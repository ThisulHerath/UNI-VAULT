import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
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
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

const getNoteSubjectLabel = (item: any) => item.subject?.name || item.subjectText || 'No Subject';

export default function NotesScreen() {
  const { user } = useAuth();
  const { showDialog, dialogElement } = useAppDialog();
  const [notes, setNotes]         = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [hasMore, setHasMore]     = useState(true);
  const [savedMap, setSavedMap]   = useState<Record<string, boolean>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

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
    return () => {
      mounted = false;
    };
  }, [notes, user?._id]);

  const onRefresh = () => { setRefreshing(true); fetchNotes(1, search, true); };
  const onSearch  = () => { setLoading(true); fetchNotes(1, search, true); };
  const loadMore  = () => { if (hasMore && !loading) fetchNotes(page + 1); };

  const toggleSave = (item: any) => {
    const noteId = String(item?._id || '');
    if (!noteId) return;

    if (!user?._id) {
      showDialog('Sign In Required', 'Please sign in to save notes to your collections.', [
        { label: 'Okay', role: 'default' },
      ]);
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
              Toast.show({
                type: 'success',
                text1: 'Saved to Collection',
                text2: result.createdCollection
                  ? `Created ${result.collectionName} and saved this note.`
                  : `Saved to ${result.collectionName}.`,
              });
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Save Failed', text2: error?.message || 'Unable to save this note.' });
            } finally {
              setSavingNoteId(null);
            }
          },
        },
      ]);
      return;
    }

    showDialog('Remove Saved Note', 'Remove this note from your saved collections?', [
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
              Toast.show({ type: 'error', text1: 'Already Removed', text2: 'This note is not in your collections anymore.' });
              return;
            }

            const removedCount = await removeNoteFromAllCollections(noteId);
            setSavedMap((prev) => ({ ...prev, [noteId]: false }));
            Toast.show({
              type: 'success',
              text1: 'Removed from Collections',
              text2: `Removed from ${removedCount} collection${removedCount === 1 ? '' : 's'}.`,
            });
          } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Remove Failed', text2: error?.message || 'Unable to remove this note.' });
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
      <View style={styles.card}>
        <TouchableOpacity style={styles.cardLeft} onPress={() => router.push(`/note/${item._id}`)}>
          <View style={styles.iconBox}>
            <Ionicons
              name={item.fileType === 'pdf' ? 'document-text' : item.fileType === 'image' ? 'image' : 'document'}
              size={22} color={Colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {getNoteSubjectLabel(item)} · {item.uploadedBy?.name || 'Unknown'}
            </Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color={Colors.star} />
              <Text style={styles.ratingText}>{item.averageRating?.toFixed(1) || '0.0'} ({item.totalReviews || 0})</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.rightActions}>
          <TouchableOpacity
            style={[styles.saveBtn, isBusy && { opacity: 0.7 }]}
            onPress={() => toggleSave(item)}
            disabled={isBusy}
          >
            {isBusy ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={18} color={Colors.text} />
            )}
          </TouchableOpacity>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </View>
      </View>
    );
  };

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

      {dialogElement}
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
  rightActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: Spacing.sm },
  saveBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBox:   { width: 44, height: 44, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  cardTitle: { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  cardMeta:  { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  ratingText:{ fontSize: FontSizes.xs, color: Colors.star, marginLeft: 3 },
  empty:     { textAlign: 'center', color: Colors.textMuted, marginTop: 60, fontSize: FontSizes.md },
});

