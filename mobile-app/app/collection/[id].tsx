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
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collectionService } from '../../services/dataServices';
import { useAppDialog } from '../../hooks/use-app-dialog';
import { useAuth } from '../../context/AuthContext';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

type CollectionPriority = 'low' | 'normal' | 'high';

const PRIORITY_OPTIONS: CollectionPriority[] = ['low', 'normal', 'high'];

const formatPriorityLabel = (priority?: string | null) => {
  if (!priority) return 'Normal';
  return priority.charAt(0).toUpperCase() + priority.slice(1);
};

const formatTargetDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function CollectionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showDialog, dialogElement } = useAppDialog();
  const { user } = useAuth();
  const [collection, setCollection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [removingNoteId, setRemovingNoteId] = useState<string | null>(null);
  const [removingFulfillmentId, setRemovingFulfillmentId] = useState<string | null>(null);

  // Edit Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCourseCode, setEditCourseCode] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');
  const [editPriority, setEditPriority] = useState<CollectionPriority>('normal');
  const [editIsPrivate, setEditIsPrivate] = useState(true);
  const [editTags, setEditTags] = useState('');

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

  const openEditModal = () => {
    setEditName(collection?.name || '');
    setEditDescription(collection?.description || '');
    setEditCourseCode(collection?.courseCode || '');
    setEditTargetDate(collection?.targetDate ? String(collection.targetDate).slice(0, 10) : '');
    setEditPriority(collection?.priority || 'normal');
    setEditIsPrivate(collection?.isPrivate ?? true);
    setEditTags((collection?.tags || []).join(', '));
    setEditModalVisible(true);
  };

  const handleUpdateCollection = async () => {
    if (!editName.trim()) {
      Toast.show({ type: 'error', text1: 'Name required' });
      return;
    }
    try {
      setEditing(true);
      const tagsArray = editTags.split(',').map((t) => t.trim()).filter((t) => t);
      await collectionService.updateCollection(id, {
        name: editName.trim(),
        description: editDescription.trim(),
        courseCode: editCourseCode.trim(),
        targetDate: editTargetDate.trim() || null,
        priority: editPriority,
        isPrivate: editIsPrivate,
        tags: tagsArray,
      });
      Toast.show({ type: 'success', text1: 'Collection updated' });
      setEditModalVisible(false);
      loadCollection(true);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: e.message });
    } finally {
      setEditing(false);
    }
  };

  const confirmDeleteCollection = () => {
    showDialog(
      'Delete Collection',
      `Are you sure you want to delete "${collection?.name}"? This action cannot be undone.`,
      [
        { label: 'Cancel', role: 'cancel' },
        {
          label: 'Delete',
          role: 'destructive',
          onPress: async () => {
            try {
              await collectionService.deleteCollection(id);
              Toast.show({ type: 'success', text1: 'Collection deleted' });
              router.back();
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Delete failed', text2: e.message });
            }
          },
        },
      ]
    );
  };

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

  const ownerId = collection?.owner?._id || collection?.owner;
  const isOwner = ownerId && user?._id && String(ownerId) === String(user._id);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle} numberOfLines={1}>{collection.name}</Text>
          <Text style={styles.subtitle}>{totalItems} saved item{totalItems === 1 ? '' : 's'} {collection.isPrivate ? '' : '• Public'}</Text>
        </View>
        {isOwner && (
          <TouchableOpacity style={styles.editBtn} onPress={openEditModal}>
            <Ionicons name="pencil" size={20} color={Colors.primary} />
          </TouchableOpacity>
        )}
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
        <View style={styles.sectionHeaderRow}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>Saved Notes</Text>
        </View>
        {notes.length
          ? notes.map((item: any, index: number) => (
            <View key={getItemKey(item, 'note', index)}>
              {renderNote({ item })}
            </View>
          ))
          : <Text style={styles.emptyText}>No notes in this collection yet.</Text>}

        <View style={[styles.sectionHeaderRow, styles.sectionSpacing]}>
          <View style={styles.sectionAccent} />
          <Text style={styles.sectionTitle}>Saved Fulfillments</Text>
        </View>
        {fulfillments.length
          ? fulfillments.map((item: any, index: number) => (
            <View key={getItemKey(item, 'fulfillment', index)}>
              {renderFulfillment(item)}
            </View>
          ))
          : <Text style={styles.emptyText}>No fulfilled attachments saved yet.</Text>}

        {isOwner && (
          <TouchableOpacity style={styles.deleteCollectionBtn} onPress={confirmDeleteCollection}>
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={styles.deleteCollectionBtnText}>Delete Collection</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Collection</Text>

            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, { height: 80 }]}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              textAlignVertical="top"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Private Collection</Text>
                <Text style={styles.switchDesc}>Only you can see this collection</Text>
              </View>
              <Switch
                value={editIsPrivate}
                onValueChange={setEditIsPrivate}
                trackColor={{ false: '#DBEAFE', true: Colors.primary }}
                thumbColor={Colors.surface}
              />
            </View>

            {!editIsPrivate && (
              <>
                <Text style={styles.inputLabel}>Tags (comma separated)</Text>
                <TextInput
                  style={styles.input}
                  value={editTags}
                  onChangeText={setEditTags}
                  placeholderTextColor={Colors.textMuted}
                />
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnSave} onPress={handleUpdateCollection} disabled={editing}>
                {editing ? <ActivityIndicator size="small" color={Colors.surface} /> : <Text style={styles.modalBtnSaveText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {dialogElement}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F9FF' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F9FF', padding: Spacing.md },
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
  subtitle: { marginTop: 2, fontSize: FontSizes.xs, color: Colors.textMuted, fontWeight: '600' },
  listContent: { padding: Spacing.md, paddingBottom: 120 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm, gap: 8 },
  sectionAccent: { width: 3, height: 16, borderRadius: 2, backgroundColor: Colors.primary },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '800' },
  sectionSpacing: { marginTop: Spacing.sm },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  noteInfo: { flex: 1 },
  noteTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  noteMeta: { color: Colors.primary, fontSize: FontSizes.xs, marginTop: 3 },
  privateHint: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 3 },
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  openAttachmentBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  removeBtnText: { color: Colors.error, fontSize: FontSizes.xs, fontWeight: '700' },
  emptyText: { color: Colors.textMuted, fontSize: FontSizes.sm, textAlign: 'center', marginBottom: Spacing.sm },
  backBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  backBtnText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.sm },
  editBtn: { padding: Spacing.sm, backgroundColor: '#DBEAFE', borderRadius: Radius.sm },
  deleteCollectionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FEE2E2', padding: Spacing.md, borderRadius: Radius.md, marginTop: Spacing.xl, borderWidth: 1, borderColor: '#FECACA', gap: Spacing.sm },
  deleteCollectionBtnText: { color: Colors.error, fontSize: FontSizes.md, fontWeight: '700' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.md },
  modalContent: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.lg, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  modalTitle: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.primary, marginBottom: Spacing.lg },
  inputLabel: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  input: { backgroundColor: '#F5F9FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: Radius.md, padding: Spacing.sm, fontSize: FontSizes.md, color: Colors.text, marginBottom: Spacing.md },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md, paddingVertical: 8 },
  switchLabel: { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  switchDesc: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  modalBtnCancel: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: Radius.md, backgroundColor: '#F3F4F6' },
  modalBtnCancelText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.sm },
  modalBtnSave: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: Radius.md, backgroundColor: Colors.primary, minWidth: 80, alignItems: 'center' },
  modalBtnSaveText: { color: Colors.surface, fontWeight: '700', fontSize: FontSizes.sm },
});
