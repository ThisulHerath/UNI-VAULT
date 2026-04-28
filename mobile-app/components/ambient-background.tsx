import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

type AmbientBackgroundProps = {
  primary?: string;
  secondary?: string;
};

export function AmbientBackground({
  primary = '#3B82F6',
  secondary = '#60A5FA',
}: AmbientBackgroundProps) {
  const driftA = useRef(new Animated.Value(0)).current;
  const driftB = useRef(new Animated.Value(0)).current;
  const driftC = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(driftA, {
          toValue: 1,
          duration: 8500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftA, {
          toValue: 0,
          duration: 8500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const b = Animated.loop(
      Animated.sequence([
        Animated.timing(driftB, {
          toValue: 1,
          duration: 11000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftB, {
          toValue: 0,
          duration: 11000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    const c = Animated.loop(
      Animated.sequence([
        Animated.timing(driftC, {
          toValue: 1,
          duration: 9800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(driftC, {
          toValue: 0,
          duration: 9800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    a.start();
    b.start();
    c.start();

    return () => {
      a.stop();
      b.stop();
      c.stop();
    };
  }, [driftA, driftB, driftC]);

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View
        style={[
          styles.blob,
          styles.blobTop,
          {
            backgroundColor: `${primary}18`,
            transform: [
              {
                translateX: driftA.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-8, 16],
                }),
              },
              {
                translateY: driftA.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 18],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobRight,
          {
            backgroundColor: `${secondary}12`,
            transform: [
              {
                translateX: driftB.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -20],
                }),
              },
              {
                translateY: driftB.interpolate({
                  inputRange: [0, 1],
                  outputRange: [8, -12],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.blob,
          styles.blobBottom,
          {
            backgroundColor: `${primary}10`,
            transform: [
              {
                translateX: driftC.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, -12],
                }),
              },
              {
                translateY: driftC.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-10, 12],
                }),
              },
            ],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 0,
  },
  blob: {
    position: 'absolute',
    borderRadius: 999,
  },
  blobTop: {
    width: 240,
    height: 240,
    top: -70,
    left: -90,
  },
  blobRight: {
    width: 200,
    height: 200,
    top: '34%',
    right: -80,
  },
  blobBottom: {
    width: 230,
    height: 230,
    bottom: -85,
    left: '16%',
  },
});
