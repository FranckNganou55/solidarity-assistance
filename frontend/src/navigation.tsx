import { usePathname, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { assetUrl, GroupView } from './api';
import { PERM } from './permissions';
import { useApp } from './store';
import { radius, spacing } from './theme';
import { NotificationsBell } from './notifications';
type NavItem = { label: string; icon: string; path: string; permission?: string };
type NavGroup = { id: string; title: string; icon: string; items: NavItem[] };

export function DesktopSidebar() {
  const { t, palette, member, settings, groups, activeGroupId, can, logout } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const cleanPath = pathname.replace('/(tabs)', '') || '/';
  const navGroups = useMemo<NavGroup[]>(() => [
    {
      id: 'overview', title: t('nav_overview'), icon: '⌂', items: [
        { label: t('tab_home'), icon: '◫', path: '/(tabs)' },
        { label: t('my_stats'), icon: '▥', path: '/mes-statistiques' },
        { label: t('tab_assistances'), icon: '♡', path: '/(tabs)/assistances', permission: PERM.EVENT_VIEW },
        { label: t('tab_events'), icon: '▣', path: '/evenements', permission: PERM.EVENT_VIEW },
        { label: t('tab_contributions'), icon: '↗', path: '/(tabs)/cotisations', permission: PERM.CONTRIBUTION_VIEW },
        { label: t('tab_requests'), icon: '▤', path: '/(tabs)/demandes', permission: PERM.REQUEST_CREATE },
      ],
    },
    {
      id: 'management', title: t('nav_management'), icon: '▦', items: [
        { label: t('members'), icon: '♙', path: '/admin/membres', permission: PERM.MEMBER_VIEW },
        { label: t('types'), icon: '◇', path: '/admin/types', permission: PERM.ASSISTANCE_TYPE_VIEW },
        { label: t('audit'), icon: '◷', path: '/admin/audit', permission: PERM.AUDIT_VIEW },
      ],
    },
    {
      id: 'administration', title: t('nav_administration'), icon: '♜', items: [
        ...(member?.groupAdmin || member?.superAdmin ? [{ label: t('bureau_title'), icon: '♙', path: '/admin/administration', permission: PERM.MEMBER_EDIT }] : []),
        { label: t('roles'), icon: '♧', path: '/admin/roles', permission: PERM.ROLE_VIEW },
        { label: t('role_assignments'), icon: '⇄', path: '/admin/affectations', permission: PERM.ROLE_ASSIGN },
        ...(member?.superAdmin ? [{ label: t('groups_title'), icon: '▦', path: '/admin/groupes' }] : []),
      ],
    },
  ].map((g) => ({ ...g, items: g.items.filter((i) => !i.permission || can(i.permission)) }))
    .filter((g) => g.items.length > 0), [t, can, member?.superAdmin, member?.groupAdmin]);

  const normalizePath = (path: string) => path.replace('/(tabs)', '') || '/';
  const currentGroup = navGroups.find((g) => g.items.some((i) => cleanPath === normalizePath(i.path) || (normalizePath(i.path) !== '/' && cleanPath.startsWith(normalizePath(i.path) + '/'))))?.id ?? 'overview';
  const [openGroups, setOpenGroups] = useState<string[]>([currentGroup]);
  useEffect(() => { setOpenGroups((current) => current.includes(currentGroup) ? current : [...current, currentGroup]); }, [currentGroup]);

  const activeGroup = groups.find((group) => group.id === activeGroupId);
  const workspaceName = activeGroup?.name ?? settings?.orgName ?? t('app_name');
  const logo = assetUrl(activeGroup?.logoUrl ?? settings?.logoUrl);
  return (
    <View style={{ width: 280, flexShrink: 0, height: '100%', backgroundColor: palette.surface, borderRightWidth: 1, borderColor: palette.border, padding: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 6, paddingTop: 6, paddingBottom: 22 }}>
        <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: palette.border }}>
          {logo ? <Image source={{ uri: logo }} resizeMode="cover" style={{ width: 44, height: 44 }} /> : <Text style={{ fontSize: 24 }}>🤝</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ color: palette.text, fontWeight: '900', fontSize: 14 }}>{workspaceName}</Text>
          <Text style={{ color: palette.muted, fontSize: 11, marginTop: 3 }}>{t('nav_workspace_label')}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 14 }}>
        {navGroups.map((group) => <AccordionGroup
          key={group.id} group={group} open={openGroups.includes(group.id)} activePath={cleanPath}
          onToggle={() => setOpenGroups((current) => current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id])}
          onNavigate={(path) => router.push(path as any)} palette={palette}
        />)}
        <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: palette.border, gap: 4 }}>
          {[
            ...(can(PERM.SETTINGS_VIEW) ? [{ label: t('settings'), icon: '⚙', path: '/admin/parametres' }] : []),
            { label: t('tab_profile'), icon: '◎', path: '/(tabs)/profil' },
          ].map((item) => {
            const path = item.path.replace('/(tabs)', '') || '/';
            const active = cleanPath === path || cleanPath.startsWith(path + '/');
            return <Pressable key={item.path} onPress={() => router.push(item.path as any)} style={({ pressed }) => ({ minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, borderRadius: 12, borderLeftWidth: active ? 4 : 0, borderLeftColor: active ? palette.primary : 'transparent', backgroundColor: active ? palette.primarySoft : 'transparent', opacity: pressed ? 0.75 : 1 })}>
              <Text style={{ width: 20, textAlign: 'center', color: active ? palette.primary : palette.muted, fontSize: 16 }}>{item.icon}</Text>
              <Text numberOfLines={1} style={{ color: active ? palette.primary : palette.text, fontSize: 12, fontWeight: active ? '800' : '700' }}>{item.label}</Text>
            </Pressable>;
          })}
        </View>
      </ScrollView>

      <View style={{ borderTopWidth: 1, borderColor: palette.border, paddingTop: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 7, paddingVertical: 8, borderRadius: 12 }}>
          <Pressable onPress={() => router.push('/(tabs)/profil' as any)} accessibilityLabel={t('tab_profile')} style={({ pressed }) => ({ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.75 : 1 })}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {member?.photoUrl ? <Image source={{ uri: assetUrl(member.photoUrl) }} style={{ width: 38, height: 38 }} /> : <Text style={{ color: palette.primary, fontWeight: '900', fontSize: 12 }}>{member?.firstName?.slice(0, 1)}{member?.lastName?.slice(0, 1)}</Text>}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{ color: palette.text, fontSize: 12, fontWeight: '800' }}>{member?.fullName}</Text>
            <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 10, marginTop: 2 }}>{member?.superAdmin ? t('system_admin') : member?.groupAdmin ? t('principal_admin') : member?.roleName}{member?.phone ? ` · ${member.phone}` : ''}</Text>
          </View>
          </Pressable>
          <Pressable onPress={async () => { await logout(); router.replace('/login'); }} accessibilityLabel={t('logout')} hitSlop={8} style={{ padding: 5 }}>
            <Text style={{ color: palette.muted, fontSize: 17 }}>↪</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Barre de travail desktop : contexte de page, préférences et identité du compte. */
