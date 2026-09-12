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
        scheme === 'dark' ? 'border-brand-800 bg-surface-cardDark' : 'border-brand-100 bg-white'
      }`}
      style={{ width: sidebarWidth }}
      testID="web-sidebar"
    >
      <View className="px-5 pb-4 pt-8">
        <AppText className="font-sans-semibold text-xs uppercase tracking-[0.18em] text-accent-500">
          Travel
        </AppText>
        <AppText className="mt-1 font-display-bold text-xl leading-7">{env.appName}</AppText>
      </View>

      <View className="gap-1 px-3 pb-8">
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.match);
          return (
            <Pressable
              key={item.href}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => router.push(item.href as never)}
              className={`flex-row items-center gap-3 rounded-2xl px-3 py-3 ${
                active
                  ? 'bg-brand-600'
                  : scheme === 'dark'
                    ? 'hover:bg-brand-900'
                    : 'hover:bg-brand-50'
              }`}
              testID={`web-nav-${item.match}`}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={active ? '#FFFFFF' : colors.tabIconDefault}
              />
              <AppText
                inverse={active}
                className={`font-sans-semibold ${active ? 'text-white' : ''}`}
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
