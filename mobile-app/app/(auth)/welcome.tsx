import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { height } = Dimensions.get('window');

const BLUE_LIGHT = '#60A5FA';
const BLUE_DEEP = '#1D4ED8';

export default function WelcomeScreen() {
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentRise = useRef(new Animated.Value(40)).current;
  const badgeFade = useRef(new Animated.Value(0)).current;
  const badgeScale = useRef(new Animated.Value(0.85)).current;
  const btnScale1 = useRef(new Animated.Value(0.92)).current;
  const btnScale2 = useRef(new Animated.Value(0.92)).current;
  const orb1Y = useRef(new Animated.Value(0)).current;
  const orb2Y = useRef(new Animated.Value(0)).current;
  const orb3X = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentFade, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(contentRise, { toValue: 0, duration: 700, useNativeDriver: true }),
      Animated.spring(badgeScale, { toValue: 1, useNativeDriver: true }),
      Animated.timing(badgeFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const float = (anim: Animated.Value, to: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: to, duration: 4000, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 4000, useNativeDriver: true }),
        ])
      );

    float(orb1Y, -20).start();
    float(orb2Y, 20).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb3X, { toValue: 15, duration: 5000, useNativeDriver: true }),
        Animated.timing(orb3X, { toValue: 0, duration: 5000, useNativeDriver: true }),
      ])
    ).start();
  }, [contentFade, contentRise, badgeScale, badgeFade, orb1Y, orb2Y, orb3X]);

  const handlePressIn = (scale: Animated.Value) => {
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true }).start();
  };

  const handlePressOut = (scale: Animated.Value) => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Background */}
      <View style={styles.backdrop}>
        <Animated.View style={[styles.orb, styles.orbTopRight, { transform: [{ translateY: orb1Y }] }]} />
        <Animated.View style={[styles.orb, styles.orbBottomLeft, { transform: [{ translateY: orb2Y }] }]} />
        <Animated.View style={[styles.orb, styles.orbCenter, { transform: [{ translateX: orb3X }] }]} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Badge */}
        <Animated.View style={[styles.badge, { opacity: badgeFade, transform: [{ scale: badgeScale }] }]}>
          <Ionicons name="star" size={14} color="#60A5FA" />
          <Text style={styles.badgeText}>Collaborative Learning Hub</Text>
        </Animated.View>

        {/* Hero */}
        <Animated.View style={{ opacity: contentFade, transform: [{ translateY: contentRise }] }}>
          <Text style={styles.brand}>UNIVAULT</Text>

          <Text style={styles.hero1}>Study better</Text>
          <View style={styles.heroRow}>
            <Text style={styles.hero2}>together.</Text>
            <View style={styles.dot} />
          </View>

          <Text style={styles.subtitle}>
            Share notes, discover quality resources, and stay productive with your campus community.
          </Text>
        </Animated.View>

        {/* Pills */}
        <View style={styles.pillRow}>
          {['Notes', 'Reviews', 'Groups'].map((item, i) => (
            <View key={i} style={styles.pill}>
              <Text style={styles.pillText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttonContainer}>
          <Animated.View style={{ transform: [{ scale: btnScale1 }] }}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(auth)/login')}
              onPressIn={() => handlePressIn(btnScale1)}
              onPressOut={() => handlePressOut(btnScale1)}
            >
              <Text style={styles.primaryText}>Sign In →</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: btnScale2 }] }}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/(auth)/register')}
              onPressIn={() => handlePressIn(btnScale2)}
              onPressOut={() => handlePressOut(btnScale2)}
            >
              <Text style={styles.secondaryText}>Create Account</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Built for focused learners</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },

  orb: {
    position: 'absolute',
    borderRadius: 999,
  },

  orbTopRight: {
    width: 280,
    height: 280,
    top: -100,
    right: -80,
    backgroundColor: 'rgba(59,130,246,0.2)',
  },

  orbBottomLeft: {
    width: 250,
    height: 250,
    bottom: 50,
    left: -100,
    backgroundColor: 'rgba(34,197,94,0.15)',
  },

  orbCenter: {
    width: 150,
    height: 150,
    top: height * 0.4,
    right: -50,
    backgroundColor: 'rgba(139,92,246,0.1)',
  },

  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },

  badge: {
    flexDirection: 'row',
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    alignSelf: 'flex-start',
    marginBottom: 24,
    gap: 8,
    alignItems: 'center',
  },

  badgeText: {
    color: '#60A5FA',
    fontWeight: '600',
    fontSize: 13,
    letterSpacing: 0.3,
  },

  brand: {
    color: '#3B82F6',
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 10,
  },

  hero1: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
  },

  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  hero2: {
    fontSize: 42,
    fontWeight: '900',
    color: BLUE_LIGHT,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BLUE_DEEP,
    marginLeft: 6,
  },

  subtitle: {
    marginTop: 10,
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
  },

  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
    marginBottom: 30,
  },

  pill: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  pillText: {
    color: '#CBD5F5',
    fontWeight: '600',
  },

  buttonContainer: {
    gap: 12,
  },

  primaryButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },

  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },

  secondaryText: {
    color: '#fff',
    fontWeight: '700',
  },

  footer: {
    marginTop: 20,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 12,
  },
});