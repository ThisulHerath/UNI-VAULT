import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { subjectService } from '../../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../../constants/theme';

export default function EditSubjectScreen() {
  const { id } = useLocalSearchParams();
  const [formData, setFormData] = useState({ name: '', code: '', department: '', semester: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await subjectService.getSubjectById(id as string);
        const s = res.data;
        setFormData({
          name: s.name || '',
          code: s.code || '',
          department: s.department || '',
          semester: s.semester ? String(s.semester) : '',
        });
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Error', text2: e.message });
        router.back();
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      return Toast.show({ type: 'error', text1: 'Validation', text2: 'Name and code are required.' });
    }
    setSaving(true);
    try {
      await subjectService.updateSubject(id as string, {
        name: formData.name,
        code: formData.code,
        department: formData.department,
        semester: formData.semester ? Number(formData.semester) : undefined,
      });
      Toast.show({ type: 'success', text1: 'Saved', text2: 'Subject updated.' });
      router.push(`/subject/${id}`);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Subject', 'Are you sure you want to delete this subject?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: confirmDelete },
    ]);
  };

  const confirmDelete = async () => {
    setSaving(true);
    try {
      await subjectService.deleteSubject(id as string);
      Toast.show({ type: 'success', text1: 'Deleted', text2: 'Subject removed.' });
      router.replace('/subjects');
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
        <Text style={styles.headerTitle}>Edit Subject</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Subject Name *</Text>
          <TextInput style={styles.input} value={formData.name} onChangeText={(t) => setFormData({ ...formData, name: t })} placeholder="e.g. Data Structures" placeholderTextColor={Colors.textMuted} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Subject Code *</Text>
          <TextInput style={styles.input} value={formData.code} onChangeText={(t) => setFormData({ ...formData, code: t })} placeholder="e.g. CS101" placeholderTextColor={Colors.textMuted} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Department</Text>
          <TextInput style={styles.input} value={formData.department} onChangeText={(t) => setFormData({ ...formData, department: t })} placeholder="e.g. Computer Science" placeholderTextColor={Colors.textMuted} />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Semester (Number)</Text>
          <TextInput style={styles.input} keyboardType="numeric" value={formData.semester} onChangeText={(t) => setFormData({ ...formData, semester: t })} placeholder="e.g. 1" placeholderTextColor={Colors.textMuted} />
        </View>

        <TouchableOpacity style={[styles.button, saving && styles.buttonDisabled]} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>Save Changes</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.deleteButton, saving && styles.buttonDisabled]} onPress={handleDelete} disabled={saving}>
          <Text style={styles.deleteText}>Delete Subject</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  scrollContent: { padding: Spacing.md },
  formGroup: { marginBottom: Spacing.md },
  label: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: Spacing.xs, fontWeight: '600' },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSizes.md },
  button: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '700' },
  deleteButton: { marginTop: Spacing.md, alignItems: 'center' },
  deleteText: { color: '#ff4d4f', fontWeight: '700' }
});
