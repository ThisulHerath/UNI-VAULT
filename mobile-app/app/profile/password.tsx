import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function PasswordScreen() {
  const [formData, setFormData] = useState({ current: '', newPassword: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (formData.newPassword !== formData.confirm) {
        return Toast.show({ type: 'error', text1: 'Passwords do not match' });
    }
    setLoading(true);
    try {
      // Simulate update API call
      await new Promise(resolve => setTimeout(resolve, 800));
      Toast.show({ type: 'success', text1: 'Password Changed Successfully' });
      router.back();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Change Password</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Current Password</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            value={formData.current}
            onChangeText={(t) => setFormData({ ...formData, current: t })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            value={formData.newPassword}
            onChangeText={(t) => setFormData({ ...formData, newPassword: t })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Confirm New Password</Text>
          <TextInput
            style={styles.input}
            placeholder="********"
            placeholderTextColor={Colors.textMuted}
            secureTextEntry
            value={formData.confirm}
            onChangeText={(t) => setFormData({ ...formData, confirm: t })}
          />
        </View>

        <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>Update Password</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  content: { padding: Spacing.md },
  formGroup: { marginBottom: Spacing.md },
  label: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: Spacing.xs, fontWeight: '600' },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSizes.md },
  button: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg },
  buttonText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' }
});
