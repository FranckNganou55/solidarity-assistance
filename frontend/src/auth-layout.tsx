import React, { useEffect, useRef } from 'react';
import { Animated, Image, Platform, Pressable, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetUrl } from './api';
import { useApp } from './store';
import { font, radius } from './theme';

export function AuthLayout({ title, subtitle, eyebrow, children, footer }: {
  title: string; subtitle: string; eyebrow: string; children: React.ReactNode; footer: React.ReactNode;
}) {
  const { palette, settings, t, lang, setLang, themeMode, setThemeMode } = useApp();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const desktop = Platform.OS === 'web' && width >= 900;
  const entrance = useRef(new Animated.Value(0)).current;
  const logo = assetUrl(settings?.logoUrl);

  useEffect(() => {
    Animated.timing(entrance, { toValue: 1, duration: 520, useNativeDriver: true }).start();
  }, [entrance]);

  return (
    <View style={{ flex: 1, minHeight: '100%', flexDirection: desktop ? 'row' : 'column', backgroundColor: palette.bg }}>
      {desktop ? (
        <View style={{ flex: 0.9, minWidth: 360, maxWidth: 780, backgroundColor: palette.primary, paddingHorizontal: 56, paddingVertical: 48, justifyContent: 'space-between', overflow: 'hidden' }}>
          <View style={{ position: 'absolute', width: 500, height: 500, borderRadius: 250, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)', right: -180, top: -150 }} />
          <View style={{ position: 'absolute', width: 370, height: 370, borderRadius: 185, backgroundColor: 'rgba(248,184,200,0.10)', right: -50, bottom: -180 }} />
          <BrandMark logo={logo} name={settings?.orgName ?? t('app_name')} slogan={t('slogan')} light />
          <View style={{ maxWidth: 560, paddingVertical: 46 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 22 }}>
              <View style={{ width: 28, height: 2, backgroundColor: palette.affection }} />
              <Text style={{ color: palette.affection, textTransform: 'uppercase', letterSpacing: 2.4, fontSize: 11, fontWeight: '900' }}>{t('auth_community')}</Text>
            </View>
            <Text style={{ color: '#FFFFFF', fontSize: width > 1200 ? 47 : 40, lineHeight: width > 1200 ? 58 : 50, fontWeight: '900', letterSpacing: -1.5 }}>{t('auth_hero_title')}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.76)', fontSize: 16, lineHeight: 26, maxWidth: 460, marginTop: 19 }}>{t('auth_hero_text')}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 38, flexWrap: 'wrap' }}>
              <TrustPill label={t('auth_trust_one')} />
              <TrustPill label={t('auth_trust_two')} />
            </View>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.58)', fontSize: 11 }}>{t('auth_footer')}</Text>
        </View>
      ) : null}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingTop: desktop ? 28 : insets.top + 14, paddingBottom: insets.bottom + 28, paddingHorizontal: width < 560 ? 20 : 40 }} keyboardShouldPersistTaps="handled">
        {!desktop ? (
          <View style={{ alignItems: 'center', marginBottom: 26 }}>
            <BrandMark logo={logo} name={settings?.orgName ?? t('app_name')} slogan={t('slogan')} />
          </View>
        ) : null}
        <View style={{ width: '100%', maxWidth: 510, alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 20 }}>
            <PreferencePill label={lang === 'fr' ? 'FR' : 'EN'} onPress={() => setLang(lang === 'fr' ? 'en' : 'fr')} palette={palette} />
            <PreferencePill label={themeMode === 'dark' ? '☼' : '◐'} onPress={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')} palette={palette} />
          </View>
          <Animated.View style={{ opacity: entrance, transform: [{ translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
            <View style={{ backgroundColor: palette.surface, borderRadius: 28, borderWidth: 1, borderColor: palette.border, padding: width < 560 ? 23 : 34, shadowColor: palette.shadow, shadowOpacity: palette.mode === 'dark' ? 0 : 0.14, shadowRadius: 28, shadowOffset: { width: 0, height: 15 }, elevation: 5 }}>
              <Text style={{ color: palette.accent, fontSize: 10, fontWeight: '900', letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 10 }}>{eyebrow}</Text>
              <Text style={{ color: palette.text, fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.8 }}>{title}</Text>
              <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 22, marginTop: 8, marginBottom: 24 }}>{subtitle}</Text>
              {children}
              <View style={{ height: 1, backgroundColor: palette.border, marginTop: 22, marginBottom: 18 }} />
              {footer}
            </View>
          </Animated.View>
          <Text style={{ color: palette.muted, textAlign: 'center', fontSize: 11, marginTop: 20 }}>{t('auth_secure_note')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function BrandMark({ logo, name, slogan, light = false }: { logo?: string; name: string; slogan: string; light?: boolean }) {
  const { palette } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 13, alignSelf: light ? 'flex-start' : 'center' }}>
      <View style={{ width: 52, height: 52, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: light ? 'rgba(255,255,255,0.35)' : palette.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', shadowColor: '#000', shadowOpacity: light ? 0 : 0.08, shadowRadius: 8, elevation: 2 }}>
        {logo ? <Image source={{ uri: logo }} resizeMode="cover" style={{ width: 50, height: 50 }} /> : <Text style={{ fontSize: 27 }}>🤝</Text>}
      </View>
      <View style={{ maxWidth: 270 }}>
        <Text numberOfLines={1} style={{ color: light ? '#FFFFFF' : palette.text, fontSize: 14, fontWeight: '900' }}>{name}</Text>
        <Text numberOfLines={1} style={{ color: light ? 'rgba(255,255,255,0.68)' : palette.muted, fontSize: 11, marginTop: 3 }}>{slogan}</Text>
      </View>
    </View>
  );
}

function TrustPill({ label }: { label: string }) {
  return <View style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 9 }}><Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '700' }}>✓  {label}</Text></View>;
}

function PreferencePill({ label, onPress, palette }: { label: string; onPress: () => void; palette: ReturnType<typeof useApp>['palette'] }) {
  return <Pressable onPress={onPress} style={({ pressed }) => ({ width: 42, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, opacity: pressed ? 0.65 : 1 })}><Text style={{ color: palette.text, fontWeight: '800', fontSize: font.small }}>{label}</Text></Pressable>;
}
