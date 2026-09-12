import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable as RNPressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { useCountryAppearance } from '@/hooks/use-country-appearance';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { analytics } from '@/lib/analytics';

const QUICK_PROMPTS = [
  { id: 'afternoon', label: 'What should we do this afternoon?' },
  { id: 'food', label: 'Best food nearby' },
  { id: 'plan', label: 'Help plan my trip' },
  { id: 'hotels', label: 'Find hotels in my budget' },
] as const;

/**
 * App-wide floating AI button + bottom sheet, similar to messenger/support FABs.
 * Hidden on the full AI Assistant tab so it does not stack on itself.
 */
export function AiAssistantFab() {
  const router = useRouter();
  const pathname = usePathname();
  const { scheme, colors } = useCountryAppearance();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { isDesktop, sidebarWidth, contentMaxWidth } = useResponsiveLayout();
  const [open, setOpen] = useState(false);

  const onAssistantTab = pathname.includes('assistant');

  const layout = useMemo(() => {
    const compact = width < 360;
    const tablet = width >= 768;
    const fabSize = compact ? 52 : isDesktop ? 60 : tablet ? 64 : 58;
    const tabBarApprox = isDesktop ? 0 : Platform.OS === 'ios' ? 88 : 66;
    const bottom = Math.max(insets.bottom, 8) + tabBarApprox + (compact ? 4 : 10);

    let right: number;
    if (isDesktop) {
      // Anchor to the content column (right of sidebar), not the full viewport.
      const mainWidth = Math.max(0, width - sidebarWidth);
      const contentWidth = Math.min(contentMaxWidth, mainWidth);
      const sideGutter = Math.max(24, (mainWidth - contentWidth) / 2);
      right = sideGutter + 20;
    } else if (tablet) {
      right = Math.max(24, (width - 720) / 2 + 24);
    } else {
      right = compact ? 14 : 18;
    }

    const sheetMaxWidth = tablet || isDesktop ? 440 : width;
    const sheetMaxHeight = Math.min(height * 0.72, tablet || isDesktop ? 560 : 520);
    return { fabSize, bottom, right, sheetMaxWidth, sheetMaxHeight, compact, tablet };
  }, [width, height, insets.bottom, isDesktop, sidebarWidth, contentMaxWidth]);

  if (onAssistantTab) {
    return null;
  }

  const openAssistant = (prompt?: string) => {
    setOpen(false);
    analytics.track('ai_fab_open', { prompt: prompt ?? 'full' });
    if (prompt) {
      router.push({
        pathname: '/(tabs)/assistant',
        params: { prompt },
      });
      return;
    }
    router.push('/(tabs)/assistant');
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          right: layout.right,
          bottom: layout.bottom,
          zIndex: 50,
          elevation: 50,
        }}
      >
        <RNPressable
          testID="ai-assistant-fab"
          accessibilityRole="button"
          accessibilityLabel="Open AI Assistant"
          onPress={() => setOpen(true)}
          style={({ pressed }) => ({
            width: layout.fabSize,
            height: layout.fabSize,
            borderRadius: layout.fabSize / 2,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.accent,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.96 : 1 }],
            shadowColor: '#C45C3A',
            shadowOpacity: scheme === 'dark' ? 0.45 : 0.35,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 10,
            borderWidth: 2,
            borderColor: scheme === 'dark' ? '#3A221C' : '#FFE6DF',
          })}
        >
          <Ionicons name="sparkles" size={layout.compact ? 22 : 26} color="#FFFFFF" />
        </RNPressable>
      </View>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        {/* Backdrop and sheet are siblings — nesting Pressables caused <button> in <button> on web. */}
        <View className="flex-1 justify-end bg-black/50">
          <RNPressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss AI Assistant"
            onPress={() => setOpen(false)}
            style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View
            style={{
              maxHeight: layout.sheetMaxHeight,
              width: layout.sheetMaxWidth,
              alignSelf: 'center',
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              borderBottomLeftRadius: layout.tablet ? 28 : 0,
              borderBottomRightRadius: layout.tablet ? 28 : 0,
              marginBottom: layout.tablet ? Math.max(insets.bottom, 24) : 0,
              paddingHorizontal: layout.compact ? 16 : 20,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
              backgroundColor: scheme === 'dark' ? colors.surface : '#FFFFFF',
              borderWidth: 1,
              borderColor: colors.border,
              zIndex: 1,
            }}
          >
            <View className="mb-3 items-center">
              <View
                className="h-1.5 w-12 rounded-full"
                style={{ backgroundColor: scheme === 'dark' ? '#2A4541' : '#D5E8E4' }}
              />
            </View>

            <View className="mb-1 flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <AppText className="font-sans-semibold text-xs uppercase tracking-[0.16em] text-accent-500">
                  Assistant
                </AppText>
                <AppText
                  className={`mt-1 font-display-bold leading-7 ${
                    layout.compact ? 'text-xl' : 'text-2xl'
                  }`}
                >
                  Ask TravelAssistant AI
                </AppText>
                <AppText muted className={`mt-1 ${layout.compact ? 'text-sm' : 'text-[15px]'}`}>
                  Voice or text · travel places, food, hotels & routes only
                </AppText>
                <View className="mt-2 h-1 w-10 rounded-full bg-accent-500" />
              </View>
              <RNPressable
                onPress={() => setOpen(false)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: scheme === 'dark' ? '#1A2E2B' : '#EEF6F4',
                }}
              >
                <Ionicons name="close" size={20} color={colors.textMuted} />
              </RNPressable>
            </View>

            <AppText muted className="mb-3 mt-4 text-xs font-sans-semibold uppercase tracking-wide">
              Try asking
            </AppText>
            <View className={`mb-4 ${layout.tablet ? 'flex-row flex-wrap gap-2' : 'gap-2'}`}>
              {QUICK_PROMPTS.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openAssistant(item.label)}
                  className={`rounded-2xl border px-3.5 py-3 ${
                    layout.tablet ? 'w-[48%]' : 'w-full'
                  } ${
                    scheme === 'dark'
                      ? 'border-brand-800 bg-brand-900/60'
                      : 'border-brand-100 bg-surface-mist'
                  }`}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <AppText className="font-sans-medium text-sm">{item.label}</AppText>
                </Pressable>
              ))}
            </View>

            <View className="gap-2">
              <Button
                label="Open AI Assistant"
                variant="accent"
                testID="ai-assistant-sheet-open"
                onPress={() => openAssistant()}
              />
              <Button
                label="Ask with voice"
                variant="secondary"
                testID="ai-assistant-sheet-voice"
                onPress={() => openAssistant('__voice__')}
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}
