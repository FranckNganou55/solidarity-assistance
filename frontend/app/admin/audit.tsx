import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { api, AuditEntry } from '../../src/api';
import { Guard } from '../../src/guard';
import { PERM } from '../../src/permissions';
import { useApp, useResource } from '../../src/store';
import { Badge, Card, EmptyState, ErrorBox, Header, Loading, Muted, Row, Screen } from '../../src/ui';
import { font, spacing } from '../../src/theme';
import { formatDateTime } from '../../src/utils';

export default function AuditScreen() {
  return <Guard permission={PERM.AUDIT_VIEW}><AuditInner /></Guard>;
}

function AuditInner() {
  const { t, palette, lang } = useApp();
  const router = useRouter();
  const auditRes = useResource(() => api.audit());
  const entries = auditRes.data?.content ?? [];

  return (
    <Screen refreshing={auditRes.loading} onRefresh={auditRes.reload}>
      <Header title={t('audit_title')} subtitle={t('audit_entries_count', { n: auditRes.data?.totalElements ?? 0 })} onBack={() => router.back()} />

      {auditRes.error ? <ErrorBox message={auditRes.error} onRetry={auditRes.reload} /> : null}
      {auditRes.loading && !auditRes.data ? <Loading /> : null}
      {!auditRes.loading && entries.length === 0 ? <EmptyState icon="🧾" title={t('no_data')} /> : null}

      {entries.map((entry: AuditEntry) => (
        <Card key={entry.id} style={{ marginBottom: spacing.xs, padding: spacing.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Badge label={entry.action} tone="primary" />
            <Muted style={{ fontSize: font.tiny }}>{formatDateTime(entry.createdAt, lang)}</Muted>
          </Row>
          <Text style={{ color: palette.text, fontSize: font.small, marginTop: 6 }}>{entry.details}</Text>
          <Muted style={{ fontSize: font.tiny, marginTop: 2 }}>
            {entry.actorName ?? '—'} {entry.entityType ? `· ${entry.entityType} #${entry.entityId ?? ''}` : ''}
          </Muted>
        </Card>
      ))}

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
