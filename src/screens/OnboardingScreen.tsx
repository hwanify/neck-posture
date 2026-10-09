import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { monitor } from '../state/monitor';
import { Button, Card } from '../ui/components';
import { colors } from '../ui/theme';

const POINTS = [
  { emoji: '01', title: 'AirPods로 자세 감지', body: '귀에 꽂은 AirPods의 움직임 센서로 고개 기울기를 측정해요. 카메라도, 추가 기기도 필요 없어요.' },
  { emoji: '02', title: '좌우 기울어짐에 집중', body: '고개가 한쪽으로 기운 채 몇 초 이상 지나면, 반대쪽 귀에서 짧은 알림음으로 알려줘요.' },
  { emoji: '03', title: '나의 습관 확인', body: '어느 쪽으로 더 자주 기우는지, 바른 자세 비율이 얼마나 되는지 기록해요.' },
];

export function OnboardingScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>바로목</Text>
      <Text style={styles.subtitle}>고개가 기울면 AirPods가 알려줘요</Text>

      {POINTS.map((p) => (
        <Card key={p.title} style={styles.point}>
          <Text style={styles.emoji}>{p.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.pointTitle}>{p.title}</Text>
            <Text style={styles.pointBody}>{p.body}</Text>
          </View>
        </Card>
      ))}

      <Card>
        <Text style={styles.pointTitle}>필요한 것</Text>
        <Text style={styles.pointBody}>
          AirPods Pro, AirPods Max, AirPods(3세대 이상) 등 공간 음향 헤드 트래킹을 지원하는 이어폰이 필요해요.
        </Text>
        <Text style={[styles.pointBody, { marginTop: 8 }]}>
          다음 화면에서 &apos;동작 및 피트니스&apos; 접근을 허용해주세요.
        </Text>
      </Card>

      <View style={{ height: 8 }} />
      <Button title="시작하기" onPress={() => void monitor.completeOnboarding()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 34, fontWeight: '700', color: colors.text, marginTop: 24, letterSpacing: -0.6 },
  subtitle: { fontSize: 17, color: colors.subtext, marginTop: 6, marginBottom: 24 },
  point: { flexDirection: 'row', alignItems: 'flex-start' },
  emoji: { fontSize: 13, fontWeight: '600', color: colors.subtext, marginRight: 16, marginTop: 2, letterSpacing: 1 },
  pointTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 4 },
  pointBody: { fontSize: 14, color: colors.subtext, lineHeight: 20 },
});
