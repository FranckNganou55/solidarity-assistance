import { Redirect } from 'expo-router';
import React from 'react';
import { useApp } from './store';
import { Loading, Screen } from './ui';

/** Protege un ecran d'administration selon une permission. */
export function Guard({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { ready, token, can } = useApp();
  if (!ready) return <Screen><Loading /></Screen>;
  if (!token) return <Redirect href="/login" />;
  if (!can(permission)) return <Redirect href="/(tabs)/profil" />;
  return <>{children}</>;
}
