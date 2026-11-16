import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useColorScheme } from 'react-native';
import { api, getRequestLanguage, GroupView, MemberView, PublicSettings, setActiveGroupHeader, setAuthToken, setRequestLanguage } from './api';
import { Lang, translate } from './i18n';
import { Palette, palettes, ThemeMode } from './theme';

const K = { token: 'ms.token', theme: 'ms.theme', lang: 'ms.lang', group: 'ms.group' };

interface Toast { id: number; message: string; kind: 'success' | 'error' | 'info'; }

interface AppState {
  ready: boolean;
  member: MemberView | null;
  token: string | null;
  settings: PublicSettings | null;
  groups: GroupView[];
  activeGroupId: number | null;
  setActiveGroup: (id: number) => Promise<void>;
  reloadGroups: () => Promise<void>;
  themeMode: ThemeMode;
  scheme: ThemeMode;
  palette: Palette;
  setThemeMode: (m: ThemeMode) => void;
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  login: (phone: string, password: string) => Promise<MemberView>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  reloadSettings: () => Promise<void>;
  can: (permission: string) => boolean;
  isAdmin: boolean;
  toast: (message: string, kind?: Toast['kind']) => void;
  toasts: Toast[];
  dismissToast: (id: number) => void;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [member, setMember] = useState<MemberView | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [lang, setLangState] = useState<Lang>('fr');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(1);

  const scheme: ThemeMode = themeMode ?? (systemScheme === 'dark' ? 'dark' : 'light');
  const palette = palettes[scheme];

  useEffect(() => {
    (async () => {
      const [storedToken, storedTheme, storedLang, storedGroup] = await Promise.all([
        AsyncStorage.getItem(K.token),
        AsyncStorage.getItem(K.theme),
        AsyncStorage.getItem(K.lang),
        AsyncStorage.getItem(K.group),
      ]);
      if (storedTheme === 'light' || storedTheme === 'dark') setThemeModeState(storedTheme);
      if (storedLang === 'fr' || storedLang === 'en') { setLangState(storedLang); setRequestLanguage(storedLang); }
      try {
        const pub = await api.publicSettings();
        setSettings(pub);
        if (!storedLang && (pub.defaultLocale === 'fr' || pub.defaultLocale === 'en')) { setLangState(pub.defaultLocale); setRequestLanguage(pub.defaultLocale); }
      } catch { /* serveur indisponible : on continue hors ligne */ }
      if (storedToken) {
        setAuthToken(storedToken);
        try {
          const availableGroups = await api.groups();
          setGroups(availableGroups);
          const chosen = availableGroups.find((g) => String(g.id) === storedGroup)?.id ?? availableGroups[0]?.id ?? null;
          setActiveGroupId(chosen);
          setActiveGroupHeader(chosen);
          if (chosen != null) setSettings(await api.publicSettings(chosen));
          const me = await api.me();
          setMember(me);
          setToken(storedToken);
        } catch {
          setAuthToken(null);
          await AsyncStorage.removeItem(K.token);
        }
      }
      setReady(true);
    })();
  }, []);

