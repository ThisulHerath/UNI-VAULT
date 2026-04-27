import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { collectionService } from '../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../constants/theme';

export default function CollectionsScreen() {
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const res = await collectionService.getMyCollections();
      setCollections(res.data || []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const renderItem = ({ item }: any) => {
    const noteCount = Array.isArray(item?.notes) ? item.notes.length : 0;
    const fulfillmentCount = Array.isArray(item?.requestFulfillments) ? item.requestFulfillments.length : 0;
    const totalCount = noteCount + fulfillmentCount;

    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push({ pathname: '/collection/[id]', params: { id: item._id } })}>
        <View style={styles.iconContainer}>
          <Ionicons name="folder-open" size={24} color={Colors.primary} />
        </View>
        <View style={styles.infoContainer}>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta}>{totalCount} Saved Items</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>My Collections</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          contentContainerStyle={{ padding: Spacing.md }}
          ListEmptyComponent={<Text style={styles.empty}>No collections yet. Save notes to create one!</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.text },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  iconContainer: { backgroundColor: Colors.primary + '20', borderRadius: Radius.sm, padding: Spacing.sm, marginRight: Spacing.md },
  infoContainer: { flex: 1 },
  title: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  meta: { fontSize: FontSizes.xs, color: Colors.textMuted },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 60, fontSize: FontSizes.md },
});
