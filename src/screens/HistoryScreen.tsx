import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { type } from '../ui/fonts';
import { Text } from '../ui/Text';

import type { SessionSummary } from '../engine';
import { localeTag, t } from '../i18n';
import { monitor, useMonitor } from '../state/monitor';
import { Row, Screen, Section, Sheet } from '../ui/components';
import { colors, formatAngle, formatDuration } from '../ui/theme';

/**
 * History grouped by day so it stays short however much is recorded: this week at a glance on
 * top, then one row per day; tapping a day opens its sessions in a sheet.
 */
export function HistoryScreen() {
  const { sessions } = useMonitor();
  const [openDay, setOpenDay] = useState<string | null>(null);
  const days = groupByDay(sessions);
  const week = lastSevenDays(days);
  const weekTotal = summarize(week.flatMap((d) => d.sessions));
  const selected = days.find((d) => d.key === openDay) ?? null;

  return (
    <Screen title={t('history.title')}>
      <Section header={t('history.thisWeek')}>
        <View style={styles.weekBox}>
          <WeekStrip week={week} />
        </View>
        <Row title={t('history.good')} value={weekTotal.judgedSec > 0 ? percent(weekTotal) : '–'} />
        <Row
          title={t('history.measured')}
          value={weekTotal.judgedSec > 0 ? formatDuration(weekTotal.judgedSec) : '–'}
        />
        <Row title={t('history.alerts')} value={`${weekTotal.alerts}`} />
        {weekTotal.tiltSec > 0 ? (
          <View style={styles.biasBox}>
            <BiasBar left={weekTotal.leftSec} right={weekTotal.rightSec} />
          </View>
        ) : null}
      </Section>

      <Section
        header={t('history.byDay')}
        footer={days.length > 0 ? `${t('history.dayFooter')} ${t('history.retention')}` : t('history.footerEmpty')}>
        {days.length === 0 ? (
          <Row title={t('history.empty')} />
        ) : (
          days.map((day) => (
            <Row
              key={day.key}
              title={formatDay(day.date)}
              subtitle={summaryLine(summarize(day.sessions))}
              value={`${percent(summarize(day.sessions))}  ›`}
              valueColor={colors.text}
              onPress={() => setOpenDay(day.key)}
            />
          ))
        )}
      </Section>

      <Sheet
        visible={selected !== null}
        title={selected ? formatDay(selected.date) : ''}
        doneLabel={t('common.done')}
        onClose={() => setOpenDay(null)}>
        {selected ? (
          <Section footer={t('history.footer')}>
            {selected.sessions.map((session) => (
              <Row
                key={session.id}
                title={formatTime(session.startedAt)}
                subtitle={summaryLine(summarize([session]))}
                value={percent(summarize([session]))}
                valueColor={colors.text}
                onLongPress={() =>
                  Alert.alert(t('history.deleteTitle'), t('history.deleteMessage'), [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('common.delete'),
                      style: 'destructive',
                      onPress: () => {
                        if (selected.sessions.length === 1) setOpenDay(null);
                        void monitor.removeSession(session.id);
                      },
                    },
                  ])
                }
              />
            ))}
          </Section>
        ) : null}
      </Sheet>
    </Screen>
  );
}

type Day = { key: string; date: Date; sessions: SessionSummary[] };

/** Seven dots, oldest to today; brightness = share of good posture, a ring where nothing was measured. */
function WeekStrip({ week }: { week: Day[] }) {
  return (
    <View style={styles.week}>
      {week.map((day) => {
        const total = summarize(day.sessions);
        const ratio = total.judgedSec > 0 ? total.goodSec / total.judgedSec : null;
        return (
          <View key={day.key} style={styles.weekDay}>
            <View
              style={[
                styles.dot,
                ratio === null ? styles.dotEmpty : { backgroundColor: colors.text, opacity: 0.2 + 0.8 * ratio },
              ]}
            />
            <Text style={styles.weekLabel}>{day.date.toLocaleDateString(localeTag(), { weekday: 'narrow' })}</Text>
          </View>
        );
      })}
    </View>
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

type Totals = ReturnType<typeof summarize>;

function summarize(sessions: SessionSummary[]) {
  let goodSec = 0;
  let tiltSec = 0;
  let leftSec = 0;
  let rightSec = 0;
  let alerts = 0;
  let signed = 0;
  let unsigned = 0;
  let allSigned = true;
  for (const s of sessions) {
    const judged = s.goodSec + s.tiltSec;
    goodSec += s.goodSec;
    tiltSec += s.tiltSec;
    leftSec += s.leftTiltSec;
    rightSec += s.rightTiltSec;
    alerts += s.alertCount;
    unsigned += s.avgAbsAngle * judged;
    if (s.avgAngle === undefined) allSigned = false;
    else signed += s.avgAngle * judged;
  }
  const judgedSec = goodSec + tiltSec;
  return {
    goodSec,
    tiltSec,
    judgedSec,
    leftSec,
    rightSec,
    alerts,
    /** Mean signed angle when every session has one (older sessions only stored |angle|). */
    avgAngle: judgedSec > 0 && allSigned ? signed / judgedSec : null,
    avgAbsAngle: judgedSec > 0 ? unsigned / judgedSec : 0,
  };
}

const percent = (x: Totals) => `${Math.round((x.judgedSec > 0 ? x.goodSec / x.judgedSec : 1) * 100)}%`;

function summaryLine(x: Totals) {
  const avg = x.avgAngle !== null ? formatAngle(x.avgAngle) : `${Math.round(x.avgAbsAngle)}°`;
  return t('history.sessionSummary', { duration: formatDuration(x.judgedSec), n: x.alerts, avg });
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** Newest day first; sessions inside a day newest first (as stored). */
function groupByDay(sessions: SessionSummary[]): Day[] {
  const days = new Map<string, Day>();
  for (const s of sessions) {
    const date = new Date(s.startedAt);
    const key = dayKey(date);
    const day = days.get(key) ?? {
      key,
      date: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      sessions: [],
    };
    day.sessions.push(s);
    days.set(key, day);
  }
  return [...days.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** The last seven calendar days ending today, oldest first, empty days included. */
function lastSevenDays(days: Day[]): Day[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - i));
    const key = dayKey(date);
    return days.find((d) => d.key === key) ?? { key, date, sessions: [] };
  });
}

const formatDay = (d: Date) => d.toLocaleDateString(localeTag(), { month: 'long', day: 'numeric', weekday: 'short' });

const formatTime = (ts: number) => new Date(ts).toLocaleTimeString(localeTag(), { hour: '2-digit', minute: '2-digit' });

const styles = StyleSheet.create({
  weekBox: { paddingTop: 6, paddingBottom: 14 },
  week: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDay: { alignItems: 'center', width: 32 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  dotEmpty: { borderWidth: 1, borderColor: colors.tertiary },
  weekLabel: { ...type.label, fontSize: 11, color: colors.subtext, marginTop: 8 },
  biasBox: { paddingVertical: 14 },
  biasLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  biasText: { ...type.caption, color: colors.subtext, fontVariant: ['tabular-nums'] },
  biasCaption: { ...type.caption, color: colors.tertiary },
  biasTrack: { flexDirection: 'row', height: 3, borderRadius: 1.5, overflow: 'hidden' },
});
