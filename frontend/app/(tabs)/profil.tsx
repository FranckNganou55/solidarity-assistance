import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { assetUrl } from '../../src/api';
import { PERM } from '../../src/permissions';
import { useApp } from '../../src/store';
import { Avatar, Badge, Button, Card, Chip, Divider, Header, Muted, Progress, Row, Screen, SectionTitle } from '../../src/ui';
import { font, radius, spacing } from '../../src/theme';
import { formatDate } from '../../src/utils';

export default function ProfileScreen() {
  const { t, palette, member, logout, lang, setLang, themeMode, setThemeMode, can, settings, reloadSettings } = useApp();
  const router = useRouter();

  const adminItems = [
    { perm: PERM.MEMBER_VIEW, icon: '👥', label: t('members'), route: '/admin/membres' },
    { perm: PERM.ROLE_VIEW, icon: '🔐', label: t('roles'), route: '/admin/roles' },
    { perm: PERM.ASSISTANCE_TYPE_VIEW, icon: '🏷️', label: t('types'), route: '/admin/types' },
    { perm: PERM.SETTINGS_VIEW, icon: '⚙️', label: t('settings'), route: '/admin/parametres' },
    { perm: PERM.AUDIT_VIEW, icon: '🧾', label: t('audit'), route: '/admin/audit' },
  ].filter((item) => can(item.perm));

  return (
    <Screen>
      <Header title={t('tab_profile')} big />

      <Card>
        <Row gap={spacing.md}>
          <Avatar name={member?.fullName} uri={member?.photoUrl} size={64} shape={member?.photoShape} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontWeight: '900', fontSize: font.h3 }}>{member?.fullName}</Text>
            <Muted>{member?.phone}</Muted>
            <Row gap={6} style={{ marginTop: 6 }}>
              <Badge label={member?.superAdmin ? t('system_admin') : member?.groupAdmin ? t('principal_admin') : member?.roleName ?? ''} tone="primary" />
              {member?.active ? <Badge label={t('active')} tone="success" /> : <Badge label={t('inactive')} tone="danger" />}
            </Row>
          </View>
        </Row>

        <Divider />

        <Row style={{ justifyContent: 'space-between' }}>
          <Muted>{t('city')}</Muted>
          <Text style={{ color: palette.text, fontWeight: '600', fontSize: font.small }}>{member?.city}{member?.quarter ? ` · ${member.quarter}` : ''}</Text>
        </Row>
        {member?.email ? (
          <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
            <Muted>{t('email')}</Muted>
            <Text style={{ color: palette.text, fontWeight: '600', fontSize: font.small }}>{member.email}</Text>
          </Row>
        ) : null}
        <Row style={{ justifyContent: 'space-between', marginTop: 6 }}>
          <Muted>{t('tab_requests')}</Muted>
          <Text style={{ color: palette.text, fontWeight: '600', fontSize: font.small }}>{t('cycle')} {member?.cycleContributions}/{member?.requiredAssistances}</Text>
        </Row>
        <View style={{ marginTop: spacing.sm }}>
          <Progress value={member?.cycleContributions ?? 0} max={member?.requiredAssistances ?? 1} />
        </View>
      </Card>

      <SectionTitle>{t('language')} & {t('theme')}</SectionTitle>
      <Card>
        <Muted style={{ marginBottom: spacing.sm, fontWeight: '700' }}>{t('language')}</Muted>
        <Row gap={6}>
          <Chip label={t('french_flag')} active={lang === 'fr'} onPress={() => setLang('fr')} />
          <Chip label={t('english_flag')} active={lang === 'en'} onPress={() => setLang('en')} />
        </Row>
        <Muted style={{ margin: spacing.sm, marginLeft: 0, fontWeight: '700' }}>{t('theme')}</Muted>
        <Row gap={6}>
          <Chip label={`☀️ ${t('theme_light')}`} active={themeMode === 'light'} onPress={() => setThemeMode('light')} />
          <Chip label={`🌙 ${t('theme_dark')}`} active={themeMode === 'dark'} onPress={() => setThemeMode('dark')} />
        </Row>
      </Card>

      {adminItems.length > 0 ? (
        <>
          <SectionTitle>{t('admin_space')}</SectionTitle>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {adminItems.map((item, index) => (
              <Pressable
                key={item.route}
                onPress={() => router.push(item.route as any)}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg,
                  borderTopWidth: index === 0 ? 0 : 1, borderTopColor: palette.border,
                  backgroundColor: pressed ? palette.surfaceAlt : 'transparent',
                })}
              >
                <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                <Text style={{ flex: 1, color: palette.text, fontWeight: '700', fontSize: font.body }}>{item.label}</Text>
                <Text style={{ color: palette.muted }}>›</Text>
              </Pressable>
            ))}
          </Card>
        </>
      ) : null}

      <SectionTitle>{t('account')}</SectionTitle>
      <Card>
        <Button title={`🔒 ${t('change_password')}`} variant="outline" small onPress={() => router.push('/change-password')} style={{ marginBottom: spacing.sm }} />
        <Button title={`↩︎ ${t('logout')}`} variant="danger" small onPress={async () => { await logout(); router.replace('/login'); }} />
        <Muted style={{ marginTop: spacing.md, textAlign: 'center', fontSize: font.tiny }}>
          {settings?.orgName ?? t('app_name')} · {t('slogan')}
          {member?.createdAt ? `\n${t('member_since', { date: formatDate(member.createdAt, lang) })}` : ''}
        </Muted>
      </Card>

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
