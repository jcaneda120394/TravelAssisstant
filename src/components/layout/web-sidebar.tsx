import Ionicons from '@expo/vector-icons/Ionicons';
import { usePathname, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';

import { AppText } from '@/components/ui/typography';
import { Pressable, View } from '@/components/ui/primitives';
import { env } from '@/config/env';
import { useCountryAppearance } from '@/hooks/use-country-appearance';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

type IconName = ComponentProps<typeof Ionicons>['name'];

const NAV_ITEMS: Array<{ href: string; label: string; match: string; icon: IconName }> = [
  { href: '/(tabs)', label: 'Home', match: 'index', icon: 'home' },
  { href: '/(tabs)/explore', label: 'Explore', match: 'explore', icon: 'compass' },
  { href: '/(tabs)/trips', label: 'Trips', match: 'trips', icon: 'briefcase' },
  { href: '/(tabs)/guide', label: 'Guide', match: 'guide', icon: 'book' },
  { href: '/(tabs)/map', label: 'Map', match: 'map', icon: 'map' },
  { href: '/(tabs)/translate', label: 'Translate', match: 'translate', icon: 'scan' },
  { href: '/(tabs)/assistant', label: 'AI', match: 'assistant', icon: 'sparkles' },
  { href: '/(tabs)/profile', label: 'Profile', match: 'profile', icon: 'person' },
];

function isActivePath(pathname: string, match: string): boolean {
  if (match === 'index') {
    return (
      pathname === '/' ||
      pathname.endsWith('/(tabs)') ||
      pathname.endsWith('/(tabs)/') ||
      pathname.endsWith('/(tabs)/index')
    );
  }
  return pathname.includes(`/${match}`);
}

/** Left rail navigation for desktop web traveler shell. */
export function WebSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { scheme, colors } = useCountryAppearance();
  const { sidebarWidth } = useResponsiveLayout();

  return (
    <View
      className={`h-full border-r ${
        scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-black/5 bg-white'
      }`}
      style={{ width: sidebarWidth }}
      testID="web-sidebar"
    >
      <View className="px-5 pb-6 pt-8">
        <AppText className="font-display-bold text-[22px] leading-7 tracking-tight">
          {env.appName}
        </AppText>
        <AppText muted className="mt-1 text-xs">
          Your travel companion
        </AppText>
      </View>

      <View className="gap-0.5 px-3 pb-8">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.match);
          return (
            <Pressable
              key={item.href}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => router.push(item.href as never)}
              className={`flex-row items-center gap-3 rounded-xl px-3 py-2.5 ${
                active
                  ? scheme === 'dark'
                    ? 'bg-brand-800'
                    : 'bg-brand-50'
                  : scheme === 'dark'
                    ? 'hover:bg-brand-900'
                    : 'hover:bg-black/5'
              }`}
              testID={`web-nav-${item.match}`}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? colors.tabIconSelected : colors.tabIconDefault}
              />
              <AppText
                className={`font-sans-medium text-[15px] ${
                  active
                    ? scheme === 'dark'
                      ? 'text-ink-dark'
                      : 'text-brand-800'
                    : ''
                }`}
              >
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
