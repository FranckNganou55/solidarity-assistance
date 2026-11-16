import React, { useState } from 'react';
import {
  ActivityIndicator, Image, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet,
  Text, TextInput, TextInputProps, View, ViewStyle, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { assetUrl } from './api';
import { useApp } from './store';
import { font, radius, spacing } from './theme';
import { initials } from './utils';
import { matchesPersonSearch } from './utils';

const MAX_WIDTH = 1440;

/* --------------------------------- layout -------------------------------- */
export function Screen({
  children, scroll = true, refreshing, onRefresh, padded = true, contentStyle,
}: {
  children: React.ReactNode; scroll?: boolean; refreshing?: boolean; onRefresh?: () => void;
  padded?: boolean; contentStyle?: ViewStyle;
}) {
  const { palette } = useApp();
  const insets = useSafeAreaInsets();
  const content = (
    <View style={[
      { flex: 1, width: '100%', maxWidth: Platform.OS === 'web' ? '100%' : MAX_WIDTH, alignSelf: 'center' },
      padded && { paddingHorizontal: spacing.lg },
      contentStyle,
    ]}>
      {children}
    </View>
  );
  if (!scroll) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: insets.top }}>
        {content}
      </View>
    );
  }
  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: spacing.xxl + 24 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={palette.primary} colors={[palette.primary]} />
        ) : undefined}
      >
        {content}
      </ScrollView>
    </View>
  );
}

export function Header({
  title, subtitle, onBack, right, big,
}: { title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode; big?: boolean }) {
  const { palette, t } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg, marginTop: spacing.sm }}>
      {onBack && (
        <Pressable
          onPress={onBack}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          style={({ pressed }) => ({
            width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center',
            backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border,
            shadowColor: palette.shadow, shadowOpacity: palette.mode === 'dark' ? 0 : 0.14,
            shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: palette.mode === 'dark' ? 0 : 1,
            opacity: pressed ? 0.75 : 1, transform: [{ scale: pressed ? 0.96 : 1 }],
          })}
        >
          <Text style={{ fontSize: 20, lineHeight: 24, color: palette.primary, fontWeight: '800' }}>←</Text>
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: big ? (right ? 22 : font.h1) : (right ? 17 : font.h2),
            fontWeight: '800', color: palette.text, letterSpacing: -0.3,
          }}
        >
          {title}
        </Text>
        {subtitle ? <Text style={{ color: palette.muted, marginTop: 2, fontSize: font.small }}>{subtitle}</Text> : null}
      </View>
      {right ? <View style={{ flexShrink: 0 }}>{right}</View> : null}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  const { palette } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl, marginBottom: spacing.sm }}>
      <Text style={{ fontSize: font.small, fontWeight: '800', color: palette.muted, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {children}
      </Text>
      {right}
    </View>
  );
}

export function Card({ children, style, onPress }: { children: React.ReactNode; style?: ViewStyle; onPress?: () => void }) {
  const { palette } = useApp();
  const body = (
    <View style={[{
      backgroundColor: palette.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: palette.border,
      padding: spacing.lg,
      shadowColor: palette.shadow,
      shadowOpacity: palette.mode === 'dark' ? 0 : 0.14,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 5 },
      elevation: palette.mode === 'dark' ? 0 : 2,
    }, style]}>
      {children}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  );
}

