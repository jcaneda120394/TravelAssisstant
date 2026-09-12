import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Platform } from 'react-native';

import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { useAppColorScheme } from '@/hooks/use-app-color-scheme';
import { APP_MAP_STYLES, type AppMapStyleId } from '@/providers/maps/map-style';
import { useMapStyleStore } from '@/stores/map-style-store';

type MapLayersControlProps = {
  /** Extra Tailwind classes for the floating container (default: top-left). */
  className?: string;
  testID?: string;
};

/**
 * Compact Google Maps–style layers picker for Map / Directions overlays.
 * Persists selection via `useMapStyleStore`.
 */
export function MapLayersControl({
  className = 'absolute top-4 left-4 z-10',
  testID = 'map-layers-control',
}: MapLayersControlProps) {
  const scheme = useAppColorScheme();
  const [open, setOpen] = useState(false);
  const style = useMapStyleStore((state) => state.style);
  const setStyle = useMapStyleStore((state) => state.setStyle);
  const showTraffic = useMapStyleStore((state) => state.showTraffic);
  const setShowTraffic = useMapStyleStore((state) => state.setShowTraffic);
  const supportsTraffic = Platform.OS === 'ios' || Platform.OS === 'android';

  const panelClass =
    scheme === 'dark'
      ? 'border-brand-700 bg-surface-cardDark'
      : 'border-brand-200 bg-white';
  const btnClass =
    scheme === 'dark'
      ? 'border-brand-700 bg-surface-cardDark'
      : 'border-brand-200 bg-white';

  const selectStyle = (next: AppMapStyleId) => {
    setStyle(next);
    setOpen(false);
  };

  return (
    <View pointerEvents="box-none" className={className}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close map layers' : 'Map layers'}
        accessibilityState={{ expanded: open }}
        testID={testID}
        onPress={() => setOpen((value) => !value)}
        className={`h-11 w-11 items-center justify-center rounded-2xl border shadow-sm ${btnClass}`}
      >
        <Ionicons
          name="layers"
          size={22}
          color={scheme === 'dark' ? '#99D5CF' : '#0B726A'}
        />
      </Pressable>

      {open ? (
        <View
          testID={`${testID}-panel`}
          className={`mt-2 w-44 overflow-hidden rounded-2xl border shadow-md ${panelClass}`}
        >
          <View className="border-b border-brand-100 px-3 py-2 dark:border-brand-800">
            <AppText className="font-sans-semibold text-sm text-brand-800 dark:text-brand-100">
              Map type
            </AppText>
          </View>

          {APP_MAP_STYLES.map((option) => {
            const selected = option.id === style;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`${testID}-option-${option.id}`}
                onPress={() => selectStyle(option.id)}
                className={`flex-row items-center gap-2.5 px-3 py-2.5 ${
                  selected ? 'bg-brand-50 dark:bg-brand-900/60' : ''
                }`}
              >
                <View
                  className={`h-8 w-8 items-center justify-center rounded-lg ${
                    selected
                      ? 'bg-brand-600'
                      : 'bg-brand-100 dark:bg-brand-800'
                  }`}
                >
                  <Ionicons
                    name={
                      option.id === 'satellite'
                        ? 'globe-outline'
                        : option.id === 'terrain'
                          ? 'triangle-outline'
                          : 'map-outline'
                    }
                    size={16}
                    color={selected ? '#FFFFFF' : scheme === 'dark' ? '#99D5CF' : '#0B726A'}
                  />
                </View>
                <View className="flex-1">
                  <AppText
                    className={`font-sans-medium text-sm ${
                      selected ? 'text-brand-700 dark:text-brand-200' : ''
                    }`}
                  >
                    {option.label}
                  </AppText>
                  <AppText muted className="text-[11px] leading-3">
                    {option.hint}
                  </AppText>
                </View>
                {selected ? (
                  <Ionicons name="checkmark" size={16} color="#0B726A" />
                ) : null}
              </Pressable>
            );
          })}

          {supportsTraffic ? (
            <>
              <View className="mx-3 border-t border-brand-100 dark:border-brand-800" />
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: showTraffic }}
                testID={`${testID}-traffic`}
                onPress={() => setShowTraffic(!showTraffic)}
                className="flex-row items-center gap-2.5 px-3 py-2.5"
              >
                <View
                  className={`h-5 w-5 items-center justify-center rounded-md border ${
                    showTraffic
                      ? 'border-brand-600 bg-brand-600'
                      : 'border-brand-300 dark:border-brand-600'
                  }`}
                >
                  {showTraffic ? (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  ) : null}
                </View>
                <AppText className="font-sans-medium text-sm">Traffic</AppText>
              </Pressable>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
