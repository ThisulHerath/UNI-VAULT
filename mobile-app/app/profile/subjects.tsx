import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, TextInput, KeyboardAvoidingView, Platform, Modal, FlatList,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { subjectService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function ManageSubjectsScreen() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', department: '', semester: '' });
  const [saving, setSaving] = useState(false);

  const loadSubjects = async () => {
    try {
      const res = await subjectService.getMySubjects();
      setSubjects(res.data || []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error Loading Subjects', text2: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const resetForm = () => {
    setFormData({ name: '', code: '', department: '', semester: '' });
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (subject: any) => {
    setFormData({
      name: subject.name || '',
      code: subject.code || '',
      department: subject.department || '',
      semester: subject.semester ? String(subject.semester) : '',
    });
    setEditingId(subject._id);
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.code) {
      Toast.show({ type: 'error', text1: 'Validation', text2: 'Name and code are required.' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        code: formData.code,
        department: formData.department,
        semester: formData.semester ? Number(formData.semester) : undefined,
      };

      if (editingId) {
        await subjectService.updateSubject(editingId, payload);
        Toast.show({ type: 'success', text1: 'Updated', text2: 'Subject updated successfully.' });
      } else {
        await subjectService.createSubject(payload);
        Toast.show({ type: 'success', text1: 'Created', text2: 'Subject created successfully.' });
      }

      setShowAddModal(false);
      resetForm();
      loadSubjects();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (subject: any) => {
    Alert.alert(
      'Delete Subject',
      `Are you sure you want to delete "${subject.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await subjectService.deleteSubject(subject._id);
              Toast.show({ type: 'success', text1: 'Deleted', text2: 'Subject removed.' });
              loadSubjects();
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Error', text2: e.message });
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Subjects</Text>
        <TouchableOpacity onPress={openAddModal} style={{ marginLeft: 'auto' }}>
          <Ionicons name="add-circle" size={28} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={subjects}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.code || '??'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{item.name}</Text>
                {item.department && <Text style={styles.meta}>{item.department}</Text>}
                {item.semester && <Text style={styles.meta}>Semester {item.semester}</Text>}
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color="#ff4d4f" />
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="layers-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No Custom Subjects</Text>
            <Text style={styles.emptyDesc}>Create your first subject to get started</Text>
          </View>
        }
      />

      <Modal visible={showAddModal} transparent animationType="slide" onRequestClose={() => setShowAddModal(false)}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalOverlay} onTouchEnd={() => setShowAddModal(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Text style={styles.modalClose}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Subject' : 'New Subject'}</Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text style={[styles.modalClose, { color: Colors.primary, fontWeight: '700' }]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm} keyboardShouldPersistTaps="handled">
              <View style={styles.formGroup}>
                <Text style={styles.label}>Subject Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Introduction to Programming"
                  placeholderTextColor={Colors.textMuted}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  editable={!saving}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Subject Code *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. CS101"
                  placeholderTextColor={Colors.textMuted}
                  value={formData.code}
                  onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
                  editable={!saving}
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
                  editable={!saving}
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
                  editable={!saving}
                />
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  listContent: { padding: Spacing.md },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardContent: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: Spacing.sm },
  badge: {
    backgroundColor: Colors.primary + '20',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    marginRight: Spacing.md,
    minWidth: 52,
    alignItems: 'center',
  },
  badgeText: { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.sm },
  title: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  meta: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: { alignItems: 'center', paddingVertical: 60, marginTop: 40 },
  emptyTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginTop: Spacing.md },
  emptyDesc: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: Spacing.xs },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalOverlay: { flex: 1 },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalClose: { fontSize: FontSizes.md, color: Colors.textMuted },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  modalForm: { padding: Spacing.md },
  formGroup: { marginBottom: Spacing.lg },
  label: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: Spacing.xs, fontWeight: '600' },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    color: Colors.text,
    fontSize: FontSizes.md,
  },
});
