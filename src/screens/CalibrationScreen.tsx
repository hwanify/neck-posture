import { StyleSheet, View } from 'react-native';

import { type } from '../ui/fonts';
import { Text } from '../ui/Text';

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

  const title = {
    neutral: phone ? 'iPhone을 똑바로 세워 주세요' : '정면을 바라봐 주세요',
    tiltLeft: phone ? 'iPhone을 왼쪽으로 기울이세요' : '고개를 왼쪽으로 기울이세요',
    tiltRight: phone ? 'iPhone을 오른쪽으로 기울이세요' : '고개를 오른쪽으로 기울이세요',
    nodForward: phone ? 'iPhone을 앞으로 숙이세요' : '고개를 앞으로 숙이세요',
    nodBack: phone ? 'iPhone을 뒤로 젖히세요' : '고개를 뒤로 젖히세요',
    done: '앞뒤로 숙여 확인하세요',
  }[status.phase];

  const body = {
    neutral: phone
      ? 'iPhone을 세로로 세운 채 3초간 움직이지 마세요. 이 iPhone이 머리 역할을 합니다.'
      : '허리를 펴고 고개를 똑바로 세운 채 3초간 움직이지 마세요.',
    tiltLeft: phone
      ? 'iPhone 윗부분을 왼쪽으로 15° 이상 기울이고 1초간 멈추세요.'
      : '왼쪽 귀를 왼쪽 어깨 쪽으로 천천히 기울이고 1초간 멈추세요.',
    tiltRight: phone
      ? '이번엔 오른쪽으로 15° 이상 기울이고 1초간 멈추세요.'
      : '이번엔 오른쪽 귀를 오른쪽 어깨 쪽으로 기울이고 1초간 멈추세요.',
    nodForward: phone
      ? '정면으로 돌아온 뒤 iPhone 윗부분을 앞쪽으로 15° 이상 기울이고 1초간 멈추세요.'
      : '정면으로 돌아온 뒤 턱을 당기듯 앞으로 숙이고 1초간 멈추세요.',
    nodBack: phone
      ? '이번엔 iPhone 윗부분을 뒤쪽으로 15° 이상 기울이고 1초간 멈추세요.'
      : '이번엔 천장을 보듯 뒤로 젖히고 1초간 멈추세요.',
    done: `${phone ? 'iPhone을' : '고개를'} 앞뒤로 숙여도 각도가 0° 근처에 머물면 정상입니다. 3° 넘게 움직이면 다시 등록하세요.`,
  }[status.phase];

  const hint = waiting
    ? 'AirPods 신호를 기다리는 중입니다. 양쪽 이어폰을 착용하세요.'
    : status.tooMuchMotion
      ? '움직임이 감지되었습니다. 잠시 멈춰 주세요.'
      : status.hint === 'retry'
        ? '측정이 고르지 않아 다시 진행합니다. 천천히 기울여 주세요.'
        : status.hint === 'stillSideways'
          ? '좌우로는 기울이지 말고 정면에서 숙여 주세요.'
          : status.hint === 'wrongSide'
            ? '반대 방향으로 기울여 주세요.'
            : status.phase === 'neutral'
              ? ' '
              : `현재 ${Math.round(status.tiltDeg)}°`;

  const warn = waiting || status.tooMuchMotion || status.hint !== 'none';

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        {!done ? (
          <Text style={styles.cancel} onPress={() => monitor.cancelCalibration()}>
            취소
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
            caption="좌우 각도"
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
          <Button title="완료" onPress={() => monitor.finishCalibration()} />
          <Button title="좌우가 반대로 표시됨" variant="plain" onPress={() => void monitor.swapLeftRight()} />
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
