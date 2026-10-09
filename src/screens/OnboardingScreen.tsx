import { ScrollView, StyleSheet, View } from 'react-native';

import { type } from '../ui/fonts';
import { Text } from '../ui/Text';

import { t } from '../i18n';
import { monitor } from '../state/monitor';
import { Button } from '../ui/components';
import { FeatureIcon, type FeatureIconName } from '../ui/FeatureIcon';
import { colors } from '../ui/theme';

const FEATURES: { icon: FeatureIconName; key: 'airpods' | 'alert' | 'habit' }[] = [
  { icon: 'airpods', key: 'airpods' },
  { icon: 'balance', key: 'alert' },
  { icon: 'chart', key: 'habit' },
];

/** iOS "Welcome / What's New" style sheet. */
export function OnboardingScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{t('onboarding.title')}</Text>
        {FEATURES.map((f) => (
          <View key={f.key} style={styles.feature}>
            <View style={styles.icon}>
              <FeatureIcon name={f.icon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.featureTitle}>{t(`onboarding.${f.key}.title`)}</Text>
              <Text style={styles.featureBody}>{t(`onboarding.${f.key}.body`)}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <Text style={styles.note}>{t('onboarding.requirement')}</Text>
        <Button title={t('common.continue')} onPress={() => void monitor.completeOnboarding()} />
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
