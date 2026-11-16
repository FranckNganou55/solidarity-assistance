import React, { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { api, EventView } from '../src/api';
import { useApp, useRefreshOnFocus, useResource } from '../src/store';
import { Badge, Card, EmptyState, ErrorBox, Field, Header, Loading, Muted, Row, Screen } from '../src/ui';
import { font, spacing } from '../src/theme';
import { formatDate } from '../src/utils';

export default function EventsScreen() {
  const { t } = useApp();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const resource = useResource(() => api.events({ status: 'OPEN', q: search || undefined, size: 100 }), [search]);
  useRefreshOnFocus(useCallback(() => resource.reload(), [resource.reload]));
  const events: EventView[] = (resource.data?.content ?? []).filter((event: EventView) => event.status === 'OPEN' && event.contributionsOpen);
  return <Screen refreshing={resource.loading} onRefresh={resource.reload}>
    <Header title={t('tab_events')} big />
    <Field label="" value={search} onChangeText={setSearch} placeholder={`🔍 ${t('search_name_or_id')}`} />
    {resource.error ? <ErrorBox message={resource.error} onRetry={resource.reload} /> : null}
    {resource.loading && !resource.data ? <Loading /> : null}
    {!resource.loading && events.length === 0 ? <EmptyState icon="🗓️" title={t('no_events')} /> : null}
    {events.map((event) => <OpenEventCard key={event.id} event={event} onPress={() => router.push(`/assistance/${event.id}` as any)} />)}
  </Screen>;
}

function OpenEventCard({ event, onPress }: { event: EventView; onPress: () => void }) {
  const { t, palette, lang } = useApp();
  return <Card onPress={onPress} style={{ marginBottom: spacing.md }}>
    <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }}>
      <Row gap={spacing.sm} style={{ flex: 1, minWidth: 0 }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{event.typeIcon ?? '🤝'}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ color: palette.text, fontSize: font.body, fontWeight: '800' }}>{event.typeName} · {event.beneficiaryName}</Text>
          <Muted numberOfLines={2} style={{ marginTop: 3 }}>{event.description}</Muted>
        </View>
      </Row>
      <Badge label={t('status_open')} tone="success" />
    </Row>
    <Row style={{ justifyContent: 'space-between', marginTop: spacing.md }}>
      <Muted style={{ fontSize: font.tiny }}>{t('closing_date')} · {event.closingDate ? formatDate(event.closingDate, lang) : t('no_deadline')}</Muted>
      <Text style={{ color: palette.primary, fontSize: font.small, fontWeight: '800' }}>{t('contribute')} →</Text>
    </Row>
  </Card>;
}