export function Row({ children, style, gap = spacing.sm }: { children: React.ReactNode; style?: ViewStyle; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Divider() {
  const { palette } = useApp();
  return <View style={{ height: 1, backgroundColor: palette.border, marginVertical: spacing.md }} />;
}

/* --------------------------------- text ---------------------------------- */
export function Body({ children, style, numberOfLines }: { children: React.ReactNode; style?: any; numberOfLines?: number }) {
  const { palette } = useApp();
  return (
    <Text numberOfLines={numberOfLines} style={[{ color: palette.text, fontSize: font.body, lineHeight: 21 }, style]}>
      {children}
    </Text>
  );
}

export function Muted({ children, style, numberOfLines }: { children: React.ReactNode; style?: any; numberOfLines?: number }) {
  const { palette } = useApp();
  return <Text numberOfLines={numberOfLines} style={[{ color: palette.muted, fontSize: font.small }, style]}>{children}</Text>;
}

/* --------------------------------- inputs -------------------------------- */
export function Field({
  label, value, onChangeText, secureTextEntry, placeholder, keyboardType, autoCapitalize,
  multiline, error, editable = true, maxLength, right,
}: {
  label?: string; value: string; onChangeText: (v: string) => void; secureTextEntry?: boolean;
  placeholder?: string; keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize']; multiline?: boolean; error?: string;
  editable?: boolean; maxLength?: number; right?: React.ReactNode;
}) {
  const { palette } = useApp();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={{ color: palette.muted, fontSize: font.small, marginBottom: 6, fontWeight: '600' }}>{label}</Text> : null}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: palette.surfaceAlt,
        borderWidth: 1.5,
        borderColor: error ? palette.danger : focused ? palette.primary : palette.border,
        borderRadius: radius.md,
        paddingHorizontal: spacing.md,
      }}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor={palette.muted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          multiline={multiline}
          editable={editable}
          maxLength={maxLength}
          style={{
            flex: 1, color: palette.text, fontSize: font.body, paddingVertical: 12, minHeight: multiline ? 84 : undefined,
            textAlignVertical: multiline ? 'top' : 'center',
            ...(Platform.OS === 'web' ? { outlineStyle: 'none' as any } : {}),
          }}
        />
        {right}
      </View>
      {error ? <Text style={{ color: palette.danger, fontSize: font.tiny, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

/* -------------------------------- buttons -------------------------------- */
export function Button({
  title, onPress, variant = 'primary', loading, disabled, icon, small, style, textColor, borderColor,
}: {
  title: string; onPress?: () => void; variant?: 'primary' | 'accent' | 'outline' | 'ghost' | 'danger';
  loading?: boolean; disabled?: boolean; icon?: string; small?: boolean; style?: ViewStyle;
  textColor?: string; borderColor?: string;
}) {
  const { palette } = useApp();
  const bg = variant === 'primary' ? palette.primary
    : variant === 'accent' ? palette.accent
    : variant === 'danger' ? palette.danger
    : variant === 'outline' || variant === 'ghost' ? 'transparent' : palette.primary;
  const fg = textColor ?? (variant === 'outline' || variant === 'ghost' ? palette.primary : palette.onPrimary);
  const border = borderColor ?? (variant === 'outline' ? palette.primary : 'transparent');
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => ([{
        backgroundColor: bg,
        borderWidth: variant === 'outline' ? 1.5 : 0,
        borderColor: border,
        borderRadius: small ? 12 : 14,
        paddingVertical: small ? 9 : 14,
        paddingHorizontal: small ? spacing.md : spacing.lg,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        opacity: isDisabled ? 0.55 : pressed ? 0.85 : 1,
      }, style])}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : null}
      {icon && !loading ? <Text style={{ fontSize: small ? 13 : 15 }}>{icon}</Text> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? font.small : font.body }}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  const { palette } = useApp();
  return (
    <Pressable onPress={onPress} style={{
      paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill,
      backgroundColor: active ? palette.primarySoft : palette.surfaceAlt,
      borderWidth: 1, borderColor: active ? palette.primary : palette.border,
    }}>
      <Text style={{ color: active ? palette.primary : palette.text, fontWeight: '700', fontSize: font.small }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'success' | 'warning' | 'danger' | 'neutral' | 'primary' }) {
  const { palette } = useApp();
  const map = {
    success: { bg: palette.primarySoft, fg: palette.success },
    warning: { bg: palette.accentSoft, fg: palette.accent },
    danger: { bg: palette.dangerSoft, fg: palette.danger },
    primary: { bg: palette.primarySoft, fg: palette.primary },
    neutral: { bg: palette.surfaceAlt, fg: palette.muted },
  }[tone];
  return (
    <View style={{ backgroundColor: map.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' }}>
      <Text style={{ color: map.fg, fontSize: font.tiny, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</Text>
    </View>
  );
}

export function Avatar({ name, uri, size = 44, shape = 'CIRCLE' }: { name?: string; uri?: string; size?: number; shape?: 'CIRCLE' | 'SQUARE' }) {
  const { palette } = useApp();
  const src = assetUrl(uri);
  const borderRadius = shape === 'CIRCLE' ? size / 2 : Math.max(10, Math.round(size * 0.18));
  if (src) {
    return <Image source={{ uri: src }} style={{ width: size, height: size, borderRadius, backgroundColor: palette.surfaceAlt }} />;
  }
  return (
    <View style={{
      width: size, height: size, borderRadius, backgroundColor: palette.primarySoft,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ color: palette.primary, fontWeight: '800', fontSize: size / 2.8 }}>{initials(name)}</Text>
    </View>
  );
}

export function Progress({ value, max, color }: { value: number; max: number; color?: string }) {
  const { palette } = useApp();
  const pct = max <= 0 ? 0 : Math.min(100, Math.round((value / max) * 100));
  return (
    <View style={{ height: 10, backgroundColor: palette.border, borderRadius: radius.pill, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color ?? palette.primary, borderRadius: radius.pill }} />
    </View>
  );
}

export function EmptyState({ icon = '📭', title, text }: { icon?: string; title: string; text?: string }) {
  const { palette } = useApp();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xxl, gap: 6 }}>
      <Text style={{ fontSize: 34 }}>{icon}</Text>
      <Text style={{ color: palette.text, fontWeight: '700', fontSize: font.body }}>{title}</Text>
      {text ? <Text style={{ color: palette.muted, fontSize: font.small, textAlign: 'center', maxWidth: 280 }}>{text}</Text> : null}
    </View>
  );
}

export function Loading({ text }: { text?: string }) {
  const { palette } = useApp();
  return (
    <View style={{ paddingVertical: spacing.xxl, alignItems: 'center', gap: 10 }}>
      <ActivityIndicator color={palette.primary} />
      {text ? <Text style={{ color: palette.muted, fontSize: font.small }}>{text}</Text> : null}
    </View>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { palette, t } = useApp();
  return (
    <Card style={{ borderColor: palette.danger, backgroundColor: palette.dangerSoft }}>
      <Body style={{ color: palette.danger, fontWeight: '600' }}>{message}</Body>
      {onRetry ? <Button title={t('retry')} variant="outline" small onPress={onRetry} style={{ marginTop: spacing.sm, alignSelf: 'flex-start' }} /> : null}
    </Card>
  );
}

/* --------------------------------- sheet --------------------------------- */
export function Sheet({
  visible, onClose, title, children, footer,
}: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  const { palette } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const desktop = Platform.OS === 'web' && width >= 760;
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(16,24,40,0.38)', justifyContent: desktop ? 'center' : 'flex-end', alignItems: 'center', padding: desktop ? 24 : 0 }}>
        <Pressable onPress={onClose} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
        <View style={{
          backgroundColor: palette.surface,
          borderRadius: desktop ? 20 : radius.xl,
          padding: desktop ? 24 : spacing.lg, paddingBottom: desktop ? 24 : insets.bottom + spacing.lg,
          maxHeight: desktop ? '90%' : '88%', width: desktop ? '100%' : '100%', maxWidth: desktop ? 600 : MAX_WIDTH, alignSelf: 'center',
          borderWidth: desktop ? 1 : 0, borderColor: palette.border,
          shadowColor: '#101828', shadowOpacity: desktop ? 0.18 : 0, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: desktop ? 18 : 0,
        }}>
          {!desktop ? <View style={{ width: 44, height: 5, borderRadius: 3, backgroundColor: palette.border, alignSelf: 'center', marginBottom: spacing.md }} /> : null}
          <Row style={{ justifyContent: 'space-between', marginBottom: spacing.md }}>
            <Text style={{ fontSize: font.h3, fontWeight: '800', color: palette.text }}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={{ color: palette.muted, fontSize: 18 }}>✕</Text>
            </Pressable>
          </Row>
          <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 480 }}>
            {children}
          </ScrollView>
          {footer ? <View style={{ marginTop: spacing.md }}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

/* --------------------------------- toast --------------------------------- */
export function Toasts() {
  const { toasts, dismissToast, palette } = useApp();
  const insets = useSafeAreaInsets();
  if (toasts.length === 0) return null;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: insets.top + 10, left: 0, right: 0, alignItems: 'center', zIndex: 999 }}>
      {toasts.map((toast) => {
        const bg = toast.kind === 'error' ? palette.danger : toast.kind === 'success' ? palette.success : palette.primary;
        return (
          <Pressable key={toast.id} onPress={() => dismissToast(toast.id)} style={{
            backgroundColor: bg, paddingVertical: 12, paddingHorizontal: 18, borderRadius: radius.md,
            marginBottom: 8, maxWidth: 460, width: '92%',
            shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
          }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: font.small }}>{toast.message}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function StatTile({ label, value, icon, tone }: { label: string; value: string | number; icon?: string; tone?: 'primary' | 'accent' | 'danger' }) {
  const { palette } = useApp();
  const color = tone === 'accent' ? palette.accent : tone === 'danger' ? palette.danger : palette.primary;
  return (
    <View style={{
      flex: 1, backgroundColor: palette.surface, borderRadius: radius.md, padding: spacing.md,
      borderWidth: 1, borderColor: palette.border, minWidth: 120,
    }}>
      <Row style={{ gap: 6 }}>
        {icon ? <Text style={{ fontSize: 14 }}>{icon}</Text> : null}
        <Text style={{ color: palette.muted, fontSize: font.tiny, fontWeight: '700', textTransform: 'uppercase' }} numberOfLines={1}>
          {label}
        </Text>
      </Row>
      <Text style={{ color, fontSize: 20, fontWeight: '800', marginTop: 6 }}>{value}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  shadow: { shadowColor: '#0F6B4F', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
});

/* ------------------------------- selectors ------------------------------- */
export function SelectField<T>({
  label, value, options, onChange, placeholder, error,
}: {
  label: string; value: T | null; options: { value: T; label: string; hint?: string }[];
  onChange: (v: T) => void; placeholder?: string; error?: string;
}) {
  const { palette, t } = useApp();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const selected = options.find((o) => o.value === value);
  const filteredOptions = options.filter((option) => matchesPersonSearch(search, option.label, option.hint, typeof option.value === 'number' ? option.value : undefined));
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={{ color: palette.muted, fontSize: font.small, marginBottom: 6, fontWeight: '600' }}>{label}</Text>
      <Pressable
        onPress={() => { setSearch(''); setOpen(true); }}
        style={{
          backgroundColor: palette.surfaceAlt, borderWidth: 1.5, borderColor: error ? palette.danger : palette.border,
          borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: 13,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <Text style={{ color: selected ? palette.text : palette.muted, fontSize: font.body }}>
          {selected ? selected.label : placeholder ?? '—'}
        </Text>
        <Text style={{ color: palette.muted }}>▾</Text>
      </Pressable>
      {error ? <Text style={{ color: palette.danger, fontSize: font.tiny, marginTop: 4 }}>{error}</Text> : null}
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(4,20,14,0.45)' }} onPress={() => setOpen(false)}>
          <View style={{
            backgroundColor: palette.surface, marginHorizontal: spacing.lg, marginTop: '28%', borderRadius: radius.lg,
            padding: spacing.md, maxHeight: '60%', alignSelf: 'center', width: '92%', maxWidth: 520,
          }}>
            <Text style={{ fontWeight: '800', color: palette.text, fontSize: font.h3, marginBottom: spacing.sm }}>{label}</Text>
            {options.length > 6 ? <Field label="" value={search} onChangeText={setSearch} placeholder={t('search_name_or_id')} /> : null}
            <ScrollView>
              {filteredOptions.map((option) => (
                <Pressable
                  key={String(option.value)}
                  onPress={() => { onChange(option.value); setSearch(''); setOpen(false); }}
                  style={{
                    paddingVertical: 12, paddingHorizontal: spacing.sm, borderRadius: radius.sm,
                    backgroundColor: option.value === value ? palette.primarySoft : 'transparent',
                  }}
                >
                  <Text style={{ color: option.value === value ? palette.primary : palette.text, fontWeight: '600' }}>{option.label}</Text>
                  {option.hint ? <Text style={{ color: palette.muted, fontSize: font.tiny }}>{option.hint}</Text> : null}
                </Pressable>
              ))}
              {filteredOptions.length === 0 ? <Text style={{ color: palette.muted, padding: spacing.md }}>{t('no_data')}</Text> : null}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

export function DateField({
  label, value, onChange, allowEmpty,
}: { label: string; value: string; onChange: (v: string) => void; allowEmpty?: boolean }) {
  const { palette, t, lang } = useApp();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => dateFromInput(value));
  const shortcuts = [
    { label: '+' + 7, days: 7 },
    { label: '+' + 14, days: 14 },
    { label: '+' + 30, days: 30 },
  ];
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const monthLabel = visibleMonth.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', { month: 'long', year: 'numeric' });
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const calendarCells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: dayCount }, (_, index) => index + 1)];
  const weekdays = lang === 'fr' ? ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const openCalendar = () => { setVisibleMonth(dateFromInput(value)); setCalendarOpen(true); };
  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={{ color: palette.muted, fontSize: font.small, marginBottom: 6, fontWeight: '600' }}>{label}</Text> : null}
      <Pressable onPress={openCalendar} accessibilityRole="button" accessibilityLabel={`${label}: ${value || t('select_date')}`} style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: calendarOpen ? palette.primary : palette.border, backgroundColor: palette.surfaceAlt, opacity: pressed ? 0.82 : 1 })}>
        <Text style={{ color: value ? palette.text : palette.muted, fontSize: font.body }}>{value || t('select_date')}</Text>
        <Text style={{ color: palette.primary, fontSize: 19 }}>▦</Text>
      </Pressable>
      <Modal transparent visible={calendarOpen} animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
          <Pressable onPress={() => setCalendarOpen(false)} style={{ ...StyleSheet.absoluteFill, backgroundColor: '#10182888' }} />
          <View style={{ width: '100%', maxWidth: 420, alignSelf: 'center', padding: spacing.lg, borderRadius: 20, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.border, shadowColor: '#101828', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
              <Pressable onPress={() => setVisibleMonth(new Date(year, month - 1, 1))} accessibilityLabel={t('previous_month')} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceAlt }}><Text style={{ color: palette.primary, fontSize: 22 }}>‹</Text></Pressable>
              <Text style={{ color: palette.text, fontSize: font.h3, fontWeight: '800', textTransform: 'capitalize' }}>{monthLabel}</Text>
              <Pressable onPress={() => setVisibleMonth(new Date(year, month + 1, 1))} accessibilityLabel={t('next_month')} style={{ width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceAlt }}><Text style={{ color: palette.primary, fontSize: 22 }}>›</Text></Pressable>
            </View>
            <View style={{ flexDirection: 'row', marginBottom: spacing.xs }}>
              {weekdays.map((weekday) => <View key={weekday} style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.xs }}><Text style={{ color: palette.muted, fontSize: font.tiny, fontWeight: '700' }}>{weekday}</Text></View>)}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {calendarCells.map((day, index) => {
                if (day == null) return <View key={`blank-${index}`} style={{ width: '14.2857%', height: 44 }} />;
                const iso = toInputDate(new Date(year, month, day));
                const selected = value === iso;
                const today = toInputDate(new Date()) === iso;
                return <Pressable key={iso} onPress={() => { onChange(iso); setCalendarOpen(false); }} accessibilityRole="button" accessibilityState={{ selected }} style={({ pressed }) => ({ width: '14.2857%', height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: selected ? palette.primary : pressed ? palette.primarySoft : 'transparent', borderWidth: today && !selected ? 1 : 0, borderColor: palette.primary })}>
                  <Text style={{ color: selected ? '#fff' : palette.text, fontSize: font.small, fontWeight: selected || today ? '800' : '500' }}>{day}</Text>
                </Pressable>;
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md }}>
              {allowEmpty && value ? <Button title={t('clear')} variant="ghost" small onPress={() => { onChange(''); setCalendarOpen(false); }} /> : null}
              <Button title={t('cancel')} variant="outline" small onPress={() => setCalendarOpen(false)} />
            </View>
          </View>
        </View>
      </Modal>
      <Row gap={6} style={{ flexWrap: 'wrap', marginTop: -6 }}>
        {shortcuts.map((s) => {
          const d = new Date();
          d.setDate(d.getDate() + s.days);
          const iso = toInputDate(d);
          return <Chip key={s.days} label={s.label + 'j'} active={value === iso} onPress={() => onChange(iso)} />;
        })}
        {allowEmpty ? <Chip label={t('any')} active={!value} onPress={() => onChange('')} /> : null}
      </Row>
    </View>
  );
}

function dateFromInput(value: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day) return parsed;
  }
  return new Date();
}

function toInputDate(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
