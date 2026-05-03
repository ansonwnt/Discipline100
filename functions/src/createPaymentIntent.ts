import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import { isValidTier, getTierAmount, getUpgradeCost, TierKey } from './config';

const db = admin.firestore();

export const createPaymentIntent = functions
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

  const { tier } = (req.body?.data || {}) as { tier: string };
  if (!isValidTier(tier)) {
    res.status(400).json({ error: { message: 'Invalid tier', status: 'INVALID_ARGUMENT' } });
    return;
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    let amount: number;
    const currentTier = userData?.tier as TierKey | null;

    if (currentTier && userData?.balance > 0) {
      if (getTierAmount(tier) <= getTierAmount(currentTier)) {
        res.status(400).json({ error: { message: 'Can only upgrade to a higher tier', status: 'INVALID_ARGUMENT' } });
        return;
      }
      amount = getUpgradeCost(currentTier, tier);
    } else {
      amount = getTierAmount(tier);
    }

    let stripeCustomerId = userData?.stripeCustomerId;
    if (stripeCustomerId) {
      // Verify the customer exists in the current Stripe mode (test vs live keys may differ)
      try {
        await stripe.customers.retrieve(stripeCustomerId);
      } catch {
        stripeCustomerId = null;
      }
    }
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({ metadata: { firebaseUid: uid } });
      stripeCustomerId = customer.id;
      await userRef.set({ stripeCustomerId }, { merge: true });
    }

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

    res.json({ result: { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id } });
  } catch (e: any) {
    res.status(500).json({ error: { message: e.message || 'Internal error', status: 'INTERNAL' } });
  }
});
