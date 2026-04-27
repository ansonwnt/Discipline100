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

  const result = await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);
    const userData = userDoc.data();

    if (!userData) throw new functions.https.HttpsError('not-found', 'User not found');

    const balance = userData.balance || 0;
    if (balance <= 0) throw new functions.https.HttpsError('failed-precondition', 'No balance to withdraw');

    const depositPiId = userData.depositPaymentIntentId;
    if (!depositPiId) throw new functions.https.HttpsError('failed-precondition', 'No deposit found to refund');

    // Create Stripe refund for remaining balance
    const refund = await stripe.refunds.create({
      payment_intent: depositPiId,
      amount: balance,
    });

    // Update user doc: zero out balance and tier
    transaction.set(userRef, {
      balance: 0,
      tier: null,
      depositPaymentIntentId: null,
      dailySnoozeCount: 0,
      dailySnoozeDate: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    // Log the transaction
    const txRef = userRef.collection('transactions').doc();
    transaction.set(txRef, {
      type: 'withdrawal',
      amount: -balance,
      balanceAfter: 0,
      refundId: refund.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { refundedAmount: balance, refundId: refund.id };
  });

  return result;
});
