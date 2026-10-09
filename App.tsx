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
import { colors } from './src/ui/theme';

const TABS = [
  { key: 'home', label: '자세' },
  { key: 'history', label: '기록' },
  { key: 'settings', label: '설정' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const s = useMonitor();
  const [tab, setTab] = useState<TabKey>('home');

  useEffect(() => {
    void monitor.init();
  }, []);

  if (!s.loaded) {
    return (
      <View style={[styles.fill, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!s.onboarded) {
    return (
      <SafeAreaView style={styles.fill}>
        <OnboardingScreen />
      </SafeAreaView>
    );
  }

  if (s.calibrating) {
    return (
      <SafeAreaView style={styles.fill}>
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
            <TabIcon name={t.key} color={tab === t.key ? colors.text : colors.muted} />
            <Text style={[styles.tabLabel, tab === t.key && styles.tabLabelActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: 4,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabLabel: { fontSize: 10, color: colors.muted, marginTop: 3, letterSpacing: 0.3 },
  tabLabelActive: { color: colors.text, fontWeight: '600' },
});
