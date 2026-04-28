import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { authService } from '../../services/authService';

const C = {
  bg: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  text: '#0F172A',
  textMuted: '#64748B',
  textDim: '#94A3B8',
  placeholder: '#94A3B8',
  inputBg: '#F1F5F9',
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F59E0B',
};

type Field = { key: 'current' | 'newPassword' | 'confirm'; label: string; hint?: string };

const FIELDS: Field[] = [
  { key: 'current', label: 'Current Password', hint: undefined },
  { key: 'newPassword', label: 'New Password', hint: 'At least 6 characters' },
  { key: 'confirm', label: 'Confirm New Password' },
];

function getStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: 'transparent' };
  if (pw.length < 6) return { level: 1, label: 'Too short', color: C.error };
  if (pw.length < 8) return { level: 2, label: 'Weak', color: C.warning };
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum   = /[0-9]/.test(pw);
  const hasSym   = /[^A-Za-z0-9]/.test(pw);
  const extras   = [hasUpper, hasNum, hasSym].filter(Boolean).length;
  if (extras === 0) return { level: 2, label: 'Weak', color: C.warning };
  if (extras === 1) return { level: 3, label: 'Fair', color: C.warning };
  if (extras === 2) return { level: 4, label: 'Strong', color: C.success };
  return { level: 5, label: 'Very Strong', color: C.success };
}

export default function PasswordScreen() {
  const [formData, setFormData] = useState({ current: '', newPassword: '', confirm: '' });
  const [showMap, setShowMap]   = useState({ current: false, newPassword: false, confirm: false });
  const [loading, setLoading]   = useState(false);
  const [focused, setFocused]   = useState<string | null>(null);

  const strength = getStrength(formData.newPassword);
  const matches  = formData.confirm.length > 0 && formData.newPassword === formData.confirm;
  const mismatch = formData.confirm.length > 0 && formData.newPassword !== formData.confirm;

  const handleSave = async () => {
    if (!formData.current || !formData.newPassword || !formData.confirm)
      return Toast.show({ type: 'error', text1: 'All fields are required' });
    if (formData.newPassword.length < 6)
      return Toast.show({ type: 'error', text1: 'New password must be at least 6 characters' });
    if (formData.newPassword !== formData.confirm)
      return Toast.show({ type: 'error', text1: 'Passwords do not match' });
    if (formData.current === formData.newPassword)
      return Toast.show({ type: 'error', text1: 'Must be different from current password' });

    setLoading(true);
    try {
      await authService.updatePassword(formData.current, formData.newPassword);
      Toast.show({ type: 'success', text1: 'Password Changed Successfully' });
      router.back();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setLoading(false);
    }
  };

  const toggle = (key: string) =>
    setShowMap(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }));

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Change Password</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Security banner */}
        <View style={s.banner}>
          <View style={s.bannerIcon}>
            <Ionicons name="shield-checkmark" size={20} color={C.primary} />
          </View>
          <Text style={s.bannerText}>Use a strong, unique password to keep your account safe.</Text>
        </View>

        {/* Fields */}
        {FIELDS.map((field) => {
          const isFocused = focused === field.key;
          const showPw    = showMap[field.key as keyof typeof showMap];
          const isConfirm = field.key === 'confirm';
          const isNew     = field.key === 'newPassword';

          const borderColor = isFocused
            ? C.primary + '90'
            : isConfirm && matches
              ? C.success + '70'
              : isConfirm && mismatch
                ? C.error + '70'
                : C.border;

          return (
            <View key={field.key} style={s.fieldWrap}>
              <View style={s.labelRow}>
                <Text style={s.fieldLabel}>{field.label}</Text>
                {field.hint && <Text style={s.fieldHint}>{field.hint}</Text>}
              </View>

              <View style={[s.inputRow, { borderColor }]}>
                <View style={s.inputIconWrap}>
                  <Ionicons
                    name={isConfirm && matches ? 'checkmark-circle' : isConfirm && mismatch ? 'close-circle' : 'lock-closed-outline'}
                    size={17}
                    color={isConfirm && matches ? C.success : isConfirm && mismatch ? C.error : isFocused ? C.primary : C.textDim}
                  />
                </View>
                <TextInput
                  style={s.input}
                  placeholder="••••••••"
                  placeholderTextColor={C.placeholder}
                  secureTextEntry={!showPw}
                  value={formData[field.key]}
                  onChangeText={(t) => setFormData({ ...formData, [field.key]: t })}
                  onFocus={() => setFocused(field.key)}
                  onBlur={() => setFocused(null)}
                  autoCapitalize="none"
                />
                <TouchableOpacity style={s.eyeBtn} onPress={() => toggle(field.key)}>
                  <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.textDim} />
                </TouchableOpacity>
              </View>

              {/* Strength bar for new password */}
              {isNew && formData.newPassword.length > 0 && (
                <View style={s.strengthWrap}>
                  <View style={s.strengthBar}>
                    {[1, 2, 3, 4, 5].map((seg) => (
                      <View
                        key={seg}
                        style={[
                          s.strengthSeg,
                          { backgroundColor: seg <= strength.level ? strength.color : C.border },
                        ]}
                      />
                    ))}
                  </View>
                  <Text style={[s.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Update button */}
        <TouchableOpacity
          style={[s.updateBtn, loading && { opacity: 0.65 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[C.primaryLight, C.primary]} style={s.updateBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Ionicons name="lock-closed" size={17} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.updateBtnText}>Update Password</Text>
                </>
              )
            }
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },

  header:         {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 58, paddingBottom: 14,
    backgroundColor: C.surface, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn:        { width: 36, height: 36, borderRadius: 10, backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, justifyContent: 'center', alignItems: 'center' },
  headerTitle:    { fontSize: 18, fontWeight: '800', color: C.text, letterSpacing: 0.2 },

  content:        { padding: 20, paddingBottom: 50 },

  // Banner
  banner:         { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary + '10', borderWidth: 1, borderColor: C.primary + '30', borderRadius: 12, padding: 14, marginBottom: 24, gap: 12 },
  bannerIcon:     { width: 36, height: 36, borderRadius: 10, backgroundColor: C.primary + '15', justifyContent: 'center', alignItems: 'center' },
  bannerText:     { flex: 1, fontSize: 13, color: C.textMuted, lineHeight: 18 },

  // Fields
  fieldWrap:      { marginBottom: 16 },
  labelRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  fieldLabel:     { fontSize: 12, color: C.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldHint:      { fontSize: 11, color: C.textDim },
  inputRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderWidth: 1, borderRadius: 12, borderColor: C.border },
  inputIconWrap:  { width: 44, justifyContent: 'center', alignItems: 'center' },
  input:          { flex: 1, paddingVertical: 14, fontSize: 16, color: C.text, letterSpacing: 1 },
  eyeBtn:         { width: 44, justifyContent: 'center', alignItems: 'center', paddingVertical: 14 },

  // Strength
  strengthWrap:   { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
  strengthBar:    { flex: 1, flexDirection: 'row', gap: 4 },
  strengthSeg:    { flex: 1, height: 3, borderRadius: 2 },
  strengthLabel:  { fontSize: 12, fontWeight: '700', minWidth: 70, textAlign: 'right' },

  // Buttons
  updateBtn:      { borderRadius: 14, overflow: 'hidden', marginTop: 24 },
  updateBtnGrad:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15 },
  updateBtnText:  { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  cancelBtn:      { alignItems: 'center', paddingVertical: 14 },
  cancelBtnText:  { color: C.textMuted, fontSize: 14, fontWeight: '600' },
});