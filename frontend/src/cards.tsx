import React from 'react';
import { Linking, Pressable, Text, View, Image } from 'react-native';
import { assetUrl, ContributionView, EventView, RequestView } from './api';
import { useApp } from './store';
import { Avatar, Badge, Body, Button, Card, Muted, Row } from './ui';
import { font, radius, spacing } from './theme';
import { formatDate, formatDateTime, formatMoney, STATUS_COLORS } from './utils';

export function EventCard({ event, onPress }: { event: EventView; onPress?: () => void }) {
  const { t, palette, lang, settings } = useApp();
  const currency = settings?.currency ?? 'FCFA';
  const statusLabel =
    event.status === 'OPEN' ? t('status_open') : event.status === 'CLOSED' ? t('status_closed') : t('status_cancelled');
  const progress = event.targetAmount && event.targetAmount > 0
    ? Math.min(100, Math.round((event.collectedAmount / event.targetAmount) * 100))
    : null;

  return (
    <Card onPress={onPress} style={{ marginBottom: spacing.md }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Row gap={10} style={{ flex: 1 }}>
          <View style={{
            width: 42, height: 42, borderRadius: 14, backgroundColor: palette.primarySoft,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 20 }}>{event.typeIcon ?? '🤝'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontWeight: '800', fontSize: font.body }} numberOfLines={1}>
              {event.typeName} · {event.beneficiaryName}
            </Text>
            <Muted numberOfLines={1} style={{ marginTop: 1 }}>{event.description}</Muted>
          </View>
        </Row>
        <Badge label={statusLabel} tone={STATUS_COLORS[event.status] as any} />
      </Row>

      {event.status === 'CLOSED' ? (
        <View style={{ marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: palette.surfaceAlt }}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: spacing.xs }}>
            <Muted style={{ fontSize: font.tiny }}>{t('requested_date')} : {formatDateTime(event.requestedAt ?? event.createdAt, lang)}</Muted>
            <Muted style={{ fontSize: font.tiny }}>{t('closed_on')} : {event.closedAt ? formatDateTime(event.closedAt, lang) : event.closingDate ? formatDate(event.closingDate, lang) : '—'}</Muted>
          </Row>
        </View>
      ) : null}
      {event.eligibilityOverridden ? <Muted style={{ marginTop: spacing.xs, color: palette.accent, fontSize: font.tiny }}>{t('exemption_by', { name: event.eligibilityOverrideByName ?? t('principal_admin_fallback') })}</Muted> : null}

      <Row style={{ justifyContent: 'space-between', marginTop: spacing.md }}>
        <View>
          <Muted style={{ fontSize: font.tiny }}>{t('collected')}</Muted>
          <Text style={{ color: palette.primary, fontWeight: '800', fontSize: font.body }}>{formatMoney(event.collectedAmount, currency, lang)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Muted style={{ fontSize: font.tiny }}>{t('closing_date')}</Muted>
          <Text style={{ color: palette.text, fontWeight: '700', fontSize: font.small }}>
            {event.closingDate ? formatDate(event.closingDate, lang) : t('no_deadline')}
          </Text>
        </View>
      </Row>

      {progress !== null ? (
        <View style={{ marginTop: spacing.sm }}>
          <View style={{ height: 6, backgroundColor: palette.border, borderRadius: radius.pill, overflow: 'hidden' }}>
            <View style={{ width: `${progress}%`, height: '100%', backgroundColor: palette.accent }} />
          </View>
          <Muted style={{ fontSize: font.tiny, marginTop: 4 }}>
            {progress}% · {t('target')} {formatMoney(event.targetAmount, currency, lang)}
          </Muted>
        </View>
      ) : null}

      <Row style={{ marginTop: spacing.sm, justifyContent: 'space-between' }}>
        <Muted style={{ fontSize: font.tiny }}>
          {event.contributionCount} {t('participants')} · {event.reference}
        </Muted>
        {event.status === 'OPEN' && event.contributionsOpen && event.daysLeft >= 0 ? (
          <Text style={{ color: palette.accent, fontSize: font.tiny, fontWeight: '800' }}>{t('days_left', { n: event.daysLeft })}</Text>
        ) : null}
      </Row>

      {event.myContribution ? (
        <View style={{ marginTop: spacing.sm, backgroundColor: palette.surfaceAlt, borderRadius: radius.sm, padding: spacing.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Muted style={{ fontSize: font.tiny }}>{t('your_contribution')}</Muted>
            <Text style={{ color: palette.text, fontSize: font.small, fontWeight: '700' }}>
              {formatMoney(event.myContribution.amount, currency, lang)}
            </Text>
          </Row>
        </View>
      ) : null}
    </Card>
  );
}

export function ContributionRow({
  contribution, showMember, actions, onPress, onPressLabel,
}: {
  contribution: ContributionView;
  showMember?: boolean;
  actions?: React.ReactNode;
  onPress?: () => void;
  onPressLabel?: string;
}) {
  const { t, palette, lang, settings } = useApp();
  const currency = settings?.currency ?? 'FCFA';
  const statusLabel = contribution.status === 'VALIDATED' ? t('validated')
    : contribution.status === 'PENDING' ? t('pending_validation') : contribution.status === 'INVALIDATED' ? t('invalidated') : t('rejected');

  return (
    <Card style={{ marginBottom: spacing.sm, padding: spacing.md }}>
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} accessibilityLabel={onPress ? onPressLabel ?? t('open_assistance') : undefined} style={({ pressed }) => ({ opacity: onPress && pressed ? 0.78 : 1 })}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm }}>
        <Row gap={10} style={{ flex: 1, minWidth: 0 }}>
          <Avatar name={showMember ? contribution.memberName : contribution.eventTypeName} uri={showMember ? contribution.memberPhotoUrl : undefined} size={38} shape={showMember ? contribution.memberPhotoShape : undefined} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: palette.text, fontWeight: '700', fontSize: font.small }} numberOfLines={1}>
              {showMember ? contribution.memberName : `${contribution.eventTypeName} · ${contribution.eventReference}`}
            </Text>
            <Muted style={{ fontSize: font.tiny, marginTop: 1 }}>
              {showMember ? `${contribution.eventReference} · ` : ''}{formatDateTime(contribution.submittedAt, lang)}{onPress ? ` · ${onPressLabel ?? t('open_assistance')} →` : ''}
            </Muted>
          </View>
        </Row>
        <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
          <Text style={{ color: palette.text, fontWeight: '800', fontSize: font.body }}>{formatMoney(contribution.amount, currency, lang)}</Text>
          <Badge label={statusLabel} tone={STATUS_COLORS[contribution.status] as any} />
        </View>
      </Row>
      </Pressable>
      {contribution.status === 'VALIDATED' ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.xs, flexWrap: 'wrap' }}>
          <Badge
            label={`${contribution.paymentReceived ? '💵' : '⏳'} ${contribution.paymentReceived ? t('payment_received_badge') : t('not_received_badge')}`}
            tone={contribution.paymentReceived ? 'success' : 'warning'}
          />
          {contribution.receiptReference ? (
            <Muted style={{ fontSize: font.tiny }}>#{contribution.receiptReference}</Muted>
          ) : null}
          {contribution.paymentReceivedByName ? (
            <Muted style={{ fontSize: font.tiny }}>{t('verified_by')} {contribution.paymentReceivedByName}</Muted>
          ) : null}
        </View>
      ) : contribution.status === 'PENDING' ? (
        <View style={{ marginTop: spacing.xs }}>
          <Badge label={`⏳ ${t('to_verify')}`} tone="warning" />
        </View>
      ) : null}
      {contribution.note ? <Muted style={{ marginTop: spacing.xs, fontStyle: 'italic' }} numberOfLines={2}>« {contribution.note} »</Muted> : null}
      {contribution.proofPhotoUrl ? <Pressable onPress={() => { const url = assetUrl(contribution.proofPhotoUrl); if (url) void Linking.openURL(url); }} style={{ alignSelf: 'flex-start', marginTop: spacing.sm }}>
        <Image source={{ uri: assetUrl(contribution.proofPhotoUrl) }} style={{ width: 88, height: 88, borderRadius: contribution.proofPhotoShape === 'CIRCLE' ? 44 : 12, backgroundColor: palette.surfaceAlt }} />
        <Muted style={{ fontSize: font.tiny, marginTop: 3 }}>{t('proof_photo')}</Muted>
      </Pressable> : null}
      {contribution.rejectionReason ? (
        <Muted style={{ marginTop: 4, color: palette.danger, fontSize: font.tiny }}>{contribution.rejectionReason}</Muted>
      ) : null}
      {actions ? <Row style={{ marginTop: spacing.sm, gap: spacing.sm }}>{actions}</Row> : null}
    </Card>
  );
}

