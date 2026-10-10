import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, View } from 'react-native';

import { type } from '../ui/fonts';
import { Text } from '../ui/Text';

import { POSTURE_CHECK_SEC, type PostureState } from '../engine';
import { localeTag, t } from '../i18n';
import { monitor, useMonitor } from '../state/monitor';
import { colors } from '../ui/theme';

const LINE_WIDTH = 180;
const MAX_LINE_DEG = 30;
/** Changes smaller than this don't move the line, so it rests still instead of shimmering. */
const DEADBAND_DEG = 0.3;

/**
 * Posture tab. The pre-session check runs in place: the level line fills in over the horizon while
 * counting down, then tilts with the head once measuring starts, without ever leaving its spot.
 */
export function HomeScreen() {
  const s = useMonitor();
  const check = s.checking;
  const snapshot = s.snapshot;
  const state: PostureState = s.calibration ? (snapshot?.state ?? 'paused') : 'paused';
  const live = !check && s.calibration && snapshot && state !== 'paused';
  const angle = live ? snapshot.angle : 0;
  const abs = Math.round(Math.abs(angle));
  // While judging pauses for a big head movement (or walking), say so instead of showing 0°.
  const pauseReason = !check && s.calibration ? snapshot?.pauseReason : null;
  const pauseText =
    pauseReason === 'moving' ? t('home.bigMovement') : pauseReason === 'walking' ? t('pause.walking') : null;
  const now = useNow(s.session !== null);
  const today = useTodaySummary();

  const notice =
    s.authorization === 'denied'
      ? t('home.allowMotion')
      : s.error
        ? s.error
        : s.calibrationMismatch
          ? t('home.otherEarbud')
          : null;

  const ratio = s.session ? s.session.goodRatio : today.judgedSec > 0 ? today.goodRatio : null;
  const alerts = s.session ? s.session.alertCount : today.alerts;
  const time = s.session
    ? formatClock((now - s.session.startedAt) / 1000)
    : today.judgedSec > 0
      ? formatShort(today.judgedSec)
      : '–';

  const largeShift = check?.largeShiftDeg != null;
  const fill = !check || check.starting || largeShift ? 1 : check.progress;
  const statsOpacity = useFade(!check);
  const numberOpacity = useFadeIn(check ? (check.starting ? 'starting' : 'check') : 'live');

  let number: string;
  if (check) {
    number = check.starting
      ? t('check.start')
      : largeShift
        ? `${Math.round(check.largeShiftDeg!)}°`
        : `${Math.max(0, Math.ceil(POSTURE_CHECK_SEC * (1 - check.progress)))}`;
  } else {
    number = live ? `${abs}°` : '0°';
  }

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        <View style={styles.top}>
          <Text style={styles.meta}>{formatToday()}</Text>
          <ConnectionStatus />
        </View>

        {notice && (
          <Text style={styles.notice} onPress={s.authorization === 'denied' ? () => Linking.openSettings() : undefined}>
            {notice}
          </Text>
        )}

        <View style={styles.center}>
          <LevelLine angle={angle} fill={fill} />
          <Animated.View style={{ opacity: numberOpacity }}>
            {pauseText ? (
              <Text style={[styles.angle, styles.pauseText]}>{pauseText}</Text>
            ) : (
              <Text style={styles.angle}>{number}</Text>
            )}
          </Animated.View>
          <View style={styles.captionBox}>{check ? <CheckCaption /> : null}</View>
        </View>

        <View style={styles.statsSlot}>
          <Animated.View style={[styles.stats, { opacity: statsOpacity }]} pointerEvents={check ? 'none' : 'auto'}>
            <Stat value={ratio === null ? '–' : `${Math.round(ratio * 100)}%`} label={t('home.good')} />
            <Stat value={`${alerts}`} label={t('home.alerts')} />
            <Stat value={time} label={s.session ? t('home.elapsed') : t('home.today')} />
          </Animated.View>
          {largeShift ? (
            <Pressable style={styles.linkSlot} onPress={() => void monitor.confirmCheck()} hitSlop={8}>
              <Text style={styles.link}>{t('check.startAnyway')}</Text>
            </Pressable>
          ) : null}
        </View>

        {check ? (
          largeShift ? (
            <MainButton title={t('check.recalibrate')} onPress={() => monitor.startCalibration()} />
          ) : (
            <MainButton
              title={check.resumed ? t('check.stop') : t('common.cancel')}
              quiet
              onPress={() => void monitor.cancelCheck()}
            />
          )
        ) : (
          <MainButton
            title={!s.calibration ? t('home.calibrate') : s.session ? t('home.stop') : t('home.start')}
            onPress={() =>
              !s.calibration
                ? monitor.startCalibration()
                : s.session
                  ? void monitor.endSession()
                  : void monitor.startSession()
            }
          />
        )}
      </View>
    </View>
  );
}

/** Label + hint under the countdown while the posture check runs. */
function CheckCaption() {
  const s = useMonitor();
  const check = s.checking!;
  const waiting = s.sourceKind === 'airpods' && !s.connected;
  const largeShift = check.largeShiftDeg !== null;
  const label = check.starting
    ? t('check.starting')
    : largeShift
      ? t('check.largeShift')
      : check.resumed
        ? t('check.reconnected')
        : t('check.lookAhead');
  const hint = check.starting
    ? t('check.startingHint')
    : largeShift
      ? t('check.largeShiftHint')
      : waiting
        ? t('check.waiting')
        : check.tooMuchMotion
          ? t('check.motion')
          : t('check.holdHint', { sec: POSTURE_CHECK_SEC });
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.hint, (waiting || check.tooMuchMotion) && { color: colors.text }]}>{hint}</Text>
    </>
  );
}

