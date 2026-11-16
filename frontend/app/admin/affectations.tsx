import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { api, MemberView, RoleView } from '../../src/api';
import { Guard } from '../../src/guard';
import { PERM } from '../../src/permissions';
import { useApp, useRefreshOnFocus, useResource } from '../../src/store';
import { Badge, Button, Card, EmptyState, ErrorBox, Header, Loading, Muted, Row, Screen, SelectField } from '../../src/ui';
import { font, spacing } from '../../src/theme';

export default function RoleAssignmentsScreen() {
  return <Guard permission={PERM.ROLE_ASSIGN}><AssignmentsInner /></Guard>;
}

function AssignmentsInner() {
  const { t, palette, toast } = useApp();
  const members = useResource(() => api.members({ size: 100, active: true }), []);
  const roles = useResource<RoleView[]>(() => api.roles(), []);
  const [memberId, setMemberId] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const refresh = useCallback(() => { members.reload(); roles.reload(); }, [members.reload, roles.reload]);
  useRefreshOnFocus(refresh);
  const memberList = members.data?.content ?? [];
  const roleList = roles.data ?? [];
  const assign = async () => {
    if (memberId == null || roleId == null) { toast(t('choose_member_role'), 'error'); return; }
    setSaving(true);
    try { await api.assignMemberRole(memberId, roleId); toast(t('role_assigned'), 'success'); refresh(); }
    catch (e: any) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };
  return <Screen refreshing={members.loading || roles.loading} onRefresh={refresh}>
    <Header title={t('role_assignment_title')} subtitle={t('role_assignment_subtitle')} />
    {members.error ? <ErrorBox message={members.error} onRetry={members.reload} /> : null}
    {roles.error ? <ErrorBox message={roles.error} onRetry={roles.reload} /> : null}
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={{ color: palette.text, fontSize: font.h3, fontWeight: '900', marginBottom: spacing.md }}>{t('role_assign_title')}</Text>
      <SelectField label={t('active_group_member')} value={memberId} options={memberList.map((m) => ({ value: m.id, label: `${m.fullName} · ${m.phone}`, hint: m.roleName }))} onChange={(v) => setMemberId(v)} placeholder={t('select_member_placeholder')} />
      <SelectField label={t('group_role')} value={roleId} options={roleList.map((r) => ({ value: r.id, label: r.name, hint: r.code }))} onChange={(v) => setRoleId(v)} placeholder={t('select_role_placeholder')} />
      <Button title={t('save_assignment')} onPress={assign} loading={saving} />
    </Card>
    {members.loading && !members.data ? <Loading /> : null}
    {memberList.length === 0 && !members.loading ? <EmptyState icon="♙" title={t('no_active_member')} text={t('create_members_first')} /> : null}
    {memberList.map((m: MemberView) => <Card key={m.id} style={{ marginBottom: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between', gap: spacing.md }}>
        <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontWeight: '800' }}>{m.fullName}</Text><Muted>{m.phone}</Muted></View>
        <Badge label={m.roleName} tone={m.groupAdmin ? 'primary' : 'neutral'} />
      </Row>
    </Card>)}
  </Screen>;
}
