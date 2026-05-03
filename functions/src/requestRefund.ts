import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = admin.firestore();

export const requestRefund = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
  .https.onCall(async (request) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');

  const userRef = db.collection('users').doc(uid);

  // Read user data OUTSIDE the transaction — Stripe calls must never be inside
  // Firestore transactions (transactions retry on contention → double refund risk)
  const userDoc = await userRef.get();
  const userData = userDoc.data();

  if (!userData) throw new functions.https.HttpsError('not-found', 'User not found');

  const balance = userData.balance || 0;
  if (balance <= 0) throw new functions.https.HttpsError('failed-precondition', 'No balance to withdraw');

  const depositPiId = userData.depositPaymentIntentId as string | null;
  const depositPiAmount = (userData.depositPaymentIntentAmount || 0) as number;
  const upgradePiId = userData.upgradePaymentIntentId as string | null;
  const upgradePiAmount = (userData.upgradePaymentIntentAmount || 0) as number;

  if (!depositPiId) throw new functions.https.HttpsError('failed-precondition', 'No deposit found to refund');

  // Determine how much to refund from each PaymentIntent.
  // If the user upgraded, the upgrade PI covers the upgrade diff;
  // any leftover balance (from the original deposit) comes from the original PI.
  let upgradeRefundAmount = 0;
  let depositRefundAmount = balance;

  if (upgradePiId && upgradePiAmount > 0) {
    upgradeRefundAmount = Math.min(balance, upgradePiAmount);
    depositRefundAmount = balance - upgradeRefundAmount;
  }

  // Use idempotency key = uid so retries on the same refund request are safe
  const refunds: Stripe.Refund[] = [];

  if (upgradeRefundAmount > 0 && upgradePiId) {
    const r = await stripe.refunds.create(
      { payment_intent: upgradePiId, amount: upgradeRefundAmount },
      { idempotencyKey: `refund-upgrade-${uid}` },
    );
    refunds.push(r);
  }

  if (depositRefundAmount > 0) {
    const r = await stripe.refunds.create(
      { payment_intent: depositPiId, amount: depositRefundAmount },
      { idempotencyKey: `refund-deposit-${uid}` },
    );
    refunds.push(r);
  }

  // Update Firestore — simple write, no transaction needed since:
  // 1. We already validated balance > 0 above
  // 2. Stripe is idempotent (same key = same refund)
  // 3. Client can't increase balance (only Cloud Functions can)
  const txRef = userRef.collection('transactions').doc();
  const batch = db.batch();

  batch.set(userRef, {
    balance: 0,
    tier: null,
    depositPaymentIntentId: null,
    depositPaymentIntentAmount: null,
    upgradePaymentIntentId: null,
    upgradePaymentIntentAmount: null,
    dailySnoozeCount: 0,
    dailySnoozeDate: null,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  batch.set(txRef, {
    type: 'withdrawal',
    amount: -balance,
    balanceAfter: 0,
    refundIds: refunds.map(r => r.id),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return { refundedAmount: balance, refundId: refunds[0]?.id ?? '' };
});
