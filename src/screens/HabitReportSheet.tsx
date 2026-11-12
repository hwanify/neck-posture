import { useState } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { ANGLE_HIST_MAX, type HabitReport, type SessionSummary } from '../engine';
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
      <HeadGauge report={report} threshold={threshold} />

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

/** Gauge degrees are drawn this many times wider so a 2° habit is visible; labels show real degrees. */
const VIS = 3;
const GW = 300;
const PX = GW / 2;
const PY = 196;
const R = 138;
const TICKS = [-20, -10, -5, 0, 5, 10, 20];

const polar = (deg: number, r: number) => {
  const a = (deg * VIS * Math.PI) / 180;
  return { x: PX + r * Math.sin(a), y: PY - r * Math.cos(a) };
};
const arc = (from: number, to: number, r: number) => {
  const a = polar(from, r);
  const b = polar(to, r);
  return `M${a.x.toFixed(1)} ${a.y.toFixed(1)} A${r} ${r} 0 0 1 ${b.x.toFixed(1)} ${b.y.toFixed(1)}`;
};

/**
 * A head (seen from behind) tilted to the usual angle under a fan-shaped scale; the band on the
 * scale is darker where the head spent more time. Right tilt leans to the screen's right.
 */
function HeadGauge({ report, threshold }: { report: HabitReport; threshold: number }) {
  const usual = report.usualAngle;
  if (usual === null) return null;
  const hist = report.angleHist;
  const max = Math.max(...hist);
  const tip = polar(usual, R - 14);
  const top = polar(usual, 104); // just above the head
  return (
    <View style={styles.gauge}>
      <Svg width="100%" height={PY + 22} viewBox={`0 0 ${GW} ${PY + 22}`}>
        <Path d={arc(-ANGLE_HIST_MAX - 0.5, ANGLE_HIST_MAX + 0.5, R)} stroke={colors.separator} strokeWidth={16} fill="none" />
        {hist.map((v, i) =>
          v > 0 ? (
            <Path
              key={i}
              d={arc(i - ANGLE_HIST_MAX - 0.5, i - ANGLE_HIST_MAX + 0.5, R)}
              stroke={colors.text}
              strokeOpacity={0.15 + 0.85 * Math.pow(v / max, 0.6)}
              strokeWidth={16}
              fill="none"
            />
          ) : null,
        )}
        {[-threshold, threshold].map((d) => {
          const a = polar(d, R - 12);
          const b = polar(d, R + 12);
          return <Line key={d} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.subtext} strokeWidth={1} strokeDasharray="2 2" />;
        })}
        {TICKS.map((d) => {
          const p = polar(d, R + 22);
          return (
            <SvgText key={d} x={p.x} y={p.y + 4} fontSize={11} fill={colors.muted} textAnchor="middle">
              {`${Math.abs(d)}°`}
            </SvgText>
          );
        })}
        {/* True vertical, for reference. */}
        <Line x1={PX} y1={PY} x2={PX} y2={PY - R + 10} stroke={colors.tertiary} strokeWidth={1} strokeDasharray="3 4" />
        <Path d={`M${PX - 66} ${PY + 22} Q${PX} ${PY - 12} ${PX + 66} ${PY + 22}`} stroke={colors.subtext} strokeWidth={2} fill="none" />
        <G rotation={usual * VIS} origin={`${PX}, ${PY}`}>
          <Line x1={PX} y1={PY} x2={PX} y2={PY - 30} stroke={colors.subtext} strokeWidth={2} />
          <Circle cx={PX} cy={PY - 64} r={34} fill={colors.card} stroke={colors.text} strokeWidth={2} />
        </G>
        <Line x1={top.x} y1={top.y} x2={tip.x} y2={tip.y} stroke={colors.text} strokeWidth={1.5} strokeOpacity={0.6} />
        <Circle cx={tip.x} cy={tip.y} r={4} fill={colors.text} />
      </Svg>
      <View style={styles.gaugeSides}>
        <Text style={styles.small}>{t('common.left')}</Text>
        <Text style={styles.small}>{t('common.right')}</Text>
      </View>
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
 * stretch tilted left (5-second steps past the alert angle). Touch and slide to read the time and
 * angle at that point.
 */
function When({ summary, threshold }: { summary: SessionSummary; threshold: number }) {
  const { timeline } = summary;
  const n = timeline.length;
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState<number | null>(null);
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

  const pick = (e: GestureResponderEvent) => {
    if (width <= 0) return;
    setIndex(Math.max(0, Math.min(n - 1, Math.floor((e.nativeEvent.locationX / width) * n))));
  };
  const a = index === null ? null : timeline[index];
  const readout =
    index === null
      ? t('report.scrubHint')
      : `${clock(summary.startedAt + index * BUCKET_MS)} · ${
          a === null
            ? t('report.paused')
            : Math.round(a) === 0
              ? '0°'
              : `${t(a < 0 ? 'common.left' : 'common.right')} ${Math.abs(Math.round(a))}°`
        }`;

  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('report.when')}</Text>
      <Text style={[styles.readout, index !== null && styles.readoutOn]} numberOfLines={1}>
        {readout}
      </Text>
      <View style={styles.whenRow}>
        <View style={styles.whenSides}>
          <Text style={styles.small}>{t('common.right')}</Text>
          <Text style={styles.small}>{t('common.left')}</Text>
        </View>
        <View style={styles.whenPlot}>
          <View
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={pick}
            onResponderMove={pick}
            onResponderRelease={() => setIndex(null)}
            onResponderTerminate={() => setIndex(null)}>
            <Svg
              width="100%"
              height={ROW_H * 2 + ROW_GAP}
              viewBox={`0 0 ${W} ${ROW_H * 2 + ROW_GAP}`}
              preserveAspectRatio="none"
              pointerEvents="none">
              {row(1, 0)}
              {row(-1, ROW_H + ROW_GAP)}
              {index !== null ? (
                <Rect x={((index + 0.5) / n) * W - 0.75} y={0} width={1.5} height={ROW_H * 2 + ROW_GAP} fill={colors.tint} />
              ) : null}
            </Svg>
          </View>
          <View style={styles.times}>
            <Text style={styles.time}>{clock(summary.startedAt)}</Text>
            <Text style={styles.time}>{clock(summary.endedAt)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

/** Timeline step (see SessionStats). */
const BUCKET_MS = 5000;

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
  whenRow: { flexDirection: 'row', marginTop: 8 },
  readout: { ...type.label, fontSize: 12, color: colors.muted, marginTop: 6, height: 18 },
  readoutOn: { color: colors.text, fontVariant: ['tabular-nums'] },
  gauge: { marginTop: 20 },
  gaugeSides: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -16 },
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
