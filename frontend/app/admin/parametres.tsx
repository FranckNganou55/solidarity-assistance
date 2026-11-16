import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { api, assetUrl, SettingsView } from '../../src/api';
import { Guard } from '../../src/guard';
import { PERM } from '../../src/permissions';
import { useApp, useResource } from '../../src/store';
import { pickAndUpload } from '../../src/upload';
import { Badge, Button, Card, Chip, ErrorBox, Field, Header, Loading, Muted, Row, Screen, SectionTitle } from '../../src/ui';
import { font, radius, spacing } from '../../src/theme';

export default function SettingsScreen() {
  return <Guard permission={PERM.SETTINGS_VIEW}><SettingsInner /></Guard>;
}

function SettingsInner() {
  const { t, palette, toast, can, reloadSettings, lang, setLang, themeMode, setThemeMode } = useApp();
  const router = useRouter();
  const settingsRes = useResource<SettingsView>(() => api.settings());
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settingsRes.data) setForm(settingsRes.data);
  }, [settingsRes.data]);

  const set = (key: string, value: any) => setForm((f: any) => ({ ...f, [key]: value }));

  const save = async () => {
    setSaving(true);
    try {
      await api.updateSettings({
        orgName: form.orgName,
        logoUrl: form.logoUrl,
        primaryColor: form.primaryColor,
        accentColor: form.accentColor,
        currency: form.currency,
        motto: form.motto,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail,
        minContributionsRequired: Math.max(0, Math.trunc(Number(form.minContributionsRequired ?? 0))),
        minContributionAmount: Math.max(0, Number(form.minContributionAmount ?? 0)),
        defaultLocale: form.defaultLocale,
        defaultTheme: form.defaultTheme,
        defaultPassword: form.defaultPassword,
      });
      toast(t('settings_saved'), 'success');
      await reloadSettings();
      settingsRes.reload();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const uploadLogo = async () => {
    try {
      const url = await pickAndUpload('logo');
      if (url) { set('logoUrl', url); toast(t('logo_updated'), 'success'); await reloadSettings(); }
    } catch (e: any) { toast(e.message, 'error'); }
  };

  if (settingsRes.loading && !settingsRes.data) return <Screen><Loading /></Screen>;
  if (settingsRes.error) return <Screen><ErrorBox message={settingsRes.error} onRetry={settingsRes.reload} /></Screen>;

  const ro = !can(PERM.SETTINGS_MANAGE);
  const logo = assetUrl(form.logoUrl);

  return (
    <Screen refreshing={settingsRes.loading} onRefresh={settingsRes.reload}>
      <Header title={t('settings_title')} onBack={() => router.back()} />

      <Card>
        <Row gap={spacing.md}>
          <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: form.primaryColor ?? palette.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {logo ? <Image source={{ uri: logo }} style={{ width: 64, height: 64, borderRadius: 16, backgroundColor: '#fff' }} resizeMode="contain" /> : <Text style={{ fontSize: 30 }}>🤝</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontWeight: '800' }}>{t('logo')}</Text>
            <Muted style={{ fontSize: font.tiny }}>{t('logo_formats_hint')}</Muted>
            <Button title={`📷 ${t('change_logo')}`} variant="outline" small onPress={uploadLogo} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} />
          </View>
        </Row>
      </Card>

      <SectionTitle>{t('settings_identity')}</SectionTitle>
      <Card>
        <Field label={t('org_name')} value={form.orgName ?? ''} onChangeText={(v) => set('orgName', v)} editable={!ro} autoCapitalize="words" />
        <Field label={t('motto')} value={form.motto ?? ''} onChangeText={(v) => set('motto', v)} editable={!ro} autoCapitalize="sentences" />
        <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
          <View style={{ flex: 1 }}><Field label={t('contact_phone')} value={form.contactPhone ?? ''} onChangeText={(v) => set('contactPhone', v)} editable={!ro} keyboardType="phone-pad" /></View>
          <View style={{ flex: 1 }}><Field label={t('currency')} value={form.currency ?? ''} onChangeText={(v) => set('currency', v)} editable={!ro} /></View>
        </Row>
        <Field label={t('contact_email')} value={form.contactEmail ?? ''} onChangeText={(v) => set('contactEmail', v)} editable={!ro} keyboardType="email-address" />
      </Card>

      <SectionTitle>{t('settings_colors')}</SectionTitle>
      <Card>
        <Row gap={spacing.md}>
          <View style={{ flex: 1 }}>
            <Field label={t('primary_color')} value={form.primaryColor ?? ''} onChangeText={(v) => set('primaryColor', v)} editable={!ro} />
          </View>
          <Pressable onPress={() => {}} style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: form.primaryColor ?? palette.primary, marginTop: 22 }} />
        </Row>
        <Row gap={spacing.md}>
          <View style={{ flex: 1 }}>
            <Field label={t('accent_color')} value={form.accentColor ?? ''} onChangeText={(v) => set('accentColor', v)} editable={!ro} />
          </View>
          <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: form.accentColor ?? palette.accent, marginTop: 22 }} />
        </Row>
        <Muted style={{ fontSize: font.tiny }}>{t('settings_colors_hint')}</Muted>
      </Card>

      <SectionTitle>{t('solidarity_rules')}</SectionTitle>
      <Card>
        <Field label={t('min_contributions')} value={String(form.minContributionsRequired ?? 0)} onChangeText={(v) => set('minContributionsRequired', v.replace(/[^0-9]/g, ''))} keyboardType="numeric" editable={!ro} placeholder="0" />
        <Muted style={{ fontSize: font.tiny, marginTop: -6 }}>{t('zero_assistance_hint')}</Muted>
        <Field label={t('minimum_contribution_amount')} value={String(form.minContributionAmount ?? 0)} onChangeText={(v) => set('minContributionAmount', v.replace(/\D/g, ''))} keyboardType="numeric" editable={!ro} placeholder="0" />
        <Muted style={{ fontSize: font.tiny, marginTop: -6 }}>{t('zero_contribution_hint')}</Muted>
        <Field label={`${t('default_password')}`} value={form.defaultPassword ?? ''} onChangeText={(v) => set('defaultPassword', v)} editable={!ro} />
        <Muted style={{ fontSize: font.tiny, marginTop: -6 }}>{t('default_password_hint')}</Muted>
      </Card>

      <SectionTitle>{t('default_preferences')}</SectionTitle>
      <Card>
        <Muted style={{ fontWeight: '700', marginBottom: spacing.sm }}>{t('default_locale')}</Muted>
        <Row gap={6} style={{ marginBottom: spacing.md }}>
          <Chip label={t('french_flag')} active={form.defaultLocale === 'fr'} onPress={() => !ro && set('defaultLocale', 'fr')} />
          <Chip label={t('english_flag')} active={form.defaultLocale === 'en'} onPress={() => !ro && set('defaultLocale', 'en')} />
        </Row>
        <Muted style={{ fontWeight: '700', marginBottom: spacing.sm }}>{t('default_theme')}</Muted>
        <Row gap={6}>
          <Chip label={`☀️ ${t('theme_light')}`} active={form.defaultTheme === 'light'} onPress={() => !ro && set('defaultTheme', 'light')} />
          <Chip label={`🌙 ${t('theme_dark')}`} active={form.defaultTheme === 'dark'} onPress={() => !ro && set('defaultTheme', 'dark')} />
        </Row>
      </Card>

      <SectionTitle>{t('my_preference')}</SectionTitle>
      <Card>
        <Row gap={6} style={{ marginBottom: spacing.sm }}>
          <Chip label={t('french_flag')} active={lang === 'fr'} onPress={() => setLang('fr')} />
          <Chip label={t('english_flag')} active={lang === 'en'} onPress={() => setLang('en')} />
        </Row>
        <Row gap={6}>
          <Chip label={`☀️ ${t('theme_light')}`} active={themeMode === 'light'} onPress={() => setThemeMode('light')} />
          <Chip label={`🌙 ${t('theme_dark')}`} active={themeMode === 'dark'} onPress={() => setThemeMode('dark')} />
        </Row>
      </Card>

      {!ro ? <Button title={t('save')} onPress={save} loading={saving} style={{ marginTop: spacing.lg }} /> : null}
      <View style={{ height: spacing.xxl }} />
    </Screen>
  );
}
