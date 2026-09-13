import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearPrivateOfflineData, cacheJson } from '@/services/offline/offline.service';
import { dbSet } from '@/lib/storage/local-db';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

describe('clearPrivateOfflineData', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('removes private offline packs and trip db keys on logout', async () => {
    await cacheJson('pack:user-1', { trips: [{ id: 't1' }] });
    await cacheJson('places:nearby', [{ id: 'p1' }]);
    await dbSet('trips', [{ id: 't1', title: 'Secret' }]);
    await AsyncStorage.setItem('travelassistant.theme', 'dark');

    await clearPrivateOfflineData();

    const keys = await AsyncStorage.getAllKeys();
    expect(keys.some((k) => k.includes('pack:'))).toBe(false);
    expect(keys.some((k) => k.includes('trips'))).toBe(false);
    expect(keys.some((k) => k.includes('places:'))).toBe(false);
    expect(keys).toContain('travelassistant.theme');
  });
});
