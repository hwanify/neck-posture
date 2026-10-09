import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from './theme';

const RANGE_DEG = 30;

/** Horizontal left ← 0 → right gauge with the alert zones shaded. */
export function TiltGauge({ angle, enterDeg, color }: { angle: number; enterDeg: number; color: string }) {
  const [width, setWidth] = useState(0);
  const x = (deg: number) => ((Math.max(-RANGE_DEG, Math.min(RANGE_DEG, deg)) + RANGE_DEG) / (2 * RANGE_DEG)) * width;

  return (
    <View style={{ width: '100%' }}>
      <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 && (
          <>
            <View style={[styles.zone, { left: 0, width: width - x(enterDeg) }]} />
            <View style={[styles.zone, { right: 0, width: width - x(enterDeg) }]} />
            <View style={[styles.center, { left: width / 2 - 1 }]} />
            <View style={[styles.marker, { left: x(angle) - 9, backgroundColor: color }]} />
          </>
        )}
      </View>
      <View style={styles.labels}>
        <Text style={styles.label}>왼쪽</Text>
        <Text style={styles.label}>바름</Text>
        <Text style={styles.label}>오른쪽</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    marginTop: 4,
  },
  zone: { position: 'absolute', top: 0, bottom: 0, backgroundColor: 'rgba(239, 78, 74, 0.28)', borderRadius: 6 },
  center: { position: 'absolute', top: -3, bottom: -3, width: 2, backgroundColor: colors.muted, borderRadius: 1 },
  marker: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  label: { fontSize: 11, color: colors.subtext },
});
