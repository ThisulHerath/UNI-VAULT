import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { subjectService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function SubjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const [subject, setSubject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await subjectService.getSubjectById(id as string);
        setSubject(res.data);
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Error Fetching Subject', text2: e.message });
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  }

  if (!subject) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.text }}>Subject not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: Colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Subject Details</Text>
        <TouchableOpacity onPress={() => router.push(`/subject/${id}/edit`)} style={{ marginLeft: 'auto' }}>
          <Ionicons name="create-outline" size={22} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={styles.badge}><Text style={styles.badgeText}>{subject.code || '??'}</Text></View>
          <Text style={styles.title}>{subject.name}</Text>
          <Text style={styles.meta}>Department: {subject.department || 'General'}</Text>
          <Text style={styles.meta}>Semester: {subject.semester || 'N/A'}</Text>
        </View>

        {/* Future expansion: list of notes under this subject */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes in this subject</Text>
          <Text style={styles.empty}>This feature is coming soon.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  content: { padding: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg },
  badge: { backgroundColor: Colors.primary + '30', borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: Spacing.sm },
  badgeText: { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.sm },
  title: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
  meta: { fontSize: FontSizes.md, color: Colors.textMuted, marginBottom: 4 },
  section: { marginTop: Spacing.md },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: Spacing.md, fontStyle: 'italic' }
});
