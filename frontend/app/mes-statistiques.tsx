import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api, MeSummary } from '../src/api';
import { useApp, useRefreshOnFocus, useResource } from '../src/store';
import { Button, Card, Header, Loading, Muted, Row, Screen, SectionTitle, StatTile } from '../src/ui';
import { font, radius, spacing } from '../src/theme';
import { formatMoney } from '../src/utils';
import { PERM } from '../src/permissions';

export default function MyStatisticsScreen() {
  const { t, palette, lang, settings, member, can, toast } = useApp();
  const router = useRouter();
  const summary = useResource<MeSummary>(() => api.mySummary());
  useRefreshOnFocus(useCallback(() => summary.reload(), [summary.reload]));
  const data = summary.data;
  const currency = settings?.currency ?? 'FCFA';
  const cycle = data?.cycleContributions ?? member?.cycleContributions ?? 0;
  const required = data?.requiredAssistances ?? member?.requiredAssistances ?? 0;
  const eligible = data?.eligible ?? cycle >= required;
  return <Screen refreshing={summary.loading} onRefresh={summary.reload}>
    <Header title={t('my_stats')} onBack={() => router.back()} big />
    {!data && summary.loading ? <Loading /> : null}
    <Card>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={{ color: palette.primary, fontSize: font.small, fontWeight: '700' }}>{t('your_cycle')}</Text>
        <Text style={{ color: palette.primary, fontSize: font.small, fontWeight: '800' }}>{cycle}/{required}</Text>
      </Row>
      <View style={{ marginTop: spacing.sm }}><View style={{ height: 10, backgroundColor: palette.border, borderRadius: radius.pill, overflow: 'hidden' }}>
        <View style={{ width: `${required === 0 ? 100 : Math.min(100, (cycle / required) * 100)}%`, height: '100%', backgroundColor: palette.primary, borderRadius: radius.pill }} />
      </View></View>
      <Text style={{ color: palette.text, fontWeight: '800', fontSize: font.h3, marginTop: spacing.md }}>{eligible ? `🎉 ${t('eligible')}` : t('not_eligible', { n: Math.max(0, required - cycle) })}</Text>
      <Muted style={{ marginTop: spacing.xs }}>{cycle} {t('cycle_text')} {required}</Muted>
      <Row style={{ gap: spacing.sm, marginTop: spacing.md }}>
        {can(PERM.CONTRIBUTION_SUBMIT) ? <Button title={t('tab_events')} variant="accent" small onPress={() => router.push('/evenements')} style={{ flex: 1 }} /> : null}
        {can(PERM.REQUEST_CREATE) ? <Button title={t('request_help')} small onPress={() => {
          if (!eligible) { toast(t('request_blocked', { n: Math.max(0, required - cycle) }), 'error'); return; }
          router.push('/(tabs)/demandes');
        }} style={{ flex: 1 }} /> : null}
      </Row>
    </Card>
    <SectionTitle>{t('my_stats')}</SectionTitle>
    <Row gap={spacing.sm}>
      <View style={{ flex: 1 }}><StatTile label={t('total_contributions')} value={data?.totalContributions ?? 0} icon="✅" /></View>
      <View style={{ flex: 1 }}><StatTile label={t('total_amount')} value={formatMoney(data?.totalContributedAmount ?? 0, currency, lang)} icon="💰" tone="accent" /></View>
    </Row>
    <Row gap={spacing.sm} style={{ marginTop: spacing.sm }}>
      <View style={{ flex: 1 }}><StatTile label={t('pending')} value={data?.pendingContributions ?? 0} icon="⏳" tone="danger" /></View>
      <View style={{ flex: 1 }}><StatTile label={t('my_requests')} value={data?.myRequests ?? 0} icon="📩" /></View>
    </Row>
    <View style={{ height: spacing.xl }} />
  </Screen>;
}
