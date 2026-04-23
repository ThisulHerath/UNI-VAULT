import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

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
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>📚 UniVault</Text>
          <Text style={styles.tagline}>Your collaborative study space</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor={Colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
          />

          <TouchableOpacity style={[styles.button, loading && styles.buttonDisabled]} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color={Colors.text} />
              : <Text style={styles.buttonText}>Sign In</Text>
            }
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/(auth)/register" asChild>
              <TouchableOpacity><Text style={styles.link}>Register</Text></TouchableOpacity>
            </Link>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.background },
  scroll:     { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  header:     { alignItems: 'center', marginBottom: Spacing.xl },
  logo:       { fontSize: FontSizes.xxxl, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  tagline:    { fontSize: FontSizes.md, color: Colors.textMuted },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title:    { fontSize: FontSizes.xxl, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  subtitle: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: Spacing.lg },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
    marginBottom: Spacing.sm,
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
  buttonText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  footer:     { flexDirection: 'row', justifyContent: 'center', marginTop: Spacing.lg },
  footerText: { color: Colors.textMuted, fontSize: FontSizes.sm },
  link:       { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.sm },
});

