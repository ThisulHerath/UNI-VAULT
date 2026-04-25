import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { requestService, subjectService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { SUBJECT_CATALOG, SubjectCatalogItem } from '../../constants/subject-catalog';

export default function CreateRequestScreen() {
  const [title, setTitle]     = useState('');
  const [desc, setDesc]       = useState('');
  const [subject, setSubject] = useState<SubjectCatalogItem | null>(null);
  const [subjectIdByCode, setSubjectIdByCode] = useState<Record<string, string>>({});
  const [subjectQuery, setSubjectQuery] = useState('');
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { 
    subjectService
      .getSubjects()
      .then((r) => {
        const subjectMap: Record<string, string> = {};
        (r.data || []).forEach((item: any) => {
          if (item?.code && item?._id) {
            subjectMap[item.code] = item._id;
          }
        });
        setSubjectIdByCode(subjectMap);
      })
      .catch(() => {
        Toast.show({
          type: 'error',
          text1: 'Subjects unavailable',
          text2: 'Using local subject list. Request will still be posted.',
        });
      }); 
  }, []);

  const normalizedQuery = subjectQuery.trim().toLowerCase();
  const filteredSubjects = SUBJECT_CATALOG.filter((s) => {
    if (!normalizedQuery) return true;
    const code = (s.code || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    return code.includes(normalizedQuery) || name.includes(normalizedQuery);
  });

  const selectSubject = (item: SubjectCatalogItem) => {
    setSubject(item);
    setSubjectQuery(item.name || item.code || '');
    setSubjectDropdownOpen(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) { Toast.show({ type: 'error', text1: 'Title is required' }); return; }
    setLoading(true);
    try {
      const selectedSubjectId = subject?.code ? subjectIdByCode[subject.code] : undefined;
      await requestService.createRequest({
        title: title.trim(),
        description: desc.trim(),
        subject: selectedSubjectId || undefined,
      });
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
        <View style={styles.subjectBox}>
          <View style={styles.subjectSearchRow}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.subjectSearchInput}
              placeholder="Search subject code/name"
              placeholderTextColor={Colors.textMuted}
              value={subjectQuery}
              editable={!subject}
              onFocus={() => setSubjectDropdownOpen(true)}
              onChangeText={(text) => {
                setSubjectQuery(text);
                setSubjectDropdownOpen(true);
              }}
            />
            <TouchableOpacity onPress={() => setSubjectDropdownOpen((prev) => !prev)}>
              <Ionicons name={subjectDropdownOpen ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {!!subject && (
            <View style={styles.selectedSubjectRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedSubjectText}>{subject.name || subject.code}</Text>
                {!!subject.code && !!subject.name && <Text style={styles.selectedSubjectSubText}>{subject.code}</Text>}
              </View>
              <TouchableOpacity onPress={() => { setSubject(null); setSubjectQuery(''); }}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {subjectDropdownOpen && (
            <View style={styles.dropdownList}>
              <ScrollView
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
                style={styles.dropdownScroll}
                contentContainerStyle={styles.dropdownScrollContent}
              >
                <Text style={styles.dropdownSectionTitle}>Available Subjects</Text>
                {filteredSubjects.slice(0, 20).map((s) => (
                  <TouchableOpacity key={s.code} style={styles.dropdownItem} onPress={() => selectSubject(s)}>
                    <Text style={styles.dropdownItemTitle}>{s.name || s.code}</Text>
                    {!!s.code && <Text style={styles.dropdownItemSub}>{s.code}</Text>}
                  </TouchableOpacity>
                ))}
                {filteredSubjects.length === 0 && (
                  <Text style={styles.noSubject}>No subjects found.</Text>
                )}
              </ScrollView>
            </View>
          )}
        </View>

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
  subjectBox:      { marginBottom: Spacing.md },
  subjectSearchRow:{
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.sm,
    gap: 6,
  },
  subjectSearchInput: { flex: 1, color: Colors.text, fontSize: FontSizes.md, paddingVertical: Spacing.sm },
  selectedSubjectRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.xs, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  selectedSubjectText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  selectedSubjectSubText: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  dropdownList: { marginTop: Spacing.xs, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 0, maxHeight: 340, overflow: 'hidden' },
  dropdownScroll: { maxHeight: 340 },
  dropdownScrollContent: { padding: Spacing.sm },
  dropdownSectionTitle: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: '700', marginBottom: 6 },
  dropdownItem: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 8, marginBottom: 6, backgroundColor: Colors.surfaceAlt },
  dropdownItemTitle: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '600' },
  dropdownItemSub: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  noSubject:       { color: Colors.textMuted, fontSize: FontSizes.sm, padding: 8 },
  btn:       { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm },
  btnText:   { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
});

