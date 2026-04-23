import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import * as ImagePicker from 'expo-image-picker';
import { authService } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function EditProfileScreen() {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({ name: '', university: '', batch: '' });
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        university: user.university || '',
        batch: user.batch || '',
      });
      setAvatarUri(user.avatar || null);
    }
  }, [user]);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const data = new FormData();
      data.append('name', formData.name);
      data.append('university', formData.university);
      data.append('batch', formData.batch);

      if (avatarUri && !avatarUri.startsWith('http')) {
        const filename = avatarUri.split('/').pop() || 'avatar.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        data.append('avatar', {
          uri: avatarUri,
          name: filename,
          type,
        } as any);
      }

      const res = await authService.updateProfile(data);
      if (res.success && res.data) {
        updateUser(res.data);
        Toast.show({ type: 'success', text1: 'Profile Updated' });
        router.back();
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
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
        <Text style={styles.pageTitle}>Edit Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={Colors.background} />
              </View>
            )}
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={16} color={Colors.background} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor={Colors.textMuted}
            value={formData.name}
            onChangeText={(t) => setFormData({ ...formData, name: t })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>University</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. University of Colombo"
            placeholderTextColor={Colors.textMuted}
            value={formData.university}
            onChangeText={(t) => setFormData({ ...formData, university: t })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Batch/Year</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. SE2020"
            placeholderTextColor={Colors.textMuted}
            value={formData.batch}
            onChangeText={(t) => setFormData({ ...formData, batch: t })}
          />
        </View>

        <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  content: { padding: Spacing.md },
  avatarSection: { alignItems: 'center', marginBottom: Spacing.lg },
  avatarContainer: { position: 'relative' },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.background },
  avatarHint: { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: Spacing.sm },
  formGroup: { marginBottom: Spacing.md },
  label: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: Spacing.xs, fontWeight: '600' },
  input: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSizes.md },
  button: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg },
  buttonText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' }
});
