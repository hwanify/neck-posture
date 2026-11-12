import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Rect } from 'react-native-svg';

import { HIST_MAX, type HabitReport, type SessionSummary } from '../engine';
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

/** Report page; also opened again from History for a past session. */
export function ReportBody({
  summary,
  report,
  threshold,
}: {
  summary: SessionSummary;
  report: HabitReport;
  threshold: number;
}) {
  const pct = (x: number) => Math.round(x * 100);
  const side =
    report.side === null
      ? t('report.noSide')
      : t(report.side === 'left' ? 'report.left' : 'report.right', { pct: pct(report.sideShare) });
  const typical = report.typicalAngle;
  return (
    <View style={styles.body}>
      <Text style={styles.label}>{t('report.typicalLabel')}</Text>
      {typical === null ? (
        <Text style={styles.none}>{t('report.typicalNone')}</Text>
      ) : (
        <>
          <Text style={styles.big}>
            {`${t(typical < 0 ? 'common.left' : 'common.right')} ${Math.abs(typical)}°`}
          </Text>
          <Text style={styles.sub}>{t('report.typicalHint')}</Text>
        </>
      )}
      <Text style={styles.summary}>{t(`report.trend.${report.trend}`)}</Text>

      <Distribution histogram={report.histogram} threshold={threshold} typical={typical} />
      <Timeline summary={summary} threshold={threshold} />

      <View style={styles.grid}>
        <Item
          label={t('report.tiltShareLabel')}
          value={`${pct(report.tiltShare)}%`}
          hint={t('report.of', { time: formatDuration(report.measuredSec) })}
        />
        <Item label={t('report.side')} value={side} />
        <Item label={t('report.episodes')} value={t('report.episodesValue', { n: report.episodes })} />
        <Item
          label={t('report.episodeAvg')}
          value={report.episodes > 0 ? formatDuration(report.avgEpisodeSec) : '–'}
        />
        <Item label={t('report.longest')} value={report.longestTiltSec > 0 ? formatDuration(report.longestTiltSec) : '–'} />
        <Item
          label={t('report.firstTilt')}
          value={
            report.firstTiltAfterSec === null
              ? t('report.never')
              : t('report.firstTiltValue', { time: formatDuration(report.firstTiltAfterSec) })
          }
        />
        <Item label={t('report.avg')} value={`${Math.round(report.avgAbsAngle)}°`} />
      </View>
      <Text style={styles.note}>{t('report.note', { deg: threshold })}</Text>
    </View>
  );
}

const BAR_W = 320;
const BAR_H = 72;

/**
 * Bars of how often each angle came up, left tilt on the left, right on the right; tilted bins are
 * bright, the usual angle brightest, and dashed lines mark the alert angle on both sides.
 */
function Distribution({
  histogram,
  threshold,
  typical,
}: {
  histogram: number[];
  threshold: number;
  typical: number | null;
}) {
  const max = Math.max(...histogram);
  if (max === 0) return null;
  const n = histogram.length;
  const slot = BAR_W / n;
  // Edges of the tilted range: left of the +threshold bin, right of the -threshold bin.
  const edges = [(HIST_MAX + threshold) * slot, (HIST_MAX - threshold + 1) * slot];
  return (
    <View style={styles.chart}>
      <Text style={styles.chartLabel}>{t('report.distribution')}</Text>
      <Svg width="100%" height={BAR_H} viewBox={`0 0 ${BAR_W} ${BAR_H}`} preserveAspectRatio="none">
        {histogram.map((count, i) => {
          if (count === 0) return null;
          const deg = i - HIST_MAX;
          const h = Math.max(2, (count / max) * (BAR_H - 4));
          const fill = deg === typical ? colors.text : Math.abs(deg) >= threshold ? colors.warning : colors.muted;
          return <Rect key={i} x={i * slot + 1} y={BAR_H - h} width={slot - 2} height={h} rx={1} fill={fill} />;
        })}
        {edges.map((x) => (
          <Line key={x} x1={x} x2={x} y1={0} y2={BAR_H} stroke={colors.tertiary} strokeWidth={1} strokeDasharray="3 4" />
        ))}
      </Svg>
      <View style={styles.axis}>
        <Text style={styles.time}>{`${t('common.left')} ${HIST_MAX}°`}</Text>
        <Text style={styles.time}>0°</Text>
        <Text style={styles.time}>{`${t('common.right')} ${HIST_MAX}°`}</Text>
      </View>
    </View>
  );
}

