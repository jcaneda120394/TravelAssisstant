import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { ResponsiveScrollView } from '@/components/layout/responsive-scroll-view';
import { Button } from '@/components/ui/button';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { View } from '@/components/ui/primitives';
import { getErrorMessage } from '@/lib/errors/app-error';
import {
  deleteAdminSpot,
  listAdminSpots,
  setAdminSpotPublic,
} from '@/services/admin/admin.service';

export default function AdminSpotsScreen() {
  const queryClient = useQueryClient();
  const spotsQuery = useQuery({
    queryKey: ['admin-spots'],
    queryFn: listAdminSpots,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-spots'] });
    void queryClient.invalidateQueries({ queryKey: ['admin-overview'] });
  };

  const visibilityMutation = useMutation({
    mutationFn: ({
      kind,
      id,
      isPublic,
    }: {
      kind: 'review' | 'photo';
      id: string;
      isPublic: boolean;
    }) => setAdminSpotPublic(kind, id, isPublic),
    onSuccess: invalidate,
    onError: (error) => Alert.alert('Update failed', getErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: ({ kind, id }: { kind: 'review' | 'photo'; id: string }) =>
      deleteAdminSpot(kind, id),
    onSuccess: invalidate,
    onError: (error) => Alert.alert('Delete failed', getErrorMessage(error)),
  });

  return (
    <Screen testID="admin-spots">
      <ResponsiveScrollView className="flex-1 px-6 py-6">
        <SectionHeader
          eyebrow="Travel Guide"
          title="Spots moderation"
          subtitle="Toggle visibility or remove reviews and photos"
        />
        {spotsQuery.isError ? (
          <Card className="mb-4">
            <AppText className="text-red-500">{getErrorMessage(spotsQuery.error)}</AppText>
          </Card>
        ) : null}
        {(spotsQuery.data ?? []).length === 0 && !spotsQuery.isLoading ? (
          <Card>
            <AppText muted>No reviews or photos yet.</AppText>
          </Card>
        ) : null}
        {(spotsQuery.data ?? []).map((row) => (
          <Card key={`${row.kind}-${row.id}`} className="mb-3">
            <AppText className="font-sans-semibold">
              {row.kind === 'review' ? 'Review' : 'Photo'} · {row.place_name}
            </AppText>
            <AppText muted className="mt-1 text-sm">
              {row.preview || '—'}
            </AppText>
            <AppText muted className="mt-1 text-xs">
              {row.is_public ? 'Public' : 'Hidden'} · {new Date(row.created_at).toLocaleString()}
            </AppText>
            <View className="mt-3 flex-row flex-wrap gap-2">
              <Button
                label={row.is_public ? 'Hide' : 'Make public'}
                variant="secondary"
                disabled={visibilityMutation.isPending}
                onPress={() =>
                  visibilityMutation.mutate({
                    kind: row.kind,
                    id: row.id,
                    isPublic: !row.is_public,
                  })
                }
              />
              <Button
                label="Delete"
                variant="secondary"
                disabled={deleteMutation.isPending}
                onPress={() =>
                  Alert.alert('Delete content?', 'This cannot be undone.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Delete',
                      style: 'destructive',
                      onPress: () => deleteMutation.mutate({ kind: row.kind, id: row.id }),
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
