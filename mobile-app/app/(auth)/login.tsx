import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Animated, Easing,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

const GOLD = '#E8A838';
const RED_BRIGHT = '#E8453C';
const FIELD_BG = '#160C05';
const BORDER_IDLE = '#2E1A0A';
const BORDER_FOCUS = '#C0392B';

interface FloatingLabelInputProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  returnKeyType?: any;
  onSubmitEditing?: () => void;
  icon: string;
}

function FloatingLabelInput({ label, value, onChangeText, icon, secureTextEntry, ...props }: FloatingLabelInputProps) {
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
    <Animated.View style={[inputStyles.wrapper, { borderColor }]}>
      <View style={inputStyles.iconCol}>
        <Ionicons name={icon as any} size={16} color={focused ? GOLD : '#4A3520'} />
      </View>
      <View style={inputStyles.fieldArea}>
        <Animated.Text style={[inputStyles.floatLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]}>
          {label}
        </Animated.Text>
        <TextInput
          style={inputStyles.input}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholderTextColor="transparent"
          secureTextEntry={secureTextEntry && !showPass}
          {...props}
        />
      </View>
      {secureTextEntry && (
        <TouchableOpacity onPress={() => setShowPass(s => !s)} style={inputStyles.eyeBtn}>
          <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={16} color="#4A3520" />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const inputStyles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: FIELD_BG,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    marginBottom: 12,
    minHeight: 58,
  },
  iconCol: {
    paddingHorizontal: 14,
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
    height: 24,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingTop: 10,
  },
});

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Email and password are required.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Toast.show({ type: 'error', text1: 'Invalid Email', text2: 'Please enter a valid email address.' });
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      router.replace('/(tabs)');
    } catch (err: any) {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Background orbs */}
        <View style={styles.orbTopRight} />
        <View style={styles.orbBottomLeft} />

        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/welcome')}>
          <View style={styles.backBtnIcon}>
            <Ionicons name="arrow-back" size={14} color={Colors.textMuted} />
          </View>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <Animated.View style={[styles.header, { opacity: cardAnim }]}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Ionicons name="library" size={22} color={Colors.primary} />
            </View>
            <Text style={styles.logoText}>UniVault</Text>
          </View>
          <Text style={styles.tagline}>Your collaborative study space</Text>
        </Animated.View>

        {/* Card */}
        <Animated.View style={[styles.card, { opacity: cardAnim, transform: [{ translateY: cardRise }] }]}>
          {/* Card top accent bar */}
          <View style={styles.cardAccentBar} />

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue learning</Text>

          <View style={styles.divider} />

          <FloatingLabelInput
            label="Email Address"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
          />
          <FloatingLabelInput
            label="Password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              onPressIn={() => Animated.spring(btnScale, { toValue: 0.97, friction: 5, tension: 200, useNativeDriver: true }).start()}
              onPressOut={() => Animated.spring(btnScale, { toValue: 1, friction: 4, tension: 200, useNativeDriver: true }).start()}
              activeOpacity={1}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : (
                  <View style={styles.btnInner}>
                    <Text style={styles.buttonText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 8 }} />
                  </View>
                )
              }
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity><Text style={styles.link}>Register</Text></TouchableOpacity>
            </Link>
          </View>
        </Animated.View>

        {/* Bottom tagline */}
        <Animated.Text style={[styles.bottomNote, { opacity: cardAnim }]}>
          Secure · Private · Built for students
        </Animated.Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0E0703' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg, paddingTop: Spacing.xl },
  orbTopRight: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    top: -80,
    right: -80,
    backgroundColor: `${Colors.primary}20`,
  },
  orbBottomLeft: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    bottom: 40,
    left: -80,
    backgroundColor: `${GOLD}10`,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  backBtnIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1C1008',
    borderWidth: 1,
    borderColor: '#2E1A0A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  logoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1C0A04',
    borderWidth: 1,
    borderColor: `${Colors.primary}40`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 26, fontWeight: '900', color: Colors.text, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: Colors.textMuted, letterSpacing: 0.2 },
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
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 4, marginTop: 4 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 0 },
  divider: { height: 1, backgroundColor: '#1E1008', marginVertical: 16 },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
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
  },
});