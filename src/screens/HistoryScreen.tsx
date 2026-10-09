import { Alert, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { SessionSummary } from '../engine';
import { monitor, useMonitor } from '../state/monitor';
import { Row, Screen, Section } from '../ui/components';
import { Sparkline } from '../ui/Sparkline';
import { colors, formatDuration } from '../ui/theme';

export function HistoryScreen() {
  const { sessions, settings } = useMonitor();
  const { width } = useWindowDimensions();
  const today = summarizeDay(sessions, new Date());

  return (
    <Screen title="기록">
      <Section header="오늘">
        <Row
          title="바른 자세"
          value={today.judgedSec > 0 ? `${Math.round((today.goodSec / today.judgedSec) * 100)}%` : '–'}
        />
        <Row title="측정 시간" value={today.judgedSec > 0 ? formatDuration(today.judgedSec) : '–'} />
        <Row title="알림" value={`${today.alerts}회`} />
        {today.tiltSec > 0 ? (
          <View style={styles.biasBox}>
            <BiasBar left={today.leftSec} right={today.rightSec} />
          </View>
        ) : null}
      </Section>

      <Section
        header="세션"
        footer={sessions.length > 0 ? '세션을 길게 눌러 삭제할 수 있습니다.' : '측정을 시작하면 여기에 기록이 쌓입니다.'}>
        {sessions.length === 0 ? (
          <Row title="기록 없음" />
        ) : (
          sessions.map((session) => (
            <View key={session.id}>
              <Row
                title={formatDate(session.startedAt)}
                subtitle={`${formatDuration(session.goodSec + session.tiltSec)} · 알림 ${session.alertCount}회 · 평균 ${session.avgAbsAngle}°`}
                value={`${Math.round(goodRatio(session) * 100)}%`}
                valueColor={colors.text}
                onLongPress={() =>
                  Alert.alert('세션 삭제', '이 세션 기록을 삭제하시겠습니까?', [
                    { text: '취소', style: 'cancel' },
                    { text: '삭제', style: 'destructive', onPress: () => void monitor.removeSession(session.id) },
                  ])
                }
              />
              {session.timeline.length > 1 && (
                <View style={styles.chart}>
                  <Sparkline
                    values={session.timeline}
                    width={width - 64}
                    height={40}
                    limitDeg={settings.posture.enterDeg}
                  />
                </View>
              )}
            </View>
          ))
        )}
      </Section>
    </Screen>
  );
}

function BiasBar({ left, right }: { left: number; right: number }) {
  const total = left + right;
  const leftPct = total > 0 ? Math.round((left / total) * 100) : 50;
  return (
    <View>
      <View style={styles.biasLabels}>
        <Text style={styles.biasText}>왼쪽 {leftPct}%</Text>
        <Text style={styles.biasCaption}>기울어진 방향</Text>
        <Text style={styles.biasText}>오른쪽 {100 - leftPct}%</Text>
      </View>
      <View style={styles.biasTrack}>
        <View style={{ flex: Math.max(leftPct, 1), backgroundColor: colors.tint }} />
        <View style={{ width: 2 }} />
        <View style={{ flex: Math.max(100 - leftPct, 1), backgroundColor: colors.warning }} />
      </View>
    </View>
  );
}

const goodRatio = (s: SessionSummary) => {
  const judged = s.goodSec + s.tiltSec;
  return judged > 0 ? s.goodSec / judged : 1;
};

function summarizeDay(sessions: SessionSummary[], day: Date) {
  const sameDay = (ts: number) => new Date(ts).toDateString() === day.toDateString();
  return sessions
    .filter((s) => sameDay(s.startedAt))
    .reduce(
      (acc, s) => ({
        goodSec: acc.goodSec + s.goodSec,
        tiltSec: acc.tiltSec + s.tiltSec,
        judgedSec: acc.judgedSec + s.goodSec + s.tiltSec,
        leftSec: acc.leftSec + s.leftTiltSec,
        rightSec: acc.rightSec + s.rightTiltSec,
        alerts: acc.alerts + s.alertCount,
      }),
      { goodSec: 0, tiltSec: 0, judgedSec: 0, leftSec: 0, rightSec: 0, alerts: 0 },
    );
}

function formatDate(ts: number) {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const styles = StyleSheet.create({
  biasBox: { paddingHorizontal: 16, paddingVertical: 12 },
  biasLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  biasText: { fontSize: 13, color: colors.subtext, fontVariant: ['tabular-nums'] },
  biasCaption: { fontSize: 13, color: colors.tertiary },
  biasTrack: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden' },
  chart: { paddingHorizontal: 16, paddingBottom: 12 },
});
