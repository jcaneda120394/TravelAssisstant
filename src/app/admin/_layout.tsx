import { Stack } from 'expo-router';

import { AdminGate } from '@/features/admin/admin-gate';

export default function AdminLayout() {
  return (
    <AdminGate>
      <Stack screenOptions={{ headerShown: false }} />
    </AdminGate>
  );
}
