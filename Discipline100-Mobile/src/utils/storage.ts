import AsyncStorage from '@react-native-async-storage/async-storage';

const STATE_KEY = 'discipline100_state';

export async function loadState<T>(defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    if (raw) return { ...defaultValue, ...JSON.parse(raw) };
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
