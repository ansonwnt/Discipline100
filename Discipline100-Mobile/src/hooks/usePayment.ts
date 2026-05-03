import { useState } from 'react';
import { Alert } from 'react-native';
import { useStripe } from '@stripe/stripe-react-native';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { createPaymentIntent, requestRefund } from '../utils/cloudFunctions';
import { listenToBalance } from '../utils/firestoreSync';
import { TIERS, TierKey, formatUSD } from '../constants/config';

export function usePayment() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { user } = useAuth();
  const { state, dispatch } = useApp();
  const [loading, setLoading] = useState(false);

  async function initiateDeposit(tier: TierKey): Promise<boolean> {
    if (!user) return false;
    setLoading(true);

    try {
      // 1. Get client secret from Cloud Function
      const { clientSecret } = await createPaymentIntent(tier);

      // 2. Initialize Stripe Payment Sheet
      const isUpgrade = state.tier && state.balance > 0;
      const depositAmount = isUpgrade
        ? TIERS[tier].amount - TIERS[state.tier!].amount
        : TIERS[tier].amount;
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'Discipline100',
        primaryButtonLabel: `Deposit ${formatUSD(depositAmount)} (Refundable)`,
      });

      if (initError) {
        Alert.alert('Error', initError.message);
        setLoading(false);
        return false;
      }

      // 3. Present Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment Failed', presentError.message);
        }
        setLoading(false);
        return false;
      }

      // 4. Payment succeeded — wait for webhook to update Firestore.
      // Capture the balance NOW so we only resolve when it actually INCREASES
      // past the pre-payment value. onSnapshot fires immediately with the current
      // value, so without this guard an upgrade (where balance > 0 already) would
      // resolve before the webhook fires.
      const balanceBeforePayment = state.balance;

      return await new Promise<boolean>((resolve) => {
        const unsubscribe = listenToBalance(user.uid, (balance, tierFromServer) => {
          if (balance > balanceBeforePayment && tierFromServer) {
            dispatch({ type: 'SET_BALANCE', balance, tier: tierFromServer as TierKey });
            unsubscribe();
            setLoading(false);
            resolve(true);
          }
        });

        // Timeout after 15 seconds
        setTimeout(() => {
          unsubscribe();
          setLoading(false);
          resolve(false);
        }, 15000);
      });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
      setLoading(false);
      return false;
    }
  }

  async function initiateWithdrawal(): Promise<boolean> {
    if (!user) return false;
    setLoading(true);

    try {
      const result = await requestRefund();
      dispatch({ type: 'RESET_AFTER_WITHDRAWAL' });
      setLoading(false);
      Alert.alert('Withdrawal Successful', `${formatUSD(result.refundedAmount)} will be refunded to your card within 5-10 business days.`);
      return true;
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Withdrawal failed');
      setLoading(false);
      return false;
    }
  }

  return { initiateDeposit, initiateWithdrawal, loading };
}
