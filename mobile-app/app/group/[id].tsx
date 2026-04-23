import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { groupService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams();
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await groupService.getGroupById(id as string);
        setGroup(res.data);
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Error', text2: e.message });
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id]);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!group) return <View style={styles.center}><Text style={{ color: Colors.text }}>Group not found</Text><TouchableOpacity onPress={() => router.back()}><Text style={{ color: Colors.primary, marginTop: 10 }}>Go Back</Text></TouchableOpacity></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Group Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{group.name}</Text>
          <Text style={styles.desc}>{group.description || 'No description provided'}</Text>
          <Text style={styles.meta}>Members: {group.members?.length || 0}</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon' })}>
          <Text style={styles.buttonText}>Join Group</Text>
        </TouchableOpacity>
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
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
  desc: { fontSize: FontSizes.md, color: Colors.textMuted, marginBottom: Spacing.md },
  meta: { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: '600' },
  button: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg },
  buttonText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' }
});
