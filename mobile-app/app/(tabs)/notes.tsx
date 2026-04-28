import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { noteService } from '../../services/dataServices';
import { useAuth } from '../../context/AuthContext';
import {
  getNoteSaveState,
  getSavedStateMapForNotes,
  removeNoteFromAllCollections,
  saveNoteToCollections,
} from '../../services/collectionLogic';
import { useAppDialog } from '../../hooks/use-app-dialog';
import { SkeletonBlock } from '../../components/ui/skeleton-block';

// Premium Dark Theme Constants
const C = {
  bg: '#F8FAFC',
  surface: '#F8FAFC',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  primary: '#3B82F6',
  primaryLight: '#60A5FA',
  accent: '#8B5CF6',
  text: '#0F172A',
  textMuted: '#64748B',
  textDim: '#94A3B8',
  placeholder: '#94A3B8',
  inputBg: '#F1F5F9',
  star: '#FBBF24',
};

function NotesSkeletonList() {
  return (
    <View style={s.listContent}>
      {[0, 1, 2, 3].map((idx) => (
        <View key={idx} style={s.skeletonCard}>
          <SkeletonBlock width={48} height={48} borderRadius={12} />
          <View style={{ flex: 1 }}>
            <SkeletonBlock width="70%" height={14} borderRadius={8} />
            <SkeletonBlock width="54%" height={11} borderRadius={8} style={{ marginTop: 8 }} />
            <SkeletonBlock width={86} height={10} borderRadius={8} style={{ marginTop: 10 }} />
          </View>
          <SkeletonBlock width={38} height={38} borderRadius={12} />
        </View>
      ))}
    </View>
  );
}

const getNoteSubjectLabel = (item: any) => item.subject?.name || item.subjectText || 'No Subject';

