import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const db = admin.firestore();

export const requestRefund = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
  .https.onRequest(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { message: 'Must be signed in', status: 'UNAUTHENTICATED' } });
    return;
  }

  let uid: string;
  try {
    const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
  } catch {
    res.status(401).json({ error: { message: 'Invalid auth token', status: 'UNAUTHENTICATED' } });
    return;
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    if (!userData) {
      res.status(404).json({ error: { message: 'User not found', status: 'NOT_FOUND' } });
      return;
    }

    const balance = userData.balance || 0;
    if (balance <= 0) {
      res.status(400).json({ error: { message: 'No balance to withdraw', status: 'FAILED_PRECONDITION' } });
      return;
    }

    const depositPiId = userData.depositPaymentIntentId as string | null;
    const upgradePiId = userData.upgradePaymentIntentId as string | null;
    const upgradePiAmount = (userData.upgradePaymentIntentAmount || 0) as number;

    if (!depositPiId) {
      res.status(400).json({ error: { message: 'No deposit found to refund', status: 'FAILED_PRECONDITION' } });
      return;
    }

    let upgradeRefundAmount = 0;
    let depositRefundAmount = balance;

    if (upgradePiId && upgradePiAmount > 0) {
      upgradeRefundAmount = Math.min(balance, upgradePiAmount);
      depositRefundAmount = balance - upgradeRefundAmount;
    }

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

    res.json({ result: { refundedAmount: balance, refundId: refunds[0]?.id ?? '' } });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message || 'Internal error', status: 'INTERNAL' } });
  }
});
