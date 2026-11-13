import { useState } from 'react';
import { type GestureResponderEvent, StyleSheet, View } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { ANGLE_HIST_MAX, habitReport, type HabitReport, type SessionSummary } from '../engine';
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
  const [scrubbing, setScrubbing] = useState(false);
  return (
    <Sheet
      visible={data !== null}
      title={t('report.title')}
      doneLabel={t('common.done')}
      scrollEnabled={!scrubbing}
      onClose={() => monitor.dismissReport()}>
      {data ? (
        <ReportBody
          summary={data.summary}
          report={data.report}
          threshold={threshold}
          previous={previousOf(s.sessions, data.summary.id)}
          onScrub={setScrubbing}
        />
      ) : null}
    </Sheet>
  );
}

/** The session recorded just before `id` (sessions are stored newest first). */
export function previousOf(sessions: SessionSummary[], id: string): SessionSummary | undefined {
  const i = sessions.findIndex((x) => x.id === id);
  return i >= 0 ? sessions[i + 1] : undefined;
}

/**
 * Report page, also opened again from History. Top to bottom: where the head usually sits, how the
 * time split between left / upright / right, when it tilted, and how this compares (later in the
 * session, and with the previous one).
 */
export function ReportBody({
  summary,
  report,
  threshold,
  previous,
  onScrub,
}: {
  summary: SessionSummary;
  report: HabitReport;
  threshold: number;
  /** The session measured before this one, to compare with. */
  previous?: SessionSummary;
  /** Called with true while a finger slides along the tilt strip, so the sheet can stop scrolling. */
  onScrub?: (active: boolean) => void;
}) {
  const usual = report.usualAngle;
  return (
    <View style={styles.body}>
      <Text style={styles.label}>{t('report.usualLabel')}</Text>
      <Text style={styles.big}>
        {usual === null ? '–' : sideAngle(usual)}
      </Text>
      <Text style={styles.sub}>{t('report.usualHint')}</Text>
      <TiltGauge report={report} threshold={threshold} />

      <Text style={[styles.label, styles.section]}>{t('report.during', { time: formatDuration(report.measuredSec) })}</Text>
      <SplitBar report={report} />

      <When summary={summary} threshold={threshold} onScrub={onScrub} />

      <Changes report={report} previous={previous ? habitReport(previous, threshold) : null} />
    </View>
  );
}

/** Gauge degrees are drawn this many times wider so a 2° habit is visible; labels show real degrees. */
const VIS = 3;
const GW = 300;
const PX = GW / 2;
const PY = 196;
const R = 138;
/** Width of the scale's band; lines match the app's level line (1–1.5 pt). */
const BAND = 6;
/** Inner end of the 0° and usual-angle lines. */
const R0 = 58;
/** Drawing height: cut just below the ends of the arc. */
const GH = PY - 52;
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
 * Fan-shaped scale whose band is brighter where the head spent more time, a dashed 0° line and a
 * solid line at the usual angle. Right tilt is on the right.
 */
