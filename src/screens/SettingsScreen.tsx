import Constants from 'expo-constants';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { playTestCue } from '../services/feedback';
import type { AppSettings, FeedbackSettings } from '../services/storage';
import type { PostureSettings } from '../engine';
import { monitor, useMonitor } from '../state/monitor';
import { Button, Card, SectionTitle, StepperRow, ToggleRow } from '../ui/components';
import { colors, formatAngle } from '../ui/theme';

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
    if (!ok) Alert.alert('알림음', '실제 앱 빌드(TestFlight)에서만 소리가 나요.');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SectionTitle>감지 기준</SectionTitle>
      <Card>
        <StepperRow
          label="알림 각도"
          hint={`${posture.exitDeg}° 아래로 돌아오면 바른 자세로 인정`}
          value={posture.enterDeg}
          step={1}
          min={5}
          max={25}
          format={(v) => `${v}°`}
          onChange={(enterDeg) => setPosture({ enterDeg })}
        />
        <StepperRow
          label="유지 시간"
          hint="이 시간 이상 기울어져 있으면 알림"
          value={posture.holdSec}
          step={1}
          min={2}
          max={60}
          format={(v) => `${v}초`}
          onChange={(holdSec) => setPosture({ holdSec })}
        />
        <StepperRow
          label="반복 알림 간격"
          hint="계속 기울어져 있을 때 (반복할수록 길어짐)"
          value={posture.cooldownSec}
          step={10}
          min={10}
          max={300}
          format={(v) => `${v}초`}
          onChange={(cooldownSec) => setPosture({ cooldownSec })}
        />
      </Card>

      <SectionTitle>알림 방식</SectionTitle>
      <Card>
        <ToggleRow
          label="AirPods 알림음"
          hint="기울어진 반대쪽 귀에서 소리가 나요"
          value={feedback.sound}
          onChange={(sound) => setFeedback({ sound })}
        />
        <ToggleRow label="자세 회복 효과음" value={feedback.recoveryChime} onChange={(recoveryChime) => setFeedback({ recoveryChime })} />
        <ToggleRow label="진동 (앱 화면이 켜져 있을 때)" value={feedback.haptic} onChange={(haptic) => setFeedback({ haptic })} />
        <ToggleRow
          label="푸시 알림 (백그라운드일 때)"
          value={feedback.notification}
          onChange={(notification) => setFeedback({ notification })}
        />
        <StepperRow
          label="알림음 크기"
          value={feedback.volume}
          step={0.1}
          min={0.1}
          max={1}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(volume) => setFeedback({ volume })}
        />
        <View style={styles.buttons}>
          <View style={{ flex: 1 }}>
            <Button title="왼쪽 귀 테스트" variant="secondary" onPress={() => void testCue(-1)} />
          </View>
          <View style={{ width: 10 }} />
          <View style={{ flex: 1 }}>
            <Button title="오른쪽 귀 테스트" variant="secondary" onPress={() => void testCue(1)} />
          </View>
        </View>
      </Card>

      <SectionTitle>측정 중 동작</SectionTitle>
      <Card>
        <ToggleRow
          label="백그라운드 감지"
          hint="화면이 꺼져도 감지를 계속해요 (무음 오디오 사용, 배터리 소모 증가)"
          value={feedback.backgroundMode}
          onChange={(backgroundMode) => setFeedback({ backgroundMode })}
        />
        <ToggleRow label="측정 중 화면 켜두기" value={feedback.keepAwake} onChange={(keepAwake) => setFeedback({ keepAwake })} />
      </Card>

      <SectionTitle>자세 보정</SectionTitle>
      <Card>
        <Button title="바른 자세 다시 등록" onPress={() => monitor.startCalibration()} />
        <View style={{ height: 10 }} />
        <Button
          title="좌우 방향 바꾸기"
          variant="secondary"
          disabled={!s.calibration}
          onPress={() => void monitor.swapLeftRight()}
        />
      </Card>

      <SectionTitle>진단 정보</SectionTitle>
      <Card>
        <Info label="센서 소스" value={s.sourceKind === 'airpods' ? 'AirPods' : '데모'} />
        <Info label="권한" value={s.authorization} />
        <Info label="수신 빈도" value={`${s.sampleRateHz} Hz`} />
        <Info label="센서 위치" value={s.sensorLocation ?? '-'} />
        <Info label="원시 각도" value={s.snapshot ? formatAngle(s.snapshot.rawAngle) : '-'} />
        <Info label="버전" value={`${Constants.expoConfig?.version ?? '-'}`} />
      </Card>

      <Text style={styles.disclaimer}>
        바로목은 바른 자세 습관을 돕는 앱이며 의료기기가 아니에요. 통증이 지속되면 전문가와 상담하세요. 모든
        데이터는 이 iPhone에만 저장돼요.
      </Text>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.info}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  buttons: { flexDirection: 'row', marginTop: 12 },
  info: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  infoLabel: { fontSize: 14, color: colors.subtext },
  infoValue: { fontSize: 14, color: colors.text, fontVariant: ['tabular-nums'] },
  disclaimer: { fontSize: 12, color: colors.subtext, lineHeight: 18, marginTop: 8, marginHorizontal: 4 },
});
