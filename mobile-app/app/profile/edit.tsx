import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';

const C = {
  bg: '#F8FAFC',
  surface: '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  accent: '#8B5CF6',
  text: '#0F172A',
  textMuted: '#64748B',
  textDim: '#94A3B8',
  placeholder: '#94A3B8',
  inputBg: '#F8FAFC',
};

const resolveImageMimeType = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return 'image/jpeg';
};

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({ name: '', university: '', batch: '' });
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({ name: user.name || '', university: user.university || '', batch: user.batch || '' });
      setAvatarUri(user.avatar ? `${user.avatar}${user.avatar.includes('?') ? '&' : '?'}t=${Date.now()}` : null);
    }
  }, [user]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('university', formData.university);
      data.append('batch', formData.batch);
      if (avatarUri && !avatarUri.startsWith('http')) {
        const filename = avatarUri.split('/').pop() || 'avatar.jpg';
        const type = resolveImageMimeType(filename);
        data.append('avatar', { uri: avatarUri, name: filename, type } as any);
      }
      const res = await authService.updateProfile(data);
      if (res.success && res.data) {
        await updateUser(res.data);
        const hasAvatarFromBackend = !!res.data.avatar;
        Toast.show({
          type: 'success',
          text1: 'Profile Updated',
          text2: hasAvatarFromBackend
            ? 'Avatar uploaded and confirmed by server.'
            : 'Saved, but no avatar URL was returned by server.',
        });
        router.back();
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setLoading(false);
    }
  };

  const fields = [
    { key: 'name', label: 'Full Name', placeholder: 'John Doe', icon: 'person-outline' },
    { key: 'university', label: 'University', placeholder: 'e.g. University of Colombo', icon: 'business-outline' },
    { key: 'batch', label: 'Batch / Year', placeholder: 'e.g. SE2020', icon: 'calendar-outline' },
  ];

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Edit Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Avatar picker */}
        <View style={s.avatarSection}>
          <View style={s.avatarOuter}>
            <View style={s.avatarRing}>
              <TouchableOpacity onPress={pickImage} style={s.avatarTouch} activeOpacity={0.85}>
                {avatarUri
                  ? <Image source={{ uri: avatarUri }} style={s.avatarImg} />
                  : (
                    <LinearGradient colors={[C.primaryLight, C.primary, '#2563EB']} style={s.avatarImg}>
                      <Ionicons name="person" size={38} color="#fff" />
                    </LinearGradient>
                  )
                }
                {/* Camera overlay */}
                <View style={s.cameraOverlay}>
                  <Ionicons name="camera" size={18} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={s.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Form fields */}
        <View style={s.form}>
          {fields.map((field) => {
            const isFocused = focusedField === field.key;
            return (
              <View key={field.key} style={s.fieldWrap}>
                <Text style={s.fieldLabel}>{field.label}</Text>
                <View style={[s.inputRow, isFocused && s.inputRowFocused]}>
                  <View style={[s.inputIconWrap, isFocused && s.inputIconFocused]}>
                    <Ionicons name={field.icon as any} size={16} color={isFocused ? C.primary : C.textDim} />
                  </View>
                  <TextInput
                    style={s.input}
                    placeholder={field.placeholder}
                    placeholderTextColor={C.placeholder}
                    value={(formData as any)[field.key]}
                    onChangeText={(t) => setFormData({ ...formData, [field.key]: t })}
                    onFocus={() => setFocusedField(field.key)}
                    onBlur={() => setFocusedField(null)}
                  />
                  {(formData as any)[field.key]?.length > 0 && (
                    <Ionicons name="checkmark-circle" size={16} color={C.primary + '80'} style={{ marginRight: 12 }} />
                  )}
                </View>
              </View>
            );
          })}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveBtn, loading && { opacity: 0.65 }]}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          <LinearGradient colors={[C.primaryLight, C.primary]} style={s.saveBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : (
                <>
                  <Ionicons name="checkmark" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={s.saveBtnText}>Save Changes</Text>
                </>
              )
            }
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={s.cancelBtn} onPress={() => router.back()}>
          <Text style={s.cancelBtnText}>Discard Changes</Text>
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

  content:        { padding: 20, paddingBottom: 120 },

  // Avatar
  avatarSection:  { alignItems: 'center', marginTop: 8, marginBottom: 28 },
  avatarOuter:    { padding: 4, borderRadius: 58, borderWidth: 1.5, borderColor: C.primary + '50', borderStyle: 'dashed' },
  avatarRing:     { padding: 3, borderRadius: 54, borderWidth: 2, borderColor: C.primary + '40', backgroundColor: C.bg },
  avatarTouch:    { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', position: 'relative' },
  avatarImg:      { width: 96, height: 96, justifyContent: 'center', alignItems: 'center' },
  cameraOverlay:  {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 34,
    backgroundColor: '#00000088', justifyContent: 'center', alignItems: 'center',
  },
  avatarHint:     { fontSize: 12, color: C.textMuted, marginTop: 10, fontWeight: '500' },

  // Form
  form:           { gap: 4 },
  fieldWrap:      { marginBottom: 14 },
  fieldLabel:     { fontSize: 12, color: C.textMuted, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  inputRow:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: 12 },
  inputRowFocused:{ borderColor: C.primary + '80', backgroundColor: C.surface },
  inputIconWrap:  { width: 42, justifyContent: 'center', alignItems: 'center' },
  inputIconFocused:{},
  input:          { flex: 1, paddingVertical: 14, paddingRight: 12, fontSize: 15, color: C.text },

  // Buttons
  saveBtn:        { borderRadius: 14, overflow: 'hidden', marginTop: 28 },
  saveBtnGrad:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15 },
  saveBtnText:    { color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
  cancelBtn:      { alignItems: 'center', paddingVertical: 14 },
  cancelBtnText:  { color: C.textMuted, fontSize: 14, fontWeight: '600' },
});