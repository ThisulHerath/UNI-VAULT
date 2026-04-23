import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

const ACCENT_GOLD = '#D58B2A';
const ACCENT_CYAN = '#33B7A8';

export default function WelcomeScreen() {
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentRise = useRef(new Animated.Value(28)).current;
  const orbitA = useRef(new Animated.Value(0)).current;
  const orbitB = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentRise, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    const loopA = Animated.loop(
      Animated.sequence([
        Animated.timing(orbitA, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbitA, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    const loopB = Animated.loop(
      Animated.sequence([
        Animated.timing(orbitB, {
          toValue: 1,
          duration: 4100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(orbitB, {
          toValue: 0,
          duration: 4100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    loopA.start();
    loopB.start();

    return () => {
      loopA.stop();
      loopB.stop();
    };
  }, [contentFade, contentRise, orbitA, orbitB]);

  const orbATranslateY = orbitA.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -18],
  });
  const orbATranslateX = orbitA.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 9],
  });

  const orbBTranslateY = orbitB.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -14],
  });
  const orbBTranslateX = orbitB.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.glow,
            styles.glowOne,
            {
              transform: [{ translateY: orbATranslateY }, { translateX: orbATranslateX }],
            },
          ]}
        />
        <Animated.View
          style={[
            styles.glow,
            styles.glowTwo,
            {
              transform: [{ translateY: orbBTranslateY }, { translateX: orbBTranslateX }],
            },
          ]}
        />
      </View>

      <Animated.View
        style={[
          styles.content,
          {
            opacity: contentFade,
            transform: [{ translateY: contentRise }],
          },
        ]}
      >
        <View style={styles.topBadge}>
          <Text style={styles.topBadgeText}>Collaborative Learning Hub</Text>
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.brand}>UniVault</Text>
          <Text style={styles.title}>Study better together.</Text>
          <Text style={styles.subtitle}>
            Share notes, discover quality resources, and stay productive with your campus community.
          </Text>
        </View>

        <View style={styles.pillRow}>
          <View style={styles.pill}><Text style={styles.pillText}>Notes</Text></View>
          <View style={styles.pill}><Text style={styles.pillText}>Reviews</Text></View>
          <View style={styles.pill}><Text style={styles.pillText}>Groups</Text></View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.primaryButton]} 
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.primaryButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.button, styles.secondaryButton]} 
            onPress={() => router.push('/(auth)/register')}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footnote}>Built for focused learners across every semester.</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    borderRadius: Radius.full,
  },
  glowOne: {
    width: 280,
    height: 280,
    top: -90,
    right: -100,
    backgroundColor: `${Colors.primary}33`,
  },
  glowTwo: {
    width: 260,
    height: 260,
    bottom: 120,
    left: -110,
    backgroundColor: `${ACCENT_CYAN}26`,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    justifyContent: 'center',
  },
  topBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${ACCENT_GOLD}22`,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: `${ACCENT_GOLD}66`,
  },
  topBadgeText: {
    color: ACCENT_GOLD,
    fontWeight: '700',
    fontSize: FontSizes.xs,
    letterSpacing: 0.3,
  },
  heroBlock: {
    marginBottom: Spacing.lg,
  },
  brand: {
    color: Colors.text,
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: FontSizes.lg,
    color: Colors.textMuted,
    lineHeight: 25,
    maxWidth: 430,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillText: {
    color: Colors.textMuted,
    fontWeight: '700',
    fontSize: FontSizes.xs,
  },
  buttonContainer: {
    width: '100%',
    gap: Spacing.sm,
  },
  button: {
    width: '100%',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: '#D34D3E',
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: `${Colors.textMuted}66`,
  },
  primaryButtonText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: FontSizes.md,
  },
  secondaryButtonText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: FontSizes.md,
  },
  footnote: {
    marginTop: Spacing.md,
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    textAlign: 'center',
  },
});
