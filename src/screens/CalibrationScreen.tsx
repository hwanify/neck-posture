import { StyleSheet, View } from 'react-native';

import { type } from '../ui/fonts';
import { Text } from '../ui/Text';

import { monitor, useMonitor } from '../state/monitor';
import { Button } from '../ui/components';
import { PostureDial } from '../ui/PostureDial';
import { colors } from '../ui/theme';

/** Full-screen sheet guiding the three calibration steps. */
export function CalibrationScreen() {
  const s = useMonitor();
  const status = s.calibrating;
  if (!status) return null;

  const waiting = s.sourceKind === 'airpods' && !s.connected;
  const phone = s.sourceKind === 'phone';
  const done = status.phase === 'done';

  const title = {
    neutral: phone ? 'iPhone을 똑바로 세워 주세요' : '정면을 바라봐 주세요',
    tiltRight: phone ? 'iPhone을 오른쪽으로 기울이세요' : '고개를 오른쪽으로 기울이세요',
    nodForward: phone ? 'iPhone을 앞으로 숙이세요' : '고개를 앞으로 숙이세요',
    done: '등록 완료',
  }[status.phase];

  const body = {
    neutral: phone
      ? 'iPhone을 세로로 세운 채 3초간 움직이지 마세요. 이 iPhone이 머리 역할을 합니다.'
      : '허리를 펴고 고개를 똑바로 세운 채 3초간 움직이지 마세요.',
    tiltRight: phone
      ? 'iPhone 윗부분을 오른쪽으로 15° 정도 천천히 기울이고 잠시 멈추세요.'
      : '오른쪽 귀를 오른쪽 어깨 쪽으로 천천히 기울이고 잠시 멈추세요. 좌우 방향을 파악하는 단계입니다.',
    nodForward: phone
      ? '정면으로 돌아온 뒤 iPhone 윗부분을 앞쪽으로 15° 정도 기울이고 잠시 멈추세요.'
      : '정면으로 돌아온 뒤 턱을 당기듯 고개를 앞으로 숙이고 잠시 멈추세요. 앞뒤 움직임이 각도에 섞이지 않게 하는 단계입니다.',
    done: `${phone ? 'iPhone을' : '고개를'} 기울여 방향이 맞게 표시되는지 확인하세요.`,
  }[status.phase];

  const hint = waiting
    ? 'AirPods 신호를 기다리는 중입니다. 양쪽 이어폰을 착용하세요.'
    : status.tooMuchMotion
      ? '움직임이 감지되었습니다. 잠시 멈춰 주세요.'
      : status.phase === 'nodForward' && status.stillSideways
        ? '좌우로는 기울이지 말고 정면에서 숙여 주세요.'
        : status.phase === 'tiltRight' || status.phase === 'nodForward'
          ? `현재 ${Math.round(status.tiltDeg)}°`
          : ' ';

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
        <Text style={styles.step}>{done ? '' : `${STEP[status.phase]} / 3`}</Text>
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
            caption="기준 자세"
            size={240}
          />
        ) : (
          <View style={styles.progressBox}>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.round(status.progress * 100)}%` }]} />
            </View>
            <Text style={[styles.hint, (waiting || status.tooMuchMotion) && { color: colors.warning }]}>{hint}</Text>
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

const STEP = { neutral: 1, tiltRight: 2, nodForward: 3, done: 3 } as const;

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
