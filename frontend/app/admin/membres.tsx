import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { api, assetUrl, ContributionView, MemberView } from '../../src/api';
import { Guard } from '../../src/guard';
import { PERM } from '../../src/permissions';
import { useApp, useRefreshOnFocus, useResource } from '../../src/store';
import { pickAndUpload } from '../../src/upload';
import { Avatar, Badge, Button, Card, Chip, Divider, EmptyState, ErrorBox, Field, Header, Loading, Muted, Progress, Row, Screen, SelectField, Sheet } from '../../src/ui';
import { font, radius, spacing } from '../../src/theme';
import { formatDate, formatMoney, STATUS_COLORS } from '../../src/utils';
import { ContributionRow } from '../../src/cards';

export default function MembersAdminScreen() {
  return <Guard permission={PERM.MEMBER_VIEW}><MembersInner /></Guard>;
}

function MembersInner() {
  const { t, palette, can, toast, lang } = useApp();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [memberStatus, setMemberStatus] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const membersRes = useResource(() => api.members({
    q: search || undefined, size: 100,
    active: memberStatus === 'ALL' ? undefined : memberStatus === 'ACTIVE',
  }), [search, memberStatus]);
  useRefreshOnFocus(useCallback(() => { membersRes.reload(); }, [membersRes.reload]));

  const [createSheet, setCreateSheet] = useState(false);
  const [selected, setSelected] = useState<MemberView | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [contribs, setContribs] = useState<ContributionView[] | null>(null);

  const openCreate = () => {
    setForm({ firstName: '', lastName: '', phone: '', city: 'Makenene', quarter: '', email: '', photoUrl: '', photoShape: 'CIRCLE', password: '', requiredAssistancesOverride: -1 });
    setEditMode(false);
    setCreateSheet(true);
    setSelected(null);
  };

  const openEdit = (member: MemberView) => {
    setForm({
      firstName: member.firstName, lastName: member.lastName, phone: member.phone, city: member.city,
      quarter: member.quarter ?? '', email: member.email ?? '', photoUrl: member.photoUrl ?? '', photoShape: member.photoShape ?? 'CIRCLE',
      password: '', requiredAssistancesOverride: member.requiredAssistancesOverride == null ? -1 : member.requiredAssistancesOverride,
    });
    setEditMode(true);
    setCreateSheet(true);
    setSelected(member);
  };

  const save = async () => {
    if (!form.firstName || !form.lastName || !form.phone || !form.city) { toast(t('required_fields'), 'error'); return; }
    setSaving(true);
    try {
      if (editMode && selected) {
        await api.updateMember(selected.id, {
          firstName: form.firstName, lastName: form.lastName, phone: form.phone, city: form.city,
          quarter: form.quarter, email: form.email, photoUrl: form.photoUrl, photoShape: form.photoShape,
          ...(can(PERM.MEMBER_THRESHOLD_EDIT) ? { requiredAssistancesOverride: Number(form.requiredAssistancesOverride) } : {}),
        });
        toast(t('success'), 'success');
      } else {
        const res = await api.createMember({
          firstName: form.firstName, lastName: form.lastName, phone: form.phone, city: form.city,
          quarter: form.quarter, email: form.email || null, photoUrl: form.photoUrl || null, photoShape: form.photoShape,
          password: form.password || null,
        });
        toast(`${t('member_created', { phone: res.member.phone })} · ${t('password')} : ${res.temporaryPassword}`, 'success');
      }
      setCreateSheet(false);
      membersRes.reload();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const upload = async () => {
    try {
      const url = await pickAndUpload('image');
      if (url) setForm((f: any) => ({ ...f, photoUrl: url }));
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const resetPassword = async (member: MemberView) => {
    try {
      const res = await api.resetMemberPassword(member.id);
      toast(t('password_reset', { pwd: res.temporaryPassword }), 'success');
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const resetCycle = async (member: MemberView) => {
    try {
      await api.resetMemberCycle(member.id);
      toast(t('cycle_reset'), 'success');
      setSelected(null);
      membersRes.reload();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const toggleActive = async (member: MemberView) => {
    try {
      await api.setMemberActive(member.id, !member.active);
      toast(member.active ? t('member_archived') : t('member_restored'), 'success');
      setSelected(null);
      membersRes.reload();
    } catch (e: any) { toast(e.message, 'error'); }
  };

  const loadContributions = async (member: MemberView) => {
    try { setContribs(await api.memberContributions(member.id)); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const members = membersRes.data?.content ?? [];

  return (
    <Screen refreshing={membersRes.loading} onRefresh={membersRes.reload}>
      <Header
        title={t('members_title')}
        subtitle={t('members_count', { n: membersRes.data?.totalElements ?? members.length })}
        onBack={() => router.back()}
        right={can(PERM.MEMBER_CREATE) ? <Button title={`+ ${t('new_member')}`} small onPress={openCreate} /> : undefined}
      />

      <Field label="" value={search} onChangeText={setSearch} placeholder={`🔍 ${t('search_name_or_id')}`} />
      <Row gap={spacing.xs} style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
        <Chip label={t('all_members')} active={memberStatus === 'ALL'} onPress={() => setMemberStatus('ALL')} />
        <Chip label={t('active_members')} active={memberStatus === 'ACTIVE'} onPress={() => setMemberStatus('ACTIVE')} />
        <Chip label={t('archived_members')} active={memberStatus === 'ARCHIVED'} onPress={() => setMemberStatus('ARCHIVED')} />
      </Row>

      {membersRes.error ? <ErrorBox message={membersRes.error} onRetry={membersRes.reload} /> : null}
      {membersRes.loading && !membersRes.data ? <Loading /> : null}
      {!membersRes.loading && members.length === 0 ? <EmptyState icon="👥" title={t('no_members')} /> : null}

      {members.map((member) => (
        <Card key={member.id} style={{ marginBottom: spacing.sm }} onPress={() => { setSelected(member); setContribs(null); }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={spacing.sm} style={{ flex: 1, minWidth: 0 }}>
              <Avatar name={member.fullName} uri={member.photoUrl} size={44} shape={member.photoShape} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Row gap={spacing.xs} style={{ minWidth: 0 }}>
                  <Text style={{ flex: 1, minWidth: 0, color: palette.text, fontWeight: '800', fontSize: font.small }} numberOfLines={1}>{member.fullName}</Text>
                  <Badge label={member.active ? t('active') : t('archived')} tone={member.active ? 'success' : 'danger'} />
                </Row>
                <Muted style={{ fontSize: font.tiny }}>{member.phone} · {member.quarter ?? member.city}</Muted>
                <Row gap={4} style={{ marginTop: 4, flexWrap: 'wrap' }}>
                  <Badge label={member.superAdmin ? t('system_admin') : member.groupAdmin ? t('principal_admin') : member.roleName.length > 14 ? member.roleName.slice(0, 14) + '…' : member.roleName} tone="primary" />
                  {member.bureauPosition ? <><Badge label={t('bureau_member_badge')} tone="success" /><Badge label={t(`bureau_${member.bureauPosition}`)} tone="warning" /></> : null}
                  {member.eligibleForAssistance ? <Badge label={t('eligible_yes')} tone="success" /> : null}
                </Row>
              </View>
            </Row>
            <View style={{ alignItems: 'flex-end', minWidth: 62 }}>
              <Muted style={{ fontSize: font.tiny }}>{t('cycle')}</Muted>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: font.small }}>
                {member.cycleContributions}/{member.requiredAssistances}
              </Text>
              <View style={{ width: 56, marginTop: 4 }}>
                <Progress value={member.cycleContributions} max={member.requiredAssistances} />
              </View>
            </View>
          </Row>
        </Card>
      ))}

      {/* Detail membre */}
      <Sheet visible={!!selected && !createSheet} onClose={() => setSelected(null)} title={selected?.fullName ?? ''}>
        {selected ? (
          <>
            <Row gap={spacing.md} style={{ marginBottom: spacing.md }}>
              <Avatar name={selected.fullName} uri={selected.photoUrl} size={56} shape={selected.photoShape} />
              <View style={{ flex: 1 }}>
                <Muted>{selected.phone}</Muted>
                <Muted>{selected.city}{selected.quarter ? ` · ${selected.quarter}` : ''}</Muted>
                {selected.email ? <Muted>{selected.email}</Muted> : null}
              </View>
            </Row>
            <Row gap={6} style={{ flexWrap: 'wrap', marginBottom: spacing.sm }}>
              <Badge label={selected.superAdmin ? t('system_admin') : selected.groupAdmin ? t('principal_admin') : selected.roleName} tone="primary" />
              {selected.bureauPosition ? <><Badge label={t('bureau_member_badge')} tone="success" /><Badge label={t(`bureau_${selected.bureauPosition}`)} tone="warning" /></> : null}
              <Badge label={selected.active ? t('active') : t('archived')} tone={selected.active ? 'success' : 'danger'} />
              <Badge label={`${t('cycle')} ${selected.cycleContributions}/${selected.requiredAssistances}`} />
              <Badge label={`${selected.totalContributions} ${t('total_contributions').toLowerCase()}`} tone="success" />
            </Row>
            <Muted style={{ fontSize: font.tiny, marginBottom: spacing.md }}>
              {t('member_since', { date: formatDate(selected.createdAt, lang) })}
              {selected.lastLoginAt ? ` · ${t('last_login', { date: formatDate(selected.lastLoginAt, lang) })}` : ''}
            </Muted>
            <Divider />
            <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
              {can(PERM.MEMBER_EDIT) ? <Button title={`✏️ ${t('edit')}`} variant="outline" small onPress={() => openEdit(selected)} /> : null}
              {can(PERM.MEMBER_RESET_PASSWORD) ? <Button title={`🔑 ${t('reset_password')}`} variant="outline" small onPress={() => resetPassword(selected)} /> : null}
              {can(PERM.EVENT_CLOSE) ? <Button title={`♻️ ${t('reset_cycle')}`} variant="ghost" small onPress={() => resetCycle(selected)} /> : null}
              {can(PERM.MEMBER_ARCHIVE) ? (
                <Button
                  title={selected.active ? `▣ ${t('archive_account')}` : `↻ ${t('restore_account')}`}
                  variant={selected.active ? 'danger' : 'primary'}
                  small
                  onPress={() => toggleActive(selected)}
                />
              ) : null}
              <Button title={`💵 ${t('contribution_history')}`} variant="ghost" small onPress={() => loadContributions(selected)} />
            </Row>
            {contribs ? (
              <View style={{ marginTop: spacing.md }}>
                <Muted style={{ fontWeight: '700', marginBottom: spacing.sm }}>
                  {t('contribution_history')} ({contribs.length})
                </Muted>
                {contribs.length === 0 ? <Muted>{t('no_contributions')}</Muted> : null}
                {contribs.map((c) => <ContributionRow key={c.id} contribution={c} />)}
              </View>
            ) : null}
          </>
        ) : null}
      </Sheet>

      {/* Creation / edition */}
      <Sheet
        visible={createSheet}
        onClose={() => setCreateSheet(false)}
        title={editMode ? t('save') : t('new_member')}
        footer={<Button title={t('save')} onPress={save} loading={saving} />}
      >
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}><Field label={t('last_name')} value={form.lastName ?? ''} onChangeText={(v) => setForm({ ...form, lastName: v })} autoCapitalize="words" /></View>
          <View style={{ flex: 1 }}><Field label={t('first_name')} value={form.firstName ?? ''} onChangeText={(v) => setForm({ ...form, firstName: v })} autoCapitalize="words" /></View>
        </Row>
        <Field label={t('phone')} value={form.phone ?? ''} onChangeText={(v) => setForm({ ...form, phone: v })} keyboardType="phone-pad" placeholder="6XX XXX XXX" />
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}><Field label={t('city')} value={form.city ?? ''} onChangeText={(v) => setForm({ ...form, city: v })} autoCapitalize="words" /></View>
          <View style={{ flex: 1 }}><Field label={t('quarter')} value={form.quarter ?? ''} onChangeText={(v) => setForm({ ...form, quarter: v })} autoCapitalize="words" /></View>
        </Row>
        <Field label={t('email')} value={form.email ?? ''} onChangeText={(v) => setForm({ ...form, email: v })} keyboardType="email-address" />
        {!editMode ? <Field label={t('default_password_optional')} value={form.password ?? ''} onChangeText={(v) => setForm({ ...form, password: v })} placeholder="••••••••" /> : null}
        {editMode && can(PERM.MEMBER_THRESHOLD_EDIT) ? <>
          <SelectField label={t('custom_min')} value={form.requiredAssistancesOverride} onChange={(value) => setForm({ ...form, requiredAssistancesOverride: Number(value) })}
            options={[{ value: -1, label: t('global_threshold') }, ...Array.from({ length: 11 }, (_, value) => ({ value, label: `${value} assistance(s)` }))]} />
          <Muted style={{ fontSize: font.tiny, marginTop: -spacing.xs }}>{t('threshold_member_hint')}</Muted>
        </> : null}
        <Row gap={spacing.md} style={{ alignItems: 'center', marginTop: spacing.sm, marginBottom: spacing.sm }}>
          <View style={{ width: 84, height: 84, borderRadius: form.photoShape === 'CIRCLE' ? 42 : 12, overflow: 'hidden', backgroundColor: palette.primarySoft, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center' }}>
            {form.photoUrl ? <Image source={{ uri: assetUrl(form.photoUrl) }} resizeMode="cover" style={{ width: 84, height: 84 }} /> : <Text style={{ color: palette.primary, fontSize: 26, fontWeight: '700' }}>＋</Text>}
          </View>
          <View style={{ flex: 1 }}>
            <Button title={`📷 ${form.photoUrl ? t('photo') : t('share_photo')}`} variant="outline" small onPress={upload} />
            <Row gap={spacing.xs} style={{ flexWrap: 'wrap', marginTop: spacing.sm }}>
              <Chip label={t('photo_circle')} active={form.photoShape === 'CIRCLE'} onPress={() => setForm({ ...form, photoShape: 'CIRCLE' })} />
              <Chip label={t('photo_square')} active={form.photoShape === 'SQUARE'} onPress={() => setForm({ ...form, photoShape: 'SQUARE' })} />
            </Row>
          </View>
        </Row>
      </Sheet>

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}

