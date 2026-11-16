/**
 * Palette mesurée sur le logo officiel et définie dans le cahier des charges.
 */
export type ThemeMode = 'light' | 'dark';

export interface Palette {
  mode: ThemeMode;
  bg: string;
  bgAlt: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  border: string;
  primary: string;
  primarySoft: string;
  secondary: string;
  onPrimary: string;
  accent: string;
  accentSoft: string;
  affection: string;
  earth: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  success: string;
  shadow: string;
}

const light: Palette = {
  mode: 'light',
  bg: '#F7F9FB',
  bgAlt: '#F2F4F7',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  text: '#1D2939',
  muted: '#667085',
  border: '#E5E7EB',
  primary: '#1E6F5C',
  primarySoft: '#E9F5F1',
  secondary: '#2D9CDB',
  onPrimary: '#FFFFFF',
  accent: '#2D9CDB',
  accentSoft: '#EAF6FD',
  affection: '#F8B8C8',
  earth: '#996F41',
  danger: '#EB5757',
  dangerSoft: '#FEF3F2',
  warning: '#F2994A',
  success: '#27AE60',
  shadow: 'rgba(16,24,40,0.05)',
};

const dark: Palette = {
  mode: 'dark',
  bg: '#0F1E2A',
  bgAlt: '#142735',
  surface: '#192C38',
  surfaceAlt: '#203642',
  text: '#EAF0F3',
  muted: '#A4B2B8',
  border: '#304550',
  primary: '#6FA3C0',
  primarySoft: '#203642',
  secondary: '#2D9CDB',
  onPrimary: '#0F1E2A',
  accent: '#F3856A',
  accentSoft: '#402B2A',
  affection: '#F8B8C8',
  earth: '#C19153',
  danger: '#E07162',
  dangerSoft: '#2B1614',
  warning: '#C19153',
  success: '#638723',
  shadow: 'rgba(0,0,0,0.5)',
};

export const palettes: Record<ThemeMode, Palette> = { light, dark };

export const radius = { sm: 10, md: 10, lg: 16, xl: 20, pill: 999 };
export const spacing = { xs: 8, sm: 8, md: 16, lg: 16, xl: 24, xxl: 32 };

export const font = {
  h1: 26,
  h2: 20,
  h3: 16,
  body: 15,
  small: 13,
  tiny: 11,
};
