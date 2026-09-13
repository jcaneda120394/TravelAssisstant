import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ResponsiveScrollView } from '@/components/layout/responsive-scroll-view';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import { getErrorMessage } from '@/lib/errors/app-error';
import {
  listAdminUsers,
  setAdminUserDisabled,
  setAdminUserRole,
} from '@/services/admin/admin.service';

export default function AdminUsersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const usersQuery = useQuery({
    queryKey: ['admin-users', query],
    queryFn: () => listAdminUsers(query),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
  };

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'user' | 'admin' }) =>
      setAdminUserRole(id, role),
    onSuccess: invalidate,
    onError: (error) => Alert.alert('Update failed', getErrorMessage(error)),
  });

  const disableMutation = useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) =>
      setAdminUserDisabled(id, disabled),
    onSuccess: invalidate,
    onError: (error) => Alert.alert('Update failed', getErrorMessage(error)),
  });

  return (
    <Screen testID="admin-users">
      <ResponsiveScrollView className="flex-1 px-6 py-6">
        <SectionHeader
          eyebrow="People"
          title="Users"
          subtitle="Edit names, passwords, profile details, roles, and travel prefs"
        />
        <TextField
          label="Search"
          value={query}
          onChangeText={setQuery}
          placeholder="Email or name"
          autoCapitalize="none"
        />
        {usersQuery.isError ? (
          <Card className="mb-4">
            <AppText className="text-red-500">{getErrorMessage(usersQuery.error)}</AppText>
          </Card>
        ) : null}
        {(usersQuery.data ?? []).map((row) => {
          const isSelf = row.id === user?.id;
          return (
            <Card key={row.id} className="mb-3">
              <AppText className="font-sans-semibold text-lg">
                {row.full_name || 'Unnamed'} · {row.role}
              </AppText>
              <AppText muted className="mt-1 text-sm">
                {row.email ?? row.id}
              </AppText>
              <AppText muted className="mt-1 text-xs">
                Joined {new Date(row.created_at).toLocaleDateString()}
                {row.is_disabled ? ' · disabled' : ''}
                {!row.onboarding_completed ? ' · onboarding incomplete' : ''}
              </AppText>
              <View className="mt-3 flex-row flex-wrap gap-2">
                <Button
                  label="Edit profile"
                  onPress={() =>
                    router.push({
                      pathname: '/admin/users/[id]',
                      params: { id: row.id },
                    })
                  }
                />
                <Button
                  label={row.role === 'admin' ? 'Make user' : 'Make admin'}
                  variant="secondary"
                  disabled={isSelf || roleMutation.isPending}
                  onPress={() =>
                    roleMutation.mutate({
                      id: row.id,
                      role: row.role === 'admin' ? 'user' : 'admin',
                    })
                  }
                />
                <Button
                  label={row.is_disabled ? 'Enable' : 'Disable'}
                  variant="secondary"
                  disabled={isSelf || disableMutation.isPending}
                  onPress={() =>
                    disableMutation.mutate({
                      id: row.id,
                      disabled: !row.is_disabled,
                    })
                  }
                />
              </View>
            </Card>
          );
        })}
      </ResponsiveScrollView>
    </Screen>
  );
}
