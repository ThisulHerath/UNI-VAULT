import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collectionService } from '../../services/dataServices';
import { useAppDialog } from '../../hooks/use-app-dialog';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showDialog, dialogElement } = useAppDialog();
  const [collection, setCollection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingNoteId, setRemovingNoteId] = useState<string | null>(null);
  const [removingFulfillmentId, setRemovingFulfillmentId] = useState<string | null>(null);

  const getItemKey = (item: any, fallbackPrefix: string, index: number) => {
    const id = item?._id || item?.id || (typeof item === 'string' ? item : null);
    return id ? String(id) : `${fallbackPrefix}-${index}`;
  };

  const getSavedNoteSubjectLabel = (item: any) => {
    const subject = item?.subject;

    if (subject && typeof subject === 'object') {
      if (subject.name) return subject.name;
      if (subject.code) return subject.code;
    }

    if (typeof subject === 'string' && subject.trim()) return subject;
    if (typeof item?.subjectText === 'string' && item.subjectText.trim()) return item.subjectText;
    if (typeof item?.subjectLabel === 'string' && item.subjectLabel.trim()) return item.subjectLabel;
    if (typeof item?.subjectName === 'string' && item.subjectName.trim()) return item.subjectName;

    return 'No subject';
  };

  const loadCollection = useCallback(async (showRefresh = false) => {
    if (!id) return;

    if (showRefresh) setRefreshing(true);
    try {
      const response = await collectionService.getCollectionById(id);
      setCollection(response?.data || null);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Unable to Load Collection',
        text2: error?.message || 'Please try again in a moment.',
      });
    } finally {
      setLoading(false);
      if (showRefresh) setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const confirmRemoveNote = (note: any) => {
    if (!id || !note?._id) return;

    if (removingNoteId) {
      Toast.show({
        type: 'error',
        text1: 'Please wait',
        text2: 'A remove action is already in progress.',
      });
      return;
    }

    const noteId = String(note._id);
    const currentNotes = Array.isArray(collection?.notes) ? collection.notes : [];
    const stillSaved = currentNotes.some((savedNote: any) => String(savedNote?._id || savedNote) === noteId);

    if (!stillSaved) {
      Toast.show({
        type: 'error',
        text1: 'Already Removed',
        text2: 'This note is no longer in this collection.',
      });
      return;
    }

    showDialog(
      'Remove Saved Note',
      `Remove "${note.title || 'this note'}" from ${collection?.name || 'this collection'}?`,
      [
        { label: 'Cancel', role: 'cancel' },
        {
          label: 'Remove',
          role: 'destructive',
          onPress: async () => {
            try {
              setRemovingNoteId(noteId);
              await collectionService.updateNotes(id, noteId, 'remove');
              setCollection((prev: any) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  notes: (prev.notes || []).filter((savedNote: any) => String(savedNote?._id || savedNote) !== noteId),
                };
              });
              Toast.show({
                type: 'success',
                text1: 'Removed from Collection',
                text2: 'The note was removed successfully.',
              });
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Remove Failed',
                text2: error?.message || 'Unable to remove this note right now.',
              });
            } finally {
              setRemovingNoteId(null);
            }
          },
        },
      ]
    );
  };

  const confirmRemoveFulfillment = (requestItem: any) => {
    if (!id || !requestItem?._id) return;

    if (removingFulfillmentId) {
      Toast.show({
        type: 'error',
        text1: 'Please wait',
        text2: 'A remove action is already in progress.',
      });
      return;
    }

    const requestId = String(requestItem._id);
    const currentFulfillments = Array.isArray(collection?.requestFulfillments) ? collection.requestFulfillments : [];
    const stillSaved = currentFulfillments.some((saved: any) => String(saved?._id || saved) === requestId);

    if (!stillSaved) {
      Toast.show({
        type: 'error',
        text1: 'Already Removed',
        text2: 'This attachment is no longer in this collection.',
      });
      return;
    }

    showDialog(
      'Remove Saved Attachment',
      `Remove "${requestItem.title || 'this attachment'}" from ${collection?.name || 'this collection'}?`,
      [
        { label: 'Cancel', role: 'cancel' },
        {
          label: 'Remove',
          role: 'destructive',
          onPress: async () => {
            try {
              setRemovingFulfillmentId(requestId);
              await collectionService.updateFulfillments(id, requestId, 'remove');
              setCollection((prev: any) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  requestFulfillments: (prev.requestFulfillments || []).filter((saved: any) => String(saved?._id || saved) !== requestId),
                };
              });
              Toast.show({
                type: 'success',
                text1: 'Removed from Collection',
                text2: 'The attachment was removed successfully.',
              });
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Remove Failed',
                text2: error?.message || 'Unable to remove this attachment right now.',
              });
            } finally {
              setRemovingFulfillmentId(null);
            }
          },
        },
      ]
    );
  };

  const openFulfillment = async (requestItem: any) => {
    const fileUrl = requestItem?.fulfillment?.fileUrl;
    if (!fileUrl) {
      Toast.show({
        type: 'error',
        text1: 'Attachment Unavailable',
        text2: 'This attachment is private or unavailable right now.',
      });
      return;
    }

    try {
      const token = await AsyncStorage.getItem('univault_token');
      const separator = fileUrl.includes('?') ? '&' : '?';
      const openUrl = token ? `${fileUrl}${separator}token=${encodeURIComponent(token)}` : fileUrl;
      await Linking.openURL(openUrl);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Unable to Open Attachment',
        text2: error?.message || 'Please try again in a moment.',
      });
    }
  };

  const renderNote = ({ item }: any) => {
    const noteId = String(item?._id || '');
    const isRemoving = removingNoteId === noteId;

    return (
      <View style={styles.noteCard}>
        <TouchableOpacity style={styles.noteInfo} onPress={() => router.push(`/note/${noteId}`)}>
          <Text style={styles.noteTitle} numberOfLines={1}>{item.title || 'Untitled note'}</Text>
          <Text style={styles.noteMeta} numberOfLines={1}>
            {getSavedNoteSubjectLabel(item)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.removeBtn, isRemoving && { opacity: 0.7 }]}
          onPress={() => confirmRemoveNote(item)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <ActivityIndicator size="small" color={Colors.text} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={16} color={Colors.text} />
              <Text style={styles.removeBtnText}>Remove</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderFulfillment = (item: any) => {
    const requestId = String(item?._id || '');
    const isRemoving = removingFulfillmentId === requestId;
    const fileName = item?.fulfillment?.fileName || 'Attachment';
    const isAccessible = !!item?.fulfillment?.fileUrl;

    return (
      <View key={requestId} style={styles.noteCard}>
        <TouchableOpacity style={styles.noteInfo} onPress={() => openFulfillment(item)}>
          <Text style={styles.noteTitle} numberOfLines={1}>{item.title || fileName}</Text>
          <Text style={styles.noteMeta} numberOfLines={1}>{fileName}</Text>
          {!isAccessible && <Text style={styles.privateHint}>Attachment is private or unavailable</Text>}
        </TouchableOpacity>

        <View style={styles.rowActions}>
          <TouchableOpacity style={styles.openAttachmentBtn} onPress={() => openFulfillment(item)}>
            <Ionicons name="open-outline" size={16} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.removeBtn, isRemoving && { opacity: 0.7 }]}
            onPress={() => confirmRemoveFulfillment(item)}
            disabled={isRemoving}
          >
            {isRemoving ? (
              <ActivityIndicator size="small" color={Colors.text} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={16} color={Colors.text} />
                <Text style={styles.removeBtnText}>Remove</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!collection) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>Collection not found.</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const notes = Array.isArray(collection?.notes) ? collection.notes : [];
  const fulfillments = Array.isArray(collection?.requestFulfillments) ? collection.requestFulfillments : [];
  const totalItems = notes.length + fulfillments.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle} numberOfLines={1}>{collection.name}</Text>
          <Text style={styles.subtitle}>{totalItems} saved item{totalItems === 1 ? '' : 's'}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadCollection(true)}
            tintColor={Colors.primary}
          />
        }
      >
        <Text style={styles.sectionTitle}>Saved Notes</Text>
        {notes.length
          ? notes.map((item: any, index: number) => (
            <View key={getItemKey(item, 'note', index)}>
              {renderNote({ item })}
            </View>
          ))
          : <Text style={styles.emptyText}>No notes in this collection yet.</Text>}

        <Text style={[styles.sectionTitle, styles.sectionSpacing]}>Saved Fulfillments</Text>
        {fulfillments.length
          ? fulfillments.map((item: any, index: number) => (
            <View key={getItemKey(item, 'fulfillment', index)}>
              {renderFulfillment(item)}
            </View>
          ))
          : <Text style={styles.emptyText}>No fulfilled attachments saved yet.</Text>}
      </ScrollView>

      {dialogElement}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background, padding: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text },
  subtitle: { marginTop: 2, fontSize: FontSizes.xs, color: Colors.textMuted, fontWeight: '600' },
  listContent: { padding: Spacing.md },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '800', marginBottom: Spacing.sm },
  sectionSpacing: { marginTop: Spacing.sm },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  noteInfo: { flex: 1 },
  noteTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  noteMeta: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 3 },
  privateHint: { color: Colors.warning, fontSize: FontSizes.xs, marginTop: 3 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  openAttachmentBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  removeBtnText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '700' },
  emptyText: { color: Colors.textMuted, fontSize: FontSizes.sm, textAlign: 'center', marginBottom: Spacing.sm },
  backBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  backBtnText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.sm },
});
