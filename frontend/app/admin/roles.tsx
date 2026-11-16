import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { api, PermissionView, RoleView } from '../../src/api';
import { Guard } from '../../src/guard';
import { PERM } from '../../src/permissions';
import { useApp, useRefreshOnFocus, useResource } from '../../src/store';
import { Badge, Button, Card, Chip, EmptyState, ErrorBox, Field, Header, Loading, Muted, Row, Screen, SectionTitle, Sheet } from '../../src/ui';
import { font, radius, spacing } from '../../src/theme';

export default function RolesScreen() {
  return <Guard permission={PERM.ROLE_VIEW}><RolesInner /></Guard>;
}

function RolesInner() {
  const { t, palette, can, toast, lang } = useApp();
  const router = useRouter();
  const rolesRes = useResource<RoleView[]>(() => api.roles());
  const permsRes = useResource<PermissionView[]>(() => api.permissions());
  useRefreshOnFocus(useCallback(() => { rolesRes.reload(); }, [rolesRes.reload]));

  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<RoleView | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, PermissionView[]>();
    (permsRes.data ?? []).forEach((p) => {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    });
    return Array.from(map.entries());
  }, [permsRes.data]);

  const openCreate = () => {
    setEditing(null); setCode(''); setName(''); setDescription(''); setSelectedPerms([]); setSheet(true);
  };
  const openEdit = (role: RoleView) => {
    setEditing(role); setCode(role.code); setName(role.name); setDescription(role.description ?? '');
    setSelectedPerms(role.permissions); setSheet(true);
  };

  const toggle = (perm: string) => {
    setSelectedPerms((prev) => prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]);
  };

  const save = async () => {
    if (!code.trim() || !name.trim()) { toast(t('required_fields'), 'error'); return; }
    setSaving(true);
    try {
      if (editing) await api.updateRole(editing.id, { code, name, description, permissions: selectedPerms });
      else await api.createRole({ code, name, description, permissions: selectedPerms });
      toast(t('role_saved'), 'success');
      setSheet(false);
      rolesRes.reload();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const remove = async (role: RoleView) => {
    try { await api.deleteRole(role.id); toast(t('role_deleted'), 'success'); rolesRes.reload(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const roles = rolesRes.data ?? [];
  const labelOf = (code: string) => {
    const perm = (permsRes.data ?? []).find((p) => p.code === code);
    return perm ? (lang === 'fr' ? perm.labelFr : perm.labelEn) : code;
  };

  return (
    <Screen refreshing={rolesRes.loading} onRefresh={rolesRes.reload}>
      <Header
        title={t('roles_title')}
        subtitle={t('roles_permissions_count', { roles: roles.length, permissions: permsRes.data?.length ?? 0 })}
        onBack={() => router.back()}
        right={can(PERM.ROLE_CREATE) ? <Button title={`+ ${t('new_role')}`} small onPress={openCreate} /> : undefined}
      />

      <Card style={{ marginBottom: spacing.md, backgroundColor: palette.primarySoft }}>
        <Text style={{ color: palette.primary, fontSize: font.small, fontWeight: '800', marginBottom: 4 }}>{t('roles')}</Text>
        <Muted style={{ fontSize: font.tiny }}>{t('role_assignment_hint')}</Muted>
      </Card>

      {rolesRes.error ? <ErrorBox message={rolesRes.error} onRetry={rolesRes.reload} /> : null}
      {rolesRes.loading && !rolesRes.data ? <Loading /> : null}
      {!rolesRes.loading && roles.length === 0 ? <EmptyState icon="🔐" title={t('no_data')} /> : null}

      {roles.map((role) => (
        <Card key={role.id} style={{ marginBottom: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Row gap={6}>
                <Text style={{ color: palette.text, fontWeight: '800', fontSize: font.body }}>{role.name}</Text>
                {role.systemRole ? <Badge label={t('system_role')} tone="neutral" /> : null}
              </Row>
              <Muted style={{ fontSize: font.tiny, marginTop: 2 }}>{role.code} · {t('members_count', { n: role.memberCount })}</Muted>
              {role.description ? <Muted style={{ marginTop: 4 }}>{role.description}</Muted> : null}
            </View>
          </Row>
          <Row gap={4} style={{ flexWrap: 'wrap', marginTop: spacing.sm }}>
            {role.permissions.slice(0, 4).map((p) => (
              <View key={p} style={{ backgroundColor: palette.primarySoft, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: palette.primary, fontSize: 9.5, fontWeight: '700' }}>{labelOf(p)}</Text>
              </View>
            ))}
            {role.permissions.length > 4 ? <Muted style={{ fontSize: font.tiny }}>+{role.permissions.length - 4}</Muted> : null}
          </Row>
          {can(PERM.ROLE_EDIT) || (can(PERM.ROLE_DELETE) && !role.systemRole) ? (
            <Row gap={6} style={{ marginTop: spacing.sm }}>
              {can(PERM.ROLE_EDIT) ? <Button title={`✏️ ${t('edit')}`} variant="outline" small onPress={() => openEdit(role)} /> : null}
              {can(PERM.ROLE_DELETE) && !role.systemRole ? <Button title={`🗑 ${t('deactivate')}`} variant="ghost" small onPress={() => remove(role)} /> : null}
            </Row>
          ) : null}
        </Card>
      ))}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={editing ? editing.name : t('new_role')}
        footer={can(editing ? PERM.ROLE_EDIT : PERM.ROLE_CREATE) ? <Button title={t('save')} onPress={save} loading={saving} /> : null}>
        <Field label={t('role_name')} value={name} onChangeText={setName} autoCapitalize="words" />
        <Field label={t('role_code')} value={code} onChangeText={(v) => setCode(v.toUpperCase())} placeholder="TRESORIER" editable={!editing?.systemRole} />
        <Field label={t('description')} value={description} onChangeText={setDescription} multiline autoCapitalize="sentences" />

        <Text style={{ color: palette.muted, fontWeight: '800', fontSize: font.small, marginTop: spacing.sm, marginBottom: spacing.sm }}>
          {t('permissions')} ({selectedPerms.length})
        </Text>
        {groups.map(([group, perms]) => (
          <View key={group} style={{ marginBottom: spacing.md }}>
            <Text style={{ color: palette.accent, fontWeight: '800', fontSize: font.tiny, textTransform: 'uppercase', marginBottom: 6 }}>{group}</Text>
            {perms.map((perm) => {
              const active = selectedPerms.includes(perm.code);
              return (
                <View key={perm.code} style={{
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                  paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: palette.border,
                }}>
                  <View style={{ flex: 1, paddingRight: spacing.sm }}>
                    <Text style={{ color: palette.text, fontSize: font.small, fontWeight: active ? '700' : '500' }}>
                      {lang === 'fr' ? perm.labelFr : perm.labelEn}
                    </Text>
                    <Text style={{ color: palette.muted, fontSize: 10 }}>{perm.code}</Text>
                  </View>
                  <Chip label={active ? '✓' : '+'} active={active} onPress={() => toggle(perm.code)} />
                </View>
              );
            })}
          </View>
        ))}
      </Sheet>

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
