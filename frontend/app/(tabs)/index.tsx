import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { api } from '../../src/api';
import { useApp, useRefreshOnFocus, useResource } from '../../src/store';
import { Avatar, Badge, Card, Header, Muted, Row, Screen, SectionTitle, StatTile } from '../../src/ui';
import { font, spacing } from '../../src/theme';
import { formatMoney } from '../../src/utils';
import { PERM } from '../../src/permissions';

export default function HomeScreen() {
  const { t, palette, member, lang, settings, can, refreshMe } = useApp();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const currency = settings?.currency ?? 'FCFA';

  const statsRes = useResource<Record<string, any>>(() => api.dashboard());

  useRefreshOnFocus(useCallback(() => {
    refreshMe();
    statsRes.reload();
  }, [statsRes.reload, refreshMe]));
  const groupAdministrator = !!(member?.superAdmin || member?.groupAdmin);

  return (
    <Screen refreshing={statsRes.loading} onRefresh={() => { statsRes.reload(); refreshMe(); }}>
      <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Muted>{t('hello')} 👋</Muted>
          <Text style={{ color: palette.text, fontSize: font.h1, fontWeight: '900', letterSpacing: -0.5 }} numberOfLines={1}>
            {member?.firstName ?? ''} {member?.lastName ?? ''}
          </Text>
          <Row gap={6} style={{ marginTop: 6 }}>
            <Badge label={member?.superAdmin ? t('system_admin') : member?.groupAdmin ? t('principal_admin') : member?.roleName ?? ''} tone="primary" />
            <Badge label={member?.quarter ? `${member.city} · ${member.quarter}` : member?.city ?? ''} />
          </Row>
        </View>
        <Pressable onPress={() => router.push('/(tabs)/profil')}>
          <Avatar name={member?.fullName} uri={member?.photoUrl} size={52} shape={member?.photoShape} />
        </Pressable>
      </Row>

      {groupAdministrator && can(PERM.REPORT_VIEW) && statsRes.data ? (
        <>
          <SectionTitle>{t('group_overview')}</SectionTitle>
          <Row gap={spacing.sm}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/admin/membres')} style={{ flex: 1 }}><StatTile label={t('stat_members')} value={statsRes.data.members ?? 0} icon="👥" /></Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push('/evenements')} style={{ flex: 1 }}><StatTile label={t('completed_assistances')} value={statsRes.data.completedEvents ?? statsRes.data.closedEvents ?? 0} icon="🤝" tone="accent" /></Pressable>
          </Row>
          <Row gap={spacing.sm} style={{ marginTop: spacing.sm }}>
            <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/cotisations')} style={{ flex: 1 }}><StatTile label={t('stat_collected')} value={formatMoney(statsRes.data.totalCollected ?? 0, currency, lang)} icon="💰" /></Pressable>
            <Pressable accessibilityRole="button" onPress={() => router.push('/evenements')} style={{ flex: 1 }}><StatTile label={t('stat_open')} value={statsRes.data.openEvents ?? 0} icon="📂" tone="accent" /></Pressable>
          </Row>
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: spacing.sm, alignItems: 'stretch' }}>
            <MonthlyBars style={{ flex: 1, minWidth: 0 }} title={t('contribution_chart')} points={statsRes.data.monthlyContributions ?? []} format={(value) => formatMoney(value, currency, lang)} />
            <MonthlyBars style={{ flex: 1, minWidth: 0 }} title={t('assistance_chart')} points={statsRes.data.monthlyAssistances ?? []} format={(value) => String(Math.round(value))} />
          </View>
        </>
      ) : null}

      {can(PERM.CONTRIBUTION_VALIDATE) && (statsRes.data?.pendingContributions ?? 0) > 0 ? (
        <Card onPress={() => router.push({ pathname: '/(tabs)/cotisations', params: { tab: 'pending' } })} style={{ marginTop: spacing.md, borderColor: palette.accent, backgroundColor: palette.accentSoft }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: palette.text, fontWeight: '800' }}>⏳ {t('stat_pending')}</Text>
              <Muted>{statsRes.data?.pendingContributions} {t('cotisations_waiting_validation')}</Muted>
            </View>
            <Text style={{ color: palette.primary, fontWeight: '800' }}>{t('to_process')} →</Text>
          </Row>
        </Card>
      ) : null}

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

function MonthlyBars({ title, points, format, style }: { title: string; points: { period: string; value: number | string }[]; format: (value: number) => string; style?: any }) {
  const { palette } = useApp();
  const values = points.map((point) => Number(point.value) || 0);
  const max = Math.max(...values, 1);
  const cardStyle = { marginTop: spacing.md, padding: spacing.md, minHeight: 168, ...(style ?? {}) };
  return <Card style={cardStyle}>
    <Text style={{ color: palette.text, fontSize: font.small, fontWeight: '800', marginBottom: spacing.sm }} numberOfLines={1}>{title}</Text>
    <Row style={{ alignItems: 'flex-end', height: 116, gap: spacing.xs }}>
      {points.map((point, index) => {
        const value = values[index];
        const height = Math.max(4, (value / max) * 68);
        return <View key={point.period} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
          <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 9, marginBottom: 4 }}>{format(value)}</Text>
          <View style={{ width: '72%', height, minHeight: 4, borderRadius: 6, backgroundColor: palette.primary }} />
          <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 9, marginTop: 6 }}>{point.period}</Text>
        </View>;
      })}
    </Row>
  </Card>;
}
