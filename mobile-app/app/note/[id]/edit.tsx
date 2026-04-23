import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { noteService } from '../../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../../constants/theme';

export default function EditNoteScreen() {
  const { id } = useLocalSearchParams();
  const [formData, setFormData] = useState({ title: '', description: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await noteService.getNoteById(id as string);
        if (res.data) {
          setFormData({
            title: res.data.title || '',
            description: res.data.description || ''
          });
        }
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Error Fetching Note', text2: e.message });
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const handleSave = async () => {
    if (!formData.title) return Toast.show({ type: 'error', text1: 'Title is required' });
    setSaving(true);
    try {
      await noteService.updateNote(id as string, formData);
      Toast.show({ type: 'success', text1: 'Note Updated' });
      router.back();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Edit Note</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Note Title"
            placeholderTextColor={Colors.textMuted}
            value={formData.title}
            onChangeText={(t) => setFormData({ ...formData, title: t })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            placeholder="Add some details..."
            placeholderTextColor={Colors.textMuted}
            multiline
            value={formData.description}
            onChangeText={(t) => setFormData({ ...formData, description: t })}
          />
        </View>

        <TouchableOpacity style={[styles.button, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  content: { padding: Spacing.md },
  formGroup: { marginBottom: Spacing.md },
  label: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: Spacing.xs, fontWeight: '600' },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSizes.md },
  button: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg },
  buttonText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' }
});
