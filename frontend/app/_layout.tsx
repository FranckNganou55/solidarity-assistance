import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DesktopSidebar, DesktopTopbar, MobileTopbar } from '../src/navigation';
import { AppProvider, useApp } from '../src/store';
import { Toasts } from '../src/ui';
import { usePathname } from 'expo-router';

function Inner() {
  const { scheme, palette, token, ready, activeGroupId } = useApp();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 1050;
  const publicRoute = ['/login', '/register', '/change-password'].includes(pathname);
  const showDesktopShell = desktop && ready && !!token && !publicRoute;
  const stack = <Stack key={activeGroupId ?? 'no-group'} screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: 'transparent' } }} />;
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {showDesktopShell ? (
        <View style={{ flex: 1, minWidth: 0, flexDirection: 'row', backgroundColor: palette.bg }}>
          <DesktopSidebar />
          <View style={{ flex: 1, minWidth: 0 }}>
            <DesktopTopbar />
            {stack}
          </View>
        </View>
      ) : ready && !!token && !publicRoute ? (
        <View style={{ flex: 1, minWidth: 0, backgroundColor: palette.bg }}><MobileTopbar />{stack}</View>
      ) : stack}
      <Toasts />
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <Inner />
      </AppProvider>
    </SafeAreaProvider>
  );
}
