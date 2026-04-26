import firestore from '@react-native-firebase/firestore';
import { AppState } from '../context/AppContext';

const usersCollection = firestore().collection('users');

/**
 * Push local state to Firestore (merge, don't overwrite).
 * Does NOT push balance/tier — those are server-authoritative.
 */
export async function pushToFirestore(uid: string, state: AppState): Promise<void> {
  try {
    await usersCollection.doc(uid).set({
      name: state.name,
      alarms: state.alarms,
      history: state.history.slice(0, 100),
      onboarded: state.onboarded,
      dailySnoozeCount: state.dailySnoozeCount,
      dailySnoozeDate: state.dailySnoozeDate,
      updatedAt: firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Firestore push error:', error);
  }
}

/**
 * Pull user data from Firestore (includes balance/tier from server)
 */
export async function pullFromFirestore(uid: string): Promise<Partial<AppState> | null> {
  try {
    const doc = await usersCollection.doc(uid).get();
    const exists = typeof doc.exists === 'function' ? doc.exists() : doc.exists;
    if (exists) {
      const data = doc.data();
      // Migration: old docs have `score` instead of `balance`
      const hasOldFormat = data?.score !== undefined && data?.balance === undefined;

      return {
        balance: hasOldFormat ? 0 : (data?.balance ?? 0),
        tier: hasOldFormat ? null : (data?.tier ?? null),
        dailySnoozeCount: data?.dailySnoozeCount ?? 0,
        dailySnoozeDate: data?.dailySnoozeDate ?? '',
        name: data?.name,
        alarms: data?.alarms || [],
        history: data?.history || [],
        onboarded: data?.onboarded ?? false,
      };
    }
    return null;
  } catch (error) {
    console.error('Firestore pull error:', error);
    return null;
  }
}

/**
 * Create user document on first sign-in
 */
export async function createUserDoc(uid: string, name: string): Promise<void> {
  try {
    const doc = await usersCollection.doc(uid).get();
    const exists = typeof doc.exists === 'function' ? doc.exists() : doc.exists;
    if (!exists) {
      await usersCollection.doc(uid).set({
        balance: 0,
        tier: null,
        name: name,
        alarms: [],
        history: [],
        onboarded: false,
        dailySnoozeCount: 0,
        dailySnoozeDate: '',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Firestore create user error:', error);
  }
}

/**
 * Deduct snooze cost from balance (server-side via FieldValue.increment).
 * This ensures balance can only decrease from client.
 */
export async function deductSnoozeBalance(uid: string, costCents: number): Promise<void> {
  if (costCents <= 0) return;
  try {
    await usersCollection.doc(uid).update({
      balance: firestore.FieldValue.increment(-costCents),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Firestore deduct balance error:', error);
  }
}

/**
 * Listen to user doc for real-time balance/tier updates (e.g. after payment webhook).
 * Returns an unsubscribe function.
 */
export function listenToBalance(
  uid: string,
  callback: (balance: number, tier: string | null) => void
): () => void {
  return usersCollection.doc(uid).onSnapshot(
    (doc) => {
      const data = doc.data();
      if (data) {
        callback(data.balance ?? 0, data.tier ?? null);
      }
    },
    (error) => {
      console.error('Firestore listener error:', error);
    }
  );
}
