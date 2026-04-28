import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface SkeletonBlockProps {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonBlock({
  width = '100%',
  height,
  borderRadius = 8,
  style,
}: SkeletonBlockProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1100,
        useNativeDriver: true,
      })
    );

    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  return (
    <View style={[styles.base, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          styles.highlight,
          {
            transform: [
              {
                translateX: shimmer.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-120, 220],
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
  base: {
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#DBEAFE',
    opacity: 0.9,
  },
});