export function RequestCard({
  request, actions, showMember,
}: { request: RequestView; actions?: React.ReactNode; showMember?: boolean }) {
  const { t, palette, lang } = useApp();
  const statusLabel = request.status === 'APPROVED' ? t('approved')
    : request.status === 'REJECTED' ? t('rejected') : t('pending');
  return (
    <Card style={{ marginBottom: spacing.sm }}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Row gap={10} style={{ flex: 1 }}>
          <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: palette.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 17 }}>{request.typeIcon ?? '📩'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: palette.text, fontWeight: '800', fontSize: font.small }} numberOfLines={1}>
              {request.typeName}{showMember ? ` · ${request.memberName}` : ''}
            </Text>
            <Muted style={{ fontSize: font.tiny, marginTop: 1 }}>{formatDateTime(request.createdAt, lang)}</Muted>
          </View>
        </Row>
        <Badge label={statusLabel} tone={STATUS_COLORS[request.status] as any} />
      </Row>
      <Body style={{ marginTop: spacing.sm, fontSize: font.small }} numberOfLines={3}>{request.reason}</Body>
      {request.cycleCountAtRequest !== undefined && request.minRequiredAtRequest !== undefined ? (
        <Muted style={{ marginTop: 4, fontSize: font.tiny }}>
          {t('eligibility')} : {request.cycleCountAtRequest}/{request.minRequiredAtRequest}
        </Muted>
      ) : null}
      {request.decisionComment ? (
        <Muted style={{ marginTop: 4, fontSize: font.tiny, fontStyle: 'italic' }}>{t('decision')} : {request.decisionComment}</Muted>
      ) : null}
      {request.eventReference ? (
        <Muted style={{ marginTop: 4, fontSize: font.tiny }}>→ {request.eventReference}</Muted>
      ) : null}
      {request.documentUrl ? <Pressable onPress={() => { const url = assetUrl(request.documentUrl); if (url) void Linking.openURL(url); }} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }}>
        <Text style={{ color: palette.secondary, fontSize: font.small, fontWeight: '700' }}>{t('photo_proof_open')}</Text>
      </Pressable> : null}
      {actions ? <Row style={{ marginTop: spacing.sm, gap: spacing.sm, flexWrap: 'wrap' }}>{actions}</Row> : null}
    </Card>
  );
}

export function PressableTile({
  icon, label, onPress, badge,
}: { icon: string; label: string; onPress: () => void; badge?: string }) {
  const { palette } = useApp();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1, minWidth: 150, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border,
        borderRadius: radius.md, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 10,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={{ color: palette.text, fontWeight: '700', fontSize: font.small, flex: 1 }} numberOfLines={1}>{label}</Text>
      {badge ? <Badge label={badge} tone="warning" /> : null}
      <Text style={{ color: palette.muted }}>›</Text>
    </Pressable>
  );
}
