import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { noteService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { SUBJECT_CATALOG } from '../../constants/subject-catalog';

const MAX_NOTE_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_NOTE_FILE_SIZE_MB = 15;
const ALLOWED_NOTE_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const formatFileSize = (bytes?: number) => {
  if (!bytes && bytes !== 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isAllowedNoteFile = (mimeType?: string, fileName?: string) => {
  if (mimeType && ALLOWED_NOTE_MIME_TYPES.has(mimeType)) {
    return true;
  }

  const extension = fileName?.split('.').pop()?.toLowerCase();
  return extension ? ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'docx'].includes(extension) : false;
};

export default function UploadNoteScreen() {
  const [title, setTitle]       = useState('');
  const [desc,  setDesc]        = useState('');
  const [tags,  setTags]        = useState('');
  const [file,  setFile]        = useState<any>(null);
  const [subject, setSubject]   = useState<{ code: string; name: string } | null>(null);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [otherSubject, setOtherSubject] = useState('');
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [loading, setLoading]   = useState(false);

  const normalizedQuery = subjectQuery.trim().toLowerCase();

  const exactMatchedSubject = SUBJECT_CATALOG.find((s) => {
    if (!normalizedQuery) return false;
    const code = (s.code || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    const combined = `${code} - ${name}`;
    return normalizedQuery === code || normalizedQuery === name || normalizedQuery === combined;
  }) || null;

  const allowOtherSubjectInput = !subject && !exactMatchedSubject;

  const filteredExistingSubjects = SUBJECT_CATALOG.filter((s) => {
    if (!normalizedQuery) return true;
    const code = (s.code || '').toLowerCase();
    const name = (s.name || '').toLowerCase();
    return code.includes(normalizedQuery) || name.includes(normalizedQuery);
  });

  const selectSubject = (item: { code: string; name: string }) => {
    setSubject(item);
    setSubjectQuery(item.name || item.code || '');
    setOtherSubject('');
    setSubjectDropdownOpen(false);
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*', 'application/msword',
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    const selectedFile = result.assets[0];
    if (!isAllowedNoteFile(selectedFile.mimeType, selectedFile.name)) {
      Toast.show({
        type: 'error',
        text1: 'Unsupported file type',
        text2: 'Only PDF, Word documents, JPG, PNG, GIF, and WEBP files are allowed.',
      });
      return;
    }

    if (selectedFile.size && selectedFile.size > MAX_NOTE_FILE_SIZE_BYTES) {
      Toast.show({
        type: 'error',
        text1: 'File too large',
        text2: `Maximum note size is ${MAX_NOTE_FILE_SIZE_MB} MB.`,
      });
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!title.trim()) { Toast.show({ type: 'error', text1: 'Title is required' }); return; }
    if (!file)         { Toast.show({ type: 'error', text1: 'Please select a file' }); return; }
    const noteOnlySubject = otherSubject.trim();
    if (!allowOtherSubjectInput && noteOnlySubject) {
      Toast.show({
        type: 'error',
        text1: 'Other subject is not allowed',
        text2: 'This subject already exists in the dropdown. Please select it instead.',
      });
      return;
    }
    if (!subject && !noteOnlySubject) {
      Toast.show({ type: 'error', text1: 'Please select a subject or enter a note-only subject' });
      return;
    }
    if (!isAllowedNoteFile(file.mimeType, file.name)) {
      Toast.show({
        type: 'error',
        text1: 'Unsupported file type',
        text2: 'Only PDF, Word documents, JPG, PNG, GIF, and WEBP files are allowed.',
      });
      return;
    }
    if (file.size && file.size > MAX_NOTE_FILE_SIZE_BYTES) {
      Toast.show({
        type: 'error',
        text1: 'File too large',
        text2: `Maximum note size is ${MAX_NOTE_FILE_SIZE_MB} MB.`,
      });
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', desc.trim());
      const selectedSubjectText = subject ? `${subject.code} - ${subject.name}` : '';
      formData.append('subjectText', selectedSubjectText || noteOnlySubject);
      formData.append('tags', tags.trim());
      formData.append('file', { uri: file.uri, type: file.mimeType || 'application/octet-stream', name: file.name } as any);

      await noteService.createNote(formData);
      Toast.show({ type: 'success', text1: '✅ Note uploaded successfully!' });
      router.replace('/(tabs)/notes');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: e.message });
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.pageTitle}>Upload Note</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} placeholder="Note title" placeholderTextColor={Colors.textMuted} value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]} placeholder="Brief description..." placeholderTextColor={Colors.textMuted} value={desc} onChangeText={setDesc} multiline />

        <Text style={styles.label}>Subject *</Text>
        <View style={styles.subjectBox}>
          <View style={styles.subjectSearchRow}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.subjectSearchInput}
              placeholder="Search or type subject code/name"
              placeholderTextColor={Colors.textMuted}
              value={subjectQuery}
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
              <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={styles.dropdownScroll} contentContainerStyle={styles.dropdownScrollContent}>
                <Text style={styles.dropdownSectionTitle}>Available Subjects</Text>
                {filteredExistingSubjects.slice(0, 20).map((s) => (
                  <TouchableOpacity key={s.code} style={styles.dropdownItem} onPress={() => selectSubject(s)}>
                    <Text style={styles.dropdownItemTitle}>{s.name || s.code}</Text>
                    {!!s.code && <Text style={styles.dropdownItemSub}>{s.code}</Text>}
                  </TouchableOpacity>
                ))}
                {filteredExistingSubjects.length === 0 && (
                  <Text style={styles.noSubject}>No existing subjects found.</Text>
                )}
              </ScrollView>
            </View>
          )}
        </View>

        <Text style={styles.label}>Other subject for this note</Text>
        <TextInput
          style={[styles.input, !allowOtherSubjectInput && styles.inputDisabled]}
          placeholder="Type a subject name for this note only"
          placeholderTextColor={Colors.textMuted}
          value={otherSubject}
          editable={allowOtherSubjectInput}
          onFocus={() => {
            if (!allowOtherSubjectInput) {
              Toast.show({
                type: 'info',
                text1: 'Select from dropdown',
                text2: 'You can add another subject only when no matching subject exists.',
              });
            }
          }}
          onChangeText={(text) => {
            setOtherSubject(text);
            if (text.trim()) {
              setSubject(null);
              setSubjectQuery(text);
            }
          }}
        />
        <Text style={styles.fileHint}>
          {allowOtherSubjectInput
            ? 'Use this only if the subject is not in the dropdown. It will stay with this note only.'
            : 'This subject already exists in the dropdown. Please select it from search.'}
        </Text>

        <Text style={styles.label}>Tags (comma separated)</Text>
        <TextInput style={styles.input} placeholder="e.g. java, oop, midterm" placeholderTextColor={Colors.textMuted} value={tags} onChangeText={setTags} />

        <Text style={styles.label}>File *</Text>
        <TouchableOpacity style={styles.filePicker} onPress={pickFile}>
          <Ionicons name="attach-outline" size={22} color={Colors.primary} />
          <Text style={styles.filePickerText} numberOfLines={1}>
            {file ? file.name : 'Tap to select PDF, Image, or DOCX'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.fileHint}>
          PDF, Word docs, and images only. Max {MAX_NOTE_FILE_SIZE_MB} MB.
          {file ? ` Selected: ${formatFileSize(file.size)}.` : ''}
        </Text>

        <TouchableOpacity style={[styles.uploadBtn, loading && { opacity: 0.65 }]} onPress={handleUpload} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.text} /> : <>
            <Ionicons name="cloud-upload-outline" size={20} color={Colors.text} />
            <Text style={styles.uploadBtnText}>Upload to MongoDB</Text>
          </>}
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  topBar:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 54, paddingBottom: Spacing.md },
  pageTitle:       { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text },
  form:            { padding: Spacing.md },
  label:           { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: '600', marginBottom: 6, marginTop: Spacing.sm },
  input:           { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  inputDisabled:   { opacity: 0.6 },
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
  filePicker:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', gap: 10, marginBottom: Spacing.lg },
  filePickerText:  { color: Colors.textMuted, flex: 1, fontSize: FontSizes.sm },
  fileHint:        { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: -Spacing.sm, marginBottom: Spacing.md },
  uploadBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, gap: 8 },
  uploadBtnText:   { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
});