export function DesktopTopbar() {
  const { t, palette, member, settings, groups, activeGroupId, setActiveGroup, can, themeMode, setThemeMode, lang, setLang } = useApp();
  const pathname = usePathname().replace('/(tabs)', '');
  const router = useRouter();
  const activeGroup = groups.find((group) => group.id === activeGroupId);
  const pageTitle = pathname.startsWith('/assistances') ? t('assistances_title')
    : pathname.startsWith('/mes-statistiques') ? t('my_stats')
    : pathname.startsWith('/admin/administration') ? t('nav_administration')
    : pathname.startsWith('/admin/parametres') ? t('settings')
    : pathname.startsWith('/admin/roles') ? t('roles')
    : pathname.startsWith('/admin/membres') ? t('members')
    : pathname.startsWith('/admin/types') ? t('types')
    : pathname.startsWith('/admin/audit') ? t('audit')
    : pathname.startsWith('/cotisations') ? t('tab_contributions')
    : pathname.startsWith('/evenements') ? t('tab_events')
    : pathname.startsWith('/demandes') ? t('tab_requests')
    : pathname.startsWith('/profil') ? t('tab_profile') : t('tab_home');

  const control = { width: 42, height: 42, borderRadius: 13, backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: palette.border, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const };
  return (
    <View style={{ minHeight: 76, paddingHorizontal: 24, paddingVertical: 11, backgroundColor: palette.surface, borderBottomWidth: 1, borderColor: palette.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 18, zIndex: 30 }}>
      <View style={{ flex: 1, minWidth: 130 }}>
        <Text style={{ color: palette.text, fontSize: 18, fontWeight: '800' }}>{pageTitle}</Text>
        <Text numberOfLines={1} style={{ color: palette.muted, fontSize: 11, marginTop: 3 }}>{activeGroup?.name ?? settings?.orgName ?? t('app_name')}</Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <GroupPicker groups={groups} activeGroupId={activeGroupId} setActiveGroup={setActiveGroup} palette={palette} t={t} superAdmin={!!member?.superAdmin} />
        <NotificationsBell />
        <Pressable onPress={() => setLang(lang === 'fr' ? 'en' : 'fr')} accessibilityLabel={lang === 'fr' ? t('english') : t('french')} style={({ pressed }) => [control, { opacity: pressed ? 0.72 : 1 }]}>
          <Text style={{ color: palette.primary, fontSize: 11, fontWeight: '900' }}>{lang === 'fr' ? 'FR' : 'EN'}</Text>
        </Pressable>
        <Pressable onPress={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')} accessibilityLabel={themeMode === 'dark' ? t('theme_light') : t('theme_dark')} style={({ pressed }) => [control, { opacity: pressed ? 0.7 : 1 }]}>
          <Text style={{ color: palette.primary, fontSize: 18 }}>{themeMode === 'dark' ? '☼' : '◐'}</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/(tabs)/profil' as any)} accessibilityRole="button" accessibilityLabel={t('tab_profile')} style={({ pressed }) => [{ width: 42, height: 42, borderRadius: 21, backgroundColor: palette.primarySoft, borderWidth: 1, borderColor: palette.border, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', opacity: pressed ? 0.75 : 1 }]}>
          {member?.photoUrl ? <Image source={{ uri: assetUrl(member.photoUrl) }} style={{ width: 42, height: 42 }} /> : <Text style={{ color: palette.primary, fontWeight: '900', fontSize: 12 }}>{member?.firstName?.slice(0, 1)}{member?.lastName?.slice(0, 1)}</Text>}
        </Pressable>
      </View>
    </View>
  );
}

