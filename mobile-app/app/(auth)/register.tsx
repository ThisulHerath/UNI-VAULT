import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

// ─── Defined OUTSIDE RegisterScreen so React never remounts it on re-renders ──
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
  returnKeyType?: any;
}

function FormField({ label, value, onChangeText, ...props }: FieldProps) {
  return (
    <View style={{ marginBottom: Spacing.sm }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={Colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        {...props}
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '', university: '', batch: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (field: keyof typeof form) => (value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        <View style={styles.header}>
          <Text style={styles.logo}>📚 UniVault</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Join UniVault</Text>

          <FormField label="Full Name *"        value={form.name}            onChangeText={update('name')}            placeholder="Your full name"               autoCapitalize="words" />
          <FormField label="Email *"            value={form.email}           onChangeText={update('email')}           placeholder="student@university.edu"       keyboardType="email-address" autoCapitalize="none" />
          <FormField label="Password *"         value={form.password}        onChangeText={update('password')}        placeholder="Min 6 characters"             secureTextEntry />
          <FormField label="Confirm Password *" value={form.confirmPassword} onChangeText={update('confirmPassword')} placeholder="Re-enter password"            secureTextEntry />
          <FormField label="University"         value={form.university}      onChangeText={update('university')}      placeholder="e.g. University of Moratuwa" />
          <FormField label="Batch / Intake"     value={form.batch}           onChangeText={update('batch')}           placeholder="e.g. SE2022"                  autoCapitalize="characters" />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={Colors.text} />
              : <Text style={styles.buttonText}>Create Account</Text>
            }
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity><Text style={styles.link}>Sign In</Text></TouchableOpacity>
            </Link>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: Colors.background },
  scroll:         { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  header:         { alignItems: 'center', marginBottom: Spacing.lg },
  logo:           { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  tagline:        { fontSize: FontSizes.md, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title:          { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  label:          { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: 4, fontWeight: '600' },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  buttonDisabled: { opacity: 0.65 },
  buttonText:     { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  footer:         { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText:     { color: Colors.textMuted, fontSize: FontSizes.sm },
  link:           { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.sm },
});
