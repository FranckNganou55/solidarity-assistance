import React, { useState } from 'react';
import { Alert, Image, Platform, Text, View } from 'react-native';
import { api, assetUrl, GroupView, MemberView } from '../../src/api';
import { Guard } from '../../src/guard';
import { useApp, useResource, useRefreshOnFocus } from '../../src/store';
import { Button, Card, EmptyState, ErrorBox, Field, Header, Loading, Muted, Row, Screen, SelectField } from '../../src/ui';
import { pickAndUpload } from '../../src/upload';
import { font, spacing } from '../../src/theme';

export default function GroupsAdminScreen() {
  return <Guard permission="GROUP_CREATE"><GroupsInner /></Guard>;
}

function GroupsInner() {
  const { t, palette, toast, groups: myGroups, activeGroupId, setActiveGroup, reloadGroups } = useApp();
  const groups = useResource<GroupView[]>(() => api.groups(), []);
  const members = useResource(() => api.members({ size: 100, active: true }), []);
  useRefreshOnFocus(groups.reload);
  const [form, setForm] = useState({ name: '', logoUrl: '', city: 'Makenene', description: '', contactPhone: '', contactEmail: '', primaryColor: '#264557', accentColor: '#F3856A', currency: 'FCFA', minAssistancesRequired: '2', firstName: '', lastName: '', phone: '', quarter: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [addingTo, setAddingTo] = useState<number | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const set = (key: keyof typeof form, value: string) => setForm((prev) => ({ ...prev, [key]: value }));
  const clearForm = () => {
    setEditingGroupId(null);
    setForm({ name: '', logoUrl: '', city: 'Makenene', description: '', contactPhone: '', contactEmail: '', primaryColor: '#264557', accentColor: '#F3856A', currency: 'FCFA', minAssistancesRequired: '2', firstName: '', lastName: '', phone: '', quarter: '', email: '', password: '' });
  };
  const groupPayload = () => ({
    name: form.name.trim(), logoUrl: form.logoUrl || null, city: form.city || null,
    description: form.description || null, contactPhone: form.contactPhone || null,
    contactEmail: form.contactEmail || null, primaryColor: form.primaryColor,
    accentColor: form.accentColor, currency: form.currency,
    minAssistancesRequired: Math.max(0, Number(form.minAssistancesRequired) || 0),
  });
  const save = async () => {
    if (!form.name.trim() || (!editingGroupId && (!form.firstName.trim() || !form.lastName.trim() || !form.phone.trim()))) {
      toast(editingGroupId ? t('group_name_required') : t('group_admin_required'), 'error'); return;
    }
    setSaving(true);
    try {
      if (editingGroupId) {
        const updated = await api.updateGroup(editingGroupId, groupPayload());
        toast(t('group_updated', { name: updated.name }), 'success');
      } else {
        const created = await api.createGroup({
          ...groupPayload(),
          admin: { firstName: form.firstName, lastName: form.lastName, phone: form.phone, quarter: form.quarter, email: form.email, password: form.password || null },
        });
        toast(t('group_created', { name: created.name }), 'success');
      }
      clearForm();
      await Promise.all([groups.reload(), reloadGroups()]);
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };
  const uploadLogo = async () => {
    try { const url = await pickAndUpload('image'); if (url) set('logoUrl', url); }
    catch (e: any) { toast(e.message, 'error'); }
  };
  const addMember = async (groupId: number) => {
    if (selectedMemberId == null) { toast(t('choose_active_group_member'), 'error'); return; }
    setAddingTo(groupId);
    try { await api.addExistingMemberToGroup(groupId, selectedMemberId); toast(t('group_member_added'), 'success'); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setAddingTo(null); }
  };
  const editGroup = (group: GroupView) => {
    setEditingGroupId(group.id);
    setForm({ name: group.name, logoUrl: group.logoUrl ?? '', city: group.city ?? '', description: group.description ?? '', contactPhone: group.contactPhone ?? '', contactEmail: group.contactEmail ?? '', primaryColor: group.primaryColor, accentColor: group.accentColor, currency: group.currency, minAssistancesRequired: String(group.minAssistancesRequired), firstName: '', lastName: '', phone: '', quarter: '', email: '', password: '' });
  };
  const removeGroup = (group: GroupView) => {
    const run = async () => {
      setSaving(true);
      try {
        if (activeGroupId === group.id) {
          const fallback = myGroups.find((item) => item.id !== group.id);
          if (!fallback) { toast(t('keep_one_active_group'), 'error'); return; }
          await setActiveGroup(fallback.id);
        }
        await api.deleteGroup(group.id);
        toast(t('group_archived', { name: group.name }), 'success');
        if (editingGroupId === group.id) clearForm();
        await Promise.all([groups.reload(), reloadGroups()]);
      } catch (e: any) { toast(e.message, 'error'); }
      finally { setSaving(false); }
    };
    const message = t('confirm_archive_group', { name: group.name });
    if (Platform.OS === 'web') { if (window.confirm(message)) void run(); }
    else Alert.alert(t('delete_group'), message, [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => void run() },
    ]);
  };
  return <Screen refreshing={groups.loading} onRefresh={groups.reload}>
    <Header title={t('groups_title')} subtitle={t('groups_create_reserved')} />
    {groups.error ? <ErrorBox message={groups.error} onRetry={groups.reload} /> : null}
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={{ color: palette.text, fontSize: font.h3, fontWeight: '900', marginBottom: spacing.sm }}>{editingGroupId ? t('edit_group_title') : t('create_group')}</Text>
      <Field label={t('group_name')} value={form.name} onChangeText={(v) => set('name', v)} placeholder={t('group_name_example')} />
      <Row gap={spacing.sm}>
        <View style={{ flex: 1 }}><Field label={t('city_locality')} value={form.city} onChangeText={(v) => set('city', v)} /></View>
        <View style={{ flex: 1 }}><Field label={t('group_currency')} value={form.currency} onChangeText={(v) => set('currency', v)} /></View>
      </Row>
      <Field label={t('group_description')} value={form.description} onChangeText={(v) => set('description', v)} multiline />
      <Button title={`▧ ${form.logoUrl ? t('change_logo') : t('add_group_logo')}`} variant="outline" small onPress={uploadLogo} />
      {form.logoUrl ? <Image source={{ uri: assetUrl(form.logoUrl) }} style={{ width: 74, height: 74, borderRadius: 14, marginVertical: 9 }} /> : null}
      <Row gap={spacing.sm} style={{ marginTop: spacing.sm }}>
        <View style={{ flex: 1 }}><Field label={t('group_contact_phone')} value={form.contactPhone} onChangeText={(v) => set('contactPhone', v)} keyboardType="phone-pad" /></View>
        <View style={{ flex: 1 }}><Field label={t('group_contact_email')} value={form.contactEmail} onChangeText={(v) => set('contactEmail', v)} keyboardType="email-address" /></View>
      </Row>
      <Row gap={spacing.sm}>
        <View style={{ flex: 1 }}><Field label={t('primary_color_hex')} value={form.primaryColor} onChangeText={(v) => set('primaryColor', v)} /></View>
        <View style={{ flex: 1 }}><Field label={t('accent_color_hex')} value={form.accentColor} onChangeText={(v) => set('accentColor', v)} /></View>
      </Row>
      <Field label={t('general_assistance_threshold')} value={String(form.minAssistancesRequired)} onChangeText={(v) => set('minAssistancesRequired', v.replace(/[^0-9]/g, ''))} keyboardType="numeric" placeholder="0" />
      {!editingGroupId ? <>
        <Text style={{ color: palette.text, fontSize: font.body, fontWeight: '800', marginTop: spacing.sm, marginBottom: spacing.sm }}>{t('principal_group_admin')}</Text>
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}><Field label={t('first_name')} value={form.firstName} onChangeText={(v) => set('firstName', v)} /></View>
          <View style={{ flex: 1 }}><Field label={t('last_name')} value={form.lastName} onChangeText={(v) => set('lastName', v)} /></View>
        </Row>
        <Field label={t('login_phone')} value={form.phone} onChangeText={(v) => set('phone', v)} keyboardType="phone-pad" />
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}><Field label={t('neighborhood')} value={form.quarter} onChangeText={(v) => set('quarter', v)} /></View>
          <View style={{ flex: 1 }}><Field label={t('group_email')} value={form.email} onChangeText={(v) => set('email', v)} keyboardType="email-address" /></View>
        </Row>
        <Field label={t('password_optional')} value={form.password} onChangeText={(v) => set('password', v)} secureTextEntry placeholder={t('default_temporary_password')} />
      </> : null}
      <Row gap={spacing.sm} style={{ marginTop: spacing.sm }}>
        <Button title={editingGroupId ? t('save_group_changes') : t('create_group_with_admin')} onPress={save} loading={saving} style={{ flex: 1 }} />
        {editingGroupId ? <Button title={t('cancel')} variant="outline" onPress={clearForm} disabled={saving} /> : null}
      </Row>
    </Card>
    <Header title={t('existing_groups')} subtitle={t('group_count', { n: groups.data?.length ?? 0 })} />
    {members.error ? <ErrorBox message={members.error} onRetry={members.reload} /> : null}
    {myGroups.length > 1 && members.data?.content?.length ? <Card style={{ marginBottom: spacing.md }}>
      <Text style={{ color: palette.text, fontWeight: '800', marginBottom: spacing.sm }}>{t('assign_member_other_group')}</Text>
      <SelectField label={t('active_group_member')} value={selectedMemberId} options={members.data.content.filter((m: MemberView) => !m.superAdmin).map((m: MemberView) => ({ value: m.id, label: `${m.fullName} · ${m.phone}` }))} onChange={setSelectedMemberId} placeholder={t('choose_member')} />
      <Muted>{t('member_group_switch_hint')}</Muted>
    </Card> : null}
    {groups.loading && !groups.data ? <Loading /> : null}
    {!groups.loading && !groups.data?.length ? <EmptyState icon="▦" title={t('no_groups')} text={t('groups_created_appear')} /> : null}
    {(groups.data ?? []).map((group) => <Card key={group.id} style={{ marginBottom: spacing.sm }}>
      <Row gap={spacing.md}>
        {group.logoUrl ? <Image source={{ uri: assetUrl(group.logoUrl) }} style={{ width: 52, height: 52, borderRadius: 12 }} /> : null}
        <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '900', fontSize: font.body }}>{group.name}</Text><Muted>{group.city || '—'} · {t('group_threshold_summary', { n: group.minAssistancesRequired })} · {group.currency}</Muted><Muted>{group.contactPhone || group.contactEmail || t('no_contact')}</Muted></View>
      </Row>
      {myGroups.length > 1 && activeGroupId !== group.id && selectedMemberId != null ? <Button title={t('add_member_to_group')} small variant="outline" loading={addingTo === group.id} onPress={() => addMember(group.id)} style={{ marginTop: spacing.sm }} /> : null}
      <Row gap={spacing.sm} style={{ marginTop: spacing.sm }}>
        <Button title={t('edit')} icon="✎" small variant="outline" disabled={saving} onPress={() => editGroup(group)} />
        <Button title={t('delete')} icon="⌫" small variant="danger" disabled={saving || groups.data!.length <= 1} onPress={() => removeGroup(group)} />
      </Row>
    </Card>)}
    <View style={{ height: spacing.xl }} />
  </Screen>;
}
