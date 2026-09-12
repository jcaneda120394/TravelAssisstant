import { useState } from 'react';
import { Dimensions, Image, Modal, Pressable as RNPressable, Text as RNText } from 'react-native';

import { AppText } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import type { PlacePhoto } from '@/services/places/place-photos.service';

type Props = {
  photos: PlacePhoto[];
  loading?: boolean;
  placeName?: string;
};

export function PlacePhotoGallery({ photos, loading, placeName }: Props) {
  const scheme = useAppColorScheme();
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const cardWidth = Math.min(Dimensions.get('window').width - 48, 280);

  if (loading && photos.length === 0) {
    return (
      <View className="mb-4">
        <AppText className="mb-2 text-xs font-sans-semibold uppercase tracking-wide text-brand-500">
          Photos
        </AppText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-3">
            <View
              className={`rounded-2xl ${scheme === 'dark' ? 'bg-brand-800' : 'bg-brand-100'}`}
              style={{ width: cardWidth, height: 168 }}
            />
            <View
              className={`rounded-2xl ${scheme === 'dark' ? 'bg-brand-800' : 'bg-brand-100'}`}
              style={{ width: cardWidth, height: 168 }}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!photos.length) {
    return null;
  }

  return (
    <View className="mb-4">
      <AppText className="mb-2 text-xs font-sans-semibold uppercase tracking-wide text-brand-500">
        Photos
      </AppText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-3 pr-2">
          {photos.map((photo) => (
            <Pressable
              key={photo.url}
              onPress={() => setViewerUrl(photo.url)}
              className={`overflow-hidden rounded-2xl border ${
                scheme === 'dark' ? 'border-brand-800 bg-brand-900' : 'border-brand-100 bg-white'
              }`}
              style={{ width: cardWidth }}
            >
              <Image
                source={{ uri: photo.thumbUrl ?? photo.url }}
                style={{ width: '100%', height: 168 }}
                resizeMode="cover"
                accessibilityLabel={photo.title ?? placeName ?? 'Place photo'}
              />
              <View className="px-3 py-2">
                <RNText
                  numberOfLines={1}
                  className={`font-sans text-xs font-sans-medium ${
                    scheme === 'dark' ? 'text-ink-dark' : 'text-ink-light'
                  }`}
                >
                  {photo.title ?? placeName ?? 'Photo'}
                </RNText>
                <AppText muted className="text-[10px]">
                  {photo.source === 'map'
                    ? 'Map preview'
                    : photo.source === 'place'
                      ? 'Place photo'
                      : 'Wikimedia'}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={Boolean(viewerUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerUrl(null)}
      >
        <RNPressable
          onPress={() => setViewerUrl(null)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.92)',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          {viewerUrl ? (
            <Image
              source={{ uri: viewerUrl }}
              style={{ width: '100%', height: '70%' }}
              resizeMode="contain"
            />
          ) : null}
          <AppText className="mt-4 text-center text-white" inverse>
            Tap to close
          </AppText>
        </RNPressable>
      </Modal>
    </View>
  );
}
