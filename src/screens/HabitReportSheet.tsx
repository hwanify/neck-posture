import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import type { HabitReport, SessionSummary } from '../engine';
import { localeTag, t } from '../i18n';
import { monitor, useMonitor } from '../state/monitor';
import { Sheet } from '../ui/components';
import { type } from '../ui/fonts';
import { Text } from '../ui/Text';
import { colors } from '../ui/theme';

/** Shown when a habit (silent) session ends: how the head was held, with no judgement attached. */
export function HabitReportSheet() {
  const s = useMonitor();
  const data = s.report;
  const threshold = s.settings.posture.enterDeg;
  return (
    <Sheet
      visible={data !== null}
      title={t('report.title')}
      doneLabel={t('common.done')}
      onClose={() => monitor.dismissReport()}>
      {data ? <ReportBody summary={data.summary} report={data.report} threshold={threshold} /> : null}
    </Sheet>
  );
}

/**
 * Report page, also opened again from History. Three answers, top to bottom: where the head
 * usually sits, how the time split between left / upright / right, and when it tilted.
 */
export function ReportBody({
  summary,
  report,
  threshold,
}: {
  summary: SessionSummary;
  report: HabitReport;
  threshold: number;
}) {
  const usual = report.usualAngle;
  return (
    <View style={styles.body}>
      <Text style={styles.label}>{t('report.usualLabel')}</Text>
      <Text style={styles.big}>
        {usual === null
          ? '–'
          : usual === 0
            ? `${t('report.straight')} 0°`
            : `${t(usual < 0 ? 'common.left' : 'common.right')} ${Math.abs(usual)}°`}
      </Text>
      <Text style={styles.sub}>{t('report.usualHint')}</Text>

      <Text style={[styles.label, styles.section]}>{t('report.during', { time: formatDuration(report.measuredSec) })}</Text>
      <SplitBar report={report} />

      <When summary={summary} threshold={threshold} />

      <View style={styles.pair}>
        <Item label={t('report.episodes')} value={t('report.episodesValue', { n: report.episodes })} />
        <Item label={t('report.longest')} value={report.longestTiltSec > 0 ? formatDuration(report.longestTiltSec) : '–'} />
      </View>
      <Text style={styles.note}>{t('report.note', { deg: threshold })}</Text>
    </View>
  );
}

/** One bar split left-tilted | upright | right-tilted, laid out in that order so the side reads from position. */
function SplitBar({ report }: { report: HabitReport }) {
  const parts = [
    { share: report.leftShare, label: t('report.leftShare'), tilted: true, align: 'flex-start' as const },
    { share: report.goodShare, label: t('report.upright'), tilted: false, align: 'center' as const },
    { share: report.rightShare, label: t('report.rightShare'), tilted: true, align: 'flex-end' as const },
  ];
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  return (
    <View>
      <View style={styles.bar}>
        {parts.map((p, i) =>
          p.share > 0 ? (
            <View
              key={i}
              style={{ flex: p.share, backgroundColor: p.tilted ? colors.text : colors.tertiary, minWidth: 3 }}
            />
          ) : null,
        )}
      </View>
      <View style={styles.barLabels}>
        {parts.map((p, i) => (
          <View key={i} style={[styles.barLabel, { alignItems: p.align }]}>
            <Text style={[styles.pct, !p.tilted && styles.pctDim]}>{pct(p.share)}</Text>
            <Text style={styles.small}>{p.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const W = 300;
const ROW_H = 16;
const ROW_GAP = 6;

/**
 * Time runs left to right; a block in the top row is a stretch tilted right, in the bottom row a
 * stretch tilted left (5-second steps past the alert angle).
 */
function When({ summary, threshold }: { summary: SessionSummary; threshold: number }) {
  const { timeline } = summary;
  const n = timeline.length;
  if (n < 2) return null;
  const runs = (side: 1 | -1) => {
    const out: [number, number][] = [];
    let start = -1;
    timeline.forEach((a, i) => {
      const on = a !== null && a * side >= threshold;
      if (on && start < 0) start = i;
      if (!on && start >= 0) {
        out.push([start, i]);
        start = -1;
      }
    });
    if (start >= 0) out.push([start, n]);
    return out;
  };
  const row = (side: 1 | -1, y: number) => (
    <>
      <Rect x={0} y={y} width={W} height={ROW_H} rx={3} fill={colors.separator} />
      {runs(side).map(([a, b]) => (
        <Rect key={a} x={(a / n) * W} y={y} width={Math.max(2, ((b - a) / n) * W)} height={ROW_H} rx={2} fill={colors.text} />
      ))}
    </>
  );
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('report.when')}</Text>
      <View style={styles.whenRow}>
        <View style={styles.whenSides}>
          <Text style={styles.small}>{t('common.right')}</Text>
          <Text style={styles.small}>{t('common.left')}</Text>
        </View>
        <View style={styles.whenPlot}>
          <Svg width="100%" height={ROW_H * 2 + ROW_GAP} viewBox={`0 0 ${W} ${ROW_H * 2 + ROW_GAP}`} preserveAspectRatio="none">
            {row(1, 0)}
            {row(-1, ROW_H + ROW_GAP)}
          </Svg>
          <View style={styles.times}>
            <Text style={styles.time}>{clock(summary.startedAt)}</Text>
            <Text style={styles.time}>{clock(summary.endedAt)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.small}>{label}</Text>
      <Text style={styles.itemValue}>{value}</Text>
    </View>
  );
}

const clock = (ms: number) => new Date(ms).toLocaleTimeString(localeTag(), { hour: 'numeric', minute: '2-digit' });

function formatDuration(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return t('report.sec', { n: s });
  const m = Math.round(s / 60);
  if (m < 60) return t('report.min', { n: m });
  return t('report.hm', { h: Math.floor(m / 60), m: m % 60 });
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 24, paddingBottom: 24 },
  label: { ...type.label, fontSize: 13, color: colors.subtext, marginTop: 8 },
  big: { ...type.display, fontSize: 48, lineHeight: 58, color: colors.text, fontVariant: ['tabular-nums'], marginTop: 4 },
  sub: { ...type.label, fontSize: 13, color: colors.subtext },
  section: { marginTop: 36 },
  bar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, marginTop: 12 },
  barLabels: { flexDirection: 'row', marginTop: 10 },
  barLabel: { flex: 1 },
  pct: { ...type.numeral, fontSize: 20, color: colors.text, fontVariant: ['tabular-nums'] },
  pctDim: { color: colors.subtext },
  small: { ...type.label, fontSize: 12, color: colors.subtext, marginTop: 2 },
  whenRow: { flexDirection: 'row', marginTop: 12 },
  /** Same height as the two rows so each label sits beside its row. */
  whenSides: { height: ROW_H * 2 + ROW_GAP, justifyContent: 'space-between', marginRight: 10 },
  whenPlot: { flex: 1 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  time: { ...type.label, fontSize: 11, color: colors.muted, fontVariant: ['tabular-nums'] },
  pair: { flexDirection: 'row', marginTop: 32 },
  item: { flex: 1 },
  itemValue: { ...type.numeral, fontSize: 20, color: colors.text, marginTop: 4 },
  note: { ...type.label, fontSize: 11, color: colors.muted, marginTop: 28, lineHeight: 16 },
});
