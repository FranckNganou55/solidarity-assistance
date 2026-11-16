import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api, EventView, MemberView, TypeView } from '../../src/api';
import { EventCard } from '../../src/cards';
import { PERM } from '../../src/permissions';
import { useApp, useRefreshOnFocus, useResource } from '../../src/store';
import { Button, Chip, EmptyState, ErrorBox, Field, Header, Loading, Muted, Row, Screen, SelectField, Sheet, DateField } from '../../src/ui';
import { font, spacing } from '../../src/theme';

const FILTERS = [
  { key: '', labelKey: 'all' },
  { key: 'OPEN', labelKey: 'open' },
  { key: 'CLOSED', labelKey: 'closed' },
  { key: 'CANCELLED', labelKey: 'cancelled' },
];

export default function AssistancesScreen() {
  const { t, palette, can, toast } = useApp();
  const router = useRouter();
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);

  const eventsRes = useResource(() => api.events({ status: filter || undefined, q: search || undefined, size: 50 }), [filter, search]);
  const typesRes = useResource<TypeView[]>(() => api.types(true));
  // la liste des membres n'est utile qu'aux profils autorises a ouvrir une assistance
  const membersRes = useResource(
    () => (can(PERM.EVENT_CREATE) ? api.members({ size: 100 }) : Promise.resolve({ content: [], total: 0, page: 0, size: 0, totalPages: 0 } as any)),
  );

  useRefreshOnFocus(useCallback(() => { eventsRes.reload(); }, [eventsRes.reload]));

  const [typeId, setTypeId] = useState<number | null>(null);
  const [beneficiaryId, setBeneficiaryId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [target, setTarget] = useState('');
  const [overrideEligibility, setOverrideEligibility] = useState(false);
  const [saving, setSaving] = useState(false);

  const createEvent = async () => {
    if (!typeId || !beneficiaryId || !reason.trim()) { toast(t('required_fields'), 'error'); return; }
    setSaving(true);
    try {
      await api.createEvent({
        typeId, beneficiaryId, description: reason.trim(),
        closingDate: closingDate || null,
        targetAmount: target ? Number(target) : null,
        overrideEligibility,
      });
      toast(t('event_created'), 'success');
      setSheet(false);
      setReason(''); setClosingDate(''); setTarget(''); setTypeId(null); setBeneficiaryId(null); setOverrideEligibility(false);
      eventsRes.reload();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const events = eventsRes.data?.content ?? [];
  const members = (membersRes.data?.content ?? []).filter((m: MemberView) => m.active);

  return (
    <Screen refreshing={eventsRes.loading} onRefresh={eventsRes.reload}>
      <Header
        title={t('assistances_title')}
        subtitle={`${eventsRes.data?.totalElements ?? events.length} assistance(s)`}
        big
        right={can(PERM.EVENT_CREATE) ? <Button title={`+ ${t('new_event')}`} small onPress={() => setSheet(true)} /> : undefined}
      />

      <Field label="" value={search} onChangeText={setSearch} placeholder={`🔍 ${t('search_name_or_id')}`} />
      <Row gap={6} style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
        {FILTERS.map((f) => (
          <Chip key={f.key} label={t(f.labelKey)} active={filter === f.key} onPress={() => setFilter(f.key)} />
        ))}
      </Row>

      {eventsRes.error ? <ErrorBox message={eventsRes.error} onRetry={eventsRes.reload} /> : null}
      {eventsRes.loading && !eventsRes.data ? <Loading /> : null}
      {!eventsRes.loading && events.length === 0 ? <EmptyState icon="🤝" title={t('no_data')} /> : null}

      {events.map((event: EventView) => (
        <EventCard key={event.id} event={event} onPress={() => router.push(`/assistance/${event.id}`)} />
      ))}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={t('new_event')}
        footer={can(PERM.EVENT_CREATE) ? <Button title={t('create')} onPress={createEvent} loading={saving} /> : null}>
        <SelectField
          label={t('type')}
          value={typeId}
          onChange={setTypeId}
          placeholder={t('select_type')}
          options={(typesRes.data ?? []).map((ty) => ({ value: ty.id, label: `${ty.icon ?? ''} ${ty.name}` }))}
        />
        <SelectField
          label={t('beneficiary')}
          value={beneficiaryId}
          onChange={setBeneficiaryId}
          placeholder={t('select_member')}
          options={members.map((m: any) => ({ value: m.id, label: m.fullName, hint: `${m.phone} · cycle ${m.cycleContributions}/${m.requiredAssistances}` }))}
        />
        <Field label={t('reason')} value={reason} onChangeText={setReason} placeholder={t('request_reason_example')} multiline autoCapitalize="sentences" />
        <DateField label={t('optional_closing_date')} value={closingDate} onChange={setClosingDate} allowEmpty />
        <Field label={`${t('target')} (${t('optional')})`} value={target} onChangeText={setTarget} keyboardType="numeric" placeholder="150000" />
        {can(PERM.REQUEST_OVERRIDE_ELIGIBILITY) ? <Chip label={t('request_override_eligibility')} active={overrideEligibility} onPress={() => setOverrideEligibility((v) => !v)} /> : null}
        <Muted style={{ fontSize: font.tiny }}>
          ℹ️ {overrideEligibility ? t('exemption_recorded_hint') : t('eligibility_cycle_hint')}
        </Muted>
      </Sheet>
    </Screen>
  );
}
