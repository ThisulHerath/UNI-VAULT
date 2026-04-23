import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { noteService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function NotesScreen() {
  const [notes, setNotes]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);

  const fetchNotes = useCallback(async (pageNum = 1, searchVal = search, reset = false) => {
    try {
      const res = await noteService.getNotes({ page: pageNum, limit: 10, search: searchVal || undefined });
      const fetched = res.data || [];
      setNotes(prev => reset ? fetched : [...prev, ...fetched]);
      setHasMore(pageNum < res.pages);
      setPage(pageNum);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => { fetchNotes(1, '', true); }, []);

  const onRefresh = () => { setRefreshing(true); fetchNotes(1, search, true); };
  const onSearch  = () => { setLoading(true); fetchNotes(1, search, true); };
  const loadMore  = () => { if (hasMore && !loading) fetchNotes(page + 1); };

  const renderItem = ({ item }: any) => (
    <TouchableOpacity style={styles.card} onPress={() => router.push(`/note/${item._id}`)}>
      <View style={styles.cardLeft}>
        <View style={styles.iconBox}>
          <Ionicons
            name={item.fileType === 'pdf' ? 'document-text' : item.fileType === 'image' ? 'image' : 'document'}
            size={22} color={Colors.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {item.subject?.name || 'No Subject'} · {item.uploadedBy?.name || 'Unknown'}
          </Text>
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={12} color={Colors.star} />
            <Text style={styles.ratingText}>{item.averageRating?.toFixed(1) || '0.0'} ({item.totalReviews || 0})</Text>
          </View>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.pageTitle}>📄 Notes</Text>
        <TouchableOpacity style={styles.fab} onPress={() => router.push('/note/upload')}>
          <Ionicons name="add" size={22} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes, tags..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={onSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={onSearch}>
          <Ionicons name="search" size={18} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {loading && notes.length === 0
        ? <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 60 }} />
        : <FlatList
            data={notes}
            keyExtractor={i => i._id}
            renderItem={renderItem}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.4}
            contentContainerStyle={{ padding: Spacing.md, paddingTop: 4 }}
            ListEmptyComponent={<Text style={styles.empty}>No notes found. Upload the first one!</Text>}
            ListFooterComponent={hasMore ? <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.md }} /> : null}
          />
      }
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm },
  pageTitle:   { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.text },
  fab: {
    width: 38, height: 38, borderRadius: Radius.full, backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  searchRow:   { flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.sm },
  searchInput: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.sm, color: Colors.text, fontSize: FontSizes.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  searchBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, justifyContent: 'center', marginLeft: 6,
  },
  card: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  cardLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox:   { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  cardTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  cardMeta:  { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText:{ fontSize: FontSizes.xs, color: Colors.star, marginLeft: 3 },
  empty:     { textAlign: 'center', color: Colors.textMuted, marginTop: 60, fontSize: FontSizes.md },
});

