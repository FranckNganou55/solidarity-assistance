import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { api } from '../src/api';
import { useApp } from '../src/store';
import { Button, Card, Field, Muted, Row } from '../src/ui';
import { font, radius, spacing } from '../src/theme';

export default function ChangePasswordScreen() {
  const { t, palette, member, refreshMe, logout, toast } = useApp();
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!current || !next || !confirm) { setError(t('required_fields')); return; }
    if (next !== confirm) { setError(t('passwords_dont_match')); return; }
    if (next.length < 6) { setError(t('password_min_length')); return; }
    setLoading(true);
    setError(null);
    try {
      await api.changePassword(current, next);
      await refreshMe();
      toast(t('success'), 'success');
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: spacing.lg }}>
        <View style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <Card>
            <Text style={{ fontSize: 34, marginBottom: spacing.sm }}>🔒</Text>
            <Text style={{ fontSize: font.h2, fontWeight: '800', color: palette.text }}>{t('must_change_title')}</Text>
            <Muted style={{ marginTop: 4, marginBottom: spacing.lg }}>{t('must_change_text')}</Muted>
            {member ? <Muted style={{ marginBottom: spacing.md }}>{member.fullName} · {member.phone}</Muted> : null}

            <Field label={t('current_password')} value={current} onChangeText={setCurrent} secureTextEntry placeholder="••••••" />
            <Field label={t('new_password')} value={next} onChangeText={setNext} secureTextEntry placeholder="••••••" />
            <Field label={t('confirm_password')} value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••" />

            {error ? (
              <View style={{ backgroundColor: palette.dangerSoft, borderRadius: radius.sm, padding: spacing.sm, marginBottom: spacing.md }}>
                <Text style={{ color: palette.danger, fontSize: font.small, fontWeight: '600' }}>{error}</Text>
              </View>
            ) : null}

            <Button title={t('save')} onPress={submit} loading={loading} />
            <Row style={{ marginTop: spacing.md, justifyContent: 'center' }}>
              <Button title={t('logout')} variant="ghost" small onPress={async () => { await logout(); router.replace('/login'); }} />
            </Row>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