function Item({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={styles.itemValue}>{value}</Text>
      {hint ? <Text style={styles.itemHint}>{hint}</Text> : null}
    </View>
  );
}

const CHART_W = 320;
const CHART_H = 132;
const HALF = CHART_H / 2;
const CHART_MAX_DEG = 20;

/**
 * Signed angle over time: right tilt above the middle line, left tilt below; dashed lines are the
 * alert angle on each side. Labels name the sides and the start/end clock times.
 */
function Timeline({ summary, threshold }: { summary: SessionSummary; threshold: number }) {
  const { timeline } = summary;
  const n = timeline.length;
  if (n < 2) return null;
  const x = (i: number) => (i / (n - 1)) * CHART_W;
  const y = (deg: number) => HALF - (Math.max(-CHART_MAX_DEG, Math.min(CHART_MAX_DEG, deg)) / CHART_MAX_DEG) * HALF;
  let d = '';
  let pen = false;
  timeline.forEach((a, i) => {
    if (a === null) {
      pen = false;
      return;
    }
    d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(a).toFixed(1)} `;
    pen = true;
  });
  const dash = { stroke: colors.tertiary, strokeWidth: 1, strokeDasharray: '4 5' };
  return (
    <View style={styles.chart}>
      <Text style={styles.chartLabel}>{t('report.timeline')}</Text>
      <View style={styles.chartRow}>
        <View style={styles.chartSides}>
          <Text style={styles.side}>{t('common.right')}</Text>
          <Text style={styles.sideZero}>0°</Text>
          <Text style={styles.side}>{t('common.left')}</Text>
        </View>
        <View style={styles.chartPlot}>
          <Svg width="100%" height={CHART_H + 2} viewBox={`0 -1 ${CHART_W} ${CHART_H + 2}`} preserveAspectRatio="none">
            <Line x1={0} x2={CHART_W} y1={HALF} y2={HALF} stroke={colors.separator} strokeWidth={1} />
            <Line x1={0} x2={CHART_W} y1={y(threshold)} y2={y(threshold)} {...dash} />
            <Line x1={0} x2={CHART_W} y1={y(-threshold)} y2={y(-threshold)} {...dash} />
            <Path d={d} stroke={colors.text} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
          </Svg>
          <View style={styles.chartTimes}>
            <Text style={styles.time}>{clock(summary.startedAt)}</Text>
            <Text style={styles.time}>{clock(summary.endedAt)}</Text>
          </View>
        </View>
      </View>
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
  none: { ...type.heading, fontSize: 22, color: colors.text, marginTop: 8 },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  itemHint: { ...type.label, fontSize: 11, color: colors.muted, marginTop: 2 },
  summary: { ...type.heading, fontSize: 17, color: colors.text, marginTop: 18 },
  chart: { marginTop: 24 },
  chartLabel: { ...type.label, fontSize: 12, color: colors.subtext, marginBottom: 8 },
  chartRow: { flexDirection: 'row' },
  /** Same height as the plot so the labels sit at the top, middle and bottom of it. */
  chartSides: { height: CHART_H + 2, justifyContent: 'space-between', marginRight: 8 },
  side: { ...type.label, fontSize: 11, color: colors.subtext },
  sideZero: { ...type.label, fontSize: 11, color: colors.muted },
  chartPlot: { flex: 1 },
  chartTimes: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  time: { ...type.label, fontSize: 11, color: colors.muted, fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 24 },
  item: { width: '50%', paddingVertical: 12 },
  itemLabel: { ...type.label, fontSize: 12, color: colors.subtext },
  itemValue: { ...type.numeral, fontSize: 17, color: colors.text, marginTop: 4 },
  note: { ...type.label, fontSize: 11, color: colors.muted, marginTop: 16, lineHeight: 16 },
});
