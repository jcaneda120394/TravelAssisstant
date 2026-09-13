import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useRef, useState } from 'react';
import {
  Image,
  Modal,
  Platform,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  Text as RNText,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import type { PlacePhoto } from '@/services/places/place-photos.service';

type Props = {
  photos: PlacePhoto[];
  loading?: boolean;
  placeName?: string;
};

const GAP = 12;

function sourceLabel(photo: PlacePhoto): string {
  if (photo.attribution) return photo.attribution;
  switch (photo.source) {
    case 'map':
      return 'Map preview';
    case 'place':
      return 'Place photo';
    case 'community':
      return 'Traveler photo';
    case 'google':
      return 'Google Places';
    case 'wikipedia':
      return 'Wikipedia';
    case 'commons':
      return 'Wikimedia Commons';
    case 'wikimedia':
      return 'Wikimedia Commons';
    case 'fallback':
      return 'Map preview';
    case 'openverse':
      return 'Openverse';
    case 'pexels':
      return 'Pexels';
    case 'unsplash':
      return 'Unsplash';
    case 'pixabay':
      return 'Pixabay';
    case 'flickr':
      return 'Flickr';
    default:
      return 'Photo';
  }
}

function GalleryArrow({
  direction,
  onPress,
  disabled,
  scheme,
}: {
  direction: 'prev' | 'next';
  onPress: () => void;
  disabled?: boolean;
  scheme: 'light' | 'dark';
}) {
  return (
    <RNPressable
      accessibilityRole="button"
      accessibilityLabel={direction === 'prev' ? 'Previous photos' : 'Next photos'}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor:
          scheme === 'dark' ? 'rgba(18,32,30,0.92)' : 'rgba(255,255,255,0.95)',
        borderWidth: 1,
        borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(18,32,30,0.12)',
        opacity: disabled ? 0.35 : pressed ? 0.85 : 1,
        shadowColor: '#12201E',
        shadowOpacity: scheme === 'dark' ? 0.35 : 0.14,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
      })}
    >
      <Ionicons
        name={direction === 'prev' ? 'chevron-back' : 'chevron-forward'}
        size={24}
        color={scheme === 'dark' ? '#E8F5F2' : '#12201E'}
      />
    </RNPressable>
  );
}

