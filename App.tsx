import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { CalibrationScreen } from './src/screens/CalibrationScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { monitor, useMonitor } from './src/state/monitor';
import { TabIcon } from './src/ui/TabIcon';
import { colors, useSvgPalette } from './src/ui/theme';

const TABS = [
  { key: 'home', label: '자세' },
  { key: 'history', label: '기록' },
  { key: 'settings', label: '설정' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const s = useMonitor();
  const palette = useSvgPalette();
  const [tab, setTab] = useState<TabKey>('home');

  useEffect(() => {
    void monitor.init();
  }, []);

  if (!s.loaded) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!s.onboarded) {
    return (
      <SafeAreaView style={styles.sheet}>
        <OnboardingScreen />
      </SafeAreaView>
    );
  }

  if (s.calibrating) {
    return (
      <SafeAreaView style={styles.sheet}>
        <CalibrationScreen />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
      <View style={styles.fill}>
        {tab === 'home' && <HomeScreen />}
        {tab === 'history' && <HistoryScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </View>
      <SafeAreaView edges={['bottom']} style={styles.tabBar}>
        {TABS.map((t) => (
          <Pressable key={t.key} style={styles.tab} onPress={() => setTab(t.key)} accessibilityRole="tab">
            <TabIcon name={t.key} color={tab === t.key ? palette.tint : palette.subtext} active={tab === t.key} />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  sheet: { flex: 1, backgroundColor: colors.card },
  center: { alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.barBg,
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: 7, paddingBottom: 2 },
  tabLabel: { fontSize: 10, fontWeight: '500', color: colors.muted, marginTop: 1 },
  tabLabelActive: { color: colors.tint },
});