/**
 * The level line over a faint fixed horizon. Rotation eases towards each new angle on the native
 * thread (so sensor jitter reads as smooth motion); `fill` (0...1) grows the line out from the
 * center during the posture check.
 */
function LevelLine({ angle, fill }: { angle: number; fill: number }) {
  const target = Math.max(-MAX_LINE_DEG, Math.min(MAX_LINE_DEG, angle));
  const rotation = useRef(new Animated.Value(target)).current;
  const scale = useRef(new Animated.Value(fill)).current;
  const lastTarget = useRef(target);

  useEffect(() => {
    if (Math.abs(target - lastTarget.current) < DEADBAND_DEG) return;
    lastTarget.current = target;
    Animated.timing(rotation, {
      toValue: target,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [target, rotation]);

  useEffect(() => {
    Animated.timing(scale, {
      toValue: Math.max(0.001, fill),
      duration: 160,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [fill, scale]);

  const rotate = rotation.interpolate({
    inputRange: [-MAX_LINE_DEG, MAX_LINE_DEG],
    outputRange: [`-${MAX_LINE_DEG}deg`, `${MAX_LINE_DEG}deg`],
  });
  return (
    <View style={styles.levelBox}>
      <View style={styles.horizon} />
      <Animated.View style={[styles.level, { transform: [{ rotate }, { scaleX: scale }] }]} />
      <View style={styles.levelDot} />
    </View>
  );
}

/** Opacity that eases to 1 while `visible`, to 0 otherwise. */
function useFade(visible: boolean) {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 400 : 200,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);
  return opacity;
}

/** Opacity that dips and fades back in each time `key` changes, so swapped text cross-fades. */
function useFadeIn(key: string) {
  const opacity = useRef(new Animated.Value(1)).current;
  const previous = useRef(key);
  useEffect(() => {
    if (previous.current === key) return;
    previous.current = key;
    opacity.setValue(0);
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [key, opacity]);
  return opacity;
}

function MainButton({ title, onPress, quiet }: { title: string; onPress: () => void; quiet?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, quiet && styles.buttonQuiet, { opacity: pressed ? 0.8 : 1 }]}>
      <Text style={[styles.buttonText, quiet && styles.buttonTextQuiet]}>{title}</Text>
    </Pressable>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ConnectionStatus() {
  const s = useMonitor();
  const [text, tone] =
    s.sourceKind === 'demo'
      ? [t('status.demo'), colors.warning]
      : s.sourceKind === 'phone'
        ? [s.connected ? t('status.phone') : t('status.waiting'), s.connected ? colors.good : colors.muted]
        : !s.available
          ? [t('status.unsupported'), colors.danger]
          : s.connected
            ? ['AirPods', colors.good]
            : [t('status.disconnected'), colors.muted];
  return (
    <View style={styles.status}>
      <View style={[styles.statusDot, { backgroundColor: tone }]} />
      <Text style={styles.meta}>{text}</Text>
    </View>
  );
}

/** Saved sessions from today plus the one in progress. */
function useTodaySummary() {
  const { sessions, session } = useMonitor();
  const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();
  let good = 0;
  let tilt = 0;
  let alerts = 0;
  for (const x of sessions.filter((x) => isToday(x.startedAt))) {
    good += x.goodSec;
    tilt += x.tiltSec;
    alerts += x.alertCount;
  }
  if (session) alerts += session.alertCount;
  const judgedSec = good + tilt;
  return { judgedSec, goodRatio: judgedSec > 0 ? good / judgedSec : 0, alerts };
}

function formatToday() {
  const d = new Date();
  return d.toLocaleDateString(localeTag(), { month: 'long', day: 'numeric', weekday: 'long' });
}

function formatShort(sec: number) {
  const m = Math.round(sec / 60);
  return m >= 60 ? t('duration.hm', { h: Math.floor(m / 60), m: m % 60 }) : t('duration.m', { m });
}

function formatClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  return h > 0
    ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`
    : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

/** Re-renders every second while `active`, for the elapsed-time display. */
function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { ...type.label, fontSize: 13, color: colors.subtext },
  status: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  notice: { ...type.caption, color: colors.danger, marginTop: 12, textAlign: 'center' },
  center: { flex: 1, minHeight: 360, alignItems: 'center', justifyContent: 'center', paddingTop: 120 },
  levelBox: { width: 240, height: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  /** Fixed reference so the direction of the tilted line reads at a glance. */
  horizon: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.tertiary, opacity: 0.6 },
  level: { position: 'absolute', width: LINE_WIDTH, height: 1.5, borderRadius: 1, backgroundColor: colors.text },
  levelDot: { width: 9, height: 9, borderRadius: 4.5, backgroundColor: colors.tint },
  angle: { ...type.display, color: colors.text, fontVariant: ['tabular-nums'], lineHeight: 44 },
  /** Same line height as the angle so the layout doesn't jump. */
  pauseText: { ...type.heading, color: colors.subtext, lineHeight: 44 },
  /** Holds the countdown's label/hint; always reserved so the line sits at the same height in every mode. */
  captionBox: { height: 48, alignItems: 'center', marginTop: 10 },
  label: { ...type.label, fontSize: 13, color: colors.text },
  hint: { ...type.label, fontSize: 12, color: colors.subtext, marginTop: 6 },
  statsSlot: { marginBottom: 28, justifyContent: 'center' },
  stats: { flexDirection: 'row' },
  linkSlot: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  link: { ...type.label, fontSize: 13, color: colors.subtext },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...type.numeral, color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { ...type.label, fontSize: 11, color: colors.subtext, marginTop: 3 },
  button: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { ...type.button, fontSize: 15, color: colors.onText },
  buttonQuiet: { backgroundColor: 'transparent', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.tertiary },
  buttonTextQuiet: { color: colors.subtext },
});
