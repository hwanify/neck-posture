import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { CalibrationScreen } from './src/screens/CalibrationScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { PostureCheckScreen } from './src/screens/PostureCheckScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { t } from './src/i18n';
import { monitor, useMonitor } from './src/state/monitor';
import { type, useAppFonts } from './src/ui/fonts';
import { TabIcon } from './src/ui/TabIcon';
import { Text } from './src/ui/Text';
import { colors, useSvgPalette } from './src/ui/theme';

const TABS = ['home', 'history', 'settings'] as const;
type TabKey = (typeof TABS)[number];

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
  const palette = useSvgPalette();
  const fontsReady = useAppFonts();
  const [tab, setTab] = useState<TabKey>('home');

  useEffect(() => {
    void monitor.init();
  }, []);

  if (!s.loaded || !fontsReady) {
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

  if (s.checking) {
    return (
      <SafeAreaView style={styles.fill}>
        <PostureCheckScreen />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.fill}>
      <SafeAreaView style={styles.transparent} edges={['top', 'left', 'right']}>
        <View style={styles.transparent}>
          {tab === 'home' && <HomeScreen />}
          {tab === 'history' && <HistoryScreen />}
          {tab === 'settings' && <SettingsScreen />}
        </View>
        <SafeAreaView edges={['bottom']} style={styles.tabBar}>
          {TABS.map((key) => (
            <Pressable key={key} style={styles.tab} onPress={() => setTab(key)} accessibilityRole="tab">
              <TabIcon name={key} color={tab === key ? palette.tint : palette.subtext} active={tab === key} />
              <Text style={[styles.tabLabel, tab === key && styles.tabLabelActive]}>{t(`tab.${key}`)}</Text>
            </Pressable>
          ))}
        </SafeAreaView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.bg },
  sheet: { flex: 1, backgroundColor: colors.card },
  transparent: { flex: 1, backgroundColor: 'transparent' },
  center: { alignItems: 'center', justifyContent: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  tabLabel: { ...type.label, fontSize: 10, color: colors.muted, marginTop: 2 },
  tabLabelActive: { color: colors.tint },
});
