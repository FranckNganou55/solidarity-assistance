import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Image, Linking, Platform, Pressable, Text, View } from 'react-native';
import { api, assetUrl, ContributionView, EventParticipantView, EventView } from '../../src/api';
import { ContributionRow } from '../../src/cards';
import { VerifyContributionSheet } from '../../src/verify-contribution';
import { PERM } from '../../src/permissions';
import { useApp, useRefreshOnFocus, useResource } from '../../src/store';
import { Avatar, Badge, Button, Card, Chip, DateField, EmptyState, ErrorBox, Field, Header, Loading, Muted, Progress, Row, Screen, SectionTitle, Sheet } from '../../src/ui';
import { font, radius, spacing } from '../../src/theme';
import { formatDate, formatDateTime, formatMoney, STATUS_COLORS } from '../../src/utils';
import { pickAndUpload } from '../../src/upload';

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventId = Number(id);
  const { t, palette, lang, settings, can, isAdmin, toast, refreshMe } = useApp();
  const router = useRouter();
  const currency = settings?.currency ?? 'FCFA';

  const eventRes = useResource<EventView>(() => api.event(eventId), [eventId]);
  const contribRes = useResource<ContributionView[]>(() => api.eventContributions(eventId), [eventId]);
  const participantsRes = useResource<EventParticipantView[]>(() => api.eventParticipants(eventId), [eventId]);

  useRefreshOnFocus(useCallback(() => { eventRes.reload(); contribRes.reload(); participantsRes.reload(); }, [eventRes.reload, contribRes.reload, participantsRes.reload]));

  const event = eventRes.data;
  const [paySheet, setPaySheet] = useState(false);
  const [closeSheet, setCloseSheet] = useState(false);
  const [amount, setAmount] = useState('0');
  const [method, setMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string | null>(null);
  const [proofPhotoShape, setProofPhotoShape] = useState<'CIRCLE' | 'SQUARE'>('SQUARE');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [closingDate, setClosingDate] = useState('');
  const [busy, setBusy] = useState(false);

  const afterChange = () => { eventRes.reload(); contribRes.reload(); participantsRes.reload(); refreshMe(); };

  const contribute = async () => {
    const minimumAmount = Math.max(1, Number(settings?.minContributionAmount ?? 0));
    if (Number(amount) < minimumAmount) { toast(t('contribution_minimum_error', { amount: formatMoney(minimumAmount, currency, lang) }), 'error'); return; }
    if (!proofPhotoUrl) { toast(t('add_contribution_proof'), 'error'); return; }
    setBusy(true);
    try {
      await api.submitContribution(eventId, { amount: Number(amount), method, note: note || undefined, proofPhotoUrl, proofPhotoShape });
      toast(t('contribution_sent'), 'success');
      setPaySheet(false); setAmount('0'); setNote(''); setProofPhotoUrl(null); setProofPhotoShape('SQUARE');
      afterChange();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const closeEvent = async () => {
    setBusy(true);
    try {
      await api.closeEvent(eventId, closingDate || null);
      toast(t('status_closed'), 'success');
      setCloseSheet(false);
      afterChange();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const reopenEvent = async () => {
    setBusy(true);
    try { await api.reopenEvent(eventId); toast(t('status_open'), 'success'); afterChange(); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const cancelEvent = async () => {
    const run = async () => {
      setBusy(true);
      try { await api.cancelEvent(eventId); toast(t('status_cancelled'), 'error'); afterChange(); }
      catch (e: any) { toast(e.message, 'error'); }
      finally { setBusy(false); }
    };
    if (Platform.OS === 'web') { if (window.confirm(t('cancel_event') + ' ?')) run(); }
    else Alert.alert(t('cancel_event'), '', [{ text: t('cancel'), style: 'cancel' }, { text: t('confirm'), style: 'destructive', onPress: run }]);
  };

  const invalidateContribution = async (contribution: ContributionView) => {
    const run = async () => {
      setBusy(true);
      try {
        await api.invalidateContribution(contribution.id, t('contribution_validation_cancelled'));
        toast(t('invalidated'), 'success');
        afterChange();
      } catch (e: any) { toast(e.message, 'error'); }
      finally { setBusy(false); }
    };
    if (Platform.OS === 'web') { if (window.confirm(t('invalidation_confirm'))) await run(); }
    else Alert.alert(t('invalidate_validation'), t('invalidation_confirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('confirm'), style: 'destructive', onPress: run },
    ]);
  };

  /** Le tresorier ouvre la verification (perception de l'argent) avant validation. */
  const [verifying, setVerifying] = useState<ContributionView | null>(null);

  const statusLabel = event?.status === 'OPEN' ? t('status_open')
    : event?.status === 'CLOSED' ? t('status_closed') : t('status_cancelled');

  if (eventRes.loading && !event) return <Screen><Loading /></Screen>;
  if (eventRes.error) return <Screen><ErrorBox message={eventRes.error} onRetry={eventRes.reload} /></Screen>;
  if (!event) return null;

  const progress = event.targetAmount && event.targetAmount > 0
    ? Math.min(100, Math.round((event.collectedAmount / event.targetAmount) * 100)) : null;

  const canContribute = can(PERM.CONTRIBUTION_SUBMIT) && event.contributionsOpen
    && (!event.myContribution || event.myContribution.status === 'REJECTED' || event.myContribution.status === 'INVALIDATED');
  const canClose = can(PERM.EVENT_CLOSE) && event.status === 'OPEN';
  const canReopen = isAdmin && event.status === 'CLOSED';
  const canCancel = can(PERM.EVENT_CANCEL) && event.status !== 'CANCELLED' && (event.status === 'OPEN' || isAdmin);

  return (
    <Screen refreshing={eventRes.loading} onRefresh={() => { eventRes.reload(); contribRes.reload(); participantsRes.reload(); }}>
      <Header title={`${event.typeIcon ?? ''} ${event.typeName}`} subtitle={event.reference} onBack={() => router.back()} />

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={spacing.sm} style={{ flex: 1 }}>
            <Avatar name={event.beneficiaryName} uri={event.beneficiaryPhotoUrl} size={46} shape={event.beneficiaryPhotoShape} />
            <View style={{ flex: 1 }}>
              <Muted style={{ fontSize: font.tiny }}>{t('beneficiary')}</Muted>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: font.body }} numberOfLines={1}>{event.beneficiaryName}</Text>
              <Muted style={{ fontSize: font.tiny }}>{event.beneficiaryPhone}</Muted>
            </View>
          </Row>
          <Badge label={statusLabel} tone={STATUS_COLORS[event.status] as any} />
        </Row>

        <View style={{ marginTop: spacing.md, backgroundColor: palette.surfaceAlt, borderRadius: radius.md, padding: spacing.md }}>
          <Text style={{ color: palette.text, fontSize: font.small, lineHeight: 20 }}>{event.description}</Text>
        </View>

        <Row style={{ justifyContent: 'space-between', marginTop: spacing.md }}>
          <View>
            <Muted style={{ fontSize: font.tiny }}>{t('closing_date')}</Muted>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: font.small }}>
              {event.closingDate ? formatDate(event.closingDate, lang) : t('no_deadline')}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Muted style={{ fontSize: font.tiny }}>{t('contributions')}</Muted>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: font.small }}>
              {event.contributionCount} {t('participants')}
            </Text>
          </View>
        </Row>

        {event.status === 'OPEN' && event.contributionsOpen && event.daysLeft >= 0 ? (
          <Row style={{ marginTop: spacing.sm }}>
            <Badge label={t('days_left', { n: event.daysLeft })} tone="warning" />
          </Row>
        ) : null}

        <View style={{ marginTop: spacing.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: palette.primary, fontWeight: '900', fontSize: font.h3 }}>
              {formatMoney(event.collectedAmount, currency, lang)}
            </Text>
            {event.targetAmount ? <Muted>{t('target')} {formatMoney(event.targetAmount, currency, lang)}</Muted> : null}
          </Row>
          {progress !== null ? <View style={{ marginTop: spacing.xs }}><Progress value={progress} max={100} color={palette.accent} /></View> : null}
        </View>

        {event.myContribution ? (
          <View style={{ marginTop: spacing.md, backgroundColor: palette.primarySoft, borderRadius: radius.md, padding: spacing.md }}>
            <Muted style={{ fontSize: font.tiny }}>{t('your_contribution')}</Muted>
            <Row style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: palette.primary, fontWeight: '800' }}>{formatMoney(event.myContribution.amount, currency, lang)}</Text>
              <Badge
                label={event.myContribution.status === 'VALIDATED' ? t('validated') : event.myContribution.status === 'PENDING' ? t('pending_validation') : t('rejected')}
                tone={STATUS_COLORS[event.myContribution.status] as any}
              />
            </Row>
          </View>
        ) : null}

        {event.closedByName ? (
          <Muted style={{ marginTop: spacing.sm, fontSize: font.tiny }}>
            {t('closed_by')} {event.closedByName} · {formatDateTime(event.closedAt, lang)}
          </Muted>
        ) : null}
        {event.supportingDocumentUrl ? <Button title={t('open_supporting_document')} variant="outline" small onPress={() => { const url = assetUrl(event.supportingDocumentUrl); if (url) void Linking.openURL(url); }} style={{ marginTop: spacing.md }} /> : null}
        {event.eligibilityOverridden ? <Muted style={{ marginTop: spacing.sm, fontSize: font.tiny, color: palette.accent }}>
          {t('exemption_by', { name: event.eligibilityOverrideByName ?? t('principal_admin_fallback') })}
        </Muted> : null}
      </Card>

      <Row style={{ marginTop: spacing.md, gap: spacing.sm, flexWrap: 'wrap' }}>
        {canContribute ? <Button title={`💵 ${t('contribute')}`} onPress={() => setPaySheet(true)} style={{ flex: 1 }} /> : null}
        {canClose ? <Button title={`🔒 ${t('close_event')}`} variant="accent" onPress={() => setCloseSheet(true)} style={{ flex: 1 }} /> : null}
        {canReopen ? <Button title={`🔓 ${t('reopen_event')}`} variant="outline" onPress={reopenEvent} loading={busy} style={{ flex: 1 }} /> : null}
        {canCancel ? <Button title={`✖ ${t('cancel_event')}`} variant="ghost" onPress={cancelEvent} loading={busy} /> : null}
      </Row>

      <SectionTitle>{t('participants_paid')} · {(participantsRes.data ?? []).filter((p) => p.contribution?.status === 'VALIDATED').length}</SectionTitle>
      {(participantsRes.data ?? []).filter((p) => p.contribution?.status === 'VALIDATED').map((p) => <Row key={p.memberId} gap={spacing.sm} style={{ backgroundColor: palette.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: palette.border }}>
        <Avatar name={p.memberName} uri={p.photoUrl} size={38} shape={p.photoShape} />
        <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: palette.text, fontWeight: '700' }}>{p.memberName}</Text><Muted>{p.phone}</Muted></View>
        <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
          <Text style={{ color: palette.primary, fontWeight: '800' }}>{formatMoney(p.contribution?.amount ?? 0, currency, lang)}</Text>
          {can(PERM.CONTRIBUTION_VALIDATE) && p.contribution ? <Chip label={`↶ ${t('invalidate_validation')}`} onPress={() => invalidateContribution(p.contribution!)} /> : null}
        </View>
      </Row>)}
      <SectionTitle>{t('participants_review')} · {(participantsRes.data ?? []).filter((p) => p.contribution?.status === 'PENDING').length}</SectionTitle>
      {(participantsRes.data ?? []).filter((p) => p.contribution?.status === 'PENDING').map((p) => <Row key={p.memberId} gap={spacing.sm} style={{ backgroundColor: palette.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: palette.border }}>
        <Avatar name={p.memberName} uri={p.photoUrl} size={38} shape={p.photoShape} />
        <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '700' }}>{p.memberName}</Text><Muted>{p.phone}</Muted></View>
        <Badge label={t('pending_validation')} tone="warning" />
      </Row>)}
      <SectionTitle>{t('participants_pending')} · {(participantsRes.data ?? []).filter((p) => !p.contribution || p.contribution.status === 'REJECTED' || p.contribution.status === 'INVALIDATED').length}</SectionTitle>
      {(participantsRes.data ?? []).filter((p) => !p.contribution || p.contribution.status === 'REJECTED' || p.contribution.status === 'INVALIDATED').map((p) => <Row key={p.memberId} gap={spacing.sm} style={{ backgroundColor: palette.surface, padding: spacing.md, borderRadius: radius.md, marginBottom: spacing.xs, borderWidth: 1, borderColor: palette.border }}>
        <Avatar name={p.memberName} uri={p.photoUrl} size={38} shape={p.photoShape} />
        <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '700' }}>{p.memberName}</Text><Muted>{p.phone}</Muted></View>
        <Text style={{ color: palette.muted, fontWeight: '700' }}>{formatMoney(p.contribution?.amount ?? 0, currency, lang)}</Text>
        <Badge label={p.contribution?.status === 'INVALIDATED' ? t('invalidated') : p.contribution?.status === 'REJECTED' ? t('rejected') : t('pending')} tone={p.contribution?.status === 'REJECTED' || p.contribution?.status === 'INVALIDATED' ? 'danger' : 'neutral'} />
      </Row>)}

      <SectionTitle>{t('contributions')} ({event.contributionCount})</SectionTitle>
      {contribRes.loading && !contribRes.data ? <Loading /> : null}
      {(contribRes.data ?? []).length === 0 ? <EmptyState icon="💵" title={t('no_contributions')} /> : null}
      {(contribRes.data ?? []).map((c) => (
        <ContributionRow
          key={c.id}
          contribution={c}
          showMember
          onPress={can(PERM.CONTRIBUTION_VALIDATE) && c.status === 'PENDING' ? () => setVerifying(c)
            : can(PERM.CONTRIBUTION_VALIDATE) && c.status === 'VALIDATED' ? () => invalidateContribution(c)
              : c.proofPhotoUrl ? () => { const url = assetUrl(c.proofPhotoUrl); if (url) void Linking.openURL(url); } : undefined}
          onPressLabel={can(PERM.CONTRIBUTION_VALIDATE) && c.status === 'PENDING' ? t('verify_contribution')
            : can(PERM.CONTRIBUTION_VALIDATE) && c.status === 'VALIDATED' ? t('invalidate_validation') : t('open_proof')}
          actions={can(PERM.CONTRIBUTION_VALIDATE) && c.status === 'VALIDATED' ? (
            <Chip label={`↶ ${t('invalidate_validation')}`} onPress={() => invalidateContribution(c)} />
          ) : can(PERM.CONTRIBUTION_VALIDATE) && c.status === 'PENDING' ? (
            <Chip label={`🔎 ${t('verify_contribution')}`} onPress={() => setVerifying(c)} />
          ) : undefined}
        />
      ))}

      <Sheet visible={paySheet} onClose={() => setPaySheet(false)} title={t('contribute')}
        footer={<Button title={t('submit_contribution')} onPress={contribute} loading={busy} />}>
        <Muted style={{ marginBottom: spacing.md }}>{event.typeName} · {event.beneficiaryName}</Muted>
        <Field label={`${t('amount')} (${currency})`} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" />
        <Muted style={{ marginTop: -spacing.sm, marginBottom: spacing.md }}>{t('minimum_contribution_hint', { amount: formatMoney(settings?.minContributionAmount ?? 0, currency, lang) })}</Muted>
        <Muted style={{ fontWeight: '700', marginBottom: spacing.sm }}>{t('method')}</Muted>
        <Row gap={6} style={{ marginBottom: spacing.md, flexWrap: 'wrap' }}>
          <Chip label={`💵 ${t('cash')}`} active={method === 'CASH'} onPress={() => setMethod('CASH')} />
          <Chip label={`📱 ${t('mobile_money')}`} active={method === 'MOBILE_MONEY'} onPress={() => setMethod('MOBILE_MONEY')} />
          <Chip label={`🏦 ${t('transfer')}`} active={method === 'TRANSFER'} onPress={() => setMethod('TRANSFER')} />
        </Row>
        <Field label={t('note')} value={note} onChangeText={setNote} placeholder={t('note_placeholder')} autoCapitalize="sentences" />
        <Muted style={{ fontWeight: '700', marginBottom: spacing.xs }}>{t('contribution_proof_required')}</Muted>
        <Row gap={spacing.sm} style={{ marginBottom: spacing.sm }}>
          <Chip label={t('photo_square_label')} active={proofPhotoShape === 'SQUARE'} onPress={() => setProofPhotoShape('SQUARE')} />
          <Chip label={t('photo_circle_label')} active={proofPhotoShape === 'CIRCLE'} onPress={() => setProofPhotoShape('CIRCLE')} />
        </Row>
        <Button title={proofPhotoUrl ? t('change_proof_photo') : t('add_proof_photo')} variant="outline" small loading={uploadingProof} onPress={async () => {
          setUploadingProof(true);
          try { const url = await pickAndUpload(); if (url) setProofPhotoUrl(url); }
          catch (e: any) { toast(e.message, 'error'); }
          finally { setUploadingProof(false); }
        }} />
        {proofPhotoUrl ? <Pressable onPress={() => { const url = assetUrl(proofPhotoUrl); if (url) void Linking.openURL(url); }} style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}>
          <Image source={{ uri: assetUrl(proofPhotoUrl) }} style={{ width: 112, height: 112, borderRadius: proofPhotoShape === 'CIRCLE' ? 56 : 12, backgroundColor: palette.surfaceAlt }} />
          <Muted style={{ marginTop: 4 }}>{t('proof_preview_hint')}</Muted>
        </Pressable> : null}
        <Muted style={{ fontSize: font.tiny }}>ℹ️ {t('contribution_review_hint')}</Muted>
      </Sheet>

      <Sheet visible={closeSheet} onClose={() => setCloseSheet(false)} title={t('close_event')}
        footer={<Button title={`🔒 ${t('confirm')}`} variant="accent" onPress={closeEvent} loading={busy} />}>
        <Muted style={{ marginBottom: spacing.md }}>{t('close_event_hint')}</Muted>
        <DateField label={t('closing_date')} value={closingDate} onChange={setClosingDate} allowEmpty />
      </Sheet>

      <VerifyContributionSheet
        contribution={verifying}
        onClose={() => setVerifying(null)}
        onDone={afterChange}
      />

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
