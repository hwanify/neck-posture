import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { monitor, useMonitor } from '../state/monitor';
import type { PostureState } from '../engine';
import { Banner } from '../ui/components';
import { PersonVisual } from '../ui/PersonVisual';
import { colors, formatAngle, formatDuration, pauseLabel, stateColor, stateLabel, stateSoftColor } from '../ui/theme';
import { TiltGauge } from '../ui/TiltGauge';

export function HomeScreen() {
  const s = useMonitor();
  const snapshot = s.snapshot;
  const state: PostureState = s.calibration ? (snapshot?.state ?? 'paused') : 'paused';
  const color = stateColor[state];
  const angle = snapshot?.angle ?? 0;
  const now = useNow(s.session !== null);
  const today = useTodaySummary();

  const label =
    state === 'paused'
      ? pauseLabel[s.calibration ? (snapshot?.pauseReason ?? 'disconnected') : 'notCalibrated']
      : stateLabel[state];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.headline}>오늘의 목 자세</Text>
        </View>
        <ConnectionChip />
      </View>

      {s.sourceKind === 'phone' && (
        <Banner tone="info">
          Expo Go에는 AirPods 센서 모듈이 없어서 iPhone 센서로 대신 테스트해요. iPhone을 세워 들고 고개처럼
          좌우로 기울여보세요.
        </Banner>
      )}
      {s.authorization === 'denied' && (
        <Banner tone="danger">
          동작 및 피트니스 권한이 꺼져 있어요. 설정 앱에서 {s.sourceKind === 'phone' ? 'Expo Go' : '바로목'}의
          &apos;동작 및 피트니스&apos;를 켜주세요.{' '}
          <Text style={{ fontWeight: '700' }} onPress={() => Linking.openSettings()}>
            설정 열기 ›
          </Text>
        </Banner>
      )}
      {s.error && s.authorization !== 'denied' && <Banner tone="warning">{s.error}</Banner>}
      {s.calibrationMismatch && (
        <Banner tone="warning">
          보정할 때와 다른 쪽 이어폰의 센서가 사용 중이에요. 다시 보정하면 더 정확해요.
        </Banner>
      )}

      <View style={[styles.hero, { backgroundColor: stateSoftColor[state] }]}>
        <PersonVisual angle={angle} state={state} size={210} />
        <Text style={[styles.angle, { color: state === 'paused' ? colors.subtext : colors.text }]}>
          {s.calibration ? formatAngle(angle) : '—'}
        </Text>
        <View style={[styles.statePill, { backgroundColor: color }]}>
          <Text style={styles.statePillText}>{label}</Text>
        </View>
        {s.calibration ? (
          <View style={styles.gauge}>
            <TiltGauge angle={angle} enterDeg={s.settings.posture.enterDeg} color={color} />
          </View>
        ) : null}
      </View>

      {!s.calibration ? (
        <View style={styles.ctaCard}>
          <Text style={styles.ctaTitle}>먼저 바른 자세를 등록해주세요</Text>
          <Text style={styles.ctaBody}>
            {s.sourceKind === 'airpods'
              ? 'AirPods가 귀에 걸린 각도는 사람마다 달라요. 10초면 끝나요.'
              : '기준 자세와 좌우 방향을 등록해요. 10초면 끝나요.'}
          </Text>
          <PillButton title="자세 보정 시작" onPress={() => monitor.startCalibration()} />
        </View>
      ) : s.session ? (
        <View style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <View style={styles.liveDot} />
            <Text style={styles.sessionTitle}>측정 중</Text>
            <Text style={styles.sessionTime}>{formatClock((now - s.session.startedAt) / 1000)}</Text>
          </View>
          <View style={styles.tiles}>
            <Tile label="바른 자세" value={`${Math.round(s.session.goodRatio * 100)}%`} tint={colors.goodSoft} />
            <Tile label="알림" value={`${s.session.alertCount}회`} tint={colors.primarySoft} />
          </View>
          <Text style={styles.hint}>
            {s.settings.feedback.backgroundMode
              ? '화면을 끄거나 다른 앱을 써도 계속 감지해요.'
              : '앱을 켜둔 동안만 감지해요.'}
          </Text>
          <PillButton title="측정 종료" variant="outline" onPress={() => void monitor.endSession()} />
        </View>
      ) : (
        <PillButton title="측정 시작" onPress={() => void monitor.startSession()} />
      )}

      <View style={styles.todayCard}>
        <View style={styles.todayHeader}>
          <Text style={styles.todayTitle}>오늘 기록</Text>
          <Text style={styles.todayMeta}>{today.judgedSec > 0 ? formatDuration(today.judgedSec) : '아직 없어요'}</Text>
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { flex: today.goodRatio }]} />
          <View style={{ flex: 1 - today.goodRatio }} />
        </View>
        <View style={styles.todayStats}>
          <TodayStat value={`${Math.round(today.goodRatio * 100)}%`} label="바른 자세" />
          <TodayStat value={`${today.alerts}회`} label="알림" />
          <TodayStat value={today.bias} label="자주 기우는 쪽" />
        </View>
      </View>
    </ScrollView>
  );
}

