import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { subjectService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function SubjectsScreen() {
  const [subjects, setSubjects]   = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await subjectService.getSubjects();
      setSubjects(res.data || []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/subject/${item._id}`)}>
      <View style={styles.badge}><Text style={styles.badgeText}>{item.code || '??'}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.meta}>{item.department || 'General'}{item.semester ? ` · Sem ${item.semester}` : ''}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>📚 Subjects</Text>
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/subject/create')}>
          <Ionicons name="add" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        : <FlatList
            data={subjects}
            keyExtractor={i => i._id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
            contentContainerStyle={{ padding: Spacing.md, paddingTop: 4, paddingBottom: 120 }}
            ListEmptyComponent={<Text style={styles.empty}>No subjects yet. Add the first one!</Text>}
          />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.text },
  fab:       { width: 38, height: 38, borderRadius: Radius.full, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  card:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  badge:     { backgroundColor: Colors.primary + '30', borderRadius: Radius.sm, padding: Spacing.xs, marginRight: Spacing.sm, minWidth: 52, alignItems: 'center' },
  badgeText: { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.sm },
  name:      { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  meta:      { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  empty:     { textAlign: 'center', color: Colors.textMuted, marginTop: 60, fontSize: FontSizes.md },
});