export default function NotesScreen() {
  const { user } = useAuth();
  const { showDialog, dialogElement } = useAppDialog();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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

  useEffect(() => {
    let mounted = true;
    const syncSavedMap = async () => {
      if (!user?._id) {
        if (mounted) setSavedMap({});
        return;
      }
      const noteIds = notes.map((note) => String(note?._id || '')).filter(Boolean);
      if (!noteIds.length) {
        if (mounted) setSavedMap({});
        return;
      }
      try {
        const nextMap = await getSavedStateMapForNotes(noteIds);
        if (mounted) setSavedMap(nextMap);
      } catch {
        if (mounted) setSavedMap({});
      }
    };
    syncSavedMap();
    return () => { mounted = false; };
  }, [notes, user?._id]);

  const onRefresh = () => { setRefreshing(true); fetchNotes(1, search, true); };
  const onSearch = () => { setLoading(true); fetchNotes(1, search, true); };
  const loadMore = () => { if (hasMore && !loading) fetchNotes(page + 1); };

  const toggleSave = (item: any) => {
    const noteId = String(item?._id || '');
    if (!noteId) return;
    if (!user?._id) {
      showDialog('Sign In Required', 'Please sign in to save notes.', [{ label: 'Okay', role: 'default' }]);
      return;
    }
    if (savingNoteId) return;

    const isSaved = !!savedMap[noteId];
    if (!isSaved) {
      showDialog('Save Note', 'Save this note to your collections?', [
        { label: 'Not Now', role: 'cancel' },
        {
          label: 'Save',
          onPress: async () => {
            try {
              setSavingNoteId(noteId);
              const result = await saveNoteToCollections(noteId);
              setSavedMap((prev) => ({ ...prev, [noteId]: true }));
              Toast.show({ type: 'success', text1: 'Saved', text2: `Saved to ${result.collectionName}.` });
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Save Failed', text2: error?.message });
            } finally {
              setSavingNoteId(null);
            }
          },
        },
      ]);
      return;
    }

    showDialog('Remove Saved Note', 'Remove from your collections?', [
      { label: 'Cancel', role: 'cancel' },
      {
        label: 'Remove',
        role: 'destructive',
        onPress: async () => {
          try {
            setSavingNoteId(noteId);
            const state = await getNoteSaveState(noteId);
            if (!state.collectionCount) {
              setSavedMap((prev) => ({ ...prev, [noteId]: false }));
              return;
            }
            const removedCount = await removeNoteFromAllCollections(noteId);
            setSavedMap((prev) => ({ ...prev, [noteId]: false }));
            Toast.show({ type: 'success', text1: 'Removed', text2: `Removed from ${removedCount} collections.` });
          } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Remove Failed', text2: error?.message });
          } finally {
            setSavingNoteId(null);
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: any) => {
    const noteId = String(item?._id || '');
    const isSaved = !!savedMap[noteId];
    const isBusy = savingNoteId === noteId;

    return (
      <View style={s.card}>
        <TouchableOpacity style={s.cardLeft} onPress={() => router.push(`/note/${item._id}`)} activeOpacity={0.7}>
          <View style={s.iconBox}>
            <LinearGradient colors={[C.surfaceAlt, C.border]} style={s.iconGrad}>
              <Ionicons
                name={item.fileType === 'pdf' ? 'document-text' : item.fileType === 'image' ? 'image' : 'document'}
                size={22} color={C.primary}
              />
            </LinearGradient>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={s.cardMeta} numberOfLines={1}>
              {getNoteSubjectLabel(item)} · {item.uploadedBy?.name || 'Unknown'}
            </Text>
            <View style={s.ratingRow}>
              <Ionicons name="star" size={12} color={C.star} />
              <Text style={s.ratingText}>{item.averageRating?.toFixed(1) || '0.0'} ({item.totalReviews || 0})</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={s.rightActions}>
          <TouchableOpacity
            style={[s.saveBtn, isBusy && { opacity: 0.7 }]}
            onPress={() => toggleSave(item)}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Ionicons 
                name={isSaved ? 'bookmark' : 'bookmark-outline'} 
                size={18} 
                color={isSaved ? C.primary : C.textDim} 
              />
            )}
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={18} color={C.textDim} />
        </View>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.pageTitle}>Notes</Text>
        <TouchableOpacity style={s.fab} onPress={() => router.push('/note/upload')} activeOpacity={0.8}>
          <LinearGradient colors={[C.primaryLight, C.primary]} style={s.fabGrad}>
            <Ionicons name="add" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Search Bar Upgrade */}
      <View style={s.searchContainer}>
        <View style={[s.searchRow, isSearchFocused && s.searchRowFocused]}>
          <Ionicons name="search" size={18} color={isSearchFocused ? C.primary : C.textDim} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Search notes, subjects, tags..."
            placeholderTextColor={C.placeholder}
            value={search}
            onChangeText={setSearch}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            onSubmitEditing={onSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => { setSearch(''); fetchNotes(1, '', true); }}>
              <Ionicons name="close-circle" size={18} color={C.textDim} style={{ marginRight: 8 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && notes.length === 0 ? (
        <NotesSkeletonList />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={i => i._id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          contentContainerStyle={s.listContent}
          ListEmptyComponent={
            <View style={s.emptyWrap}>
              <Ionicons name="document-outline" size={48} color={C.border} />
              <Text style={s.emptyText}>No notes found matching your search.</Text>
            </View>
          }
          ListFooterComponent={
            hasMore
              ? (
                <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                  <View style={s.skeletonFooter}>
                    <SkeletonBlock width={44} height={44} borderRadius={12} />
                    <View style={{ flex: 1 }}>
                      <SkeletonBlock width="62%" height={13} borderRadius={8} />
                      <SkeletonBlock width="48%" height={10} borderRadius={8} style={{ marginTop: 8 }} />
                    </View>
                  </View>
                </View>
              )
              : <View style={{ height: 20 }} />
          }
        />
      )}

      {dialogElement}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  // Header
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 60, 
    paddingBottom: 15 
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  fab: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden', elevation: 4 },
  fabGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Search Section
  searchContainer: { paddingHorizontal: 20, marginBottom: 15 },
  searchRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: C.inputBg, 
    borderRadius: 15, 
    borderWidth: 1, 
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 50
  },
  searchRowFocused: { borderColor: C.primary + '80', backgroundColor: C.surface },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: C.text, fontSize: 15, fontWeight: '500' },

  // List & Cards
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  card: {
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: C.surface,
    borderRadius: 18, 
    padding: 14, 
    marginBottom: 12,
    borderWidth: 1, 
    borderColor: C.border,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 48, height: 48, borderRadius: 12, overflow: 'hidden', marginRight: 15 },
  iconGrad: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  cardMeta: { fontSize: 12, color: C.textMuted, fontWeight: '500' },
  
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  ratingText: { fontSize: 11, color: C.star, marginLeft: 4, fontWeight: '600' },

  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  saveBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },

  // Empty State
  emptyWrap: { alignItems: 'center', marginTop: 100 },
  emptyText: { textAlign: 'center', color: C.textDim, marginTop: 15, fontSize: 15, fontWeight: '500', paddingHorizontal: 40 },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  skeletonFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    backgroundColor: C.surface,
    padding: 12,
    gap: 12,
  },
});