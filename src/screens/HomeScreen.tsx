import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';

import type { PostureState } from '../engine';
import { monitor, useMonitor } from '../state/monitor';
import { Banner, Button, Row, Screen, Section } from '../ui/components';
import { PostureDial } from '../ui/PostureDial';
import { colors, formatDuration, pauseLabel, stateLabel } from '../ui/theme';

export function HomeScreen() {
  const s = useMonitor();
  const snapshot = s.snapshot;
  const state: PostureState = s.calibration ? (snapshot?.state ?? 'paused') : 'paused';
  const now = useNow(s.session !== null);
  const today = useTodaySummary();
  const { enterDeg, holdSec } = s.settings.posture;

  const caption =
    state === 'paused'
      ? pauseLabel[s.calibration ? (snapshot?.pauseReason ?? 'disconnected') : 'notCalibrated']
      : stateLabel[state];

  return (
    <Screen title="자세">
      {s.sourceKind === 'phone' && <Banner tone="info">Expo Go 테스트 모드 · iPhone 모션 센서 사용 중</Banner>}
      {s.authorization === 'denied' && (
        <Banner tone="danger">
          동작 및 피트니스 접근이 꺼져 있습니다.{' '}
          <Text style={{ color: colors.tint }} onPress={() => Linking.openSettings()}>
            설정 열기
          </Text>
        </Banner>
      )}
      {s.error && s.authorization !== 'denied' && <Banner tone="warning">{s.error}</Banner>}
      {s.calibrationMismatch && <Banner tone="warning">다른 쪽 이어폰의 센서가 사용 중입니다. 다시 보정하세요.</Banner>}

      <Section footer={`좌우로 ${enterDeg}° 이상 ${holdSec}초 동안 기울어지면 알려드립니다.`}>
        <View style={styles.dialBox}>
          <View style={styles.dialHeader}>
            <Text style={styles.dialTitle}>현재 기울기</Text>
            <ConnectionStatus />
          </View>
          <PostureDial
            angle={s.calibration && snapshot && state !== 'paused' ? snapshot.angle : null}
            enterDeg={enterDeg}
            state={state}
            caption={caption}
          />
        </View>
      </Section>

      {!s.calibration ? (
        <Section footer="이어폰이 귀에 걸린 각도는 사람마다 다릅니다. 바른 자세를 한 번 등록하면 그 기준으로 측정합니다.">
          <View style={styles.actionBox}>
            <Button title="기준 자세 등록" onPress={() => monitor.startCalibration()} />
          </View>
        </Section>
      ) : s.session ? (
        <Section header="측정 중">
          <Row title="경과 시간" value={formatClock((now - s.session.startedAt) / 1000)} />
          <Row title="바른 자세" value={`${Math.round(s.session.goodRatio * 100)}%`} />
          <Row title="알림" value={`${s.session.alertCount}회`} />
          <View style={styles.actionBox}>
            <Button title="측정 종료" variant="tinted" role="destructive" onPress={() => void monitor.endSession()} />
          </View>
        </Section>
      ) : (
        <View style={styles.primaryAction}>
          <Button title="측정 시작" onPress={() => void monitor.startSession()} />
        </View>
      )}

      <Section header="오늘">
        <Row title="바른 자세" value={today.judgedSec > 0 ? `${Math.round(today.goodRatio * 100)}%` : '–'} />
        <Row title="측정 시간" value={today.judgedSec > 0 ? formatDuration(today.judgedSec) : '–'} />
        <Row title="알림" value={`${today.alerts}회`} />
        <Row title="주로 기우는 쪽" value={today.bias} />
      </Section>
    </Screen>
  );
}

function ConnectionStatus() {
  const s = useMonitor();
  let text: string;
  let tone;
  if (s.sourceKind === 'demo') {
    text = '데모';
    tone = colors.warning;
  } else if (s.sourceKind === 'phone') {
    text = s.connected ? 'iPhone' : '대기 중';
    tone = s.connected ? colors.good : colors.muted;
  } else if (!s.available) {
    text = '지원 안 됨';
    tone = colors.danger;
  } else if (s.connected) {
    text = 'AirPods';
    tone = colors.good;
  } else {
    text = '연결 안 됨';
    tone = colors.muted;
  }
  return (
    <View style={styles.status}>
      <View style={[styles.statusDot, { backgroundColor: tone }]} />
      <Text style={styles.statusText}>{text}</Text>
    </View>
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
  const bias =
    left + right < 5 ? '–' : Math.abs(left - right) / (left + right) < 0.2 ? '균형' : left > right ? '왼쪽' : '오른쪽';
  return { judgedSec, goodRatio: judgedSec > 0 ? good / judgedSec : 0, alerts, bias };
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
  dialBox: { alignItems: 'center', paddingBottom: 20 },
  dialHeader: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  dialTitle: { fontSize: 17, fontWeight: '600', color: colors.text, letterSpacing: -0.4 },
  status: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 7, height: 7, borderRadius: 3.5, marginRight: 6 },
  statusText: { fontSize: 15, color: colors.subtext },
  actionBox: { padding: 16 },
  primaryAction: { marginHorizontal: 16, marginTop: 22 },
});
