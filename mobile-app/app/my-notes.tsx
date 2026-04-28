import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { noteService } from '../services/dataServices';
import {
  getNoteSaveState,
  getSavedStateMapForNotes,
  removeNoteFromAllCollections,
  saveNoteToCollections,
} from '../services/collectionLogic';
import { useAppDialog } from '../hooks/use-app-dialog';
import { Colors, FontSizes, Spacing, Radius } from '../constants/theme';
import { SkeletonBlock } from '../components/ui/skeleton-block';

const getNoteSubjectLabel = (item: any) => item.subject?.name || item.subjectText || 'No Subject';

function MyNotesSkeletonList() {
  return (
    <View style={{ padding: Spacing.md, paddingBottom: 120 }}>
      {[0, 1, 2, 3].map((idx) => (
        <View key={idx} style={styles.card}>
          <View style={styles.cardMain}>
            <SkeletonBlock width={40} height={40} borderRadius={Radius.sm} />
            <View style={{ flex: 1 }}>
              <SkeletonBlock width="66%" height={14} borderRadius={8} />
              <SkeletonBlock width="45%" height={11} borderRadius={8} style={{ marginTop: 8 }} />
            </View>
          </View>
          <View style={styles.cardActions}>
            <SkeletonBlock width={34} height={34} borderRadius={Radius.full} />
            <SkeletonBlock width={18} height={18} borderRadius={9} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function MyNotesScreen() {
  const { user } = useAuth();
  const { showDialog, dialogElement } = useAppDialog();
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await noteService.getMyNotes();
      setNotes(res.data || []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

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
        <TouchableOpacity style={styles.cardMain} onPress={() => router.push(`/note/${item._id}`)}>
          <View style={styles.iconContainer}>
            <Ionicons name="document-text" size={24} color={Colors.primary} />
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.meta} numberOfLines={1}>{getNoteSubjectLabel(item)}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.cardActions}>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>My Notes</Text>
      </View>

      {loading ? (
        <MyNotesSkeletonList />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={Colors.primary} />}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }}
          ListEmptyComponent={<Text style={styles.empty}>You have not uploaded any notes yet.</Text>}
        />
      )}

      {dialogElement}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: '#BFDBFE' },
  pageTitle: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.primary },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: '#BFDBFE' },
  cardMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: Spacing.sm },
  saveBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  iconContainer: { backgroundColor: '#DBEAFE', borderRadius: Radius.sm, padding: Spacing.sm, marginRight: Spacing.md },
  infoContainer: { flex: 1 },
  title: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  meta: { fontSize: FontSizes.xs, color: Colors.primary },
  empty: { textAlign: 'center', color: Colors.textMuted, marginTop: 60, fontSize: FontSizes.md },
});
