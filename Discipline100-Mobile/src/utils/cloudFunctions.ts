import { getAuth, getIdToken } from '@react-native-firebase/auth';

const FUNCTIONS_BASE = 'https://us-central1-discipline100-67cda.cloudfunctions.net';

async function callFunction(name: string, data: object): Promise<any> {
  const currentUser = getAuth().currentUser;
  if (!currentUser) throw new Error('Not authenticated — please sign in again');

  const token = await getIdToken(currentUser, true);
  const url = `${FUNCTIONS_BASE}/${name}`;
  console.log(`[cloudFunctions] calling ${url}, token prefix: ${token.slice(0, 20)}...`);

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  });

  const text = await res.text();
  console.log(`[cloudFunctions] status: ${res.status}, body: ${text.slice(0, 200)}`);

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Server returned non-JSON (${res.status}): ${text.slice(0, 100)}`);
  }

  if (json.error) throw new Error(json.error.message || JSON.stringify(json.error));
  return json.result;
}

export async function createPaymentIntent(tier: string): Promise<{ clientSecret: string; paymentIntentId: string }> {
  return await callFunction('createPaymentIntent', { tier });
}

export async function requestRefund(): Promise<{ refundedAmount: number; refundId: string }> {
  return await callFunction('requestRefund', {});
}
