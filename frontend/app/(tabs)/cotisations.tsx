import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Platform, Pressable, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api, assetUrl, ContributionView, EventParticipantView, EventView } from '../../src/api';
import { ContributionRow } from '../../src/cards';
import { VerifyContributionSheet } from '../../src/verify-contribution';
import { PERM } from '../../src/permissions';
import { useApp, useRefreshOnFocus, useResource } from '../../src/store';
import { Avatar, Badge, Button, Card, Chip, EmptyState, ErrorBox, Field, Header, Loading, Muted, Row, Screen, SelectField, Sheet, StatTile } from '../../src/ui';
import { font, spacing } from '../../src/theme';
import { formatMoney } from '../../src/utils';
import { matchesPersonSearch } from '../../src/utils';
import { pickAndUpload } from '../../src/upload';

export default function ContributionsScreen() {
  const { t, palette, can, toast, lang, settings } = useApp();
  const router = useRouter();
  const currency = settings?.currency ?? 'FCFA';
  const { tab: requestedTab } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<'members' | 'mine' | 'pending' | 'validated'>(() => requestedTab === 'pending' ? 'pending' : 'members');
  const [search, setSearch] = useState('');
  useEffect(() => {
    setTab(requestedTab === 'pending' ? 'pending' : 'members');
  }, [requestedTab]);

  const eventsRes = useResource(() => api.events({ size: 100 }), []);
  const events: EventView[] = eventsRes.data?.content ?? [];
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  useEffect(() => {
    if (events.length === 0) { setSelectedEventId(null); return; }
    if (selectedEventId == null || !events.some((event) => event.id === selectedEventId)) {
      const firstOpen = events.find((event) => event.status === 'OPEN' && event.contributionsOpen);
      setSelectedEventId((firstOpen ?? events[0]).id);
    }
  }, [events, selectedEventId]);
  const participantsRes = useResource<EventParticipantView[]>(
    () => selectedEventId == null ? Promise.resolve([]) : api.eventParticipants(selectedEventId),
    [selectedEventId],
  );

  const mineRes = useResource<ContributionView[]>(() => api.myContributions());
  const pendingRes = useResource<ContributionView[]>(() => (can(PERM.CONTRIBUTION_VALIDATE) ? api.pendingContributions() : Promise.resolve([])));
  const validatedRes = useResource<ContributionView[]>(() => (can(PERM.CONTRIBUTION_VALIDATE) ? api.validatedContributions() : Promise.resolve([])));

  useRefreshOnFocus(useCallback(() => { mineRes.reload(); pendingRes.reload(); validatedRes.reload(); eventsRes.reload(); participantsRes.reload(); }, [mineRes.reload, pendingRes.reload, validatedRes.reload, eventsRes.reload, participantsRes.reload]));

  const [busy, setBusy] = useState<number | null>(null);
  /** cotisation ouverte dans la feuille de verification (perception de l'argent) */
  const [verifying, setVerifying] = useState<ContributionView | null>(null);
  const [editing, setEditing] = useState<ContributionView | null>(null);
  const [editAmount, setEditAmount] = useState('0');
  const [editMethod, setEditMethod] = useState('CASH');
  const [editNote, setEditNote] = useState('');
  const [editProof, setEditProof] = useState('');
  const [editProofShape, setEditProofShape] = useState<'CIRCLE' | 'SQUARE'>('SQUARE');
  const [savingEdit, setSavingEdit] = useState(false);
  const [uploading, setUploading] = useState(false);
  const reject = async (c: ContributionView) => {
    setBusy(c.id);
    try {
      await api.rejectContribution(c.id, t('contribution_rejected_by_treasurer'));
      toast(t('rejection_done'), 'error');
      pendingRes.reload(); mineRes.reload(); participantsRes.reload();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(null); }
  };

  const invalidate = async (c: ContributionView) => {
    const run = async () => {
      setBusy(c.id);
      try {
        await api.invalidateContribution(c.id, t('contribution_validation_cancelled'));
        toast(t('invalidated'), 'success');
        validatedRes.reload(); pendingRes.reload(); mineRes.reload(); participantsRes.reload();
      } catch (e: any) { toast(e.message, 'error'); }
      finally { setBusy(null); }
    };
    if (Platform.OS === 'web') { if (window.confirm(t('invalidation_confirm'))) await run(); }
    else Alert.alert(t('invalidate_validation'), t('invalidation_confirm'), [{ text: t('cancel'), style: 'cancel' }, { text: t('confirm'), style: 'destructive', onPress: run }]);
  };

  const openEdit = (c: ContributionView) => {
    setEditing(c); setEditAmount(String(c.amount)); setEditMethod(c.method); setEditNote(c.note ?? '');
    setEditProof(c.proofPhotoUrl ?? ''); setEditProofShape(c.proofPhotoShape ?? 'SQUARE');
  };

  const saveCorrection = async () => {
    if (!editing) return;
    if (!editProof) { toast(t('add_contribution_proof_before_resubmit'), 'error'); return; }
    if (Number(editAmount) < Math.max(1, Number(settings?.minContributionAmount ?? 0))) {
      toast(t('contribution_minimum_error', { amount: formatMoney(Math.max(1, Number(settings?.minContributionAmount ?? 0)), currency, lang) }), 'error'); return;
    }
    setSavingEdit(true);
    try {
      await api.editInvalidatedContribution(editing.id, { amount: Number(editAmount), method: editMethod, note: editNote || undefined, proofPhotoUrl: editProof, proofPhotoShape: editProofShape });
      toast(t('success'), 'success'); setEditing(null); pendingRes.reload(); validatedRes.reload(); mineRes.reload(); participantsRes.reload();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSavingEdit(false); }
  };

  const mine = mineRes.data ?? [];
  const validated = mine.filter((c) => c.status === 'VALIDATED');
  const pending = pendingRes.data ?? [];
  const validatedList = validatedRes.data ?? [];
  const sourceList = tab === 'mine' ? mine : tab === 'pending' ? pending : validatedList;
  const list = sourceList.filter((c) => matchesPersonSearch(search, c.memberName, c.memberPhone, c.memberId));
  const participants = (participantsRes.data ?? []).filter((p) => matchesPersonSearch(search, p.memberName, p.phone, p.memberId));
  const loading = tab === 'members' ? eventsRes.loading || participantsRes.loading : tab === 'mine' ? mineRes.loading : tab === 'pending' ? pendingRes.loading : validatedRes.loading;

  return (
    <Screen refreshing={loading} onRefresh={() => { mineRes.reload(); pendingRes.reload(); validatedRes.reload(); eventsRes.reload(); participantsRes.reload(); }}>
      <Header title={t('tab_contributions')} big />

      <Row gap={spacing.sm}>
        <StatTile label={t('validated')} value={validated.length} icon="✅" />
        <StatTile label={t('total_amount')} value={formatMoney(validated.reduce((s, c) => s + Number(c.amount), 0), currency, lang)} icon="💰" tone="accent" />
      </Row>

      {can(PERM.CONTRIBUTION_VALIDATE) ? (
        <Row gap={6} style={{ marginTop: spacing.lg, marginBottom: spacing.md, flexWrap: 'wrap' }}>
          <Chip label={t('group_members')} active={tab === 'members'} onPress={() => setTab('members')} />
          <Chip label={t('my_requests_tab')} active={tab === 'mine'} onPress={() => setTab('mine')} />
          <Chip label={`${t('to_process')} (${pending.length})`} active={tab === 'pending'} onPress={() => setTab('pending')} />
          <Chip label={`${t('validated_tab')} (${validatedList.length})`} active={tab === 'validated'} onPress={() => setTab('validated')} />
        </Row>
      ) : <Row gap={6} style={{ marginTop: spacing.lg, marginBottom: spacing.md, flexWrap: 'wrap' }}>
        <Chip label={t('group_members')} active={tab === 'members'} onPress={() => setTab('members')} />
        <Chip label={t('my_requests_tab')} active={tab === 'mine'} onPress={() => setTab('mine')} />
      </Row>}

      <Field label="" value={search} onChangeText={setSearch} placeholder={`🔍 ${t('search_name_or_id')}`} />

      {tab === 'members' ? (
        <>
          {eventsRes.error ? <ErrorBox message={eventsRes.error} onRetry={eventsRes.reload} /> : null}
          {events.length > 0 ? <SelectField
            label={t('tab_events')}
            value={selectedEventId}
            onChange={setSelectedEventId}
            placeholder={t('no_events')}
            options={events.map((event) => ({ value: event.id, label: `${event.reference} · ${event.typeName} · ${event.beneficiaryName}`, hint: `${event.status === 'OPEN' ? t('status_open') : event.status === 'CLOSED' ? t('status_closed') : t('status_cancelled')} · ${event.contributionCount} ${t('participants')}` }))}
          /> : null}
          {selectedEventId != null ? <Button title={`↗ ${t('open_assistance')}`} variant="outline" small onPress={() => router.push(`/assistance/${selectedEventId}`)} style={{ alignSelf: 'flex-start', marginBottom: spacing.md }} /> : null}
          {participantsRes.error ? <ErrorBox message={participantsRes.error} onRetry={participantsRes.reload} /> : null}
          {loading ? <Loading /> : null}
          {!eventsRes.loading && events.length === 0 ? <EmptyState icon="🗓️" title={t('no_events')} /> : null}
          {!loading && events.length > 0 && participants.length === 0 ? <EmptyState icon="👥" title={t('no_members')} /> : null}
          {participants.map((participant) => {
            const contribution = participant.contribution;
            const activeEvent = events.find((event) => event.id === selectedEventId);
            const statusLabel = contribution?.status === 'VALIDATED' ? t('validated')
              : contribution?.status === 'PENDING' ? t('pending_validation')
              : contribution?.status === 'REJECTED' ? t('rejected')
              : contribution?.status === 'INVALIDATED' ? t('invalidated')
              : activeEvent?.status === 'OPEN' && activeEvent.contributionsOpen ? t('participants_pending') : t('no_contribution_status');
            const tone = contribution?.status === 'VALIDATED' ? 'success'
              : contribution?.status === 'PENDING' ? 'warning'
              : contribution?.status === 'REJECTED' || contribution?.status === 'INVALIDATED' ? 'danger' : 'neutral';
            return <Card key={participant.memberId} style={{ marginBottom: spacing.sm, padding: spacing.md }}>
              <Pressable onPress={() => selectedEventId != null && router.push(`/assistance/${selectedEventId}`)} accessibilityRole="button" accessibilityLabel={t('open_assistance')}>
              <Row style={{ justifyContent: 'space-between', gap: spacing.sm }}>
                <Row gap={spacing.sm} style={{ flex: 1, minWidth: 0 }}>
                  <Avatar name={participant.memberName} uri={participant.photoUrl} size={42} shape={participant.photoShape} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={{ color: palette.text, fontWeight: '800' }}>{participant.memberName}</Text>
                    <Muted style={{ fontSize: font.tiny }}>{participant.phone}</Muted>
                  </View>
                </Row>
                <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
                  <Text style={{ color: palette.text, fontWeight: '800', fontSize: font.small }}>{formatMoney(contribution?.amount ?? 0, currency, lang)}</Text>
                  <Badge label={statusLabel} tone={tone} />
                </View>
              </Row>
              </Pressable>
              {contribution?.status === 'VALIDATED' && can(PERM.CONTRIBUTION_VALIDATE) ? (
                <View style={{ marginTop: spacing.sm, alignSelf: 'flex-end' }}>
                  <Chip label={`↶ ${t('invalidate_validation')}`} onPress={() => invalidate(contribution)} />
                </View>
              ) : null}
            </Card>;
          })}
        </>
      ) : tab !== 'mine' ? (
        <>
          {tab === 'pending' && pendingRes.error ? <ErrorBox message={pendingRes.error} onRetry={pendingRes.reload} /> : null}
          {tab === 'validated' && validatedRes.error ? <ErrorBox message={validatedRes.error} onRetry={validatedRes.reload} /> : null}
          {loading && !list.length ? <Loading /> : null}
          {!loading && list.length === 0 ? <EmptyState icon={tab === 'validated' ? '✅' : '🎉'} title={t('no_contributions')} /> : null}
          {list.map((c) => (
            <ContributionRow
              key={c.id}
              contribution={c}
              showMember
              onPress={() => router.push(`/assistance/${c.eventId}`)}
              actions={tab === 'validated' ? (
                <Chip label={`↶ ${t('invalidate_validation')}`} onPress={() => invalidate(c)} />
              ) : c.status === 'INVALIDATED' ? (
                <Chip label={`✎ ${t('edit_invalidated')}`} onPress={() => openEdit(c)} />
              ) : (
                <>
                  <Chip label={`🔎 ${t('verify_contribution')}`} onPress={() => setVerifying(c)} />
                  <Chip label={`✖ ${t('reject')}`} onPress={() => reject(c)} />
                </>
              )}
            />
          ))}
        </>
      ) : (
        <>
          {mineRes.error ? <ErrorBox message={mineRes.error} onRetry={mineRes.reload} /> : null}
          {loading && !mineRes.data ? <Loading /> : null}
          {!loading && list.length === 0 ? (
            <EmptyState icon="💵" title={t('no_contributions')} text={t('no_contributions_hint')} />
          ) : null}
          {list.map((c) => <ContributionRow key={c.id} contribution={c} onPress={() => router.push(`/assistance/${c.eventId}`)} />)}
        </>
      )}

      <VerifyContributionSheet
        contribution={verifying}
        onClose={() => setVerifying(null)}
        onDone={() => { pendingRes.reload(); mineRes.reload(); participantsRes.reload(); }}
      />

      <Sheet visible={!!editing} onClose={() => setEditing(null)} title={t('edit_invalidated')} footer={<Button title={t('save')} onPress={saveCorrection} loading={savingEdit} />}>
        <Muted style={{ marginBottom: spacing.md }}>{editing?.memberName} · {editing?.eventReference} · {t('minimum_contribution_hint', { amount: formatMoney(settings?.minContributionAmount ?? 0, currency, lang) })}</Muted>
        <Field label={`${t('amount')} (${currency})`} value={editAmount} onChangeText={setEditAmount} keyboardType="numeric" />
        <Muted style={{ fontWeight: '700', marginBottom: spacing.xs }}>{t('method')}</Muted>
        <Row gap={spacing.xs} style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
          <Chip label={t('cash')} active={editMethod === 'CASH'} onPress={() => setEditMethod('CASH')} />
          <Chip label={t('mobile_money')} active={editMethod === 'MOBILE_MONEY'} onPress={() => setEditMethod('MOBILE_MONEY')} />
          <Chip label={t('transfer')} active={editMethod === 'TRANSFER'} onPress={() => setEditMethod('TRANSFER')} />
        </Row>
        <Field label={t('note')} value={editNote} onChangeText={setEditNote} />
        <Muted style={{ fontWeight: '700', marginBottom: spacing.xs }}>{t('proof_shape')}</Muted>
        <Row gap={spacing.xs} style={{ marginBottom: spacing.sm }}>
          <Chip label={t('photo_square')} active={editProofShape === 'SQUARE'} onPress={() => setEditProofShape('SQUARE')} />
          <Chip label={t('photo_circle')} active={editProofShape === 'CIRCLE'} onPress={() => setEditProofShape('CIRCLE')} />
        </Row>
        <Button title={t('change_photo')} variant="outline" small loading={uploading} onPress={async () => {
          setUploading(true);
          try { const url = await pickAndUpload(); if (url) setEditProof(url); }
          catch (e: any) { toast(e.message, 'error'); }
          finally { setUploading(false); }
        }} />
        {editProof ? <Image source={{ uri: assetUrl(editProof) }} style={{ width: 112, height: 112, marginTop: spacing.sm, borderRadius: editProofShape === 'CIRCLE' ? 56 : 12 }} /> : null}
      </Sheet>

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
