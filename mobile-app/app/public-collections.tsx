import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { collectionService } from '../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../constants/theme';
import { useAuth } from '../context/AuthContext';

export default function PublicCollectionsScreen() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await collectionService.getPublicCollections({ search: debouncedSearch });
      setCollections(res.data || []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message || 'Failed to load public collections' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVote = async (collectionId: string, value: 'upvote' | 'downvote' | 'none') => {
    if (!user) {
      Toast.show({ type: 'error', text1: 'Login Required', text2: 'Please login to vote.' });
      return;
    }

    try {
      // Optimistic update
      setCollections((prev) =>
        prev.map((c) => {
          if (c._id === collectionId) {
            let newUpvotes = c.upvotes.filter((id: string) => id !== user._id);
            let newDownvotes = c.downvotes.filter((id: string) => id !== user._id);
            if (value === 'upvote') newUpvotes.push(user._id);
            if (value === 'downvote') newDownvotes.push(user._id);
            return { ...c, upvotes: newUpvotes, downvotes: newDownvotes };
          }
          return c;
        })
      );

      await collectionService.voteCollection(collectionId, value);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Vote failed', text2: e.message });
      // Revert on failure by reloading
      load();
    }
  };

  const renderItem = ({ item }: any) => {
    const noteCount = Array.isArray(item?.notes) ? item.notes.length : 0;
    const fulfillmentCount = Array.isArray(item?.requestFulfillments) ? item.requestFulfillments.length : 0;
    const totalCount = noteCount + fulfillmentCount;

    const upvotes = item.upvotes || [];
    const downvotes = item.downvotes || [];
    const score = upvotes.length - downvotes.length;
    
    const userUpvoted = user && upvotes.includes(user._id);
    const userDownvoted = user && downvotes.includes(user._id);

    return (
      <View style={styles.card}>
        <View style={styles.voteColumn}>
          <TouchableOpacity onPress={() => handleVote(item._id, userUpvoted ? 'none' : 'upvote')} style={styles.voteBtn}>
            <Ionicons name="arrow-up" size={24} color={userUpvoted ? '#F97316' : Colors.textMuted} />
          </TouchableOpacity>
          <Text style={[styles.scoreText, userUpvoted && { color: '#F97316' }, userDownvoted && { color: '#3B82F6' }]}>
            {score}
          </Text>
          <TouchableOpacity onPress={() => handleVote(item._id, userDownvoted ? 'none' : 'downvote')} style={styles.voteBtn}>
            <Ionicons name="arrow-down" size={24} color={userDownvoted ? '#3B82F6' : Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.cardContent} 
          onPress={() => router.push({ pathname: '/collection/[id]', params: { id: item._id } })}
        >
          <View style={styles.infoHeader}>
            <Text style={styles.ownerText}>By {item.owner?.name || 'Unknown User'}</Text>
          </View>
          <Text style={styles.title} numberOfLines={2}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          ) : null}
          
          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.map((tag: string, index: number) => (
                <View key={index} style={styles.tagBadge}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.meta}>{totalCount} Saved Items</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Explore Collections</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search public collections..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.textMuted}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={collections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>No public collections found.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
  },
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.primary },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    height: 48,
  },
  searchIcon: { marginRight: Spacing.sm },
  searchInput: { flex: 1, fontSize: FontSizes.md, color: Colors.text },
  listContent: { paddingHorizontal: Spacing.md, paddingBottom: 120 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    overflow: 'hidden',
  },
  voteColumn: {
    width: 48,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  voteBtn: { padding: 4 },
  scoreText: { fontSize: FontSizes.sm, fontWeight: '800', color: Colors.text, marginVertical: 4 },
  cardContent: { flex: 1, padding: Spacing.md },
  infoHeader: { marginBottom: 4 },
  ownerText: { fontSize: FontSizes.xs, color: Colors.textMuted, fontWeight: '600' },
  title: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  description: { fontSize: FontSizes.sm, color: Colors.textMuted, marginBottom: 8 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  tagBadge: { backgroundColor: '#DBEAFE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.sm },
  tagText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '600' },
  meta: { fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '700', marginTop: 4 },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 60, fontSize: FontSizes.md },
});
