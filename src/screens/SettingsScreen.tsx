import Constants from 'expo-constants';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import type { PostureSettings } from '../engine';
import { playTestCue } from '../services/feedback';
import { type MotionSourceKind, selectableSourceKinds } from '../services/motionSource';
import type { AppSettings, FeedbackSettings } from '../services/storage';
import { getLanguage, LANGUAGES, type LanguageSetting, languageName, localeTag, systemLanguage, t } from '../i18n';
import { monitor, useMonitor } from '../state/monitor';
import { Row, Screen, Section, Segmented, StepperRow, ToggleRow } from '../ui/components';
import { type } from '../ui/fonts';
import { Text } from '../ui/Text';
import { colors } from '../ui/theme';

const sourceLabel = (kind: MotionSourceKind) => t(`settings.source.${kind}`);

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
    if (!ok) Alert.alert(t('settings.cueUnavailableTitle'), t('settings.cueUnavailable'));
  };

  const calibration = s.calibration;

  return (
    <Screen title={t('settings.title')}>
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>{t('settings.calibration')}</Text>
        <Text style={styles.heroTitle}>{calibration ? t('settings.registered') : t('settings.notRegistered')}</Text>
        <Text style={styles.heroMeta}>
          {calibration
            ? `${formatDate(calibration.createdAt)} · ${t(`settings.location.${calibration.sensorLocation}`)}`
            : t('settings.notRegisteredHint')}
        </Text>
        <View style={styles.heroActions}>
          <Pill
            title={calibration ? t('settings.recalibrate') : t('settings.register')}
            primary
            onPress={() => monitor.startCalibration()}
          />
          {calibration ? <Pill title={t('settings.swap')} onPress={() => void monitor.swapLeftRight()} /> : null}
        </View>
      </View>

      {selectableSourceKinds.length > 1 && (
        <Section header={t('settings.sensorSection')} footer={t('settings.sensorFooter')}>
          <View style={styles.segmentBox}>
            <Segmented
              options={selectableSourceKinds.map((k) => ({ value: k, label: sourceLabel(k) }))}
              value={s.sourceKind}
              disabled={s.session !== null}
              onChange={(kind) => void monitor.setSourceKind(kind)}
            />
          </View>
        </Section>
      )}

      <Section
        header={t('settings.detection')}
        iconInset
        footer={
          t('settings.detectionFooter', { deg: posture.exitDeg }) +
          (posture.measureWhileWalking ? '' : ` ${t('settings.walkingPaused')}`)
        }>
        <StepperRow
          icon="angle"
          title={t('settings.alertAngle')}
          value={posture.enterDeg}
          step={1}
          min={5}
          max={25}
          format={(v) => `${v}°`}
          onChange={(enterDeg) => setPosture({ enterDeg })}
        />
        <StepperRow
          icon="timer"
          title={t('settings.holdTime')}
          value={posture.holdSec}
          step={1}
          min={2}
          max={60}
          format={(n) => t('common.seconds', { n })}
          onChange={(holdSec) => setPosture({ holdSec })}
        />
        <StepperRow
          icon="repeat"
          title={t('settings.alertInterval')}
          value={posture.cooldownSec}
          step={5}
          min={5}
          max={300}
          format={(n) => t('common.seconds', { n })}
          onChange={(cooldownSec) => setPosture({ cooldownSec })}
        />
        <ToggleRow
          icon="walk"
          title={t('settings.measureWhileWalking')}
          value={posture.measureWhileWalking}
          onChange={(measureWhileWalking) => setPosture({ measureWhileWalking })}
        />
      </Section>

      <Section
        header={t('settings.alerts')}
        iconInset
        footer={feedback.cueSide === 'tilted' ? t('settings.cueTiltedFooter') : t('settings.cueOppositeFooter')}>
        <ToggleRow
          icon="speaker"
          title={t('settings.airpodsCue')}
          value={feedback.sound}
          onChange={(sound) => setFeedback({ sound })}
        />
        <ToggleRow
          icon="chime"
          title={t('settings.recoveryChime')}
          value={feedback.recoveryChime}
          onChange={(recoveryChime) => setFeedback({ recoveryChime })}
        />
        <ToggleRow
          icon="haptic"
          title={t('settings.haptic')}
          value={feedback.haptic}
          onChange={(haptic) => setFeedback({ haptic })}
        />
        <ToggleRow
          icon="bell"
          title={t('settings.bgNotification')}
          value={feedback.notification}
          onChange={(notification) => setFeedback({ notification })}
        />
        <StepperRow
          icon="volume"
          title={t('settings.volume')}
          value={feedback.volume}
          step={0.1}
          min={0.1}
          max={1}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(volume) => setFeedback({ volume })}
        />
        <Row icon="ear" title={t('settings.cueSide')}>
          <Segmented
            options={[
              { value: 'tilted', label: t('settings.cueSide.tilted') },
              { value: 'opposite', label: t('settings.cueSide.opposite') },
            ]}
            value={feedback.cueSide}
            onChange={(cueSide) => setFeedback({ cueSide })}
          />
        </Row>
        <Row icon="ear" title={t('settings.directionTest')}>
          <View style={styles.inlinePills}>
            <Pill title={t('common.left')} small onPress={() => void testCue(-1)} />
            <Pill title={t('common.right')} small onPress={() => void testCue(1)} />
          </View>
        </Row>
      </Section>

      <Section header={t('settings.measurement')} iconInset footer={t('settings.measurementFooter')}>
        <ToggleRow
          icon="moon"
          title={t('settings.backgroundMode')}
          value={feedback.backgroundMode}
          onChange={(backgroundMode) => setFeedback({ backgroundMode })}
        />
        <ToggleRow
          icon="sun"
          title={t('settings.keepAwake')}
          value={feedback.keepAwake}
          onChange={(keepAwake) => setFeedback({ keepAwake })}
        />
      </Section>

      <LanguageSection value={s.settings.language} />

      <Section header={t('settings.info')} iconInset>
        <Row icon="sensor" title={t('settings.sensor')} value={`${sourceLabel(s.sourceKind)} · ${s.sampleRateHz}Hz`} />
        <Row icon="info" title={t('settings.motionPermission')} value={t(`settings.auth.${s.authorization}`)} />
      </Section>

      <Text style={styles.footer}>
        {t('settings.appName', { version: Constants.expoConfig?.version ?? '' })}
        {'\n'}
        {t('settings.disclaimer')}
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