  const setThemeMode = useCallback((m: ThemeMode) => {
    setThemeModeState(m);
    AsyncStorage.setItem(K.theme, m);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    setRequestLanguage(l);
    AsyncStorage.setItem(K.lang, l);
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);

  const toast = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = toastId.current++;
    setToasts((prev) => [...prev, { id, message, kind }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((prev) => prev.filter((x) => x.id !== id)), []);

  const login = useCallback(async (phone: string, password: string) => {
    const res = await api.login(phone, password);
    setAuthToken(res.token);
    await AsyncStorage.setItem(K.token, res.token);
    const availableGroups = await api.groups();
    setGroups(availableGroups);
    const chosen = availableGroups[0]?.id ?? null;
    setActiveGroupId(chosen);
    setActiveGroupHeader(chosen);
    if (chosen != null) {
      await AsyncStorage.setItem(K.group, String(chosen));
      try { setSettings(await api.publicSettings(chosen)); } catch { /* paramètres facultatifs */ }
    }
    const me = await api.me();
    setToken(res.token);
    setMember(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    setAuthToken(null);
    await AsyncStorage.removeItem(K.token);
    setToken(null);
    setMember(null);
    setGroups([]);
    setActiveGroupId(null);
    setActiveGroupHeader(null);
    await AsyncStorage.removeItem(K.group);
  }, []);

  const setActiveGroup = useCallback(async (id: number) => {
    if (!groups.some((group) => group.id === id)) return;
    setActiveGroupId(id);
    setActiveGroupHeader(id);
    await AsyncStorage.setItem(K.group, String(id));
    try {
      const [me, pub] = await Promise.all([api.me(), api.publicSettings(id)]);
      setMember(me); setSettings(pub);
    } catch (e: any) { toast(e?.message ?? translate(lang, 'group_switch_failed'), 'error'); }
  }, [groups, toast, lang]);

  const reloadGroups = useCallback(async () => {
    try {
      const available = await api.groups();
      setGroups(available);
      if (activeGroupId != null && !available.some((group) => group.id === activeGroupId)) {
        const next = available[0]?.id ?? null;
        setActiveGroupId(next);
        setActiveGroupHeader(next);
        if (next == null) await AsyncStorage.removeItem(K.group);
        else {
          await AsyncStorage.setItem(K.group, String(next));
          try {
            const [me, pub] = await Promise.all([api.me(), api.publicSettings(next)]);
            setMember(me); setSettings(pub);
          } catch (e: any) { toast(e?.message ?? translate(lang, 'group_switch_failed'), 'error'); }
        }
      }
    } catch (e: any) { toast(e?.message ?? translate(lang, 'groups_load_failed'), 'error'); }
  }, [activeGroupId, toast, lang]);

  const refreshMe = useCallback(async () => {
    try {
      const me = await api.me();
      setMember(me);
    } catch { /* ignore */ }
  }, []);

  const reloadSettings = useCallback(async () => {
    try { setSettings(await api.publicSettings()); } catch { /* ignore */ }
  }, []);

  const can = useCallback((permission: string) => {
    if (!member) return false;
    if (member.superAdmin) return true;
    if (member.groupAdmin) return permission !== 'GROUP_CREATE' && !permission.endsWith('_MANAGE');
    const granular: Record<string, string[]> = {
      MEMBER_MANAGE: ['MEMBER_CREATE', 'MEMBER_EDIT', 'MEMBER_DELETE', 'MEMBER_ARCHIVE', 'MEMBER_RESET_PASSWORD'],
      ROLE_MANAGE: ['ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE', 'ROLE_ASSIGN'],
      ASSISTANCE_TYPE_MANAGE: ['ASSISTANCE_TYPE_CREATE', 'ASSISTANCE_TYPE_EDIT', 'ASSISTANCE_TYPE_DELETE'],
      EVENT_MANAGE: ['EVENT_CREATE', 'EVENT_EDIT', 'EVENT_CLOSE', 'EVENT_REOPEN', 'EVENT_EDIT_CLOSED', 'EVENT_CANCEL'],
      REQUEST_MANAGE: ['REQUEST_VIEW', 'REQUEST_APPROVE', 'REQUEST_REJECT'],
    };
    const grants = member.permissions ?? [];
    return grants.includes(permission) || (granular[permission] ?? []).some((p) => grants.includes(p));
  }, [member]);

  const value = useMemo<AppState>(() => ({
    ready, member, token, settings, groups, activeGroupId, setActiveGroup, reloadGroups, themeMode, scheme, palette,
    setThemeMode, lang, setLang, t, login, logout, refreshMe, reloadSettings,
    can, isAdmin: !!member?.superAdmin, toast, toasts, dismissToast,
  }), [ready, member, token, settings, groups, activeGroupId, setActiveGroup, reloadGroups, themeMode, scheme, palette, setThemeMode, lang, setLang, t,
       login, logout, refreshMe, reloadSettings, can, toast, toasts, dismissToast]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

/** Recharge une ressource quand l'ecran revient au premier plan (hors premier affichage). */
export function useRefreshOnFocus(fn: () => void) {
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) { first.current = false; return; }
      fn();
    }, [fn]),
  );
}

/** Charge une ressource de l'API avec etat de chargement + rafraichissement. */
export function useResource<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loader());
    } catch (e: any) {
      setError(e?.message ?? translate(getRequestLanguage(), 'generic_error'));
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load, setData };
}
