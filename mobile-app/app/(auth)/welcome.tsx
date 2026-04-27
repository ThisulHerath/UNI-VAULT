import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

const GOLD = '#E8A838';
const GOLD_DIM = '#C8882A';
const RED_BRIGHT = '#E8453C';
const SURFACE_GLOW = '#2A1A0E';

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
  const shimmer = useRef(new Animated.Value(0)).current;
  const pill1 = useRef(new Animated.Value(0)).current;
  const pill2 = useRef(new Animated.Value(0)).current;
  const pill3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Staggered entrance
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(badgeFade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.spring(badgeScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      ]),
    ]).start();

    Animated.sequence([
      Animated.delay(250),
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: 600, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(contentRise, { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }),
      ]),
    ]).start();

    // Pills stagger
    [pill1, pill2, pill3].forEach((p, i) => {
      Animated.sequence([
        Animated.delay(500 + i * 100),
        Animated.spring(p, { toValue: 1, friction: 6, tension: 150, useNativeDriver: true }),
      ]).start();
    });

    // Buttons bounce in
    Animated.sequence([
      Animated.delay(750),
      Animated.parallel([
        Animated.spring(btnScale1, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
        Animated.spring(btnScale2, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      ]),
    ]).start();

    // Floating orbs
    const floatOrb = (anim: Animated.Value, toY: number, dur: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: toY, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );

    floatOrb(orb1Y, -22, 3600).start();
    floatOrb(orb2Y, 18, 4200).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb3X, { toValue: 14, duration: 5100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orb3X, { toValue: 0, duration: 5100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    // Shimmer on brand text
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

  const handlePressIn = (scale: Animated.Value) => {
    Animated.spring(scale, { toValue: 0.96, friction: 6, tension: 200, useNativeDriver: true }).start();
  };
  const handlePressOut = (scale: Animated.Value) => {
    Animated.spring(scale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start();
  };

  const pillData = [
    { label: 'Notes', icon: 'document-text-outline', anim: pill1 },
    { label: 'Reviews', icon: 'star-outline', anim: pill2 },
    { label: 'Groups', icon: 'people-outline', anim: pill3 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Background atmosphere */}
      <View style={styles.backdrop}>
        {/* Top-right dramatic glow */}
        <Animated.View style={[styles.orb, styles.orbTopRight, { transform: [{ translateY: orb1Y }] }]} />
        {/* Bottom-left cool glow */}
        <Animated.View style={[styles.orb, styles.orbBottomLeft, { transform: [{ translateY: orb2Y }] }]} />
        {/* Centre accent */}
        <Animated.View style={[styles.orb, styles.orbCentre, { transform: [{ translateX: orb3X }] }]} />
        {/* Decorative grid lines */}
        <View style={styles.gridLine1} />
        <View style={styles.gridLine2} />
        {/* Bottom vignette */}
        <View style={styles.vignette} />
      </View>

      <View style={styles.content}>
        {/* Badge */}
        <Animated.View style={[styles.badge, { opacity: badgeFade, transform: [{ scale: badgeScale }] }]}>
          <Ionicons name="school-outline" size={11} color={GOLD} style={{ marginRight: 5 }} />
          <Text style={styles.badgeText}>Collaborative Learning Hub</Text>
        </Animated.View>

        {/* Hero block */}
        <Animated.View style={[styles.heroBlock, { opacity: contentFade, transform: [{ translateY: contentRise }] }]}>
          <Animated.Text style={[styles.brand, { opacity: shimmerOpacity }]}>
            UniVault
          </Animated.Text>
          <Text style={styles.heroLine1}>Study better</Text>
          <View style={styles.heroAccentRow}>
            <Text style={styles.heroLine2}>together.</Text>
            <View style={styles.heroDot} />
          </View>
          <Text style={styles.subtitle}>
            Share notes, discover quality resources, and stay{'\n'}productive with your campus community.
          </Text>
        </Animated.View>

        {/* Feature pills */}
        <View style={styles.pillRow}>
          {pillData.map(({ label, icon, anim }) => (
            <Animated.View
              key={label}
              style={[styles.pill, { opacity: anim, transform: [{ scale: anim }] }]}
            >
              <Ionicons name={icon as any} size={12} color={GOLD_DIM} style={{ marginRight: 4 }} />
              <Text style={styles.pillText}>{label}</Text>
            </Animated.View>
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
              activeOpacity={1}
            >
              <View style={styles.primaryButtonInner}>
                <Text style={styles.primaryButtonText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 8 }} />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: btnScale2 }] }}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/(auth)/register')}
              onPressIn={() => handlePressIn(btnScale2)}
              onPressOut={() => handlePressOut(btnScale2)}
              activeOpacity={1}
            >
              <Text style={styles.secondaryButtonText}>Create Account</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>

        {/* Footnote */}
        <View style={styles.footnoteRow}>
          <View style={styles.footnoteDivider} />
          <Text style={styles.footnote}>Built for focused learners</Text>
          <View style={styles.footnoteDivider} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0703',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
  },
  orbTopRight: {
    width: 320,
    height: 320,
    top: -120,
    right: -100,
    backgroundColor: `${Colors.primary}2E`,
    // Extra inner core
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 60,
    shadowOffset: { width: 0, height: 0 },
  },
  orbBottomLeft: {
    width: 280,
    height: 280,
    bottom: 80,
    left: -120,
    backgroundColor: '#1A4A3A22',
  },
  orbCentre: {
    width: 180,
    height: 180,
    top: height * 0.38,
    right: -60,
    backgroundColor: `${GOLD}0D`,
  },
  gridLine1: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: width * 0.72,
    width: 1,
    backgroundColor: '#FFFFFF06',
  },
  gridLine2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: height * 0.55,
    height: 1,
    backgroundColor: '#FFFFFF06',
  },
  vignette: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 220,
    backgroundColor: '#0E0703',
    opacity: 0.7,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xl,
    justifyContent: 'flex-end',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: `${GOLD}18`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: `${GOLD}40`,
    marginBottom: Spacing.lg,
  },
  badgeText: {
    color: GOLD,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  heroBlock: {
    marginBottom: Spacing.lg,
  },
  brand: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  heroLine1: {
    fontSize: 44,
    fontWeight: '900',
    color: Colors.text,
    lineHeight: 50,
    letterSpacing: -1,
  },
  heroAccentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  heroLine2: {
    fontSize: 44,
    fontWeight: '900',
    color: GOLD,
    lineHeight: 50,
    letterSpacing: -1,
  },
  heroDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: RED_BRIGHT,
    marginLeft: 6,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 23,
    maxWidth: 340,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xl,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: SURFACE_GLOW,
    borderWidth: 1,
    borderColor: '#3A2510',
  },
  pillText: {
    color: Colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.2,
  },
  buttonContainer: {
    width: '100%',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  primaryButton: {
    width: '100%',
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    borderWidth: 1,
    borderColor: RED_BRIGHT,
    overflow: 'hidden',
    // Subtle inner glow via shadow
    shadowColor: Colors.primary,
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  primaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: FontSizes.md,
    letterSpacing: 0.3,
  },
  secondaryButton: {
    width: '100%',
    padding: Spacing.md,
    paddingVertical: 16,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1008',
    borderWidth: 1,
    borderColor: '#3A2510',
  },
  secondaryButtonText: {
    color: Colors.text,
    fontWeight: '700',
    fontSize: FontSizes.md,
  },
  footnoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: Spacing.sm,
  },
  footnoteDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#2A1A0E',
  },
  footnote: {
    color: '#4A3520',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});