/** Language picker: the current choice, expanding into the list (system + every language). */
function LanguageSection({ value }: { value: LanguageSetting }) {
  const [open, setOpen] = useState(false);
  const options: { value: LanguageSetting; label: string }[] = [
    { value: 'system', label: t('settings.languageSystem', { name: languageName(systemLanguage()) }) },
    ...LANGUAGES.map((l) => ({ value: l.code, label: l.name })),
  ];
  const choose = (language: LanguageSetting) => {
    setOpen(false);
    void monitor.updateSettings((prev) => ({ ...prev, language }));
  };
  return (
    <Section header={t('settings.language')} iconInset>
      <Row
        icon="globe"
        title={t('settings.language')}
        value={value === 'system' ? languageName(getLanguage()) : languageName(value)}
        onPress={() => setOpen((o) => !o)}
      />
      {open
        ? options.map((o) => (
            <Row
              key={o.value}
              title={o.label}
              value={o.value === value ? '✓' : undefined}
              valueColor={colors.text}
              onPress={() => choose(o.value)}
            />
          ))
        : null}
    </Section>
  );
}

function formatDate(ts: number) {
  const date = new Date(ts).toLocaleDateString(localeTag(), { month: 'long', day: 'numeric' });
  return t('settings.registeredOn', { date });
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
