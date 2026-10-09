import Constants from 'expo-constants';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import type { PostureSettings } from '../engine';
import { playTestCue } from '../services/feedback';
import { type MotionSourceKind, selectableSourceKinds } from '../services/motionSource';
import type { AppSettings, FeedbackSettings } from '../services/storage';
import { monitor, useMonitor } from '../state/monitor';
import { Row, Screen, Section, Segmented, StepperRow, ToggleRow } from '../ui/components';
import { type } from '../ui/fonts';
import { Text } from '../ui/Text';
import { colors } from '../ui/theme';

const SOURCE_LABEL: Record<MotionSourceKind, string> = { airpods: 'AirPods', phone: 'iPhone 센서', demo: '데모' };
const AUTH_LABEL = { notDetermined: '확인 전', restricted: '제한됨', denied: '거부됨', authorized: '허용됨' } as const;
const LOCATION_LABEL = { default: '기본 센서', left: '왼쪽 이어폰', right: '오른쪽 이어폰' } as const;

/** Recovery threshold sits a few degrees under the alert threshold (hysteresis). */
const HYSTERESIS_DEG = 3;

export function SettingsScreen() {
  const s = useMonitor();
  const { posture, feedback } = s.settings;

  const setPosture = (patch: Partial<PostureSettings>) =>
    void monitor.updateSettings((prev: AppSettings) => {
      const next = { ...prev.posture, ...patch };
      next.exitDeg = Math.max(2, next.enterDeg - HYSTERESIS_DEG);
      return { ...prev, posture: next };
    });
  const setFeedback = (patch: Partial<FeedbackSettings>) =>
    void monitor.updateSettings((prev) => ({ ...prev, feedback: { ...prev.feedback, ...patch } }));

  const testCue = async (pan: number) => {
    const ok = await playTestCue('alert', pan, feedback.volume).catch(() => false);
    if (!ok) Alert.alert('알림음', 'AirPods 알림음은 TestFlight 빌드에서만 재생됩니다.');
  };

  const calibration = s.calibration;

  return (
    <Screen title="설정">
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>기준 자세</Text>
        <Text style={styles.heroTitle}>{calibration ? '등록됨' : '등록이 필요해요'}</Text>
        <Text style={styles.heroMeta}>
          {calibration
            ? `${formatDate(calibration.createdAt)} · ${LOCATION_LABEL[calibration.sensorLocation]}`
            : '바른 자세를 한 번 등록하면 그 기준으로 측정합니다'}
        </Text>
        <View style={styles.heroActions}>
          <Pill title={calibration ? '다시 등록' : '등록하기'} primary onPress={() => monitor.startCalibration()} />
          {calibration ? <Pill title="좌우 바꾸기" onPress={() => void monitor.swapLeftRight()} /> : null}
        </View>
      </View>

      {selectableSourceKinds.length > 1 && (
        <Section header="센서" footer="Expo Go에서는 AirPods 대신 iPhone 센서나 데모 데이터로 테스트합니다.">
          <View style={styles.segmentBox}>
            <Segmented
              options={selectableSourceKinds.map((k) => ({ value: k, label: SOURCE_LABEL[k] }))}
              value={s.sourceKind}
              disabled={s.session !== null}
              onChange={(kind) => void monitor.setSourceKind(kind)}
            />
          </View>
        </Section>
      )}

      <Section
        header="감지"
        iconInset
        footer={`${posture.exitDeg}° 안으로 돌아오면 바른 자세로 봅니다. 계속 기울어져 있으면 알림 간격이 길어집니다.`}>
        <StepperRow
          icon="angle"
          title="알림 각도"
          value={posture.enterDeg}
          step={1}
          min={5}
          max={25}
          format={(v) => `${v}°`}
          onChange={(enterDeg) => setPosture({ enterDeg })}
        />
        <StepperRow
          icon="timer"
          title="유지 시간"
          value={posture.holdSec}
          step={1}
          min={2}
          max={60}
          format={(v) => `${v}초`}
          onChange={(holdSec) => setPosture({ holdSec })}
        />
        <StepperRow
          icon="repeat"
          title="반복 간격"
          value={posture.cooldownSec}
          step={10}
          min={10}
          max={300}
          format={(v) => `${v}초`}
          onChange={(cooldownSec) => setPosture({ cooldownSec })}
        />
      </Section>

      <Section header="알림" iconInset footer="알림음은 기울어진 반대쪽 귀에서 재생되어 돌아갈 방향을 알려줍니다.">
        <ToggleRow icon="speaker" title="AirPods 알림음" value={feedback.sound} onChange={(sound) => setFeedback({ sound })} />
        <ToggleRow
          icon="chime"
          title="회복 효과음"
          value={feedback.recoveryChime}
          onChange={(recoveryChime) => setFeedback({ recoveryChime })}
        />
        <ToggleRow icon="haptic" title="햅틱" value={feedback.haptic} onChange={(haptic) => setFeedback({ haptic })} />
        <ToggleRow
          icon="bell"
          title="백그라운드 알림"
          value={feedback.notification}
          onChange={(notification) => setFeedback({ notification })}
        />
        <StepperRow
          icon="volume"
          title="소리 크기"
          value={feedback.volume}
          step={0.1}
          min={0.1}
          max={1}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(volume) => setFeedback({ volume })}
        />
        <Row icon="ear" title="방향 테스트">
          <View style={styles.inlinePills}>
            <Pill title="왼쪽" small onPress={() => void testCue(-1)} />
            <Pill title="오른쪽" small onPress={() => void testCue(1)} />
          </View>
        </Row>
      </Section>

      <Section header="측정" iconInset footer="백그라운드 측정은 무음 오디오로 앱을 깨워 두므로 배터리를 더 사용합니다.">
        <ToggleRow
          icon="moon"
          title="백그라운드 측정"
          value={feedback.backgroundMode}
          onChange={(backgroundMode) => setFeedback({ backgroundMode })}
        />
        <ToggleRow
          icon="sun"
          title="화면 켜두기"
          value={feedback.keepAwake}
          onChange={(keepAwake) => setFeedback({ keepAwake })}
        />
      </Section>

      <Section header="정보" iconInset>
        <Row icon="sensor" title="센서" value={`${SOURCE_LABEL[s.sourceKind]} · ${s.sampleRateHz}Hz`} />
        <Row icon="info" title="동작 권한" value={AUTH_LABEL[s.authorization]} />
      </Section>

      <Text style={styles.footer}>
        바로목 {Constants.expoConfig?.version ?? ''}
        {'\n'}의료기기가 아니며, 모든 데이터는 이 iPhone에만 저장됩니다.
      </Text>
    </Screen>
  );
}

function Pill({
  title,
  onPress,
  primary,
  small,
}: {
  title: string;
  onPress: () => void;
  primary?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}>
      <Text style={[small ? styles.pillSmallText : styles.pillText, { color: primary ? colors.text : colors.subtext }]}>
        {title}
      </Text>
    </Pressable>
  );
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 등록`;
}

const styles = StyleSheet.create({
  hero: { marginHorizontal: 20, marginTop: 12, marginBottom: 6 },
  heroLabel: { ...type.label, color: colors.subtext },
  heroTitle: { ...type.heading, color: colors.text, marginTop: 6 },
  heroMeta: { ...type.caption, color: colors.subtext, marginTop: 4 },
  heroActions: { flexDirection: 'row', gap: 22, marginTop: 14 },
  pillText: { ...type.callout },
  pillSmallText: { ...type.callout },
  inlinePills: { flexDirection: 'row', gap: 18 },
  segmentBox: { paddingVertical: 8 },
  footer: { ...type.caption, color: colors.tertiary, textAlign: 'center', lineHeight: 19, marginTop: 28 },
});
