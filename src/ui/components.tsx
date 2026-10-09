import { Children, Fragment, type ReactNode } from 'react';
import {
  type ColorValue,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { colors } from './theme';

/** iOS metrics (points). */
const INSET = 16;
const RADIUS = 22;

/** Scrollable screen on the grouped background with an iOS large title. */
export function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.screen}
      contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.largeTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </ScrollView>
  );
}

/** Inset grouped section: optional header/footer and rows separated by inset hairlines. */
export function Section({
  header,
  footer,
  children,
  style,
}: {
  header?: string;
  footer?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
}) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.section}>
      {header ? <Text style={styles.sectionHeader}>{header}</Text> : null}
      <View style={[styles.group, style]}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {child}
            {i < items.length - 1 ? <View style={styles.separator} /> : null}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={styles.sectionFooter}>{footer}</Text> : null}
    </View>
  );
}

/** Standard 44pt list row: title on the left, value or accessory on the right. */
export function Row({
  title,
  subtitle,
  value,
  valueColor,
  children,
  onPress,
  onLongPress,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  valueColor?: ColorValue;
  children?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const content = (
    <View style={styles.row}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      {value !== undefined ? (
        <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
      ) : null}
      {children}
    </View>
  );
  if (!onPress && !onLongPress) return content;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => (pressed ? { backgroundColor: colors.fill } : null)}>
      {content}
    </Pressable>
  );
}

export function ToggleRow(props: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Row title={props.title} subtitle={props.subtitle}>
      <Switch value={props.value} onValueChange={props.onChange} trackColor={{ true: colors.good }} />
    </Row>
  );
}

/** Value + UIStepper-style control. */
export function StepperRow(props: {
  title: string;
  subtitle?: string;
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
  const atMin = props.value <= props.min;
  const atMax = props.value >= props.max;
  return (
    <Row title={props.title} subtitle={props.subtitle} value={props.format(props.value)}>
      <View style={styles.stepper}>
        <Pressable onPress={() => change(-props.step)} disabled={atMin} style={styles.stepperHalf} hitSlop={4}>
          <Text style={[styles.stepperSymbol, atMin && { color: colors.tertiary }]}>−</Text>
        </Pressable>
        <View style={styles.stepperDivider} />
        <Pressable onPress={() => change(props.step)} disabled={atMax} style={styles.stepperHalf} hitSlop={4}>
          <Text style={[styles.stepperSymbol, atMax && { color: colors.tertiary }]}>+</Text>
        </Pressable>
      </View>
    </Row>
  );
}

/** Large iOS button. filled = primary action, tinted = secondary, plain = text only. */
export function Button({
  title,
  onPress,
  variant = 'filled',
  role,
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: 'filled' | 'tinted' | 'plain';
  role?: 'destructive';
  disabled?: boolean;
}) {
  const accent = role === 'destructive' ? colors.danger : colors.tint;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'filled' && { backgroundColor: accent },
        variant === 'tinted' && { backgroundColor: colors.fill },
        { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
      ]}>
      <Text style={[styles.buttonText, { color: variant === 'filled' ? '#FFFFFF' : accent }]}>{title}</Text>
    </Pressable>
  );
}

/** UISegmentedControl look-alike. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.segmented, disabled && { opacity: 0.5 }]}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            disabled={disabled}
            onPress={() => onChange(o.value)}
            style={[styles.segment, selected && styles.segmentSelected]}>
            <Text style={[styles.segmentText, selected && { fontWeight: '600' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Inline notice shown as its own inset group. */
export function Banner({ tone, children }: { tone: 'warning' | 'danger' | 'info'; children: ReactNode }) {
  const dot = { warning: colors.warning, danger: colors.danger, info: colors.tint }[tone];
  return (
    <View style={[styles.group, styles.banner]}>
      <View style={[styles.bannerDot, { backgroundColor: dot }]} />
      <Text style={styles.bannerText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 40 },
  largeTitle: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.text,
    marginHorizontal: INSET + 4,
    marginTop: 8,
    marginBottom: 8,
  },
  section: { marginTop: 22, marginHorizontal: INSET },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.subtext,
    marginLeft: INSET,
    marginBottom: 7,
  },
  sectionFooter: { fontSize: 13, lineHeight: 18, color: colors.subtext, marginHorizontal: INSET, marginTop: 7 },
  group: { backgroundColor: colors.card, borderRadius: RADIUS, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator, marginLeft: INSET },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: INSET, paddingVertical: 11 },
  rowTitle: { fontSize: 17, color: colors.text, letterSpacing: -0.4 },
  rowSubtitle: { fontSize: 13, color: colors.subtext, marginTop: 2 },
  rowValue: { fontSize: 17, color: colors.subtext, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.fill,
    borderRadius: 16,
    marginLeft: 12,
    height: 32,
  },
  stepperHalf: { width: 46, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepperSymbol: { fontSize: 20, color: colors.text, marginTop: -2 },
  stepperDivider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: colors.separator },
  button: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  segmented: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: 20, padding: 3 },
  segment: { flex: 1, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  segmentSelected: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  segmentText: { fontSize: 13, color: colors.text },
  banner: { flexDirection: 'row', alignItems: 'center', padding: INSET, marginTop: 12, marginHorizontal: INSET },
  bannerDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  bannerText: { flex: 1, fontSize: 15, lineHeight: 20, color: colors.text },
});
