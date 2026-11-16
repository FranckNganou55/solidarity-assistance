import React, { useCallback, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { api, assetUrl, RequestView, TypeView } from '../../src/api';
import { RequestCard } from '../../src/cards';
import { PERM } from '../../src/permissions';
import { useApp, useRefreshOnFocus, useResource } from '../../src/store';
import { Badge, Button, Chip, DateField, EmptyState, ErrorBox, Field, Header, Loading, Muted, Row, Screen, SelectField, Sheet } from '../../src/ui';
import { font, spacing } from '../../src/theme';
import { matchesPersonSearch } from '../../src/utils';
import { pickAndUploadDocument } from '../../src/upload';

export default function RequestsScreen() {
  const { t, palette, can, member, toast } = useApp();
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [search, setSearch] = useState('');
  const [sheet, setSheet] = useState(false);

  const mineRes = useResource<RequestView[]>(() => api.requests('mine'));
  const allRes = useResource<RequestView[]>(() => (can(PERM.REQUEST_VIEW) ? api.requests('all') : Promise.resolve([])));
  const typesRes = useResource<TypeView[]>(() => api.types(true));

  useRefreshOnFocus(useCallback(() => { mineRes.reload(); allRes.reload(); }, [mineRes.reload, allRes.reload]));

  const required = member?.requiredAssistances ?? 1;
  const cycle = member?.cycleContributions ?? 0;
  const eligible = cycle >= required;

  const [typeId, setTypeId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [saving, setSaving] = useState(false);

  const submitRequest = async () => {
    if (!typeId || !reason.trim()) { toast(t('required_fields'), 'error'); return; }
    setSaving(true);
    try {
      await api.createRequest({ typeId, reason: reason.trim(), documentUrl: documentUrl ?? undefined });
      toast(t('request_sent'), 'success');
      setSheet(false); setReason(''); setTypeId(null); setDocumentUrl(null);
      mineRes.reload();
    } catch (e: any) {
      toast(e.message, 'error');
    } finally { setSaving(false); }
  };

  const uploadDocument = async () => {
    setUploadingDocument(true);
    try { const url = await pickAndUploadDocument(); if (url) setDocumentUrl(url); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setUploadingDocument(false); }
  };

  /* Traitement d'une demande par le gestionnaire */
  const [target, setTarget] = useState<RequestView | null>(null);
  const [closingDate, setClosingDate] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const approve = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await api.approveRequest(target.id, {
        closingDate: closingDate || null,
        targetAmount: amount ? Number(amount) : null,
        comment: comment || undefined,
      });
      toast(t('approved'), 'success');
      setTarget(null); setClosingDate(''); setAmount(''); setComment('');
      allRes.reload(); mineRes.reload();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const rejectRequest = async (r: RequestView) => {
    setBusy(true);
    try {
      await api.rejectRequest(r.id, t('request_rejected_comment'));
      toast(t('rejected'), 'error');
      allRes.reload();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setBusy(false); }
  };

  const sourceRequests = tab === 'mine' ? mineRes.data ?? [] : (allRes.data ?? []).filter((request) => request.status === 'PENDING');
  const requests = sourceRequests.filter((request) => matchesPersonSearch(search, request.memberName, request.memberPhone, request.memberId));
  const loading = tab === 'mine' ? mineRes.loading : allRes.loading;

  return (
    <Screen refreshing={loading} onRefresh={() => { mineRes.reload(); allRes.reload(); }}>
      <Header
        title={t('requests_title')}
        big
        right={can(PERM.REQUEST_CREATE) ? <Button title={`+ ${t('new_request')}`} small onPress={() => setSheet(true)} /> : undefined}
      />

      <Row gap={6} style={{ marginBottom: spacing.md }}>
        <Chip label={t('my_requests_tab')} active={tab === 'mine'} onPress={() => setTab('mine')} />
        {can(PERM.REQUEST_VIEW) ? (
          <Chip label={`${t('to_process')} (${(allRes.data ?? []).filter((r) => r.status === 'PENDING').length})`} active={tab === 'all'} onPress={() => setTab('all')} />
        ) : null}
      </Row>

      <Field label="" value={search} onChangeText={setSearch} placeholder={`🔍 ${t('search_name_or_id')}`} />

      {tab === 'mine' ? (
        <Muted style={{ marginBottom: spacing.md }}>
          {t('eligibility')} : {cycle}/{required} — {eligible ? `✅ ${t('eligible_yes')}` : `⛔ ${t('eligible_no')}`}
        </Muted>
      ) : null}

      {loading && !requests.length ? <Loading /> : null}
      {!loading && requests.length === 0 ? (
        <EmptyState
          icon="📩"
          title={t('no_requests')}
          text={eligible ? t('request_help') : t('not_eligible', { n: Math.max(0, required - cycle) })}
        />
      ) : null}

      {requests.map((r) => (
        <RequestCard
          key={r.id}
          request={r}
          showMember={tab === 'all'}
          actions={tab === 'all' && r.status === 'PENDING' ? (
            <>
              {can(PERM.REQUEST_APPROVE) ? <Chip label={`✅ ${t('approve')}`} onPress={() => setTarget(r)} /> : null}
              {can(PERM.REQUEST_REJECT) ? <Chip label={`✖ ${t('reject')}`} onPress={() => rejectRequest(r)} /> : null}
            </>
          ) : undefined}
        />
      ))}

      {/* Nouvelle demande */}
      <Sheet visible={sheet} onClose={() => setSheet(false)} title={t('new_request')}
        footer={<Button title={t('send_request')} onPress={submitRequest} loading={saving} />}>
        {!eligible ? (
          <View style={{ backgroundColor: palette.dangerSoft, padding: spacing.md, borderRadius: 12, marginBottom: spacing.md }}>
            <Text style={{ color: palette.danger, fontWeight: '700', fontSize: font.small }}>
              {t('request_blocked', { n: Math.max(0, required - cycle) })}
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: palette.primarySoft, padding: spacing.md, borderRadius: 12, marginBottom: spacing.md }}>
            <Text style={{ color: palette.primary, fontWeight: '700', fontSize: font.small }}>
              ✅ {t('eligible_yes')} — {cycle}/{required}
            </Text>
          </View>
        )}
        <SelectField
          label={t('type')}
          value={typeId}
          onChange={setTypeId}
          placeholder={t('select_type')}
          options={(typesRes.data ?? []).map((ty) => ({ value: ty.id, label: `${ty.icon ?? ''} ${ty.name}` }))}
        />
        <Field label={t('request_reason')} value={reason} onChangeText={setReason} multiline autoCapitalize="sentences" placeholder={t('request_description_placeholder')} />
        <Button title={documentUrl ? t('request_document_added') : t('attach_supporting_document')} variant="outline" small onPress={uploadDocument} loading={uploadingDocument} />
        {documentUrl ? <Row style={{ marginTop: spacing.sm, justifyContent: 'space-between' }}>
          <Text style={{ color: palette.secondary, fontSize: font.small, fontWeight: '700' }} onPress={() => { const url = assetUrl(documentUrl); if (url) void Linking.openURL(url); }}>{t('open_document')}</Text>
          <Chip label={t('remove')} onPress={() => setDocumentUrl(null)} />
        </Row> : <Muted style={{ marginTop: spacing.xs, fontSize: font.tiny }}>{t('document_upload_hint')}</Muted>}
      </Sheet>

      {/* Approbation */}
      <Sheet visible={!!target} onClose={() => setTarget(null)} title={t('approve_request')}
        footer={can(PERM.REQUEST_APPROVE) ? <Button title={t('approve')} onPress={approve} loading={busy} /> : null}>
        {target ? (
          <>
            <Row gap={8} style={{ marginBottom: spacing.md }}>
              <Badge label={target.typeName} tone="primary" />
              <Badge label={`${target.memberName}`} />
            </Row>
            <Muted style={{ marginBottom: spacing.md }}>{target.reason}</Muted>
            <DateField label={t('closing_date')} value={closingDate} onChange={setClosingDate} allowEmpty />
            <Field label={`${t('target')} (${t('optional')})`} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="200000" />
            <Field label={`${t('decision')} (${t('optional')})`} value={comment} onChangeText={setComment} placeholder={t('comment_placeholder')} autoCapitalize="sentences" />
            <Muted style={{ fontSize: font.tiny }}>ℹ️ {t('request_created_automatically_hint')}</Muted>
          </>
        ) : null}
      </Sheet>

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
