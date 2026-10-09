import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View, type ViewStyle } from 'react-native';

import { colors } from './theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const palette = {
    primary: { bg: colors.primary, fg: colors.bg },
    secondary: { bg: colors.mutedSoft, fg: colors.text },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
      ]}>
      <Text style={[styles.buttonText, { color: palette.fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Banner({ tone, children }: { tone: 'warning' | 'danger' | 'info'; children: ReactNode }) {
  const palette = {
    warning: { bg: colors.warningSoft, fg: '#8A5A00' },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.primarySoft, fg: colors.primary },
  }[tone];
  return (
    <View style={[styles.banner, { backgroundColor: palette.bg }]}>
      <Text style={{ color: palette.fg, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

export function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function ToggleRow(props: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row label={props.label} hint={props.hint}>
      <Switch
        value={props.value}
        onValueChange={props.onChange}
        trackColor={{ true: colors.text, false: colors.border }}
        thumbColor={props.value ? colors.bg : colors.subtext}
      />
    </Row>
  );
}

export function StepperRow(props: {
  label: string;
  hint?: string;
  value: number;
  step: number;
  min: number;
  max: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const change = (delta: number) => {
    const next = Math.round((props.value + delta) * 100) / 100;
    props.onChange(Math.min(props.max, Math.max(props.min, next)));
  };
  return (
    <Row label={props.label} hint={props.hint}>
      <View style={styles.stepper}>
        <Pressable onPress={() => change(-props.step)} style={styles.stepperButton} hitSlop={6}>
          <Text style={styles.stepperSymbol}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{props.format(props.value)}</Text>
        <Pressable onPress={() => change(props.step)} style={styles.stepperButton} hitSlop={6}>
          <Text style={styles.stepperSymbol}>+</Text>
        </Pressable>
      </View>
    </Row>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  banner: { borderRadius: 12, padding: 12, marginBottom: 12 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
    marginTop: 8,
    marginBottom: 8,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 16, color: colors.text },
  rowHint: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.mutedSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSymbol: { fontSize: 18, color: colors.text },
  stepperValue: { minWidth: 56, textAlign: 'center', fontSize: 15, color: colors.text, fontVariant: ['tabular-nums'] },
});
