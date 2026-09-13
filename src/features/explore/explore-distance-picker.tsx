import { useState } from 'react';
import { Platform } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { AppText } from '@/components/ui/typography';
import { Pressable, ScrollView, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';

export const PRESET_RADII = [
  '500',
  '1000',
  '2000',
  '3000',
  '5000',
  '10000',
  '25000',
  '50000',
  '100000',
  '150000',
  '200000',
] as const;

export const DISTANCE_OPTIONS = [...PRESET_RADII, 'custom'] as const;
export type DistanceOption = (typeof DISTANCE_OPTIONS)[number];

export const PRESET_LABELS: Record<(typeof PRESET_RADII)[number], string> = {
  '500': '500m',
  '1000': '1km',
  '2000': '2km',
  '3000': '3km',
  '5000': '5km',
  '10000': '10km',
  '25000': '25km',
  '50000': '50km',
  '100000': '100km',
  '150000': '150km',
  '200000': '200km',
};

/** Same pattern as Category: a short primary strip; everything else under More. */
const PRIMARY_DISTANCES = ['1000', '5000', '10000', '25000', '50000'] as const satisfies ReadonlyArray<
  (typeof PRESET_RADII)[number]
>;

const PRIMARY_SET = new Set<string>(PRIMARY_DISTANCES);

const DISTANCE_GROUPS: Array<{
  title: string;
  options: ReadonlyArray<(typeof PRESET_RADII)[number] | 'custom'>;
}> = [
  { title: 'Nearby', options: ['500', '1000', '2000', '3000', '5000'] },
  { title: 'City & region', options: ['10000', '25000', '50000'] },
  { title: 'Wide area', options: ['100000', '150000', '200000'] },
  { title: 'Custom', options: ['custom'] },
];

function chipClass(selected: boolean, scheme: 'light' | 'dark') {
  return `rounded-full px-3.5 py-2 ${
    selected
      ? 'bg-brand-600 border border-brand-600'
      : scheme === 'dark'
        ? 'bg-transparent border border-brand-800'
        : 'bg-transparent border border-black/8'
  }`;
}

function optionLabel(option: DistanceOption, customLabel: string): string {
  if (option === 'custom') return customLabel;
  return PRESET_LABELS[option];
}

type Props = {
  value: DistanceOption;
  onChange: (next: DistanceOption) => void;
  customLabel?: string;
};

export function ExploreDistancePicker({
  value,
  onChange,
  customLabel = 'Custom',
}: Props) {
  const scheme = useAppColorScheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const secondarySelected = !PRIMARY_SET.has(value);
  const chipWebStyle = Platform.OS === 'web' ? ({ flexShrink: 0 } as const) : undefined;

  const select = (next: DistanceOption) => {
    onChange(next);
    setMoreOpen(false);
  };

  return (
    <View className="w-full" testID="explore-distance-picker">
      <ScrollView
        horizontal
        nestedScrollEnabled
        directionalLockEnabled
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={
          Platform.OS === 'web'
            ? ({ flexGrow: 0, width: '100%', touchAction: 'pan-x' } as object)
            : { flexGrow: 0, width: '100%' }
        }
        contentContainerStyle={{
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          gap: 8,
          paddingRight: 20,
        }}
      >
        {PRIMARY_DISTANCES.map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              onPress={() => select(option)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={chipClass(selected, scheme)}
              style={chipWebStyle}
              testID={`explore-distance-${option}`}
            >
              <AppText
                inverse={selected}
                className={`text-sm ${selected ? 'font-sans-semibold' : 'font-sans-medium'}`}
              >
                {PRESET_LABELS[option]}
              </AppText>
            </Pressable>
          );
        })}
        {secondarySelected ? (
          <Pressable
            onPress={() => setMoreOpen(true)}
            accessibilityRole="button"
            accessibilityState={{ selected: true }}
            className={chipClass(true, scheme)}
            style={chipWebStyle}
            testID={`explore-distance-selected-${value}`}
          >
            <AppText inverse className="text-sm font-sans-semibold">
              {optionLabel(value, customLabel)}
            </AppText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setMoreOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="More distances"
          className={chipClass(false, scheme)}
          style={chipWebStyle}
          testID="explore-distance-more"
        >
          <AppText className="text-sm font-sans-medium">More ···</AppText>
        </Pressable>
      </ScrollView>

      <BottomSheet
        visible={moreOpen}
        onClose={() => setMoreOpen(false)}
        dismissLabel="Dismiss distance picker"
      >
        <View
          className={`max-h-[80%] rounded-t-3xl px-5 pb-8 pt-4 ${
            scheme === 'dark' ? 'bg-surface-cardDark' : 'bg-white'
          }`}
        >
          <View className="mb-3 flex-row items-center justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <AppText className="text-lg font-sans-semibold">Distance</AppText>
              <AppText muted className="mt-0.5 text-xs">
                Choose how far to search from your location
              </AppText>
            </View>
            <Pressable onPress={() => setMoreOpen(false)} hitSlop={12}>
              <AppText className="font-sans-semibold text-brand-700">Close</AppText>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as object) : undefined}
          >
            {DISTANCE_GROUPS.map((group) => (
              <View key={group.title} className="mb-4">
                <AppText muted className="mb-2 text-xs font-sans-semibold uppercase tracking-wide">
                  {group.title}
                </AppText>
                <View className="flex-row flex-wrap gap-2">
                  {group.options.map((option) => {
                    const selected = value === option;
                    const label = optionLabel(option, customLabel);
                    return (
                      <Pressable
                        key={option}
                        onPress={() => select(option)}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        className={chipClass(selected, scheme)}
                        testID={`explore-distance-more-${option}`}
                      >
                        <AppText
                          inverse={selected}
                          className={`text-sm ${selected ? 'font-sans-semibold' : 'font-sans-medium'}`}
                        >
                          {label}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </BottomSheet>
    </View>
  );
}
