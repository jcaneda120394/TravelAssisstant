import { useMemo, useState } from 'react';
import { Modal } from 'react-native';

import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

export const EXPLORE_CATEGORIES = [
  // Discover
  'attraction',
  'restaurant',
  'cafe',
  'bakery',
  'hotel',
  // Everyday essentials
  'convenience',
  'pharmacy',
  'atm',
  'bank',
  'laundry',
  // Shopping & culture
  'shopping',
  'mall',
  'market',
  'souvenir',
  'park',
  'museum',
  'temple',
  'viewpoint',
  'zoo',
  'nightlife',
  'beach',
  'hot_spring',
  'cold_spring',
  'spring',
  'lake',
  'river',
  'resort',
  'spa',
  'gym',
  // Getting around
  'transit_station',
  'airport',
  'bicycle_rental',
  'fuel',
  'parking',
  // Travel help
  'tourist_info',
  'post_office',
  'coworking',
  'toilet',
  // Emergency
  'hospital',
  'clinic',
  'police',
  'embassy',
  'all',
] as const;

export type ExploreCategory = (typeof EXPLORE_CATEGORIES)[number];

/** Top strip — keep short so Explore doesn’t look flooded. */
const PRIMARY_CATEGORIES = [
  'attraction',
  'restaurant',
  'hotel',
  'shopping',
  'park',
  'transit_station',
  'convenience',
] as const satisfies readonly ExploreCategory[];

/** Primary-strip labels (may shorten vs full sheet labels). */
const PRIMARY_LABELS: Partial<Record<ExploreCategory, string>> = {
  convenience: 'Essentials',
};

type CategoryGroup = {
  title: string;
  categories: readonly ExploreCategory[];
};

const CATEGORY_GROUPS: readonly CategoryGroup[] = [
  {
    title: 'Eat & drink',
    categories: ['restaurant', 'cafe', 'bakery', 'nightlife'],
  },
  {
    title: 'Stay',
    categories: ['hotel', 'resort', 'spa'],
  },
  {
    title: 'See & do',
    categories: ['attraction', 'museum', 'temple', 'viewpoint', 'zoo'],
  },
  {
    title: 'Shopping',
    categories: ['shopping', 'mall', 'market', 'souvenir'],
  },
  {
    title: 'Nature',
    categories: ['park', 'beach', 'hot_spring', 'cold_spring', 'spring', 'lake', 'river'],
  },
  {
    title: 'Essentials',
    categories: [
      'convenience',
      'pharmacy',
      'atm',
      'bank',
      'laundry',
      'gym',
      'tourist_info',
      'post_office',
      'coworking',
      'toilet',
    ],
  },
  {
    title: 'Transport',
    categories: ['transit_station', 'airport', 'bicycle_rental', 'fuel', 'parking'],
  },
  {
    title: 'Emergency',
    categories: ['hospital', 'clinic', 'police', 'embassy'],
  },
];

export const CATEGORY_LABELS: Record<ExploreCategory, string> = {
  attraction: 'Things to do',
  restaurant: 'Food',
  cafe: 'Cafe',
  bakery: 'Bakery',
  hotel: 'Hotels',
  convenience: 'Convenience store',
  pharmacy: 'Pharmacy',
  atm: 'ATM',
  bank: 'Bank / FX',
  laundry: 'Laundry',
  shopping: 'Shopping',
  mall: 'Malls',
  market: 'Markets',
  souvenir: 'Souvenirs',
  park: 'Parks',
  museum: 'Museums',
  temple: 'Temples',
  viewpoint: 'Viewpoints',
  zoo: 'Zoo / Aquarium',
  nightlife: 'Nightlife',
  beach: 'Beaches',
  hot_spring: 'Hot springs',
  cold_spring: 'Cold springs',
  spring: 'Springs',
  lake: 'Lakes',
  river: 'Rivers / falls',
  resort: 'Resorts',
  spa: 'Spa',
  gym: 'Gym / Fitness',
  transit_station: 'Transit',
  airport: 'Airport',
  bicycle_rental: 'Bike rental',
  fuel: 'Fuel',
  parking: 'Parking',
  tourist_info: 'Tourist info',
  post_office: 'Post office',
  coworking: 'Coworking',
  toilet: 'Toilets',
  hospital: 'Hospital',
  clinic: 'Clinic',
  police: 'Police',
  embassy: 'Embassy',
  all: 'All',
};

