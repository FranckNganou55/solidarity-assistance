import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { api, TypeView } from '../../src/api';
import { Guard } from '../../src/guard';
import { PERM } from '../../src/permissions';
import { useApp, useRefreshOnFocus, useResource } from '../../src/store';
import { Badge, Button, Card, EmptyState, ErrorBox, Field, Header, Loading, Muted, Row, Screen, Sheet } from '../../src/ui';
import { font, radius, spacing } from '../../src/theme';

export default function TypesScreen() {
  return <Guard permission={PERM.ASSISTANCE_TYPE_VIEW}><TypesInner /></Guard>;
}

function TypesInner() {
  const { t, palette, can, toast } = useApp();
  const router = useRouter();
  const typesRes = useResource<TypeView[]>(() => api.types());
  useRefreshOnFocus(useCallback(() => { typesRes.reload(); }, [typesRes.reload]));

  const [sheet, setSheet] = useState(false);
  const [editing, setEditing] = useState<TypeView | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const openCreate = () => { setEditing(null); setName(''); setIcon('🤝'); setDescription(''); setSheet(true); };
  const openEdit = (type: TypeView) => { setEditing(type); setName(type.name); setIcon(type.icon ?? ''); setDescription(type.description ?? ''); setSheet(true); };

  const save = async () => {
    if (!name.trim()) { toast(t('required_fields'), 'error'); return; }
    setSaving(true);
    try {
      if (editing) await api.updateType(editing.id, { name, icon, description });
      else await api.createType({ name, icon, description });
      toast(t('type_saved'), 'success');
      setSheet(false);
      typesRes.reload();
    } catch (e: any) { toast(e.message, 'error'); }
    finally { setSaving(false); }
  };

  const deactivate = async (type: TypeView) => {
    try { await api.deactivateType(type.id); toast(t('type_deactivated'), 'error'); typesRes.reload(); }
    catch (e: any) { toast(e.message, 'error'); }
  };

  const types = typesRes.data ?? [];
  const icons = ['🕊️', '🏥', '💍', '🚑', '👶', '🎓', '🏠', '🔥', '💼', '🤝'];

  return (
    <Screen refreshing={typesRes.loading} onRefresh={typesRes.reload}>
      <Header
        title={t('types_title')}
        subtitle={`${types.length} type(s)`}
        onBack={() => router.back()}
        right={can(PERM.ASSISTANCE_TYPE_CREATE) ? <Button title={`+ ${t('new_type')}`} small onPress={openCreate} /> : undefined}
      />

      {typesRes.error ? <ErrorBox message={typesRes.error} onRetry={typesRes.reload} /> : null}
      {typesRes.loading && !typesRes.data ? <Loading /> : null}
      {!typesRes.loading && types.length === 0 ? <EmptyState icon="🏷️" title={t('no_data')} /> : null}

      {types.map((type) => (
        <Card key={type.id} style={{ marginBottom: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Row gap={spacing.md} style={{ flex: 1 }}>
              <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>{type.icon ?? '🤝'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: palette.text, fontWeight: '800', fontSize: font.body }}>{type.name}</Text>
                {type.description ? <Muted numberOfLines={2}>{type.description}</Muted> : null}
                <Row gap={6} style={{ marginTop: 4 }}>
                  <Badge label={`${type.eventCount} assistance(s)`} />
                  {type.active ? <Badge label={t('active')} tone="success" /> : <Badge label={t('inactive')} tone="danger" />}
                </Row>
              </View>
            </Row>
          </Row>
          {can(PERM.ASSISTANCE_TYPE_EDIT) || can(PERM.ASSISTANCE_TYPE_DELETE) ? (
            <Row gap={6} style={{ marginTop: spacing.sm }}>
              {can(PERM.ASSISTANCE_TYPE_EDIT) ? <Button title={`✏️ ${t('edit')}`} variant="outline" small onPress={() => openEdit(type)} /> : null}
              {can(PERM.ASSISTANCE_TYPE_DELETE) && type.active ? <Button title={`🚫 ${t('deactivate')}`} variant="ghost" small onPress={() => deactivate(type)} /> : null}
            </Row>
          ) : null}
        </Card>
      ))}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title={editing ? editing.name : t('new_type')}
        footer={can(editing ? PERM.ASSISTANCE_TYPE_EDIT : PERM.ASSISTANCE_TYPE_CREATE) ? <Button title={t('save')} onPress={save} loading={saving} /> : null}>
        <Field label={t('type_name')} value={name} onChangeText={setName} autoCapitalize="words" placeholder={t('type_example')} />
        <Field label={t('icon')} value={icon} onChangeText={setIcon} placeholder="🕊️" />
        <Row gap={6} style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
          {icons.map((i) => (
            <Text key={i} onPress={() => setIcon(i)} style={{ fontSize: 22, padding: 4, opacity: icon === i ? 1 : 0.5 }}>{i}</Text>
          ))}
        </Row>
        <Field label={t('description')} value={description} onChangeText={setDescription} multiline autoCapitalize="sentences" />
      </Sheet>

      <View style={{ height: spacing.xl }} />
    </Screen>
  );
}
