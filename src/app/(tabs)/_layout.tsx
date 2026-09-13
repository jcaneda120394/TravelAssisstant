import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Platform, View } from 'react-native';

import { AiAssistantFab } from '@/components/ai/ai-assistant-fab';
import { WebSidebar } from '@/components/layout/web-sidebar';
import { useCountryAppearance } from '@/hooks/use-country-appearance';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

type IconName = ComponentProps<typeof Ionicons>['name'];

function TabIcon({ color, name }: { color: string; name: IconName }) {
  return <Ionicons name={name} size={22} color={color} />;
}

export default function TabsLayout() {
  const { scheme, colors } = useCountryAppearance();
  const { isDesktop, isWeb } = useResponsiveLayout();

  const tabs = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabIconSelected,
        tabBarInactiveTintColor: colors.tabIconDefault,
        tabBarStyle: isDesktop
          ? { display: 'none', height: 0 }
          : {
              backgroundColor: colors.surface,
              borderTopColor: scheme === 'dark' ? colors.border : 'rgba(18,32,30,0.08)',
              borderTopWidth: 1,
              height: Platform.OS === 'ios' ? 88 : isWeb ? 72 : 66,
              paddingTop: 8,
              elevation: 0,
              shadowOpacity: 0,
            },
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans_600SemiBold',
          fontSize: isWeb ? 11 : 9,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabIcon color={String(color)} name="home" />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <TabIcon color={String(color)} name="compass" />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'Trips',
          tabBarIcon: ({ color }) => <TabIcon color={String(color)} name="briefcase" />,
        }}
      />
      <Tabs.Screen
        name="guide"
        options={{
          title: 'Guide',
          tabBarIcon: ({ color }) => <TabIcon color={String(color)} name="book" />,
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <TabIcon color={String(color)} name="map" />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'AI',
          tabBarIcon: ({ color }) => <TabIcon color={String(color)} name="sparkles" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabIcon color={String(color)} name="person" />,
        }}
      />
    </Tabs>
  );

  if (isDesktop) {
    return (
      <View className="h-full flex-1 flex-row">
        <WebSidebar />
        <View className="h-full flex-1">{tabs}</View>
        <AiAssistantFab />
      </View>
    );
  }

  return (
    <View className="flex-1">
      {tabs}
      <AiAssistantFab />
    </View>
  );
}
