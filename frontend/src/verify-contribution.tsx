import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { api, assetUrl, ContributionView } from './api';
import { useApp } from './store';
import { Badge, Button, Field, Sheet } from './ui';
import { font, radius, spacing } from './theme';
import { formatDateTime, formatMoney } from './utils';

/**
 * Ecran de verification du tresorier.
 * Le tresorier controle la cotisation du membre dans l'assistance, confirme qu'il a
 * effectivement percu l'argent (avec reference de recu optionnelle) puis valide.
 */
export function VerifyContributionSheet({
  contribution, onClose, onDone,
}: { contribution: ContributionView | null; onClose: () => void; onDone: () => void }) {
  const { t, palette, lang, settings, toast } = useApp();
  const currency = settings?.currency ?? 'FCFA';
  const [received, setReceived] = useState(false);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contribution) { setReceived(false); setReference(''); setError(null); }
  }, [contribution?.id]);

  const submit = async () => {
    if (!contribution) return;
    if (!received) { setError(t('must_confirm_payment')); return; }
    setBusy(true); setError(null);
    try {
      await api.verifyContribution(contribution.id, {
        paymentReceived: true,
        receiptReference: reference.trim() || undefined,
      });
      toast(t('validation_done'), 'success');
      onDone();
      onClose();
    } catch (e: any) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <Sheet
      visible={!!contribution}
      onClose={onClose}
      title={t('verify_contribution')}
      footer={
        <View style={{ gap: spacing.sm }}>
          {error ? <Text style={{ color: palette.danger, fontSize: font.small }}>{error}</Text> : null}
          <Button title={t('confirm_validation')} icon="✅" onPress={submit} loading={busy} disabled={!received} />
        </View>
      }
    >
      {contribution ? (
        <View>
          {/* rappel : membre + assistance concernes */}
          <View style={{
            backgroundColor: palette.surfaceAlt, borderRadius: radius.md, padding: spacing.md,
            borderWidth: 1, borderColor: palette.border, gap: 4, marginBottom: spacing.md,
          }}>
            <Text style={{ color: palette.text, fontWeight: '800', fontSize: font.body }}>{contribution.memberName}</Text>
            <Text style={{ color: palette.muted, fontSize: font.small }}>
              {contribution.eventTypeName} · {contribution.eventReference}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 4 }}>
              <Text style={{ color: palette.text, fontWeight: '800', fontSize: font.h3 }}>
                {formatMoney(contribution.amount, currency, lang)}
              </Text>
              <Badge label={contribution.method === 'CASH' ? t('cash') : contribution.method === 'MOBILE_MONEY' ? t('mobile_money') : contribution.method === 'TRANSFER' ? t('transfer') : contribution.method} tone="neutral" />
            </View>
            <Text style={{ color: palette.muted, fontSize: font.tiny, marginTop: 2 }}>
              {t('member_declared')} · {formatDateTime(contribution.submittedAt, lang)}
            </Text>
            {contribution.note ? (
              <Text style={{ color: palette.muted, fontSize: font.small, fontStyle: 'italic', marginTop: 4 }}>
                « {contribution.note} »
              </Text>
            ) : null}
            {contribution.proofPhotoUrl ? <Pressable onPress={() => { const url = assetUrl(contribution.proofPhotoUrl); if (url) void Linking.openURL(url); }} style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}>
              <Image source={{ uri: assetUrl(contribution.proofPhotoUrl) }} style={{ width: 144, height: 144, borderRadius: contribution.proofPhotoShape === 'CIRCLE' ? 72 : 12, backgroundColor: palette.surface }} />
              <Text style={{ color: palette.secondary, fontSize: font.tiny, marginTop: 4 }}>{t('open_proof')}</Text>
            </Pressable> : <Text style={{ color: palette.danger }}>{t('no_photo_proof')}</Text>}
          </View>

          <Text style={{ color: palette.muted, fontSize: font.small, lineHeight: 19, marginBottom: spacing.md }}>
            {t('verify_hint')}
          </Text>

          {/* case a cocher : perception effective */}
          <Pressable
            onPress={() => setReceived((v) => !v)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
              borderWidth: 1.5, borderColor: received ? palette.success : palette.border,
              backgroundColor: received ? palette.primarySoft : palette.surfaceAlt,
              borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md,
            }}
          >
            <View style={{
              width: 24, height: 24, borderRadius: 6, borderWidth: 2,
              borderColor: received ? palette.success : palette.border,
              backgroundColor: received ? palette.success : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {received ? <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>✓</Text> : null}
            </View>
            <Text style={{ flex: 1, color: palette.text, fontSize: font.small, fontWeight: '700', lineHeight: 19 }}>
              {t('payment_received_label')}
            </Text>
          </Pressable>

          <Field
            label={t('receipt_reference')}
            value={reference}
            onChangeText={setReference}
            placeholder={t('receipt_placeholder')}
            autoCapitalize="characters"
            maxLength={80}
          />
        </View>
      ) : null}
    </Sheet>
  );
}
