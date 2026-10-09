import { Alert, StyleSheet, View, useWindowDimensions } from 'react-native';

import { type } from '../ui/fonts';
import { Text } from '../ui/Text';

import type { SessionSummary } from '../engine';
import { localeTag, t } from '../i18n';
import { monitor, useMonitor } from '../state/monitor';
import { Row, Screen, Section } from '../ui/components';
import { Sparkline } from '../ui/Sparkline';
import { colors, formatAngle, formatDuration } from '../ui/theme';

export function HistoryScreen() {
  const { sessions, settings } = useMonitor();
  const { width } = useWindowDimensions();
  const today = summarizeDay(sessions, new Date());

  return (
    <Screen title={t('history.title')}>
      <Section header={t('history.today')}>
        <Row
          title={t('history.good')}
          value={today.judgedSec > 0 ? `${Math.round((today.goodSec / today.judgedSec) * 100)}%` : '–'}
        />
        <Row title={t('history.measured')} value={today.judgedSec > 0 ? formatDuration(today.judgedSec) : '–'} />
        <Row title={t('history.alerts')} value={`${today.alerts}`} />
        {today.tiltSec > 0 ? (
          <View style={styles.biasBox}>
            <BiasBar left={today.leftSec} right={today.rightSec} />
          </View>
        ) : null}
      </Section>

      <Section
        header={t('history.sessions')}
        footer={sessions.length > 0 ? t('history.footer') : t('history.footerEmpty')}>
        {sessions.length === 0 ? (
          <Row title={t('history.empty')} />
        ) : (
          sessions.map((session) => (
            <View key={session.id}>
              <Row
                title={formatDate(session.startedAt)}
                subtitle={t('history.sessionSummary', {
                  duration: formatDuration(session.goodSec + session.tiltSec),
                  n: session.alertCount,
                  avg: session.avgAngle === undefined ? `${session.avgAbsAngle}°` : formatAngle(session.avgAngle),
                })}
                value={`${Math.round(goodRatio(session) * 100)}%`}
                valueColor={colors.text}
                onLongPress={() =>
                  Alert.alert(t('history.deleteTitle'), t('history.deleteMessage'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('common.delete'),
                      style: 'destructive',
                      onPress: () => void monitor.removeSession(session.id),
                    },
                  ])
                }
              />
              {session.timeline.length > 1 && (
                <View style={styles.chart}>
                  <Sparkline
                    values={session.timeline}
                    width={width - 40}
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
        <Text style={styles.biasText}>{t('history.biasLeft', { pct: leftPct })}</Text>
        <Text style={styles.biasCaption}>{t('history.biasCaption')}</Text>
        <Text style={styles.biasText}>{t('history.biasRight', { pct: 100 - leftPct })}</Text>
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
  return new Date(ts).toLocaleString(localeTag(), {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const styles = StyleSheet.create({
  biasBox: { paddingVertical: 14 },
  biasLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  biasText: { ...type.caption, color: colors.subtext, fontVariant: ['tabular-nums'] },
  biasCaption: { ...type.caption, color: colors.tertiary },
  biasTrack: { flexDirection: 'row', height: 3, borderRadius: 1.5, overflow: 'hidden' },
  chart: { paddingBottom: 14 },
});
