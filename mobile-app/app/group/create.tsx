import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Switch, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { groupService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function CreateGroupScreen() {
  const [name, setName]       = useState('');
  const [desc, setDesc]       = useState('');
  const [batch, setBatch]     = useState('');
  const [isPrivate, setPrivate] = useState(false);
  const [joinMode, setJoinMode] = useState<'open' | 'request'>('open');
  const [inviteCode, setInviteCode] = useState('');
  const [cover, setCover]     = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) setCover(result.assets[0]);
  };

  const handleCreate = async () => {
    if (!name.trim()) { Toast.show({ type: 'error', text1: 'Group name is required' }); return; }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', desc.trim());
      formData.append('batch', batch.trim());
      formData.append('privacy', isPrivate ? 'private' : 'public');
      formData.append('joinMode', joinMode);
      if (isPrivate && inviteCode.trim()) {
        formData.append('invitationCode', inviteCode.trim().toUpperCase());
      }
      if (cover) formData.append('coverImage', { uri: cover.uri, type: 'image/jpeg', name: 'cover.jpg' } as any);

      await groupService.createGroup(formData);
      Toast.show({ type: 'success', text1: '✅ Group created!' });
      router.replace('/(tabs)/groups');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Failed', text2: e.message });
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <Text style={styles.pageTitle}>New Group</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Group Name *</Text>
        <TextInput style={styles.input} placeholder="e.g. SE2022 Study Squad" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="What's this group about?" placeholderTextColor={Colors.textMuted} value={desc} onChangeText={setDesc} multiline />

        <Text style={styles.label}>Batch</Text>
        <TextInput style={styles.input} placeholder="e.g. SE2022" placeholderTextColor={Colors.textMuted} value={batch} onChangeText={setBatch} autoCapitalize="characters" />

        <TouchableOpacity style={styles.filePicker} onPress={pickCover}>
          <Ionicons name="image-outline" size={22} color={Colors.primary} />
          <Text style={styles.filePickerText}>{cover ? 'Profile picture selected' : 'Tap to add group profile picture'}</Text>
        </TouchableOpacity>

        {cover && (
          <View style={styles.coverPreviewWrap}>
            <Image source={{ uri: cover.uri }} style={styles.coverPreview} />
            <TouchableOpacity style={styles.removeCoverBtn} onPress={() => setCover(null)}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={styles.removeCoverText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.switchRow}>
          <View>
            <Text style={styles.switchLabel}>Private Group</Text>
            <Text style={styles.switchDesc}>Only invitation code holders can join</Text>
          </View>
          <Switch value={isPrivate} onValueChange={setPrivate} trackColor={{ true: Colors.primary }} thumbColor={Colors.text} />
        </View>

        {!isPrivate && (
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Request-Based Join</Text>
              <Text style={styles.switchDesc}>If on, users must be approved by an admin</Text>
            </View>
            <Switch value={joinMode === 'request'} onValueChange={(value) => setJoinMode(value ? 'request' : 'open')} trackColor={{ true: Colors.primary }} thumbColor={Colors.text} />
          </View>
        )}

        {isPrivate && (
          <>
            <Text style={styles.label}>Custom Invitation Code (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Leave empty to auto-generate"
              placeholderTextColor={Colors.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
            />
          </>
        )}

        <TouchableOpacity style={[styles.btn, loading && { opacity: 0.65 }]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.btnText}>Create Group</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: Colors.background },
  topBar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 54, paddingBottom: Spacing.md },
  pageTitle:     { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text },
  form:          { padding: Spacing.md },
  label:         { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: '600', marginBottom: 6, marginTop: Spacing.sm },
  input:         { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  filePicker:    { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', gap: 10, marginBottom: Spacing.md },
  filePickerText:{ color: Colors.textMuted, fontSize: FontSizes.sm },
  coverPreviewWrap: { alignItems: 'flex-start', marginBottom: Spacing.md },
  coverPreview: { width: 90, height: 90, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.xs },
  removeCoverBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.error + '15', borderWidth: 1, borderColor: Colors.error + '35', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 5 },
  removeCoverText: { color: Colors.error, fontSize: FontSizes.xs, fontWeight: '700' },
  switchRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  switchLabel:   { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  switchDesc:    { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  btn:           { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.md, alignItems: 'center' },
  btnText:       { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
});

