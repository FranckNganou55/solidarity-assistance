import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AuthLayout } from '../src/auth-layout';
import { useApp } from '../src/store';
import { Button, Field } from '../src/ui';
import { font, radius } from '../src/theme';

export default function LoginScreen() {
  const { t, palette, login } = useApp();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!phone.trim() || !password) { setError(t('required_fields')); return; }
    setLoading(true);
    setError(null);
    try {
      const member = await login(phone.trim(), password);
      router.replace(member.mustChangePassword ? '/change-password' : '/(tabs)');
    } catch (e: any) { setError(e?.message ?? t('error')); }
    finally { setLoading(false); }
  };

  return (
    <AuthLayout eyebrow={t('auth_welcome')} title={t('login')} subtitle={t('login_subtitle')} footer={null}>
      <Field label={t('identifier')} value={phone} onChangeText={setPhone} placeholder="6XX XXX XXX" keyboardType="phone-pad" />
      <Field label={t('password')} value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry={!showPassword}
        right={<Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={12} style={{ padding: 6 }}><Text style={{ color: palette.primary, fontSize: 16, fontWeight: '700' }}>{showPassword ? t('auth_hide') : t('auth_show')}</Text></Pressable>} />

      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: -6, marginBottom: 16 }}>
        <Text style={{ color: palette.muted, fontSize: 11 }}>{t('forgot')}</Text>
      </View>
      {error ? <View style={{ backgroundColor: palette.dangerSoft, borderRadius: radius.md, padding: 12, marginBottom: 14 }}><Text style={{ color: palette.danger, fontSize: 12, fontWeight: '700' }}>{error}</Text></View> : null}
      <Button title={t('sign_in')} onPress={submit} loading={loading} style={{ minHeight: 52, borderRadius: 15 }} icon="→" />

    </AuthLayout>
  );
}
