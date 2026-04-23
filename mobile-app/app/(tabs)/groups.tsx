import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { groupService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function GroupsScreen() {
  const [groups, setGroups]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await groupService.getGroups();
      setGroups(res.data || []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/group/${item._id}`)}>
      {item.coverImage
        ? <Image source={{ uri: item.coverImage }} style={styles.cover} />
        : <View style={[styles.cover, styles.coverPlaceholder]}><Ionicons name="people" size={28} color={Colors.primary} /></View>
      }
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.privacyBadge, { backgroundColor: item.privacy === 'private' ? Colors.error + '25' : Colors.success + '25' }]}>
            <Ionicons name={item.privacy === 'private' ? 'lock-closed' : 'earth'} size={10} color={item.privacy === 'private' ? Colors.error : Colors.success} />
          </View>
        </View>
        <Text style={styles.meta} numberOfLines={1}>{item.description || 'No description'}</Text>
        <Text style={styles.members}><Ionicons name="people-outline" size={11} /> {item.memberCount || 0} members</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>👥 Groups</Text>
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/group/create')}>
          <Ionicons name="add" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {loading
        ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        : <FlatList
            data={groups}
            keyExtractor={i => i._id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
            contentContainerStyle={{ padding: Spacing.md, paddingTop: 4 }}
            ListEmptyComponent={<Text style={styles.empty}>No groups yet. Create one!</Text>}
          />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  header:          { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm },
  pageTitle:       { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.text },
  fab:             { width: 38, height: 38, borderRadius: Radius.full, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  card:            { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  cover:           { width: 80, height: 80 },
  coverPlaceholder:{ backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' },
  info:            { flex: 1, padding: Spacing.sm, justifyContent: 'center' },
  nameRow:         { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name:            { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, flex: 1 },
  privacyBadge:    { padding: 4, borderRadius: Radius.full },
  meta:            { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  members:         { fontSize: FontSizes.xs, color: Colors.primary, marginTop: 4, fontWeight: '600' },
  empty:           { textAlign: 'center', color: Colors.textMuted, marginTop: 60, fontSize: FontSizes.md },
});

