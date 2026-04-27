import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Animated, Easing,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

const GOLD = '#E8A838';
const FIELD_BG = '#160C05';
const BORDER_IDLE = '#2E1A0A';
const BORDER_FOCUS = '#C0392B';

// ─── Floating label input (same as login but self-contained here) ─────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  icon: string;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  returnKeyType?: any;
  optional?: boolean;
}

function FormField({ label, value, onChangeText, icon, secureTextEntry, optional }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.parallel([
      Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      Animated.timing(labelAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
    if (!value) {
      Animated.timing(labelAnim, { toValue: 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }
  };

  useEffect(() => {
    Animated.timing(labelAnim, { toValue: value ? 1 : (focused ? 1 : 0), duration: 180, useNativeDriver: false }).start();
  }, [value]);

  const borderColor = focusAnim.interpolate({ inputRange: [0, 1], outputRange: [BORDER_IDLE, BORDER_FOCUS] });
  const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 5] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelColor = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [Colors.textMuted, GOLD] });

  return (
    <Animated.View style={[fStyles.wrapper, { borderColor }]}>
      <View style={fStyles.iconCol}>
        <Ionicons name={icon as any} size={15} color={focused ? GOLD : '#4A3520'} />
      </View>
      <View style={fStyles.fieldArea}>
        <Animated.Text style={[fStyles.floatLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]}>
          {label}{optional && <Text style={{ color: '#3A2510' }}> (optional)</Text>}
        </Animated.Text>
        <TextInput
          style={fStyles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor="transparent"
          secureTextEntry={secureTextEntry && !showPass}
        />
      </View>
      {secureTextEntry && (
        <TouchableOpacity onPress={() => setShowPass(s => !s)} style={fStyles.eyeBtn}>
          <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={15} color="#4A3520" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const fStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FIELD_BG,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    marginBottom: 10,
    minHeight: 56,
  },
  iconCol: {
    paddingHorizontal: 13,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  fieldArea: {
    flex: 1,
    position: 'relative',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    paddingTop: 18,
  },
  floatLabel: {
    position: 'absolute',
    left: 0,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  input: {
    color: Colors.text,
    fontSize: 15,
    paddingVertical: 0,
    height: 22,
  },
  eyeBtn: {
    paddingHorizontal: 13,
    paddingTop: 10,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

// Step indicator
function StepDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <View style={[
      stepStyles.dot,
      active && stepStyles.dotActive,
      done && stepStyles.dotDone,
    ]}>
      {done && <Ionicons name="checkmark" size={10} color="#fff" />}
    </View>
  );
}

const stepStyles = StyleSheet.create({
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1C1008',
    borderWidth: 1.5,
    borderColor: '#2E1A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}20`,
  },
  dotDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', university: '', batch: '',
  });
  const [loading, setLoading] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardRise = useRef(new Animated.Value(30)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardAnim, { toValue: 1, duration: 500, delay: 150, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(cardRise, { toValue: 0, duration: 500, delay: 150, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }),
    ]).start();
  }, []);

  const update = (field: keyof typeof form) => (value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  // Determine which "step" we're on for visual feedback
  const step1Done = !!form.name && !!form.email;
  const step2Done = !!form.password && !!form.confirmPassword;
  const handleBackToWelcome = () => router.push('/(auth)/welcome');

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Name, email and password are required.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
      return;
    }
    if (form.password.length < 6) {
      Toast.show({ type: 'error', text1: 'Weak Password', text2: 'Password must be at least 6 characters.' });
      return;
    }
    if (form.password !== form.confirmPassword) {
      Toast.show({ type: 'error', text1: 'Mismatch', text2: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email.toLowerCase(),
        password: form.password,
        university: form.university,
        batch: form.batch,
      });
      router.replace('/(tabs)');
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Registration Failed', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Background */}
        <View style={styles.orbTopRight} pointerEvents="none" />
        <View style={styles.orbBottomLeft} pointerEvents="none" />

        <Pressable
          style={({ pressed }) => [styles.backNavButton, pressed && styles.backNavButtonPressed]}
          onPress={handleBackToWelcome}
          hitSlop={12}
          android_ripple={{ color: '#2A1A0E' }}
        >
          <View style={styles.backNavIcon}>
            <Ionicons name="arrow-back" size={14} color={Colors.textMuted} />
          </View>
          <Text style={styles.backNavText}>Back</Text>
        </Pressable>

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: cardAnim }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="library" size={20} color={Colors.primary} />
            </View>
            <Text style={styles.logoText}>UniVault</Text>
          </View>
          <Text style={styles.tagline}>Create your account</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[styles.card, { opacity: cardAnim, transform: [{ translateY: cardRise }] }]}>
          <View style={styles.cardAccentBar} />

          {/* Title + step indicator */}
          <View style={styles.cardHeader}>
            <View>
              <Text style={styles.title}>Join UniVault</Text>
              <Text style={styles.subtitle}>Fill in your details below</Text>
            </View>
            <View style={styles.stepRow}>
              <StepDot active={!step1Done} done={step1Done} />
              <View style={[styles.stepLine, step1Done && styles.stepLineDone]} />
              <StepDot active={step1Done && !step2Done} done={step2Done} />
              <View style={[styles.stepLine, step2Done && styles.stepLineDone]} />
              <StepDot active={step1Done && step2Done} done={false} />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Section: Identity */}
          <View style={styles.sectionLabel}>
            <Ionicons name="person-circle-outline" size={13} color={GOLD} />
            <Text style={styles.sectionLabelText}>Your Identity</Text>
          </View>

          <FormField label="Full Name" icon="person-outline" value={form.name} onChangeText={update('name')} autoCapitalize="words" />
          <FormField label="Email Address" icon="mail-outline" value={form.email} onChangeText={update('email')} keyboardType="email-address" autoCapitalize="none" />

          {/* Section: Security */}
          <View style={[styles.sectionLabel, { marginTop: 6 }]}>
            <Ionicons name="shield-checkmark-outline" size={13} color={GOLD} />
            <Text style={styles.sectionLabelText}>Security</Text>
          </View>

          <FormField label="Password" icon="lock-closed-outline" value={form.password} onChangeText={update('password')} secureTextEntry />
          <FormField label="Confirm Password" icon="lock-open-outline" value={form.confirmPassword} onChangeText={update('confirmPassword')} secureTextEntry />

          {/* Section: Academic */}
          <View style={[styles.sectionLabel, { marginTop: 6 }]}>
            <Ionicons name="school-outline" size={13} color={GOLD} />
            <Text style={styles.sectionLabelText}>Academic Info</Text>
            <View style={styles.optionalBadge}><Text style={styles.optionalBadgeText}>optional</Text></View>
          </View>

          <FormField label="University" icon="business-outline" value={form.university} onChangeText={update('university')} optional />
          <FormField label="Batch / Intake" icon="calendar-outline" value={form.batch} onChangeText={update('batch')} autoCapitalize="characters" optional />

          {/* Submit */}
          <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 6 }}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, friction: 5, tension: 200, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(btnScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start()}
              activeOpacity={1}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : (
                  <View style={styles.btnInner}>
                    <Ionicons name="checkmark-circle-outline" size={17} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.buttonText}>Create Account</Text>
                  </View>
                )
              }
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity><Text style={styles.link}>Sign In</Text></TouchableOpacity>
            </Link>
          </View>
        </Animated.View>

        <Animated.Text style={[styles.bottomNote, { opacity: cardAnim }]}>
          Secure · Private · Built for students
        </Animated.Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0703' },
  scroll: { flexGrow: 1, padding: Spacing.lg, paddingTop: Spacing.xl },
  orbTopRight: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    top: -80,
    right: -80,
    backgroundColor: `${Colors.primary}1A`,
  },
  orbBottomLeft: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: 0,
    left: -80,
    backgroundColor: `${GOLD}0C`,
  },
  backNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: Spacing.lg,
    zIndex: 20,
    elevation: 20,
    position: 'relative',
  },
  backNavButtonPressed: {
    opacity: 0.85,
  },
  backNavIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1C1008',
    borderWidth: 1,
    borderColor: '#2E1A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backNavText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#1C0A04',
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 24, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: Colors.textMuted },
  card: {
    backgroundColor: '#130A04',
    borderRadius: 20,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#2E1A0A',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  cardAccentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.primary,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 3 },
  subtitle: { fontSize: 12, color: Colors.textMuted },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  stepLine: {
    width: 18,
    height: 2,
    backgroundColor: '#2E1A0A',
    marginHorizontal: 3,
    borderRadius: 1,
  },
  stepLineDone: { backgroundColor: Colors.primary },
  divider: { height: 1, backgroundColor: '#1E1008', marginVertical: 14 },
  sectionLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionLabelText: {
    fontSize: 11,
    fontWeight: '700',
    color: GOLD,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  optionalBadge: {
    backgroundColor: '#1E1008',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
  },
  optionalBadgeText: { fontSize: 10, color: '#4A3520', fontWeight: '600' },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonDisabled: { opacity: 0.6 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: FontSizes.md, letterSpacing: 0.2 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { color: Colors.textMuted, fontSize: FontSizes.sm },
  link: { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.sm },
  bottomNote: {
    textAlign: 'center',
    color: '#2E1A0A',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
});