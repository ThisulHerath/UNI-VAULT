import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { requestService, subjectService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function CreateRequestScreen() {
  const [title, setTitle]     = useState('');
  const [desc, setDesc]       = useState('');
  const [subject, setSubject] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { subjectService.getSubjects().then(r => setSubjects(r.data || [])).catch(() => {}); }, []);

  const handleCreate = async () => {
    if (!title.trim()) { Toast.show({ type: 'error', text1: 'Title is required' }); return; }
    setLoading(true);
    try {
      await requestService.createRequest({ title: title.trim(), description: desc.trim(), subject: subject?._id || undefined });
      Toast.show({ type: 'success', text1: '✅ Request posted!' });
      router.replace('/(tabs)/requests');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed', text2: e.message });
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.pageTitle}>New Request</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>What do you need? *</Text>
        <TextInput style={styles.input} placeholder="e.g. Past paper for CS3012" placeholderTextColor={Colors.textMuted} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Details</Text>
        <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]} placeholder="Any extra details..." placeholderTextColor={Colors.textMuted} value={desc} onChangeText={setDesc} multiline />

        <Text style={styles.label}>Subject (optional)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
          {subjects.map(s => (
            <TouchableOpacity key={s._id} style={[styles.chip, subject?._id === s._id && styles.chipActive]} onPress={() => setSubject(subject?._id === s._id ? null : s)}>
              <Text style={[styles.chipText, subject?._id === s._id && { color: Colors.text }]}>{s.code || s.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.65 }]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.btnText}>Post Request</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  topBar:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 54, paddingBottom: Spacing.md },
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text },
  form:      { padding: Spacing.md },
  label:     { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: '600', marginBottom: 6, marginTop: Spacing.sm },
  input:     { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  chip:      { backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  chipActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:  { color: Colors.textMuted, fontWeight: '600', fontSize: FontSizes.sm },
  btn:       { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  btnText:   { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
});