function ConnectionChip() {
  const s = useMonitor();
  let text: string;
  let tone: string;
  if (s.sourceKind === 'demo') {
    text = '데모 모드';
    tone = colors.warning;
  } else if (s.sourceKind === 'phone') {
    text = s.connected ? 'iPhone 센서' : '센서 준비 중';
    tone = s.connected ? colors.primary : colors.muted;
  } else if (!s.available) {
    text = '미지원 기기';
    tone = colors.danger;
  } else if (s.connected) {
    text = 'AirPods 연결됨';
    tone = colors.primary;
  } else {
    text = 'AirPods 착용 필요';
    tone = colors.muted;
  }
  return (
    <View style={styles.chip}>
      <View style={[styles.dot, { backgroundColor: tone }]} />
      <Text style={styles.chipText}>{text}</Text>
    </View>
  );
}

function Tile({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: tint }]}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

function TodayStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.todayValue}>{value}</Text>
      <Text style={styles.todayLabel}>{label}</Text>
    </View>
  );
}

function PillButton({
  title,
  onPress,
  variant = 'solid',
}: {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'outline';
}) {
  const solid = variant === 'solid';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        solid ? styles.pillSolid : styles.pillOutline,
        { opacity: pressed ? 0.85 : 1 },
      ]}>
      <Text style={[styles.pillText, { color: solid ? '#FFFFFF' : colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

/** Saved sessions from today plus the one in progress. */
function useTodaySummary() {
  const { sessions, session } = useMonitor();
  const isToday = (ts: number) => new Date(ts).toDateString() === new Date().toDateString();
  let good = 0;
  let tilt = 0;
  let left = 0;
  let right = 0;
  let alerts = 0;
  for (const x of sessions.filter((x) => isToday(x.startedAt))) {
    good += x.goodSec;
    tilt += x.tiltSec;
    left += x.leftTiltSec;
    right += x.rightTiltSec;
    alerts += x.alertCount;
  }
  if (session) alerts += session.alertCount;
  const judgedSec = good + tilt;
  const bias = left + right < 5 ? '—' : Math.abs(left - right) / (left + right) < 0.2 ? '비슷해요' : left > right ? '왼쪽' : '오른쪽';
  return { judgedSec, goodRatio: judgedSec > 0 ? good / judgedSec : 0, alerts, bias };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return '좋은 아침이에요';
  if (h < 18) return '좋은 오후예요';
  return '오늘도 수고했어요';
}

function formatClock(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(s / 3600);
  return h > 0 ? `${h}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
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
  container: { padding: 20, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  greeting: { fontSize: 14, color: colors.subtext },
  headline: { fontSize: 26, fontWeight: '800', color: colors.text, marginTop: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 170,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  chipText: { fontSize: 12, color: colors.text, flexShrink: 1 },
  hero: { borderRadius: 32, alignItems: 'center', paddingTop: 12, paddingBottom: 20, paddingHorizontal: 20, marginBottom: 16 },
  angle: { fontSize: 48, fontWeight: '800', marginTop: -4, fontVariant: ['tabular-nums'] },
  statePill: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 6, marginTop: 4 },
  statePillText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  gauge: { width: '100%', marginTop: 16 },
  ctaCard: { backgroundColor: colors.card, borderRadius: 24, padding: 20, marginBottom: 16 },
  ctaTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  ctaBody: { fontSize: 14, color: colors.subtext, marginTop: 6, marginBottom: 16, lineHeight: 20 },
  sessionCard: { backgroundColor: colors.card, borderRadius: 24, padding: 20, marginBottom: 16 },
  sessionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  liveDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.danger, marginRight: 8 },
  sessionTitle: { fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 },
  sessionTime: { fontSize: 22, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  tiles: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, borderRadius: 18, padding: 14 },
  tileValue: { fontSize: 24, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  tileLabel: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  hint: { fontSize: 12, color: colors.subtext, marginVertical: 12, textAlign: 'center' },
  pill: { borderRadius: 28, paddingVertical: 17, alignItems: 'center', marginBottom: 16 },
  pillSolid: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  pillOutline: { borderWidth: 2, borderColor: colors.primary, marginBottom: 0 },
  pillText: { fontSize: 17, fontWeight: '800' },
  todayCard: { backgroundColor: colors.card, borderRadius: 24, padding: 20 },
  todayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  todayTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  todayMeta: { fontSize: 13, color: colors.subtext },
  progressTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.mutedSoft,
    overflow: 'hidden',
    marginVertical: 14,
  },
  progressFill: { backgroundColor: colors.good, borderRadius: 5 },
  todayStats: { flexDirection: 'row' },
  todayValue: { fontSize: 18, fontWeight: '800', color: colors.text },
  todayLabel: { fontSize: 12, color: colors.subtext, marginTop: 2 },
});
