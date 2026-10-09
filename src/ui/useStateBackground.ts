import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

import type { PostureState } from '../engine';
import { stateBackground } from './theme';

const ORDER: PostureState[] = ['good', 'tilting', 'alerted', 'paused'];

/** Full-screen background color that eases between posture states. */
export function useStateBackground(state: PostureState) {
  const value = useRef(new Animated.Value(ORDER.indexOf(state))).current;
  useEffect(() => {
    Animated.timing(value, {
      toValue: ORDER.indexOf(state),
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [state, value]);
  return value.interpolate({
    inputRange: ORDER.map((_, i) => i),
    outputRange: ORDER.map((s) => stateBackground[s]),
  });
}
