import Constants from 'expo-constants';
import { Alert, StyleSheet, View } from 'react-native';

import { type } from '../ui/fonts';
import { Text } from '../ui/Text';

import type { PostureSettings } from '../engine';
import { playTestCue } from '../services/feedback';
import { type MotionSourceKind, selectableSourceKinds } from '../services/motionSource';
import type { AppSettings, FeedbackSettings } from '../services/storage';
import { monitor, useMonitor } from '../state/monitor';
import { Row, Screen, Section, Segmented, StepperRow, ToggleRow } from '../ui/components';
import { colors, formatAngle } from '../ui/theme';

const SOURCE_LABEL: Record<MotionSourceKind, string> = { airpods: 'AirPods', phone: 'iPhone 센서', demo: '데모' };

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
    if (!ok) Alert.alert('알림음', 'AirPods 알림음은 TestFlight 빌드에서만 재생됩니다. Expo Go에서는 진동으로 알려드립니다.');
  };

  return (
    <Screen title="설정">
      {selectableSourceKinds.length > 1 && (
        <Section
          header="센서"
          footer="Expo Go에는 AirPods 센서 모듈이 없습니다. iPhone 센서는 iPhone을 머리처럼 기울여 테스트하고, 데모는 가상 데이터를 재생합니다.">
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
        header="감지 기준"
        footer={`${posture.exitDeg}° 안으로 돌아오면 바른 자세로 봅니다. 계속 기울어져 있으면 알림 간격이 점점 길어집니다.`}>
        <StepperRow
          title="알림 각도"
          value={posture.enterDeg}
          step={1}
          min={5}
          max={25}
          format={(v) => `${v}°`}
          onChange={(enterDeg) => setPosture({ enterDeg })}
        />
        <StepperRow
          title="유지 시간"
          value={posture.holdSec}
          step={1}
          min={2}
          max={60}
          format={(v) => `${v}초`}
          onChange={(holdSec) => setPosture({ holdSec })}
        />
        <StepperRow
          title="반복 알림 간격"
          value={posture.cooldownSec}
          step={10}
          min={10}
          max={300}
          format={(v) => `${v}초`}
          onChange={(cooldownSec) => setPosture({ cooldownSec })}
        />
      </Section>

      <Section header="알림" footer="알림음은 기울어진 반대쪽 귀에서 재생되어 돌아갈 방향을 알려줍니다.">
        <ToggleRow title="AirPods 알림음" value={feedback.sound} onChange={(sound) => setFeedback({ sound })} />
        <ToggleRow
          title="자세 회복 효과음"
          value={feedback.recoveryChime}
          onChange={(recoveryChime) => setFeedback({ recoveryChime })}
        />
        <ToggleRow title="햅틱" value={feedback.haptic} onChange={(haptic) => setFeedback({ haptic })} />
        <ToggleRow
          title="백그라운드 알림"
          value={feedback.notification}
          onChange={(notification) => setFeedback({ notification })}
        />
        <StepperRow
          title="알림음 크기"
          value={feedback.volume}
          step={0.1}
          min={0.1}
          max={1}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(volume) => setFeedback({ volume })}
        />
        <Row title="왼쪽 귀에서 재생" onPress={() => void testCue(-1)}>
          <Text style={styles.link}>테스트</Text>
        </Row>
        <Row title="오른쪽 귀에서 재생" onPress={() => void testCue(1)}>
          <Text style={styles.link}>테스트</Text>
        </Row>
      </Section>

      <Section header="측정" footer="백그라운드 감지는 무음 오디오로 앱을 깨워 두므로 배터리를 더 사용합니다.">
        <ToggleRow
          title="백그라운드 감지"
          value={feedback.backgroundMode}
          onChange={(backgroundMode) => setFeedback({ backgroundMode })}
        />
        <ToggleRow
          title="측정 중 화면 켜두기"
          value={feedback.keepAwake}
          onChange={(keepAwake) => setFeedback({ keepAwake })}
        />
      </Section>

      <Section header="기준 자세">
        <Row title="다시 등록" onPress={() => monitor.startCalibration()}>
          <Text style={styles.chevron}>›</Text>
        </Row>
        <Row title="좌우 방향 바꾸기" onPress={s.calibration ? () => void monitor.swapLeftRight() : undefined}>
          <Text style={[styles.link, !s.calibration && { color: colors.tertiary }]}>바꾸기</Text>
        </Row>
      </Section>

      <Section header="정보">
        <Row title="센서" value={SOURCE_LABEL[s.sourceKind]} />
        <Row title="권한" value={AUTH_LABEL[s.authorization]} />
        <Row title="수신 빈도" value={`${s.sampleRateHz} Hz`} />
        <Row title="센서 위치" value={s.sensorLocation ? LOCATION_LABEL[s.sensorLocation] : '–'} />
        <Row title="원시 각도" value={s.snapshot ? formatAngle(s.snapshot.rawAngle) : '–'} />
        <Row title="버전" value={Constants.expoConfig?.version ?? '–'} />
      </Section>

      <Text style={styles.disclaimer}>
        바로목은 바른 자세 습관을 돕는 앱이며 의료기기가 아닙니다. 모든 데이터는 이 iPhone에만 저장됩니다.
      </Text>
    </Screen>
  );
}

const AUTH_LABEL = { notDetermined: '확인 전', restricted: '제한됨', denied: '거부됨', authorized: '허용됨' } as const;
const LOCATION_LABEL = { default: '기본', left: '왼쪽 이어폰', right: '오른쪽 이어폰' } as const;

const styles = StyleSheet.create({
  segmentBox: { padding: 12 },
  link: { ...type.bodyStrong, color: colors.tint },
  chevron: { ...type.body, fontSize: 22, color: colors.tertiary, marginTop: -2 },
  disclaimer: { ...type.caption, lineHeight: 18, color: colors.subtext, marginHorizontal: 32, marginTop: 24 },
});
