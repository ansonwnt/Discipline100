import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { isValidTier } from './config';

const db = admin.firestore();

export const handleStripeWebhook = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] })
  .https.onRequest(async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const { firebaseUid, tier, type } = paymentIntent.metadata;

    if (!firebaseUid || !tier || !isValidTier(tier)) {
      console.error('Missing or invalid metadata on PaymentIntent', paymentIntent.id);
      res.status(400).send('Invalid metadata');
      return;
    }

    const userRef = db.collection('users').doc(firebaseUid);
    const txRef = userRef.collection('transactions').doc(paymentIntent.id);

    // Idempotency check — don't process the same payment twice
    const existingTx = await txRef.get();
    if (existingTx.exists) {
      res.status(200).send('Already processed');
      return;
    }

    await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      const userData = userDoc.data() || {};
      const currentBalance = userData.balance || 0;

      let newBalance: number;
      let txType: string;

      if (type === 'upgrade') {
        // Upgrade: add the difference to existing balance
        newBalance = currentBalance + paymentIntent.amount;
        txType = 'upgrade';
      } else {
        // Fresh deposit
        newBalance = paymentIntent.amount;
        txType = 'deposit';
      }

      // For deposits: store as the base PI. For upgrades: store separately so
      // requestRefund can refund from both PIs without exceeding either charge.
      const piFields = type === 'upgrade'
        ? {
            upgradePaymentIntentId: paymentIntent.id,
            upgradePaymentIntentAmount: paymentIntent.amount,
          }
        : {
            depositPaymentIntentId: paymentIntent.id,
            depositPaymentIntentAmount: paymentIntent.amount,
            // Clear any prior upgrade PI when re-depositing from scratch
            upgradePaymentIntentId: null,
            upgradePaymentIntentAmount: null,
          };

      transaction.set(userRef, {
        balance: newBalance,
        tier,
        ...piFields,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      transaction.set(txRef, {
        type: txType,
        amount: paymentIntent.amount,
        balanceAfter: newBalance,
        tier,
        paymentIntentId: paymentIntent.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log(`Payment processed: ${type} for ${firebaseUid}, tier: ${tier}, amount: ${paymentIntent.amount}`);
  }

  res.status(200).send('OK');
});
