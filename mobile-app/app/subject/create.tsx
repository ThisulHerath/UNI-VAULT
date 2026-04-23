import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { subjectService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function CreateSubjectScreen() {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    department: '',
    semester: '',
  });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!formData.name || !formData.code) {
      return Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Name and Code are required.' });
    }

    setLoading(true);
    try {
      await subjectService.createSubject({
        name: formData.name,
        code: formData.code,
        department: formData.department,
        semester: formData.semester ? Number(formData.semester) : undefined,
      });
      Toast.show({ type: 'success', text1: 'Success', text2: 'Subject created successfully' });
      router.back();
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
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
        <Text style={styles.headerTitle}>Create Subject</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>Subject Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Data Structures"
            placeholderTextColor={Colors.textMuted}
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Subject Code *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. CS101"
            placeholderTextColor={Colors.textMuted}
            value={formData.code}
            onChangeText={(text) => setFormData({ ...formData, code: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Department</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Computer Science"
            placeholderTextColor={Colors.textMuted}
            value={formData.department}
            onChangeText={(text) => setFormData({ ...formData, department: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Semester (Number)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 1"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numeric"
            value={formData.semester}
            onChangeText={(text) => setFormData({ ...formData, semester: text })}
          />
        </View>

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]} 
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Create Subject</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: Spacing.md, 
    paddingTop: 56, 
    paddingBottom: Spacing.md, 
    backgroundColor: Colors.surface, 
    borderBottomWidth: 1, 
    borderBottomColor: Colors.border 
  },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  scrollContent: { padding: Spacing.md },
  formGroup: { marginBottom: Spacing.md },
  label: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: Spacing.xs, fontWeight: '600' },
  input: { 
    backgroundColor: Colors.surface, 
    borderWidth: 1, 
    borderColor: Colors.border, 
    borderRadius: Radius.md, 
    padding: Spacing.md, 
    color: Colors.text, 
    fontSize: FontSizes.md 
  },
  button: { 
    backgroundColor: Colors.primary, 
    padding: Spacing.md, 
    borderRadius: Radius.md, 
    alignItems: 'center', 
    marginTop: Spacing.lg 
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#FFFFFF', fontSize: FontSizes.md, fontWeight: '700' }
});