function TiltGauge({ report, threshold }: { report: HabitReport; threshold: number }) {
  const usual = report.usualAngle;
  if (usual === null) return null;
  const hist = report.angleHist;
  const max = Math.max(...hist);
  // Two lines from the centre to the scale: dashed upright (0°) and solid usual angle, with the gap
  // between them marked so the amount of tilt reads at a glance.
  const ray = (deg: number) => ({ a: polar(deg, R0), b: polar(deg, R + 6) });
  const zero = ray(0);
  const at = ray(usual);
  return (
    <View style={styles.gauge}>
      <Svg width="100%" height={GH} viewBox={`0 0 ${GW} ${GH}`}>
        <Path d={arc(-ANGLE_HIST_MAX - 0.5, ANGLE_HIST_MAX + 0.5, R)} stroke={colors.separator} strokeWidth={BAND} fill="none" />
        {hist.map((v, i) =>
          v > 0 ? (
            <Path
              key={i}
              d={arc(i - ANGLE_HIST_MAX - 0.5, i - ANGLE_HIST_MAX + 0.5, R)}
              stroke={colors.text}
              strokeOpacity={0.15 + 0.85 * Math.pow(v / max, 0.6)}
              strokeWidth={BAND}
              fill="none"
            />
          ) : null,
        )}
        {[-threshold, threshold].map((d) => {
          const a = polar(d, R - 8);
          const b = polar(d, R + 8);
          return <Line key={d} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colors.subtext} strokeWidth={1} strokeDasharray="2 2" />;
        })}
        {TICKS.map((d) => {
          const p = polar(d, R + 18);
          return (
            <SvgText key={d} x={p.x} y={p.y + 4} fontSize={11} fill={colors.muted} textAnchor="middle">
              {`${Math.abs(d)}°`}
            </SvgText>
          );
        })}
        <Line x1={zero.a.x} y1={zero.a.y} x2={zero.b.x} y2={zero.b.y} stroke={colors.tertiary} strokeWidth={1} strokeDasharray="3 4" />
        {usual !== 0 ? (
          <Path d={arc(Math.min(0, usual), Math.max(0, usual), R0 + 18)} stroke={colors.subtext} strokeWidth={1} fill="none" />
        ) : null}
        <Line x1={at.a.x} y1={at.a.y} x2={at.b.x} y2={at.b.y} stroke={colors.text} strokeWidth={1.5} strokeLinecap="round" />
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
/** Thin rows (like History's bar) centred on their 13-pt side labels; STRIP_H is the whole strip. */
const ROW_H = 3;
const LABEL_LINE = 13;
const STRIP_H = 30;
const ROW_Y = [LABEL_LINE / 2 - ROW_H / 2, STRIP_H - LABEL_LINE / 2 - ROW_H / 2];

/**
 * Time runs left to right; a block in the top row is a stretch tilted right, in the bottom row a
 * stretch tilted left (5-second steps past the alert angle). Tap or slide to read the time and angle
 * at that point; the sheet stops scrolling while the finger is down.
 */
function When({
  summary,
  threshold,
  onScrub,
}: {
  summary: SessionSummary;
  threshold: number;
  onScrub?: (active: boolean) => void;
}) {
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
      <Rect x={0} y={y} width={W} height={ROW_H} rx={ROW_H / 2} fill={colors.separator} />
      {runs(side).map(([a, b]) => (
        <Rect key={a} x={(a / n) * W} y={y} width={Math.max(2, ((b - a) / n) * W)} height={ROW_H} rx={ROW_H / 2} fill={colors.text} />
      ))}
    </>
  );

  const pick = (e: GestureResponderEvent) => {
    if (width <= 0) return;
    setIndex(Math.max(0, Math.min(n - 1, Math.floor((e.nativeEvent.locationX / width) * n))));
  };
  // The picked point stays shown after the finger lifts, so a plain tap also works.
  const end = () => onScrub?.(false);
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
          <Text style={styles.sideLabel}>{t('common.right')}</Text>
          <Text style={styles.sideLabel}>{t('common.left')}</Text>
        </View>
        <View style={styles.whenPlot}>
          <View
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
            onResponderGrant={(e) => {
              onScrub?.(true);
              pick(e);
            }}
            onResponderMove={pick}
            onResponderRelease={end}
            onResponderTerminate={end}>
            <Svg
              width="100%"
              height={STRIP_H}
              viewBox={`0 0 ${W} ${STRIP_H}`}
              preserveAspectRatio="none"
              pointerEvents="none">
              {row(1, ROW_Y[0])}
              {row(-1, ROW_Y[1])}
              {index !== null ? (
                <Rect x={((index + 0.5) / n) * W - 0.5} y={0} width={1} height={STRIP_H} fill={colors.tint} />
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

const sideAngle = (deg: number) =>
  deg === 0 ? `${t('report.straight')} 0°` : `${t(deg < 0 ? 'common.left' : 'common.right')} ${Math.abs(deg)}°`;

/** "N° more / less tilted" from one usual angle to another, by how far from upright each is. */
function verdict(from: number, to: number) {
  const d = Math.abs(to) - Math.abs(from);
  if (Math.abs(d) < 1) return t('report.same');
  return t(d > 0 ? 'report.more' : 'report.less', { n: Math.abs(d) });
}

function Changes({ report, previous }: { report: HabitReport; previous: HabitReport | null }) {
  const now = report.usualAngle;
  const share = (r: HabitReport) => `${Math.round((r.leftShare + r.rightShare) * 100)}%`;
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{t('report.changes')}</Text>
      {report.halves ? (
        <Change
          label={t('report.within')}
          value={`${sideAngle(report.halves.first)} → ${sideAngle(report.halves.second)}`}
          verdict={verdict(report.halves.first, report.halves.second)}
        />
      ) : null}
      {previous && previous.usualAngle !== null && now !== null ? (
        <Change
          label={t('report.vsLast')}
          value={`${sideAngle(previous.usualAngle)} → ${sideAngle(now)}`}
          verdict={verdict(previous.usualAngle, now)}
          hint={t('report.tiltTime', { a: share(previous), b: share(report) })}
        />
      ) : (
        <Text style={styles.empty}>{t('report.firstTime')}</Text>
      )}
    </View>
  );
}

function Change({ label, value, verdict, hint }: { label: string; value: string; verdict: string; hint?: string }) {
  return (
    <View style={styles.change}>
      <Text style={styles.small}>{label}</Text>
      <Text style={styles.changeValue}>{value}</Text>
      <Text style={styles.verdict}>{verdict}</Text>
      {hint ? <Text style={styles.small}>{hint}</Text> : null}
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
  big: { ...type.display, fontSize: 38, lineHeight: 46, color: colors.text, fontVariant: ['tabular-nums'], marginTop: 4 },
  sub: { ...type.label, fontSize: 13, color: colors.subtext },
  section: { marginTop: 32 },
  /** Same weight as History's left/right bar. */
  bar: { flexDirection: 'row', height: 3, borderRadius: 1.5, overflow: 'hidden', gap: 2, marginTop: 12 },
  barLabels: { flexDirection: 'row', marginTop: 10 },
  barLabel: { flex: 1 },
  pct: { ...type.numeral, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  pctDim: { color: colors.subtext },
  small: { ...type.label, fontSize: 12, color: colors.subtext, marginTop: 2 },
  whenRow: { flexDirection: 'row', marginTop: 8 },
  readout: { ...type.label, fontSize: 12, color: colors.muted, marginTop: 6, height: 18 },
  readoutOn: { color: colors.text, fontVariant: ['tabular-nums'] },
  gauge: { marginTop: 20 },
  gaugeSides: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -14 },
  /** Same height as the two rows so each label sits beside its row. */
  whenSides: { height: STRIP_H, justifyContent: 'space-between', marginRight: 10 },
  sideLabel: { ...type.label, fontSize: 11, lineHeight: LABEL_LINE, color: colors.subtext },
  whenPlot: { flex: 1 },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  time: { ...type.label, fontSize: 11, color: colors.muted, fontVariant: ['tabular-nums'] },
  change: { marginTop: 14 },
  changeValue: { ...type.numeral, fontSize: 17, color: colors.text, marginTop: 4 },
  verdict: { ...type.label, fontSize: 13, color: colors.text, marginTop: 2 },
  empty: { ...type.label, fontSize: 13, color: colors.subtext, marginTop: 10 },
});
