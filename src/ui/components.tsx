import { Children, Fragment, type ReactNode } from 'react';
import {
  type ColorValue,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
  type ViewStyle,
} from 'react-native';

import { type } from './fonts';
import { Text } from './Text';
import { RowIcon, type RowIconName } from './RowIcon';
import { colors } from './theme';

/** iOS metrics (points). */
const ICON_INSET = 20 + 14;

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
  iconInset,
}: {
  header?: string;
  footer?: ReactNode;
  children: ReactNode;
  style?: ViewStyle;
  /** Rows have leading icons: start separators after the icon, as iOS does. */
  iconInset?: boolean;
}) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={styles.section}>
      {header ? <Text style={styles.sectionHeader}>{header}</Text> : null}
      <View style={[styles.group, style]}>
        {items.map((child, i) => (
          <Fragment key={i}>
            {child}
            {i < items.length - 1 ? <View style={[styles.separator, iconInset && { marginLeft: ICON_INSET }]} /> : null}
          </Fragment>
        ))}
      </View>
      {footer ? <Text style={styles.sectionFooter}>{footer}</Text> : null}
    </View>
  );
}

/** Standard 44pt list row: title on the left, value or accessory on the right. */
export function Row({
  icon,
  title,
  subtitle,
  value,
  valueColor,
  children,
  onPress,
  onLongPress,
}: {
  icon?: RowIconName;
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
      {icon ? (
        <View style={styles.rowIcon}>
          <RowIcon name={icon} />
        </View>
      ) : null}
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

export function ToggleRow(props: {
  icon?: RowIconName;
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Row icon={props.icon} title={props.title} subtitle={props.subtitle}>
      <Switch
        value={props.value}
        onValueChange={props.onChange}
        trackColor={{ true: colors.tint, false: colors.fill }}
        thumbColor={props.value ? colors.bg : colors.text}
        ios_backgroundColor={colors.fill}
      />
    </Row>
  );
}

/** Value + UIStepper-style control. */
export function StepperRow(props: {
  icon?: RowIconName;
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
    <Row icon={props.icon} title={props.title} subtitle={props.subtitle}>
      <View style={styles.stepper}>
        <Pressable onPress={() => change(-props.step)} disabled={atMin} style={styles.stepperHalf} hitSlop={4}>
          <Text style={[styles.stepperSymbol, atMin && { color: colors.tertiary }]}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{props.format(props.value)}</Text>
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
        variant === 'tinted' && { borderWidth: StyleSheet.hairlineWidth, borderColor: colors.tertiary },
        { opacity: disabled ? 0.35 : pressed ? 0.6 : 1 },
      ]}>
      <Text style={[styles.buttonText, { color: variant === 'filled' ? colors.onText : accent }]}>{title}</Text>
    </Pressable>
  );
}

/** Text options; the selected one is bright, the rest are dimmed. */
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
          <Pressable key={o.value} disabled={disabled} onPress={() => onChange(o.value)} style={styles.segment}>
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Inline notice: a dot and a line of text, no container. */
export function Banner({ tone, children }: { tone: 'warning' | 'danger' | 'info'; children: ReactNode }) {
  const dot = { warning: colors.warning, danger: colors.danger, info: colors.tint }[tone];
  return (
    <View style={styles.banner}>
      <View style={[styles.bannerDot, { backgroundColor: dot }]} />
      <Text style={styles.bannerText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { paddingBottom: 40 },
  largeTitle: {
    ...type.title,
    color: colors.text,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 8,
  },
  section: { marginTop: 30, marginHorizontal: 20 },
  sectionHeader: {
    ...type.label,
    color: colors.subtext,
    marginBottom: 4,
  },
  sectionFooter: { ...type.caption, lineHeight: 18, color: colors.subtext, marginTop: 8 },
  group: {},
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.separator },
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  rowIcon: { marginRight: 14 },
  rowTitle: { ...type.body, color: colors.text },
  rowSubtitle: { ...type.caption, color: colors.subtext, marginTop: 2 },
  rowValue: { ...type.body, color: colors.subtext, fontVariant: ['tabular-nums'] },
  stepper: { flexDirection: 'row', alignItems: 'center', marginLeft: 12 },
  stepperHalf: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepperSymbol: { ...type.body, fontSize: 18, color: colors.subtext },
  stepperValue: { ...type.body, color: colors.text, minWidth: 48, textAlign: 'center', fontVariant: ['tabular-nums'] },
  button: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  buttonText: { ...type.button },
  segmented: { flexDirection: 'row', gap: 24 },
  segment: { paddingVertical: 6 },
  segmentText: { ...type.callout, color: colors.tertiary },
  segmentTextSelected: { color: colors.text },
  banner: { flexDirection: 'row', alignItems: 'center', marginTop: 12, marginHorizontal: 20 },
  bannerDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  bannerText: { ...type.caption, flex: 1, lineHeight: 19, color: colors.subtext },
});
