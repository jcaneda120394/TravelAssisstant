import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AiAssistantFab } from '@/components/ai/ai-assistant-fab';
import { WebSidebar } from '@/components/layout/web-sidebar';
import { useCountryAppearance } from '@/hooks/use-country-appearance';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ color, name, size }: { color: string; name: IconName; size: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

export default function TabsLayout() {
  const { scheme, colors } = useCountryAppearance();
  const { isDesktop, isCompact, isTablet, isWeb, tabBarHeight } = useResponsiveLayout();
  const insets = useSafeAreaInsets();
  // Phone web: icons only — 6–7 labeled tabs look crushed on ~390px.
  const showLabels = isTablet || isDesktop;
  const iconSize = isCompact ? 22 : showLabels ? 22 : 24;
  const webBottomPad = Math.max(insets.bottom, isWeb ? (Platform.OS === 'web' ? 10 : 8) : 4);

  const tabs = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarShowLabel: showLabels,
        tabBarStyle: isDesktop
          ? { display: 'none', height: 0 }
          : {
              backgroundColor: colors.surface,
              borderTopColor: scheme === 'dark' ? colors.border : 'rgba(18,32,30,0.08)',
              borderTopWidth: 1,
              height: tabBarHeight,
              paddingTop: showLabels ? 6 : 10,
              paddingBottom: webBottomPad,
              elevation: 0,
              shadowOpacity: 0,
            },
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: isWeb ? 10 : 9,
          marginTop: 0,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: showLabels ? 0 : 6,
          minWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon color={String(color)} name="home" size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => (
            <TabIcon color={String(color)} name="compass" size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color }) => (
            <TabIcon color={String(color)} name="briefcase" size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: 'Guide',
          tabBarIcon: ({ color }) => <TabIcon color={String(color)} name="book" size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <TabIcon color={String(color)} name="map" size={iconSize} />,
        }}
      />
      <Tabs.Screen
        name="translate"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          // Phone/tablet: FAB + Home shortcuts open AI — keep tab bar uncrowded.
          href: isDesktop ? undefined : null,
          title: 'AI',
          tabBarIcon: ({ color }) => (
            <TabIcon color={String(color)} name="sparkles" size={iconSize} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <TabIcon color={String(color)} name="person" size={iconSize} />
          ),
        }}
      />
    </Tabs>
  );

  if (isDesktop) {
    return (
      <View className="h-full flex-1 flex-row" style={{ minHeight: 0, width: '100%' }}>
        <WebSidebar />
        <View className="h-full flex-1" style={{ minWidth: 0, minHeight: 0 }}>
          {tabs}
        </View>
        <AiAssistantFab />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ minHeight: 0, width: '100%', maxWidth: '100%' }}>
      {tabs}
      <AiAssistantFab />
    </View>
  );
}
