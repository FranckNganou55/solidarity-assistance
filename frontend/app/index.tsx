import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useApp } from '../src/store';

export default function Index() {
  const { ready, token, member, palette } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (!token) router.replace('/login');
    else if (member?.mustChangePassword) router.replace('/change-password');
    else router.replace('/(tabs)');
  }, [ready, token, member, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
      <ActivityIndicator color={palette.primary} size="large" />
    </View>
  );
}
