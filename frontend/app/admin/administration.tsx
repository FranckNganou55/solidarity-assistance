import { Redirect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';
import { api, MemberView } from '../../src/api';
import { Guard } from '../../src/guard';
import { PERM } from '../../src/permissions';
import { useApp, useRefreshOnFocus, useResource } from '../../src/store';
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Header, Loading, Muted, Row, Screen, SelectField, Sheet } from '../../src/ui';
import { font, spacing } from '../../src/theme';
import { matchesPersonSearch } from '../../src/utils';

const positions = ['MEMBRE_BUREAU', 'DIRECTEUR', 'DIRECTEUR_ADJOINT', 'SECRETAIRE', 'SECRETAIRE_ADJOINT', 'TRESORIER', 'TRESORIER_ADJOINT', 'CONSEILLER', 'COMMISSAIRE_AUX_COMPTES'];
const positionOptions = (t: (key: string) => string) => positions.map((position) => ({ value: position, label: t(`bureau_${position}`) }));

export default function AdministrationScreen() {
  const { member } = useApp();
  if (!member?.groupAdmin && !member?.superAdmin) return <Redirect href="/(tabs)" />;
  return <Guard permission={PERM.MEMBER_MANAGE}><AdministrationInner /></Guard>;
}

function AdministrationInner() {
  const { t, palette, toast } = useApp();
  const router = useRouter();
  const bureauRes = useResource(() => api.bureauMembers(), []);
  const membersRes = useResource(() => api.members({ size: 100, active: true }), []);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MemberView | null>(null);
  const [mode, setMode] = useState<'add' | 'position' | 'replace'>('add');
  const [memberId, setMemberId] = useState<number | null>(null);
  const [position, setPosition] = useState<string>('DIRECTEUR');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const refresh = useCallback(() => { bureauRes.reload(); membersRes.reload(); }, [bureauRes.reload, membersRes.reload]);
  useRefreshOnFocus(refresh);
  const officeMembers = bureauRes.data ?? [];
  const filteredOfficeMembers = officeMembers.filter((m) => matchesPersonSearch(search, m.fullName, m.phone, m.id));
  const availableMembers = useMemo(() => (membersRes.data?.content ?? []).filter((m) => !m.bureauPosition || (mode !== 'replace' && m.id === editing?.id)), [membersRes.data, editing, mode]);
  const candidateOptions = availableMembers.map((m) => ({
    value: m.id,
    label: `${m.fullName} · ${m.phone}`,
    hint: m.superAdmin ? t('system_admin') : m.groupAdmin ? t('principal_admin') : m.roleName,
  }));

  const openAdd = () => { setMode('add'); setEditing(null); setMemberId(null); setPosition('DIRECTEUR'); setSheetOpen(true); };
  const openEdit = (member: MemberView) => { setMode('position'); setEditing(member); setMemberId(member.id); setPosition(member.bureauPosition ?? 'DIRECTEUR'); setSheetOpen(true); };
  const openReplace = (member: MemberView) => { setMode('replace'); setEditing(member); setMemberId(null); setPosition(member.bureauPosition ?? 'DIRECTEUR'); setSheetOpen(true); };

  const save = async () => {
    if (!memberId) { toast(t('bureau_choose_member'), 'error'); return; }
    setSaving(true);
    try {
      if (mode === 'replace' && editing) await api.replaceBureauMember(editing.id, memberId);
      else await api.appointBureauMember(memberId, position);
      toast(mode === 'replace' ? t('bureau_replaced') : mode === 'position' ? t('bureau_saved') : t('bureau_added'), 'success');
      setSheetOpen(false); refresh();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (member: MemberView) => {
    const run = async () => {
      setRemoving(member.id);
      try { await api.removeBureauMember(member.id); toast(t('bureau_removed'), 'success'); refresh(); }
      catch (e: any) { toast(e.message, 'error'); }
      finally { setRemoving(null); }
    };
    if (Platform.OS === 'web') { if (window.confirm(t('bureau_remove_confirm', { name: member.fullName }))) await run(); }
    else Alert.alert(t('bureau_remove_title'), t('bureau_remove_confirm', { name: member.fullName }), [
      { text: t('cancel'), style: 'cancel' }, { text: t('remove'), style: 'destructive', onPress: run },
    ]);
  };

  return <Screen refreshing={bureauRes.loading || membersRes.loading} onRefresh={refresh}>
    <Header title={t('nav_administration')} subtitle={`${officeMembers.length} ${t('bureau_members_count')}`} onBack={() => router.back()}
      right={<Button title={`+ ${t('bureau_appoint')}`} small onPress={openAdd} />} />
    <Card style={{ marginBottom: spacing.md, backgroundColor: palette.primarySoft }}>
      <Text style={{ color: palette.text, fontSize: font.small, fontWeight: '800', marginBottom: 5 }}>{t('bureau_access_title')}</Text>
      <Muted>{t('bureau_access_description')}</Muted>
    </Card>
    <Field label="" value={search} onChangeText={setSearch} placeholder={`🔍 ${t('search_name_or_id')}`} />
    {bureauRes.error ? <ErrorBox message={bureauRes.error} onRetry={refresh} /> : null}
    {membersRes.error ? <ErrorBox message={membersRes.error} onRetry={membersRes.reload} /> : null}
    {(bureauRes.loading || membersRes.loading) && !bureauRes.data ? <Loading /> : null}
    {!bureauRes.loading && filteredOfficeMembers.length === 0 ? <EmptyState icon="♙" title={search ? t('no_members') : t('bureau_empty_title')} text={search ? undefined : t('bureau_empty_hint')} /> : null}

    {filteredOfficeMembers.map((member) => <Card key={member.id} style={{ marginBottom: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Row gap={spacing.xs} style={{ minWidth: 0 }}>
            <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, color: palette.text, fontWeight: '800', fontSize: font.body }}>{member.fullName}</Text>
            <Badge label={member.active ? t('active') : t('archived')} tone={member.active ? 'success' : 'danger'} />
          </Row>
          <Muted style={{ marginTop: 3 }}>{member.phone} · {member.quarter || member.city}</Muted>
          <Muted style={{ marginTop: 2 }}>{t('role')}: {member.superAdmin ? t('system_admin') : member.groupAdmin ? t('principal_admin') : member.roleName}</Muted>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}><Badge label={t('bureau_member_badge')} tone="success" /><Badge label={t(`bureau_${member.bureauPosition}`)} tone="primary" /></View>
      </Row>
      <Row gap={spacing.xs} style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
        <Button title={`✎ ${t('bureau_edit')}`} variant="outline" small onPress={() => openEdit(member)} />
        <Button title={`⇄ ${t('bureau_replace')}`} variant="ghost" small onPress={() => openReplace(member)} />
        <Button title={t('bureau_remove')} variant="danger" small onPress={() => remove(member)} loading={removing === member.id} />
      </Row>
    </Card>)}

    <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title={mode === 'replace' ? t('bureau_replace_title') : mode === 'position' ? t('bureau_edit_title') : t('bureau_appoint_title')}
      footer={<Button title={t('save')} onPress={save} loading={saving} />}>
      {mode === 'add' || mode === 'replace' ? <SelectField label={t('bureau_member')} value={memberId} options={candidateOptions} onChange={(value) => setMemberId(Number(value))} placeholder={t('bureau_choose_member')} /> : null}
      {mode !== 'replace' ? <SelectField label={t('bureau_position')} value={position} options={positionOptions(t)} onChange={(value) => setPosition(String(value))} /> : null}
      <Muted style={{ marginTop: -spacing.xs, marginBottom: spacing.md }}>{mode === 'replace' ? t('bureau_replace_hint') : mode === 'position' ? t('bureau_edit_hint') : t('bureau_appoint_hint')}</Muted>
    </Sheet>
    <View style={{ height: spacing.xl }} />
  </Screen>;
}
