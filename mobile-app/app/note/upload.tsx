import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import { noteService, subjectService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

const MAX_NOTE_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_NOTE_FILE_SIZE_MB = 15;
const ALLOWED_NOTE_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
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
  const [subject, setSubject]   = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    subjectService.getSubjects().then(r => setSubjects(r.data || [])).catch(() => {});
  }, []);

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
        text2: 'Only PDF, DOCX, JPG, PNG, GIF, and WEBP files are allowed.',
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
    if (!subject)      { Toast.show({ type: 'error', text1: 'Please select a subject' }); return; }
    if (!isAllowedNoteFile(file.mimeType, file.name)) {
      Toast.show({
        type: 'error',
        text1: 'Unsupported file type',
        text2: 'Only PDF, DOCX, JPG, PNG, GIF, and WEBP files are allowed.',
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
      formData.append('subject', subject._id);
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
          {subjects.map(s => (
            <TouchableOpacity
              key={s._id}
              style={[styles.subjectChip, subject?._id === s._id && styles.subjectChipActive]}
              onPress={() => setSubject(s)}
            >
              <Text style={[styles.subjectChipText, subject?._id === s._id && { color: Colors.text }]}>{s.code || s.name}</Text>
            </TouchableOpacity>
          ))}
          {subjects.length === 0 && <Text style={styles.noSubject}>No subjects yet — create one first.</Text>}
        </ScrollView>

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
          PDF, DOCX, and images only. Max {MAX_NOTE_FILE_SIZE_MB} MB.
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
  subjectChip:     { backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  subjectChipActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  subjectChipText: { color: Colors.textMuted, fontWeight: '600', fontSize: FontSizes.sm },
  noSubject:       { color: Colors.textMuted, fontSize: FontSizes.sm, padding: 8 },
  filePicker:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', gap: 10, marginBottom: Spacing.lg },
  filePickerText:  { color: Colors.textMuted, flex: 1, fontSize: FontSizes.sm },
  fileHint:        { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: -Spacing.sm, marginBottom: Spacing.md },
  uploadBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, gap: 8 },
  uploadBtnText:   { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
});

