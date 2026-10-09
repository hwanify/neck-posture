import { ScrollView, StyleSheet, View } from 'react-native';

import { type } from '../ui/fonts';
import { Text } from '../ui/Text';

import { monitor } from '../state/monitor';
import { Button } from '../ui/components';
import { FeatureIcon, type FeatureIconName } from '../ui/FeatureIcon';
import { colors } from '../ui/theme';

const FEATURES: { icon: FeatureIconName; title: string; body: string }[] = [
  {
    icon: 'airpods',
    title: 'AirPods로 측정',
    body: 'AirPods의 헤드 트래킹 센서로 고개 기울기를 측정합니다. 카메라나 별도 기기가 필요 없습니다.',
  },
  {
    icon: 'balance',
    title: '좌우 기울어짐 알림',
    body: '고개가 한쪽으로 기운 채 몇 초가 지나면 반대쪽 귀에서 짧은 소리로 알려드립니다.',
  },
  {
    icon: 'chart',
    title: '습관 기록',
    body: '바른 자세를 유지한 비율과 자주 기우는 방향을 기록합니다.',
  },
];

/** iOS "Welcome / What's New" style sheet. */
export function OnboardingScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>바로목에 오신 것을{'\n'}환영합니다</Text>
        {FEATURES.map((f) => (
          <View key={f.title} style={styles.feature}>
            <View style={styles.icon}>
              <FeatureIcon name={f.icon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureBody}>{f.body}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.note}>
          AirPods Pro, AirPods Max, AirPods(3세대 이상)가 필요합니다. 다음 단계에서 동작 및 피트니스 접근을 허용해 주세요.
        </Text>
        <Button title="계속" onPress={() => void monitor.completeOnboarding()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card },
  content: { paddingHorizontal: 40, paddingTop: 64, paddingBottom: 24 },
  title: {
    ...type.title,
    fontSize: 30,
    lineHeight: 38,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 44,
  },
  feature: { flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
  icon: { width: 52, alignItems: 'center', marginRight: 14 },
  featureTitle: { ...type.bodyStrong, color: colors.text },
  featureBody: { ...type.caption, fontSize: 14, lineHeight: 20, color: colors.subtext, marginTop: 3 },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  note: { ...type.caption, fontSize: 12, lineHeight: 18, color: colors.subtext, textAlign: 'center', marginBottom: 16 },
});