export function MobileTopbar() {
  const { t, palette, member, groups, activeGroupId, setActiveGroup } = useApp();
  return <View style={{ minHeight: 62, paddingHorizontal: 14, backgroundColor: palette.surface, borderBottomWidth: 1, borderColor: palette.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, zIndex: 30 }}>
    <GroupPicker groups={groups} activeGroupId={activeGroupId} setActiveGroup={setActiveGroup} palette={palette} t={t} superAdmin={!!member?.superAdmin} compact />
    <NotificationsBell />
  </View>;
}

function GroupPicker({ groups, activeGroupId, setActiveGroup, palette, t, superAdmin = false, compact = false }: {
  groups: GroupView[]; activeGroupId: number | null; setActiveGroup: (id: number) => Promise<void>;
  palette: ReturnType<typeof useApp>['palette']; t: (key: string) => string; superAdmin?: boolean; compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<any>(null);
  const { width: viewportWidth } = useWindowDimensions();
  const active = groups.find((group) => group.id === activeGroupId) ?? groups[0];
  const menuWidth = Math.min(300, Math.max(230, viewportWidth - 32));
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const onPointerDown = (event: MouseEvent) => {
      const element = root.current as unknown as HTMLElement | null;
      if (element && !element.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (!active) return null;
  const single = groups.length <= 1;
  const badge = active.logoUrl ? <Image source={{ uri: assetUrl(active.logoUrl) }} resizeMode="cover" style={{ width: 32, height: 32, borderRadius: 10 }} />
    : <View style={{ width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.primarySoft }}><Text style={{ color: palette.primary, fontWeight: '900', fontSize: 13 }}>▦</Text></View>;
  const triggerStyle = { minHeight: 44, maxWidth: compact ? 224 : 250, flex: compact ? 1 : undefined, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 9, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 14, backgroundColor: palette.surfaceAlt, borderWidth: 1, borderColor: open ? palette.primary : palette.border };
  return <View ref={root} style={{ position: 'relative', zIndex: open ? 60 : 1, flex: compact ? 1 : undefined, maxWidth: compact ? 224 : 250 }}>
    {single ? <View accessibilityLabel={active.name} style={triggerStyle}>
      {badge}<View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: palette.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 }}>{t('group_active').toUpperCase()}</Text><Text numberOfLines={1} style={{ color: palette.text, fontSize: 12, fontWeight: '800', marginTop: 1 }}>{active.name}</Text></View>
    </View> : <Pressable onPress={() => setOpen((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={`${t('group_active')}: ${active.name}`} style={({ pressed }) => [triggerStyle, { opacity: pressed ? 0.82 : 1 }]}>
      {badge}<View style={{ flex: 1, minWidth: 0 }}><Text style={{ color: palette.muted, fontSize: 9, fontWeight: '800', letterSpacing: 0.7 }}>{t('group_active').toUpperCase()}</Text><Text numberOfLines={1} style={{ color: palette.text, fontSize: 12, fontWeight: '800', marginTop: 1 }}>{active.name}</Text></View>
      <Text style={{ color: palette.muted, fontSize: 15, transform: [{ rotate: open ? '180deg' : '0deg' }] }}>⌄</Text>
    </Pressable>}
    {!single && open ? <View style={{ position: 'absolute', top: 50, right: compact ? undefined : 0, left: compact ? 0 : undefined, width: menuWidth, maxHeight: 360, backgroundColor: palette.surface, borderRadius: 16, borderWidth: 1, borderColor: palette.border, padding: 7, zIndex: 80, elevation: 14, shadowColor: '#152C39', shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}>
      <Text style={{ color: palette.muted, fontSize: 10, fontWeight: '800', letterSpacing: 0.8, paddingHorizontal: 9, paddingTop: 7, paddingBottom: 5 }}>{t('group_active').toUpperCase()}</Text>
      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={groups.length > 5}>
        {groups.map((group) => {
          const selected = group.id === activeGroupId;
          return <Pressable key={group.id} onPress={() => { setOpen(false); void setActiveGroup(group.id); }} style={({ pressed }) => ({ minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, backgroundColor: selected ? palette.primarySoft : 'transparent', opacity: pressed ? 0.76 : 1 })}>
            {group.logoUrl ? <Image source={{ uri: assetUrl(group.logoUrl) }} resizeMode="cover" style={{ width: 36, height: 36, borderRadius: 11 }} /> : <View style={{ width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceAlt }}><Text style={{ color: palette.primary, fontWeight: '900' }}>▦</Text></View>}
            <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={{ color: selected ? palette.primary : palette.text, fontSize: 12, fontWeight: '800' }}>{group.name}</Text><Text numberOfLines={1} style={{ color: palette.muted, fontSize: 10, marginTop: 2 }}>{superAdmin ? t('system_admin') : group.roleName ?? group.city ?? t('nav_workspace_label')}</Text></View>
            {selected ? <Text style={{ color: palette.primary, fontWeight: '900', fontSize: 16 }}>✓</Text> : null}
          </Pressable>;
        })}
      </ScrollView>
    </View> : null}
  </View>;
}

function rowStyle(palette: ReturnType<typeof useApp>['palette']) {
  return { minHeight: 42, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10, paddingHorizontal: 11, borderRadius: radius.md, backgroundColor: palette.surfaceAlt };
}

function AccordionGroup({ group, open, activePath, onToggle, onNavigate, palette }: {
  group: NavGroup; open: boolean; activePath: string; onToggle: () => void;
  onNavigate: (path: string) => void; palette: ReturnType<typeof useApp>['palette'];
}) {
  const progress = useRef(new Animated.Value(open ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(progress, { toValue: open ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [open, progress]);
  const height = progress.interpolate({ inputRange: [0, 1], outputRange: [0, Math.max(46, group.items.length * 42)] });
  return (
    <View style={{ marginBottom: 6 }}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} style={({ pressed }) => ({ ...rowStyle(palette), backgroundColor: open ? palette.primarySoft : 'transparent', borderLeftWidth: open ? 4 : 0, borderLeftColor: open ? palette.primary : 'transparent', opacity: pressed ? 0.76 : 1 })}>
        <Text style={{ width: 20, textAlign: 'center', color: open ? palette.primary : palette.muted, fontSize: 16 }}>{group.icon}</Text>
        <Text style={{ flex: 1, color: open ? palette.primary : palette.text, fontSize: 12, fontWeight: '800' }}>{group.title}</Text>
        <Text style={{ color: palette.muted, fontSize: 18, width: 16, textAlign: 'center' }}>{open ? '⌄' : '›'}</Text>
      </Pressable>
      <Animated.View style={{ height, opacity: progress, overflow: 'hidden' }}>
        <View style={{ paddingTop: 5, paddingLeft: 12, gap: 3 }}>
          {group.items.map((item) => {
            const path = item.path.replace('/(tabs)', '') || '/';
            const active = activePath === path || (path !== '/' && activePath.startsWith(path + '/'));
            return <Pressable key={item.path} onPress={() => onNavigate(item.path)} style={({ pressed }) => ({ minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11, borderRadius: 11, borderLeftWidth: active ? 4 : 0, borderLeftColor: active ? palette.primary : 'transparent', backgroundColor: active ? palette.primarySoft : 'transparent', opacity: pressed ? 0.75 : 1 })}>
              <Text style={{ width: 18, textAlign: 'center', fontSize: 15, color: active ? palette.primary : palette.muted }}>{item.icon}</Text>
              <Text numberOfLines={1} style={{ color: active ? palette.primary : palette.text, fontSize: 12, fontWeight: active ? '800' : '600' }}>{item.label}</Text>
            </Pressable>;
          })}
        </View>
      </Animated.View>
    </View>
  );
}
