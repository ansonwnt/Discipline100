import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { isValidTier, getTierAmount, getUpgradeCost, TierKey } from './config';

const db = admin.firestore();

interface CreatePaymentRequest {
  tier: string;
}

export const createPaymentIntent = functions
  .runWith({ secrets: ['STRIPE_SECRET_KEY'] })
  .https.onCall(async (request) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
  const uid = request.auth?.uid;
  if (!uid) throw new functions.https.HttpsError('unauthenticated', 'Must be signed in');

  const { tier } = request.data as CreatePaymentRequest;
  if (!isValidTier(tier)) throw new functions.https.HttpsError('invalid-argument', 'Invalid tier');

  const userRef = db.collection('users').doc(uid);
  const userDoc = await userRef.get();
  const userData = userDoc.data();

  // Determine amount: full deposit or upgrade difference
  let amount: number;
  const currentTier = userData?.tier as TierKey | null;

  if (currentTier && userData?.balance > 0) {
    // Upgrading — charge the difference
    if (getTierAmount(tier) <= getTierAmount(currentTier)) {
      throw new functions.https.HttpsError('invalid-argument', 'Can only upgrade to a higher tier');
    }
    amount = getUpgradeCost(currentTier, tier);
  } else {
    // Fresh deposit
    amount = getTierAmount(tier);
  }

  // Get or create Stripe customer
  let stripeCustomerId = userData?.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      metadata: { firebaseUid: uid },
    });
    stripeCustomerId = customer.id;
    await userRef.set({ stripeCustomerId }, { merge: true });
  }

  // Create PaymentIntent
  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    customer: stripeCustomerId,
    metadata: {
      firebaseUid: uid,
      tier,
      type: currentTier && userData?.balance > 0 ? 'upgrade' : 'deposit',
    },
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  };
});
