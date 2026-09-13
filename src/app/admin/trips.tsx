import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { ResponsiveScrollView } from '@/components/layout/responsive-scroll-view';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { getErrorMessage } from '@/lib/errors/app-error';
import {
  deleteAdminTrip,
  listAdminTrips,
  setAdminTripPublic,
} from '@/services/admin/admin.service';

export default function AdminTripsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState('');
  const [visibility, setVisibility] = useState<'all' | 'public' | 'private'>('all');

  const tripsQuery = useQuery({
    queryKey: ['admin-trips', query],
    queryFn: () => listAdminTrips(query),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-trips'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
    void queryClient.invalidateQueries({ queryKey: ['public-trips'] });
  };

  const visibilityMutation = useMutation({
    mutationFn: ({ id, isPublic }: { id: string; isPublic: boolean }) =>
      setAdminTripPublic(id, isPublic),
    onSuccess: invalidate,
    onError: (error) => Alert.alert('Update failed', getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAdminTrip(id),
    onSuccess: invalidate,
    onError: (error) => Alert.alert('Delete failed', getErrorMessage(error)),
  });

  const rows = (tripsQuery.data ?? []).filter((row) => {
    if (visibility === 'public') return row.is_public;
    if (visibility === 'private') return !row.is_public;
    return true;
  });

  const publicCount = (tripsQuery.data ?? []).filter((row) => row.is_public).length;
  const privateCount = (tripsQuery.data ?? []).length - publicCount;

  return (
    <Screen testID="admin-trips">
      <ResponsiveScrollView className="flex-1 px-6 py-6">
        <SectionHeader
          eyebrow="Trips"
          title="All trips"
          subtitle="View every trip — including private ones not shared publicly"
        />

        <TextField
          label="Search"
          value={query}
          onChangeText={setQuery}
          placeholder="Title, destination, or owner"
          autoCapitalize="none"
        />

        <View className="mb-4 flex-row flex-wrap gap-2">
          {(
            [
              { id: 'all' as const, label: `All (${tripsQuery.data?.length ?? 0})` },
              { id: 'private' as const, label: `Private (${privateCount})` },
              { id: 'public' as const, label: `Public (${publicCount})` },
            ] as const
          ).map((item) => {
            const active = visibility === item.id;
            return (
              <Button
                key={item.id}
                label={item.label}
                variant={active ? 'primary' : 'secondary'}
                onPress={() => setVisibility(item.id)}
              />
            );
          })}
        </View>

        {tripsQuery.isError ? (
          <Card className="mb-4">
            <AppText className="text-red-500">{getErrorMessage(tripsQuery.error)}</AppText>
          </Card>
        ) : null}

        {!tripsQuery.isLoading && rows.length === 0 ? (
          <Card>
            <AppText muted>No trips match this filter.</AppText>
          </Card>
        ) : null}

        {rows.map((row) => (
          <Card key={row.id} className="mb-3">
            <AppText className="font-sans-semibold text-lg">{row.title}</AppText>
            <AppText muted className="mt-1 text-sm">
              {row.owner_name || 'Traveler'}
              {row.owner_email ? ` · ${row.owner_email}` : ''}
            </AppText>
            <AppText muted className="mt-1 text-xs">
              {row.is_public ? 'Public' : 'Private'}
              {row.status ? ` · ${row.status}` : ''}
              {' · '}
              {row.start_date}
              {row.end_date ? ` → ${row.end_date}` : ' (open-ended)'}
              {' · '}
              {row.adults} adult{row.adults === 1 ? '' : 's'}
              {row.children ? `, ${row.children} child${row.children === 1 ? '' : 'ren'}` : ''}
            </AppText>
            {row.destinations.length ? (
              <AppText muted className="mt-2 text-sm">
                {row.destinations.join(' · ')}
              </AppText>
            ) : null}
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Button
                label="Open trip"
                onPress={() =>
                  router.push({
                    pathname: '/trip/[id]',
                    params: { id: row.id },
                  })
                }
              />
              <Button
                label={row.is_public ? 'Make private' : 'Make public'}
                variant="secondary"
                disabled={visibilityMutation.isPending}
                onPress={() =>
                  visibilityMutation.mutate({ id: row.id, isPublic: !row.is_public })
                }
              />
              <Button
                label="Delete"
                variant="secondary"
                disabled={deleteMutation.isPending}
                onPress={() =>
                  Alert.alert('Delete trip?', 'This permanently removes the trip and its itinerary.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteMutation.mutate(row.id),
                    },
                  ])
                }
              />
            </View>
          </Card>
        ))}
      </ResponsiveScrollView>
    </Screen>
  );
}
