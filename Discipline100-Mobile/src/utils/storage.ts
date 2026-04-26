import AsyncStorage from '@react-native-async-storage/async-storage';

const STATE_KEY = 'discipline100_state';

export async function loadState<T>(defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);

      // Migration: old state had `score` instead of `balance`
      if ('score' in parsed && !('balance' in parsed)) {
        parsed.balance = 0; // Fresh start — old abstract points don't convert to money
        parsed.tier = null;
        parsed.dailySnoozeCount = 0;
        parsed.dailySnoozeDate = '';
        delete parsed.score;
      }

      return { ...defaultValue, ...parsed };
    }
  } catch (e) {}
  return defaultValue;
}

export async function saveState<T>(state: T): Promise<void> {
  try {
    await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch (e) {}
}

export async function clearState(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STATE_KEY);
  } catch (e) {}
}
