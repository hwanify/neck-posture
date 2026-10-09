import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import type { SessionSummary } from '../engine';
import { monitor, useMonitor } from '../state/monitor';
import { Card, SectionTitle } from '../ui/components';
import { Sparkline } from '../ui/Sparkline';
import { colors, formatDuration } from '../ui/theme';

export function HistoryScreen() {
  const { sessions, settings } = useMonitor();
  const { width } = useWindowDimensions();
  const today = summarizeDay(sessions, new Date());

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.title}>오늘</Text>
        {today.judgedSec > 0 ? (
          <View style={styles.statsRow}>
            <Stat label="바른 자세" value={`${Math.round((today.goodSec / today.judgedSec) * 100)}%`} />
            <Stat label="측정 시간" value={formatDuration(today.judgedSec)} />
            <Stat label="알림" value={`${today.alerts}회`} />
          </View>
        ) : (
          <Text style={styles.empty}>오늘 측정 기록이 없어요.</Text>
        )}
        {today.tiltSec > 0 && <BiasBar left={today.leftSec} right={today.rightSec} />}
      </Card>

      <SectionTitle>세션 기록</SectionTitle>
      {sessions.length === 0 && <Text style={styles.empty}>측정을 시작하면 여기에 기록이 쌓여요.</Text>}
      {sessions.map((session) => (
        <Pressable
          key={session.id}
          onLongPress={() =>
            Alert.alert('기록 삭제', '이 세션 기록을 삭제할까요?', [
              { text: '취소', style: 'cancel' },
              { text: '삭제', style: 'destructive', onPress: () => void monitor.removeSession(session.id) },
            ])
          }>
          <Card>
            <View style={styles.sessionHeader}>
              <Text style={styles.sessionTitle}>{formatDate(session.startedAt)}</Text>
              <Text style={styles.sessionRatio}>{Math.round(goodRatio(session) * 100)}%</Text>
            </View>
            <Text style={styles.sessionMeta}>
              {formatDuration(session.goodSec + session.tiltSec)} · 알림 {session.alertCount}회 · 평균{' '}
              {session.avgAbsAngle}°
            </Text>
            {session.timeline.length > 1 && (
              <View style={{ marginTop: 10 }}>
                <Sparkline values={session.timeline} width={width - 64} height={48} limitDeg={settings.posture.enterDeg} />
              </View>
            )}
            {session.tiltSec > 0 && <BiasBar left={session.leftTiltSec} right={session.rightTiltSec} />}
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function BiasBar({ left, right }: { left: number; right: number }) {
  const total = left + right;
  const leftPct = total > 0 ? Math.round((left / total) * 100) : 50;
  return (
    <View style={{ marginTop: 12 }}>
      <View style={styles.biasTrack}>
        <View style={[styles.biasLeft, { flex: Math.max(leftPct, 1) }]} />
        <View style={[styles.biasRight, { flex: Math.max(100 - leftPct, 1) }]} />
      </View>
      <View style={styles.biasLabels}>
        <Text style={styles.biasText}>왼쪽 {leftPct}%</Text>
        <Text style={styles.biasText}>오른쪽 {100 - leftPct}%</Text>
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
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
  container: { padding: 16, paddingBottom: 32 },
  title: { fontSize: 17, fontWeight: '700', color: colors.text, marginBottom: 6 },
  empty: { fontSize: 15, color: colors.subtext, marginVertical: 8, marginLeft: 4 },
  statsRow: { flexDirection: 'row', marginTop: 8 },
  statValue: { fontSize: 24, fontWeight: '300', color: colors.text, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 12, color: colors.subtext, marginTop: 2 },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sessionTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  sessionRatio: { fontSize: 22, fontWeight: '300', color: colors.text },
  sessionMeta: { fontSize: 13, color: colors.subtext, marginTop: 4 },
  biasTrack: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden' },
  biasLeft: { backgroundColor: '#7C8796' },
  biasRight: { backgroundColor: '#C2A27D' },
  biasLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  biasText: { fontSize: 12, color: colors.subtext },
});