export function PlacePhotoGallery({ photos, loading, placeName }: Props) {
  const scheme = useAppColorScheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<RNScrollView>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = Math.min(windowWidth - 40, 320);
  const photoHeight = Math.round(cardWidth * 0.72);
  const step = cardWidth + GAP;
  const showArrows = photos.length > 1 && (Platform.OS === 'web' || windowWidth >= 768);

  const scrollToIndex = useCallback(
    (nextIndex: number) => {
      const clamped = Math.max(0, Math.min(photos.length - 1, nextIndex));
      setIndex(clamped);
      scrollRef.current?.scrollTo({ x: clamped * step, animated: true });
    },
    [photos.length, step],
  );

  const openViewer = (photoUrl: string) => {
    const i = photos.findIndex((p) => p.url === photoUrl);
    setViewerIndex(i >= 0 ? i : 0);
  };

  if (loading && photos.length === 0) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pl-5">
        <View className="flex-row gap-3 pr-5">
          <View
            className={`rounded-2xl ${scheme === 'dark' ? 'bg-brand-900' : 'bg-surface-mist'}`}
            style={{ width: cardWidth, height: photoHeight }}
          />
          <View
            className={`rounded-2xl ${scheme === 'dark' ? 'bg-brand-900' : 'bg-surface-mist'}`}
            style={{ width: cardWidth, height: photoHeight }}
          />
        </View>
      </ScrollView>
    );
  }

  if (!photos.length) {
    return null;
  }

  const viewerPhoto = viewerIndex != null ? photos[viewerIndex] : null;

  return (
    <View>
      <View className="relative">
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={Platform.OS === 'web'}
          className="pl-5"
          decelerationRate="fast"
          snapToInterval={Platform.OS === 'web' ? step : undefined}
          snapToAlignment="start"
          onMomentumScrollEnd={(event) => {
            const x = event.nativeEvent.contentOffset.x;
            setIndex(Math.round(x / step));
          }}
          onScrollEndDrag={(event) => {
            const x = event.nativeEvent.contentOffset.x;
            setIndex(Math.round(x / step));
          }}
        >
          <View className="flex-row pr-5" style={{ gap: GAP }}>
            {photos.map((photo) => (
              <Pressable
                key={photo.url}
                onPress={() => openViewer(photo.url)}
                className="overflow-hidden rounded-2xl"
                style={{ width: cardWidth }}
              >
                <Image
                  source={{ uri: photo.thumbUrl ?? photo.url }}
                  style={{ width: '100%', height: photoHeight }}
                  resizeMode="cover"
                  accessibilityLabel={photo.title ?? placeName ?? 'Place photo'}
                />
                <View className="mt-2 px-0.5">
                  <RNText
                    numberOfLines={1}
                    className={`font-sans text-xs font-sans-medium ${
                      scheme === 'dark' ? 'text-ink-dark' : 'text-ink-light'
                    }`}
                  >
                    {photo.title ?? placeName ?? 'Photo'}
                  </RNText>
                  <AppText muted className="text-[10px]">
                    {sourceLabel(photo)}
                  </AppText>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {showArrows ? (
          <View
            pointerEvents="box-none"
            style={{
              position: 'absolute',
              left: 8,
              right: 8,
              top: Math.max(0, photoHeight / 2 - 22),
              flexDirection: 'row',
              justifyContent: 'space-between',
              zIndex: 5,
            }}
          >
            <GalleryArrow
              direction="prev"
              scheme={scheme}
              disabled={index <= 0}
              onPress={() => scrollToIndex(index - 1)}
            />
            <GalleryArrow
              direction="next"
              scheme={scheme}
              disabled={index >= photos.length - 1}
              onPress={() => scrollToIndex(index + 1)}
            />
          </View>
        ) : null}
      </View>

      {showArrows ? (
        <AppText muted className="mt-2 px-5 text-center text-xs">
          {Math.min(index + 1, photos.length)} / {photos.length} · use arrows to browse
        </AppText>
      ) : null}

      <Modal
        visible={viewerPhoto != null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerIndex(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.92)',
            justifyContent: 'center',
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 16),
            paddingHorizontal: 16,
          }}
        >
          <RNPressable
            accessibilityRole="button"
            accessibilityLabel="Close photo"
            onPress={() => setViewerIndex(null)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />

          {viewerPhoto ? (
            <Image
              source={{ uri: viewerPhoto.url }}
              style={{ width: '100%', height: '70%', zIndex: 1 }}
              resizeMode="contain"
            />
          ) : null}

          {photos.length > 1 ? (
            <View
              pointerEvents="box-none"
              style={{
                position: 'absolute',
                left: 12,
                right: 12,
                top: '45%',
                flexDirection: 'row',
                justifyContent: 'space-between',
                zIndex: 2,
              }}
            >
              <GalleryArrow
                direction="prev"
                scheme="dark"
                disabled={viewerIndex == null || viewerIndex <= 0}
                onPress={() =>
                  setViewerIndex((current) =>
                    current == null ? 0 : Math.max(0, current - 1),
                  )
                }
              />
              <GalleryArrow
                direction="next"
                scheme="dark"
                disabled={viewerIndex == null || viewerIndex >= photos.length - 1}
                onPress={() =>
                  setViewerIndex((current) =>
                    current == null
                      ? 0
                      : Math.min(photos.length - 1, current + 1),
                  )
                }
              />
            </View>
          ) : null}

          <AppText className="mt-4 text-center text-white" inverse>
            {viewerIndex != null ? `${viewerIndex + 1} / ${photos.length} · ` : ''}
            Tap outside to close
          </AppText>
        </View>
      </Modal>
    </View>
  );
}
