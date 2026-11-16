import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { View, Platform, Text, useWindowDimensions } from 'react-native';
import { useApp } from '../../src/store';

function Icon({ glyph, focused }: { glyph: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const { t, palette, token, ready } = useApp();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1050;
  // On attend la restauration de la session avant de rediriger (liens profonds / rafraichissement).
  if (!ready) return <View style={{ flex: 1, backgroundColor: palette.bg }} />;
  if (!token) return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: palette.bg }}>
      <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primary,
        tabBarInactiveTintColor: palette.muted,
        tabBarLabelStyle: { fontSize: 9.5, fontWeight: '700' },
        tabBarStyle: {
          display: desktop ? 'none' : 'flex',
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: Platform.OS === 'ios' ? 84 : 62,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tab_home'), tabBarIcon: ({ focused }) => <Icon glyph="🏠" focused={focused} /> }} />
      <Tabs.Screen name="assistances" options={{ title: t('tab_assistances'), tabBarIcon: ({ focused }) => <Icon glyph="🤝" focused={focused} /> }} />
      <Tabs.Screen name="cotisations" options={{ title: t('tab_contributions'), tabBarIcon: ({ focused }) => <Icon glyph="💵" focused={focused} /> }} />
      <Tabs.Screen name="demandes" options={{ title: t('tab_requests'), tabBarIcon: ({ focused }) => <Icon glyph="📩" focused={focused} /> }} />
      <Tabs.Screen name="profil" options={{ title: t('tab_profile'), tabBarIcon: ({ focused }) => <Icon glyph="👤" focused={focused} /> }} />
      </Tabs>
    </View>
  );
}
