import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Auth session storage:
 * - Native: Expo SecureStore (Keychain / Keystore-backed), AsyncStorage fallback for large values
 * - Web: AsyncStorage (localStorage) so sessions survive refresh — required for Supabase web auth
 *
 * SecureStore has a ~2048 byte value limit on some platforms.
 */
const LARGE_VALUE = 1800;

export const authSessionStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return AsyncStorage.getItem(key);
    }
    try {
      const secure = await SecureStore.getItemAsync(key);
      if (secure != null) {
        return secure;
      }
      return AsyncStorage.getItem(key);
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
      return;
    }
    if (value.length > LARGE_VALUE) {
      await SecureStore.deleteItemAsync(key).catch(() => undefined);
      await AsyncStorage.setItem(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
      await AsyncStorage.removeItem(key).catch(() => undefined);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key).catch(() => undefined);
    await AsyncStorage.removeItem(key).catch(() => undefined);
  },
};
