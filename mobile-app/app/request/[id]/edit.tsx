import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

import { requestService } from '../../../services/dataServices';
import { useAuth } from '../../../context/AuthContext';
import { Colors, FontSizes, Spacing, Radius } from '../../../constants/theme';

export default function EditRequestScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    const loadRequest = async () => {
      try {
        const res = await requestService.getRequestById(id as string);
        const item = res.data;
        setTitle(item?.title || '');
        setDescription(item?.description || '');

        const ownerId = item?.requestedBy?._id || item?.requestedBy;
        const allowed = !!user && (user.role === 'admin' || ownerId?.toString() === user._id);
        setCanManage(allowed);
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Error', text2: e.message });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadRequest();
    }
  }, [id, user]);

  const handleSave = async () => {
    if (!title.trim()) {
      Toast.show({ type: 'error', text1: 'Title is required' });
      return;
    }

    try {
      setSaving(true);
      await requestService.updateRequest(id as string, {
        title: title.trim(),
        description: description.trim(),
      });
      Toast.show({ type: 'success', text1: 'Request updated' });
      router.replace(`/request/${id}`);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!canManage) {
    return (
      <View style={styles.center}>
        <Text style={styles.notAllowedText}>You are not allowed to edit this request.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      contentContainerStyle={{ paddingBottom: Spacing.lg }}
    >
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Edit Request</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Past paper for CS3012"
          placeholderTextColor={Colors.textMuted}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Details</Text>
        <TextInput
          style={[styles.input, styles.descriptionInput]}
          placeholder="Any extra details..."
          placeholderTextColor={Colors.textMuted}
          value={description}
          onChangeText={setDescription}
          multiline
        />

        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.btnText}>Save Changes</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, padding: Spacing.md },
  notAllowedText: { color: Colors.textMuted, fontSize: FontSizes.md, textAlign: 'center' },
  backButton: { marginTop: Spacing.md, backgroundColor: Colors.primary, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  backButtonText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '700' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 54, paddingBottom: Spacing.md },
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text },
  form: { padding: Spacing.md },
  label: { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: '600', marginBottom: 6, marginTop: Spacing.sm },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  descriptionInput: { height: 120, textAlignVertical: 'top' },
  btn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  btnText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
});
