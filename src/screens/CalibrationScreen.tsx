import { StyleSheet, View } from 'react-native';

import { type } from '../ui/fonts';
import { Text } from '../ui/Text';

import { t } from '../i18n';
import { monitor, useMonitor } from '../state/monitor';
import { Button } from '../ui/components';
import { PostureDial } from '../ui/PostureDial';
import { colors } from '../ui/theme';

/** Full-screen sheet guiding the five calibration steps. */
export function CalibrationScreen() {
  const s = useMonitor();
  const status = s.calibrating;
  if (!status) return null;

  const waiting = s.sourceKind === 'airpods' && !s.connected;
  const phone = s.sourceKind === 'phone';
  const done = status.phase === 'done';

  const variant = phone ? '.phone' : '';
  const title = t(status.phase === 'done' ? 'cal.title.done' : `cal.title.${status.phase}${variant}`);
  const body = t(`cal.body.${status.phase}${variant}`);

  const hint = waiting
    ? t('cal.hint.waiting')
    : status.tooMuchMotion
      ? t('cal.hint.motion')
      : status.hint === 'retry'
        ? t('cal.hint.retry')
        : status.hint === 'stillSideways'
          ? t('cal.hint.stillSideways')
          : status.hint === 'wrongSide'
            ? t('cal.hint.wrongSide')
            : status.phase === 'neutral'
              ? ' '
              : t('cal.hint.current', { deg: Math.round(status.tiltDeg) });

  const warn = waiting || status.tooMuchMotion || status.hint !== 'none';

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        {!done ? (
          <Text style={styles.cancel} onPress={() => monitor.cancelCalibration()}>
            {t('common.cancel')}
          </Text>
        ) : (
          <View />
        )}
        <Text style={styles.step}>{done ? '' : `${STEP[status.phase]} / 5`}</Text>
        <View style={{ width: 40 }} />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      <View style={styles.center}>
        {done ? (
          <PostureDial
            angle={s.snapshot?.angle ?? 0}
            enterDeg={s.settings.posture.enterDeg}
            state="good"
            caption={t('cal.dialCaption')}
            size={240}
          />
        ) : (
          <View style={styles.progressBox}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(status.progress * 100)}%` }]} />
            </View>
            <Text style={[styles.hint, warn && { color: colors.warning }]}>{hint}</Text>
          </View>
        )}
      </View>

      {done && (
        <View style={styles.actions}>
          <Button title={t('common.done')} onPress={() => monitor.finishCalibration()} />
          <Button title={t('cal.flipped')} variant="plain" onPress={() => void monitor.swapLeftRight()} />
        </View>
      )}
    </View>
  );
}

const STEP = { neutral: 1, tiltLeft: 2, tiltRight: 3, nodForward: 4, nodBack: 5, done: 5 } as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card, paddingHorizontal: 24 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: 44 },
  cancel: { ...type.bodyStrong, color: colors.tint, width: 40 },
  step: { ...type.label, fontSize: 13, color: colors.subtext, fontVariant: ['tabular-nums'] },
  title: {
    ...type.title,
    color: colors.text,
    textAlign: 'center',
    marginTop: 32,
  },
  body: { ...type.body, lineHeight: 24, color: colors.subtext, textAlign: 'center', marginTop: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressBox: { alignSelf: 'stretch', paddingHorizontal: 16 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.fill, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.tint },
  hint: { ...type.callout, color: colors.subtext, textAlign: 'center', marginTop: 16, fontVariant: ['tabular-nums'] },
  actions: { gap: 4, paddingBottom: 8 },
});
