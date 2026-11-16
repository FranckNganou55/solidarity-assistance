import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { api, NotificationList } from './api';
import { useApp } from './store';
import { formatDate } from './utils';

function playChime() {
  if (Platform.OS !== 'web') return;
  try {
    const root = globalThis as any;
    const Audio = root.AudioContext || root.webkitAudioContext;
    if (!Audio) return;
    const context = new Audio();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(880, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(660, context.currentTime + .18);
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.13, context.currentTime + .025);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .35);
    oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .36);
    setTimeout(() => context.close(), 500);
  } catch { /* le navigateur peut désactiver l'audio avant le premier geste */ }
}

export function NotificationsBell() {
  const { token, t, palette, lang } = useApp();
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<NotificationList>({ notifications: [], unreadCount: 0 });
  const initialized = useRef(false);
  const knownIds = useRef<Set<number>>(new Set());
  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const next = await api.notifications();
      const ids = new Set(next.notifications.map((n) => n.id));
      if (initialized.current && Array.from(ids).some((id) => !knownIds.current.has(id))) playChime();
      initialized.current = true; knownIds.current = ids; setData(next);
    } catch { /* la cloche reste disponible si l'API est temporairement inaccessible */ }
  }, [token]);
  useEffect(() => {
    initialized.current = false; knownIds.current = new Set(); setData({ notifications: [], unreadCount: 0 });
    if (!token) return;
    refresh(); const timer = setInterval(refresh, 8000);
    return () => clearInterval(timer);
  }, [token, refresh]);
  const markRead = async (id: number) => { await api.markNotificationRead(id); await refresh(); };
  const markAll = async () => { await api.markAllNotificationsRead(); await refresh(); };
  const localizedNotification = (notification: NotificationList['notifications'][number]) => {
    const message = notification.message;
    const event = message.match(/pour (.+?)(?: a été| et doit|\.$)/i)?.[1] ?? '';
    if (notification.type === 'CONTRIBUTION_SUBMITTED') {
      if (message.includes(' a corrigé une cotisation')) {
        const name = message.split(' a corrigé une cotisation')[0] ?? '';
        return { title: t('notification_contribution_updated_title'), message: t('notification_contribution_updated_body', { name, event }) };
      }
      const name = message.split(' a soumis une cotisation')[0] ?? '';
      return { title: t('notification_contribution_submitted_title'), message: t('notification_contribution_submitted_body', { name, event }) };
    }
    if (notification.type === 'CONTRIBUTION_VALIDATED') {
      return { title: t('notification_contribution_validated_title'), message: t('notification_contribution_validated_body', { event }) };
    }
    if (notification.type === 'CONTRIBUTION_INVALIDATED') {
      return { title: t('notification_contribution_invalidated_title'), message: t('notification_contribution_invalidated_body', { event }) };
    }
    return { title: notification.title, message: notification.message };
  };
  const control = { minWidth: 42, height: 42, paddingHorizontal: 10, borderRadius: 12, backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.border, alignItems: 'center' as const, justifyContent: 'center' as const };
  if (!token) return null;
  return <>
    <Pressable onPress={() => { setOpen(true); refresh(); }} accessibilityRole="button" accessibilityLabel={t('notifications')} style={({ pressed }) => [control, { opacity: pressed ? .7 : 1 }]}>
      <Text style={{ color: palette.text, fontSize: 18 }}>🔔</Text>
      {data.unreadCount > 0 ? <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: palette.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '900' }}>{data.unreadCount > 99 ? '99+' : data.unreadCount}</Text></View> : null}
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: '#15293630', alignItems: 'flex-end', paddingTop: Platform.OS === 'web' ? 70 : 64, paddingHorizontal: 12 }}>
        <Pressable onPress={(e) => e.stopPropagation()} style={{ width: 360, maxWidth: '100%', maxHeight: '78%', borderRadius: 18, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, overflow: 'hidden', elevation: 15, shadowColor: '#193544', shadowOpacity: .16, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } }}>
          <View style={{ padding: 16, borderBottomWidth: 1, borderColor: palette.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View><Text style={{ color: palette.text, fontSize: 15, fontWeight: '900' }}>{t('notifications')}</Text><Text style={{ color: palette.muted, fontSize: 11, marginTop: 3 }}>{data.unreadCount} {t('unread_notifications')}</Text></View>
            {data.unreadCount ? <Pressable onPress={markAll}><Text style={{ color: palette.primary, fontSize: 11, fontWeight: '800' }}>{t('mark_all_read')}</Text></Pressable> : null}
          </View>
          <ScrollView>
            {data.notifications.length === 0 ? <View style={{ padding: 26, alignItems: 'center' }}><Text style={{ color: palette.muted, fontSize: 13 }}>{t('no_notifications')}</Text></View> : data.notifications.map((n) => { const localized = localizedNotification(n); return <Pressable key={n.id} onPress={() => { if (!n.readAt) markRead(n.id); }} style={{ paddingHorizontal: 15, paddingVertical: 13, borderBottomWidth: 1, borderColor: palette.border, backgroundColor: n.readAt ? palette.surface : palette.primarySoft, flexDirection: 'row', gap: 10 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.readAt ? palette.border : palette.primary, marginTop: 5 }} />
              <View style={{ flex: 1 }}><Text style={{ color: palette.text, fontSize: 12, fontWeight: '800' }}>{localized.title}</Text><Text style={{ color: palette.muted, fontSize: 11, marginTop: 3, lineHeight: 16 }}>{localized.message}</Text><Text style={{ color: palette.muted, fontSize: 10, marginTop: 5 }}>{formatDate(n.createdAt, lang)}</Text></View>
            </Pressable>; })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}
