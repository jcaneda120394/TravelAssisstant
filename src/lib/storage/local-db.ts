import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'travelassistant.db.';

export async function dbGet<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (!raw) {
    return fallback;
  }
  return JSON.parse(raw) as T;
}

export async function dbSet<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export async function dbRemove(key: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIX + key);
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
