import functions from '@react-native-firebase/functions';

const callable = (name: string) => functions().httpsCallable(name);

export async function createPaymentIntent(tier: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const result = await callable('createPaymentIntent')({ tier });
  return result.data as { clientSecret: string; paymentIntentId: string };
}

export async function requestRefund(): Promise<{ refundedAmount: number; refundId: string }> {
  const result = await callable('requestRefund')({});
  return result.data as { refundedAmount: number; refundId: string };
}
