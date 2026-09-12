import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { PlaceCard } from '@/components/cards/place-card';
import { TextField } from '@/components/forms/text-field';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/feedback/states';
import { AppText, Card, Screen, SectionHeader } from '@/components/ui/typography';
import { ScrollView } from '@/components/ui/primitives';
import { useAuth } from '@/hooks/use-auth';
import {
  createCollection,
  listCollections,
  listSavedPlaces,
} from '@/services/favorites/favorites.service';

export function FavoritesScreen() {
  const { user } = useAuth();
  const [collectionName, setCollectionName] = useState('Tokyo Food');

  const savedQuery = useQuery({
    queryKey: ['favorites', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listSavedPlaces(user!.id),
  });

  const collectionsQuery = useQuery({
    queryKey: ['collections', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => listCollections(user!.id),
  });

  return (
    <Screen>
      <ScrollView className="flex-1 px-5 pt-14" contentContainerClassName="pb-10" testID="screen-favorites">
        <SectionHeader title="Favorites" subtitle="Saved places and collections" />

        <Card className="mb-4">
          <TextField
            label="New collection"
            value={collectionName}
            onChangeText={setCollectionName}
            autoCapitalize="words"
          />
          <Button
            label="Create collection"
            onPress={() => {
              if (!user) return;
              void createCollection(user.id, collectionName).then(() => collectionsQuery.refetch());
            }}
          />
          {collectionsQuery.data?.map((collection) => (
            <AppText key={collection.id} muted className="mt-2">
              {collection.name}
            </AppText>
          ))}
        </Card>

        {savedQuery.data?.map((item) => (
          <PlaceCard key={item.id} place={item.place} />
        ))}

        {(savedQuery.data?.length ?? 0) === 0 ? (
          <EmptyState title="No saved places" description="Save places from Explore or Place details." />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
