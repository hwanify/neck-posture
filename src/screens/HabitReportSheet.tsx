import { StyleSheet, View } from 'react-native';
import Svg, { Line, Path } from 'react-native-svg';

import type { HabitReport } from '../engine';
import { t } from '../i18n';
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
      {data ? <ReportBody report={data.report} timeline={data.summary.timeline} threshold={threshold} /> : null}
    </Sheet>
  );
}

function ReportBody({
  report,
  timeline,
  threshold,
}: {
  report: HabitReport;
  timeline: (number | null)[];
  threshold: number;
}) {
  const pct = (x: number) => Math.round(x * 100);
  const side =
    report.side === null
      ? t('report.noSide')
      : t(report.side === 'left' ? 'report.left' : 'report.right', { pct: pct(report.sideShare) });
  return (
    <View style={styles.body}>
      <Text style={styles.label}>{t('report.tiltShareLabel')}</Text>
      <Text style={styles.big}>{`${pct(report.tiltShare)}%`}</Text>
      <Text style={styles.sub}>{t('report.of', { time: formatDuration(report.measuredSec) })}</Text>
      <Text style={styles.summary}>{t(`report.trend.${report.trend}`)}</Text>

      <Timeline timeline={timeline} threshold={threshold} />

      <View style={styles.grid}>
        <Item label={t('report.side')} value={side} />
        <Item label={t('report.avg')} value={`${Math.round(report.avgAbsAngle)}°`} />
        <Item label={t('report.longest')} value={report.longestTiltSec > 0 ? formatDuration(report.longestTiltSec) : '–'} />
        <Item
          label={t('report.firstTilt')}
          value={
            report.firstTiltAfterSec === null
              ? t('report.never')
              : t('report.firstTiltValue', { time: formatDuration(report.firstTiltAfterSec) })
          }
        />
      </View>
      <Text style={styles.note}>{t('report.note', { deg: threshold })}</Text>
    </View>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={styles.itemValue}>{value}</Text>
    </View>
  );
}

const CHART_W = 320;
const CHART_H = 96;
const CHART_MAX_DEG = 20;

/** |angle| over time; the dashed line is the alert angle. */
function Timeline({ timeline, threshold }: { timeline: (number | null)[]; threshold: number }) {
  const n = timeline.length;
  if (n < 2) return null;
  const x = (i: number) => (i / (n - 1)) * CHART_W;
  const y = (deg: number) => CHART_H - (Math.min(Math.abs(deg), CHART_MAX_DEG) / CHART_MAX_DEG) * CHART_H;
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
  return (
    <View style={styles.chart}>
      <Text style={styles.chartLabel}>{t('report.timeline')}</Text>
      <Svg width="100%" height={CHART_H + 2} viewBox={`0 -1 ${CHART_W} ${CHART_H + 2}`} preserveAspectRatio="none">
        <Line x1={0} x2={CHART_W} y1={CHART_H} y2={CHART_H} stroke={colors.separator} strokeWidth={1} />
        <Line x1={0} x2={CHART_W} y1={y(threshold)} y2={y(threshold)} stroke={colors.tertiary} strokeWidth={1} strokeDasharray="4 5" />
        <Path d={d} stroke={colors.text} strokeWidth={1.5} fill="none" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

function formatDuration(sec: number): string {
  const s = Math.round(sec);
  if (s < 60) return t('report.sec', { n: s });
  const m = Math.round(s / 60);
  if (m < 60) return t('report.min', { n: m });
  return t('report.hm', { h: Math.floor(m / 60), m: m % 60 });
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 4, paddingBottom: 24 },
  label: { ...type.label, fontSize: 13, color: colors.subtext, marginTop: 8 },
  big: { ...type.display, fontSize: 56, lineHeight: 64, color: colors.text, fontVariant: ['tabular-nums'], marginTop: 4 },
  sub: { ...type.label, fontSize: 13, color: colors.subtext },
  summary: { ...type.heading, fontSize: 17, color: colors.text, marginTop: 18 },
  chart: { marginTop: 24 },
  chartLabel: { ...type.label, fontSize: 12, color: colors.subtext, marginBottom: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 24 },
  item: { width: '50%', paddingVertical: 12 },
  itemLabel: { ...type.label, fontSize: 12, color: colors.subtext },
  itemValue: { ...type.numeral, fontSize: 17, color: colors.text, marginTop: 4 },
  note: { ...type.label, fontSize: 11, color: colors.muted, marginTop: 16, lineHeight: 16 },
});