const PRIMARY_SET = new Set<string>(PRIMARY_CATEGORIES);

type Props = {
  value: ExploreCategory;
  onChange: (next: ExploreCategory) => void;
};

function chipClass(selected: boolean, scheme: 'light' | 'dark') {
  return `rounded-xl px-3.5 py-2.5 ${
    selected
      ? scheme === 'dark'
        ? 'bg-brand-800'
        : 'bg-brand-600'
      : scheme === 'dark'
        ? 'bg-transparent border border-brand-800'
        : 'bg-transparent border border-black/8'
  }`;
}

export function ExploreCategoryPicker({ value, onChange }: Props) {
  const scheme = useAppColorScheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const primarySelected = PRIMARY_SET.has(value);
  const moreActive = !primarySelected;

  const moreChipLabel = useMemo(() => {
    if (moreActive) {
      return CATEGORY_LABELS[value];
    }
    return 'More';
  }, [moreActive, value]);

  const select = (next: ExploreCategory) => {
    onChange(next);
    setMoreOpen(false);
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View className="flex-row gap-2 pr-1">
          {PRIMARY_CATEGORIES.map((option) => {
            const selected = value === option;
            return (
              <Pressable
                key={option}
                onPress={() => select(option)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={chipClass(selected, scheme)}
                testID={`explore-category-${option}`}
              >
                <AppText
                  inverse={selected}
                  className={`text-sm ${selected ? 'font-sans-semibold' : 'font-sans-medium'}`}
                >
                  {PRIMARY_LABELS[option] ?? CATEGORY_LABELS[option]}
                </AppText>
              </Pressable>
            );
          })}
          <Pressable
            onPress={() => setMoreOpen(true)}
            accessibilityRole="button"
            accessibilityState={{ selected: moreActive }}
            accessibilityLabel={moreActive ? `More categories, ${CATEGORY_LABELS[value]}` : 'More categories'}
            className={chipClass(moreActive, scheme)}
            testID="explore-category-more"
          >
            <AppText
              inverse={moreActive}
              className={`text-sm ${moreActive ? 'font-sans-semibold' : 'font-sans-medium'}`}
            >
              {moreChipLabel}
              {moreActive ? '' : ' ···'}
            </AppText>
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={moreOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setMoreOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className={`max-h-[80%] rounded-t-3xl px-5 pb-8 pt-4 ${
              scheme === 'dark' ? 'bg-surface-cardDark' : 'bg-white'
            }`}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <AppText className="text-lg font-sans-semibold">Categories</AppText>
                <AppText muted className="mt-0.5 text-xs">
                  Browse by section — tap to filter nearby places
                </AppText>
              </View>
              <Pressable onPress={() => setMoreOpen(false)} hitSlop={12}>
                <AppText className="font-sans-semibold text-brand-700">Close</AppText>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} className="mb-3">
              <Pressable
                onPress={() => select('all')}
                accessibilityRole="button"
                accessibilityState={{ selected: value === 'all' }}
                className={`mb-4 self-start ${chipClass(value === 'all', scheme)}`}
              >
                <AppText
                  inverse={value === 'all'}
                  className={`text-sm ${value === 'all' ? 'font-sans-semibold' : 'font-sans-medium'}`}
                >
                  {CATEGORY_LABELS.all}
                </AppText>
              </Pressable>

              {CATEGORY_GROUPS.map((group) => (
                <View key={group.title} className="mb-4">
                  <AppText muted className="mb-2 text-xs font-sans-semibold uppercase tracking-wide">
                    {group.title}
                  </AppText>
                  <View className="flex-row flex-wrap gap-2">
                    {group.categories.map((option) => {
                      const selected = value === option;
                      return (
                        <Pressable
                          key={option}
                          onPress={() => select(option)}
                          accessibilityRole="button"
                          accessibilityState={{ selected }}
                          className={chipClass(selected, scheme)}
                        >
                          <AppText
                            inverse={selected}
                            className={`text-sm ${selected ? 'font-sans-semibold' : 'font-sans-medium'}`}
                          >
                            {CATEGORY_LABELS[option]}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>

            <Button label="Done" variant="secondary" onPress={() => setMoreOpen(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}
