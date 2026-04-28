import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requestService } from '../../services/dataServices';
import {
  getFulfillmentSaveState,
  getNoteSaveState,
  removeFulfillmentFromAllCollections,
  removeNoteFromAllCollections,
  saveFulfillmentToCollections,
  saveNoteToCollections,
} from '../../services/collectionLogic';
import { useAppDialog } from '../../hooks/use-app-dialog';
import { useAuth } from '../../context/AuthContext';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { SkeletonBlock } from '../../components/ui/skeleton-block';

const MAX_REQUEST_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_REQUEST_FILE_SIZE_MB = 15;
const ALLOWED_REQUEST_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const formatFileSize = (bytes?: number) => {
  if (bytes === undefined || bytes === null) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isAllowedRequestFile = (mimeType?: string, fileName?: string) => {
  if (mimeType && ALLOWED_REQUEST_MIME_TYPES.has(mimeType)) {
    return true;
  }

  const extension = fileName?.split('.').pop()?.toLowerCase();
  return extension ? ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx'].includes(extension) : false;
};

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const { showDialog, dialogElement } = useAppDialog();
  const [requestItem, setRequestItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'delete' | 'close' | null>(null);
  const [showFulfillModal, setShowFulfillModal] = useState(false);
  const [fulfillFile, setFulfillFile] = useState<any>(null);
  const [fulfillDescription, setFulfillDescription] = useState('');
  const [fulfillSubmitting, setFulfillSubmitting] = useState(false);
  const [openingFulfillment, setOpeningFulfillment] = useState(false);
  const [isPickingDocument, setIsPickingDocument] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [isFulfillmentSaved, setIsFulfillmentSaved] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await requestService.getRequestById(id as string);
        setRequestItem(res.data);
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Error', text2: e.message });
      } finally {
        setLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  const requestOwnerId = requestItem?.requestedBy?._id || requestItem?.requestedBy;
  const isRequestOwner = !!user && !!requestOwnerId && requestOwnerId.toString() === user._id;
  const canManageRequest = !!user && (user.role === 'admin' || isRequestOwner);
  const canReopen = isRequestOwner && requestItem?.status === 'closed' && requestItem?.closedReason === 'cancelled';
  const canFulfill = !!user && !isRequestOwner && requestItem?.status === 'open';

  const fulfillment = requestItem?.fulfillment || requestItem?.fulfilledByNote || null;
  const fulfillmentFileUrl = requestItem?.fulfillment?.fileUrl || requestItem?.fulfilledByNote?.fileUrl || null;
  const fulfillmentTitle = requestItem?.fulfilledByNote?.title || fulfillment?.fileName || 'Fulfillment';
  const requestSubjectLabel = requestItem?.subject?.name || requestItem?.subjectLabel || 'Any Subject';
  const isFulfillmentPublic = !!requestItem?.fulfillment?.isPublic;
  const canToggleFulfillmentVisibility = isRequestOwner && !!requestItem?.fulfillment;
  const fulfillmentNoteId = requestItem?.fulfilledByNote?._id || requestItem?.fulfilledByNote?.id || null;
  const fulfillmentRequestId = requestItem?._id ? String(requestItem._id) : null;
  const isFileFulfillment = !!requestItem?.fulfillment?.fileId && !fulfillmentNoteId;
  const canSaveFileFulfillment = isFileFulfillment && isFulfillmentPublic;
  const canDeleteFulfilledRequest = canManageRequest && requestItem?.status === 'fulfilled';
  const isDeletedRequest = requestItem?.status === 'closed' && requestItem?.closedReason === 'deleted';

  const closedReasonLabel = requestItem?.closedReason
    ? requestItem.closedReason.charAt(0).toUpperCase() + requestItem.closedReason.slice(1)
    : 'Closed';
  const statusTone = requestItem?.status === 'open'
    ? { backgroundColor: Colors.primary + '16', color: '#1D4ED8', borderColor: Colors.primary + '40' }
    : requestItem?.status === 'fulfilled'
      ? { backgroundColor: '#DBEAFE', color: '#1E40AF', borderColor: '#93C5FD' }
      : { backgroundColor: '#E2E8F0', color: '#475569', borderColor: '#CBD5E1' };

  useEffect(() => {
    let mounted = true;

    const syncSavedState = async () => {
      if (!user?._id) {
        if (mounted) setIsFulfillmentSaved(false);
        return;
      }

      try {
        if (fulfillmentNoteId) {
          const state = await getNoteSaveState(fulfillmentNoteId);
          if (mounted) {
            setIsFulfillmentSaved(state.isSaved);
          }
          return;
        }

        if (canSaveFileFulfillment && fulfillmentRequestId) {
          const state = await getFulfillmentSaveState(fulfillmentRequestId);
          if (mounted) {
            setIsFulfillmentSaved(state.isSaved);
          }
          return;
        }

        if (mounted) {
          setIsFulfillmentSaved(false);
        }
      } catch {
        if (mounted) {
          setIsFulfillmentSaved(false);
        }
      }
    };

    syncSavedState();
    return () => {
      mounted = false;
    };
  }, [fulfillmentNoteId, canSaveFileFulfillment, fulfillmentRequestId, user?._id]);

  const confirmDelete = () => {
    setPendingAction('delete');
    setShowDeleteModal(true);
  };

  const confirmClose = () => {
    setPendingAction('close');
    setShowDeleteModal(true);
  };

  const handlePrimaryAction = async () => {
    try {
      setProcessing(true);
      const res = pendingAction === 'close'
        ? await requestService.closeRequest(id as string)
        : await requestService.deleteRequest(id as string);
      setRequestItem(res.data);
      setShowDeleteModal(false);
      Toast.show({
        type: 'success',
        text1: pendingAction === 'close' ? 'Request closed' : 'Request deleted',
      });
    } catch (e: any) {
      Toast.show({
        type: 'error',
        text1: pendingAction === 'close' ? 'Close failed' : 'Delete failed',
        text2: e.message,
      });
    } finally {
      setProcessing(false);
      setPendingAction(null);
    }
  };

  const openFulfillModal = () => {
    if (!user) {
      Toast.show({ type: 'error', text1: 'Please log in to fulfill requests.' });
      return;
    }

    if (isRequestOwner) {
      Toast.show({ type: 'error', text1: 'You cannot fulfill your own request.' });
      return;
    }

    if (requestItem.status !== 'open') {
      Toast.show({ type: 'error', text1: 'Only open requests can be fulfilled.' });
      return;
    }

    setShowFulfillModal(true);
  };

  const pickFulfillmentFile = async () => {
    if (isPickingDocument) return; // Prevent concurrent calls
    
    setIsPickingDocument(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'image/*',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const selectedFile = result.assets[0];
      if (!isAllowedRequestFile(selectedFile.mimeType, selectedFile.name)) {
        Toast.show({
          type: 'error',
          text1: 'Unsupported file type',
          text2: 'Only PDF, Word documents, JPG, PNG, GIF, and WEBP files are allowed.',
        });
        return;
      }

      if (selectedFile.size && selectedFile.size > MAX_REQUEST_FILE_SIZE_BYTES) {
        Toast.show({
          type: 'error',
          text1: 'File too large',
          text2: `Maximum request attachment size is ${MAX_REQUEST_FILE_SIZE_MB} MB.`,
        });
        return;
      }

      setFulfillFile(selectedFile);
    } catch (error: any) {
      console.error('Document picker error:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to pick file',
        text2: error?.message || 'Please try again',
      });
    } finally {
      setIsPickingDocument(false);
    }
  };

  const submitFulfillment = async () => {
    if (!fulfillFile) {
      Toast.show({ type: 'error', text1: 'Please select a file' });
      return;
    }

    if (!isAllowedRequestFile(fulfillFile.mimeType, fulfillFile.name)) {
      Toast.show({
        type: 'error',
        text1: 'Unsupported file type',
        text2: 'Only PDF, Word documents, JPG, PNG, GIF, and WEBP files are allowed.',
      });
      return;
    }

    if (fulfillFile.size && fulfillFile.size > MAX_REQUEST_FILE_SIZE_BYTES) {
      Toast.show({
        type: 'error',
        text1: 'File too large',
        text2: `Maximum request attachment size is ${MAX_REQUEST_FILE_SIZE_MB} MB.`,
      });
      return;
    }

    try {
      setFulfillSubmitting(true);
      const formData = new FormData();
      formData.append('description', fulfillDescription.trim());
      formData.append('file', {
        uri: fulfillFile.uri,
        type: fulfillFile.mimeType || 'application/octet-stream',
        name: fulfillFile.name,
      } as any);

      const res = await requestService.fulfillRequest(id as string, formData);
      setRequestItem(res.data);
      setShowFulfillModal(false);
      setFulfillFile(null);
      setFulfillDescription('');
      Toast.show({ type: 'success', text1: 'Request fulfilled' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Fulfill failed', text2: e.message });
    } finally {
      setFulfillSubmitting(false);
    }
  };

  const handleReopen = async () => {
    try {
      setReopening(true);
      const res = await requestService.reopenRequest(id as string);
      setRequestItem(res.data);
      Toast.show({ type: 'success', text1: 'Request reopened' });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Reopen failed', text2: e.message });
    } finally {
      setReopening(false);
    }
  };

  const handleToggleFulfillmentVisibility = async () => {
    try {
      setProcessing(true);
      const nextVisibility = !isFulfillmentPublic;
      const res = await requestService.updateFulfillmentVisibility(id as string, nextVisibility);
      setRequestItem(res.data);
      Toast.show({
        type: 'success',
        text1: nextVisibility ? 'Fulfillment is now public' : 'Fulfillment is now private',
      });
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Update failed', text2: e.message });
    } finally {
      setProcessing(false);
    }
  };

  const openFulfillment = async () => {
    if (fulfillmentNoteId) {
      router.push(`/note/${fulfillmentNoteId}`);
      return;
    }

    if (fulfillmentFileUrl) {
      try {
        setOpeningFulfillment(true);
        const token = await AsyncStorage.getItem('univault_token');
        const separator = fulfillmentFileUrl.includes('?') ? '&' : '?';
        const openUrl = token
          ? `${fulfillmentFileUrl}${separator}token=${encodeURIComponent(token)}`
          : fulfillmentFileUrl;

        await Linking.openURL(openUrl);
      } catch (error: any) {
        Toast.show({
          type: 'error',
          text1: 'Unable to open attachment',
          text2: error?.message || 'Please try again.',
        });
      } finally {
        setOpeningFulfillment(false);
      }
    }
  };

  const toggleFulfillmentSave = () => {
    if (!fulfillmentNoteId && !canSaveFileFulfillment) {
      Toast.show({
        type: 'error',
        text1: 'Save Unavailable',
        text2: 'Only fulfillment notes or public attachments can be saved to collections.',
      });
      return;
    }

    if (!user?._id) {
      showDialog('Sign In Required', 'Please sign in to save notes to your collections.', [
        { label: 'Okay', role: 'default' },
      ]);
      return;
    }

    if (saveBusy) return;

    if (!isFulfillmentSaved) {
      const saveTitle = fulfillmentNoteId ? 'Save Fulfillment Note' : 'Save Fulfillment Attachment';
      const saveMessage = fulfillmentNoteId
        ? 'Save this fulfillment note to your collections?'
        : 'Save this public fulfillment attachment to your collections?';

      showDialog(saveTitle, saveMessage, [
        { label: 'Not Now', role: 'cancel' },
        {
          label: 'Save',
          onPress: async () => {
            try {
              setSaveBusy(true);
              const result = fulfillmentNoteId
                ? await saveNoteToCollections(fulfillmentNoteId)
                : await saveFulfillmentToCollections(String(fulfillmentRequestId));
              setIsFulfillmentSaved(true);
              Toast.show({
                type: 'success',
                text1: 'Saved to Collection',
                text2: result.createdCollection
                  ? `Created ${result.collectionName} and saved this note.`
                  : `Saved to ${result.collectionName}.`,
              });
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Save Failed',
                text2: error?.message || 'Unable to save this fulfillment item.',
              });
            } finally {
              setSaveBusy(false);
            }
          },
        },
      ]);
      return;
    }

    const removeTitle = fulfillmentNoteId ? 'Remove Saved Note' : 'Remove Saved Attachment';
    const removeMessage = fulfillmentNoteId
      ? 'Remove this fulfillment note from your saved collections?'
      : 'Remove this fulfillment attachment from your saved collections?';

    showDialog(removeTitle, removeMessage, [
      { label: 'Cancel', role: 'cancel' },
      {
        label: 'Remove',
        role: 'destructive',
        onPress: async () => {
          try {
            setSaveBusy(true);
            const state = fulfillmentNoteId
              ? await getNoteSaveState(fulfillmentNoteId)
              : await getFulfillmentSaveState(String(fulfillmentRequestId));
            if (!state.collectionCount) {
              setIsFulfillmentSaved(false);
              Toast.show({
                type: 'error',
                text1: 'Already Removed',
                text2: 'This item is not in your collections anymore.',
              });
              return;
            }

            const removedCount = fulfillmentNoteId
              ? await removeNoteFromAllCollections(fulfillmentNoteId)
              : await removeFulfillmentFromAllCollections(String(fulfillmentRequestId));
            setIsFulfillmentSaved(false);
            Toast.show({
              type: 'success',
              text1: 'Removed from Collections',
              text2: `Removed from ${removedCount} collection${removedCount === 1 ? '' : 's'}.`,
            });
          } catch (error: any) {
            Toast.show({
              type: 'error',
              text1: 'Remove Failed',
              text2: error?.message || 'Unable to remove this fulfillment item.',
            });
          } finally {
            setSaveBusy(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <SkeletonBlock width={24} height={24} borderRadius={12} />
          <SkeletonBlock width={150} height={18} borderRadius={8} style={{ marginLeft: Spacing.sm }} />
        </View>
        <View style={styles.content}>
          <View style={styles.card}>
            <SkeletonBlock width="72%" height={22} borderRadius={10} />
            <SkeletonBlock width="95%" height={14} borderRadius={8} style={{ marginTop: Spacing.md }} />
            <SkeletonBlock width="86%" height={14} borderRadius={8} style={{ marginTop: 8 }} />
            <SkeletonBlock width="42%" height={24} borderRadius={Radius.full} style={{ marginTop: Spacing.md }} />
          </View>
        </View>
      </View>
    );
  }

  if (!requestItem) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.text }}>Request not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.md }}>
          <Text style={{ color: Colors.primary }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View pointerEvents="none" style={styles.blurLayer}>
        <View style={[styles.blurOrb, styles.blurOrbTop]} />
        <View style={[styles.blurOrb, styles.blurOrbMid]} />
        <View style={[styles.blurOrb, styles.blurOrbBottom]} />
      </View>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Request Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{requestItem.title}</Text>
          <Text style={styles.desc}>{requestItem.description}</Text>
          <Text style={styles.subjectText}>{requestSubjectLabel}</Text>
          <View style={[styles.statusBox, {
            backgroundColor: statusTone.backgroundColor,
            borderColor: statusTone.borderColor,
          }]}>
            <Text style={[styles.statusText, { color: statusTone.color }]}>
              Status: {requestItem.status === 'closed' ? `closed (${closedReasonLabel.toLowerCase()})` : requestItem.status}
            </Text>
          </View>
        </View>

        {fulfillment && !isDeletedRequest && (
          <View style={styles.fulfillmentCard}>
            <View style={styles.fulfillmentHeaderRow}>
              <Text style={styles.sectionTitle}>Fulfillment</Text>
              <View style={[styles.visibilityBadge, isFulfillmentPublic ? styles.publicBadge : styles.privateBadge]}>
                <Text style={[styles.visibilityText, isFulfillmentPublic ? styles.publicBadgeText : styles.privateBadgeText]}>
                  {isFulfillmentPublic ? 'Public' : 'Private'}
                </Text>
              </View>
            </View>

            <Text style={styles.fulfillmentTitle}>{fulfillmentTitle}</Text>
            {!!requestItem.fulfillment?.description && (
              <Text style={styles.fulfillmentDescription}>{requestItem.fulfillment.description}</Text>
            )}

            <View style={styles.fulfillmentMetaRow}>
              <Text style={styles.fulfillmentMetaText}>Attachment ready</Text>
              {!!requestItem.fulfillment?.fileSize && (
                <Text style={styles.fulfillmentMetaText}>{formatFileSize(requestItem.fulfillment.fileSize)}</Text>
              )}
            </View>

            {!!requestItem.fulfillment?.uploadedBy && (
              <Text style={styles.fulfillmentMetaText}>
                Uploaded by {requestItem.fulfillment.uploadedBy.name || 'Unknown'}
              </Text>
            )}

            {!!(fulfillmentNoteId || fulfillmentFileUrl) && (
              <TouchableOpacity
                style={[styles.openFileButton, openingFulfillment && { opacity: 0.7 }]}
                onPress={openFulfillment}
                disabled={openingFulfillment}
              >
                <Ionicons name="open-outline" size={18} color={Colors.surface} />
                <Text style={styles.openFileText}>{openingFulfillment ? 'Opening...' : fulfillmentNoteId ? 'Open note' : 'Open attachment'}</Text>
              </TouchableOpacity>
            )}

            {!!(fulfillmentNoteId || canSaveFileFulfillment) && (
              <TouchableOpacity
                style={[styles.saveNoteButton, saveBusy && { opacity: 0.7 }]}
                onPress={toggleFulfillmentSave}
                disabled={saveBusy}
              >
                {saveBusy ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons
                      name={isFulfillmentSaved ? 'bookmark' : 'bookmark-outline'}
                      size={18}
                      color={Colors.primary}
                    />
                    <Text style={styles.saveNoteText}>{isFulfillmentSaved ? 'Saved to Collections' : 'Save to Collections'}</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {canToggleFulfillmentVisibility && (
              <TouchableOpacity
                style={[
                  styles.visibilityActionButton,
                  isFulfillmentPublic ? styles.makePrivateButton : styles.makePublicButton,
                  processing && { opacity: 0.7 },
                ]}
                onPress={handleToggleFulfillmentVisibility}
                disabled={processing}
              >
                {processing
                  ? <ActivityIndicator size="small" color={Colors.surface} />
                  : <Text style={styles.visibilityActionText}>{isFulfillmentPublic ? 'Make Private' : 'Make Public'}</Text>}
              </TouchableOpacity>
            )}
          </View>
        )}

        {canManageRequest && requestItem.status === 'open' && (
          <View style={styles.manageRow}>
            <TouchableOpacity
              style={[styles.manageButton, styles.editButton]}
              onPress={() => router.push(`/request/${id}/edit`)}
              disabled={processing}
            >
              <Ionicons name="create-outline" size={16} color={Colors.surface} />
              <Text style={styles.manageButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.manageButton, styles.deleteButton, processing && pendingAction === 'delete' && { opacity: 0.7 }]}
              onPress={confirmDelete}
              disabled={processing}
            >
              {processing && pendingAction === 'delete'
                ? <ActivityIndicator size="small" color={Colors.surface} />
                : <Ionicons name="trash-outline" size={16} color={Colors.surface} />}
              <Text style={styles.manageButtonText}>{processing && pendingAction === 'delete' ? 'Deleting...' : 'Delete'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.manageButton, styles.closeButton, processing && pendingAction === 'close' && { opacity: 0.7 }]}
              onPress={confirmClose}
              disabled={processing}
            >
              {processing && pendingAction === 'close'
                ? <ActivityIndicator size="small" color={Colors.surface} />
                : <Ionicons name="close-circle-outline" size={16} color={Colors.surface} />}
              <Text style={styles.manageButtonText}>{processing && pendingAction === 'close' ? 'Closing...' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isDeletedRequest && requestItem.status === 'open' && (
          <TouchableOpacity
            style={styles.button}
            onPress={openFulfillModal}
            disabled={fulfillSubmitting || !canFulfill}
          >
            {fulfillSubmitting
              ? <ActivityIndicator size="small" color={Colors.surface} />
              : <Text style={styles.buttonText}>Fulfill Request</Text>}
          </TouchableOpacity>
        )}

        {isRequestOwner && requestItem.status === 'open' && (
          <Text style={styles.helperText}>Only other users can fulfill your request.</Text>
        )}

        {requestItem.status === 'fulfilled' && !fulfillment && !isDeletedRequest && (
          <Text style={styles.helperText}>This request has been fulfilled privately.</Text>
        )}

        {isDeletedRequest && (
          <Text style={styles.helperText}>This request was deleted and its uploaded file was removed.</Text>
        )}

        {requestItem.status === 'closed' && (
          <Text style={styles.helperText}>
            Closed as {closedReasonLabel.toLowerCase()}.
          </Text>
        )}

        {canReopen && !isDeletedRequest && (
          <TouchableOpacity
            style={[styles.reopenButton, reopening && { opacity: 0.7 }]}
            onPress={handleReopen}
            disabled={reopening}
          >
            {reopening
              ? <ActivityIndicator size="small" color={Colors.surface} />
              : <Text style={styles.reopenButtonText}>Reopen Request</Text>}
          </TouchableOpacity>
        )}

        {canDeleteFulfilledRequest && !isDeletedRequest && (
          <TouchableOpacity
            style={[styles.fulfilledDeleteButton, processing && pendingAction === 'delete' && { opacity: 0.7 }]}
            onPress={confirmDelete}
            disabled={processing}
          >
            {processing && pendingAction === 'delete'
              ? <ActivityIndicator size="small" color={Colors.surface} />
              : <Text style={styles.fulfilledDeleteButtonText}>Delete Request</Text>}
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => !processing && setShowDeleteModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>{pendingAction === 'close' ? 'Close Request' : 'Delete Request'}</Text>
            <Text style={styles.modalText}>
              {pendingAction === 'close'
                ? 'This will move the request to Closed and mark it as cancelled.'
                : 'This will move the request to Closed and mark it as deleted.'}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowDeleteModal(false)}
                disabled={processing}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton, processing && { opacity: 0.7 }]}
                onPress={handlePrimaryAction}
                disabled={processing}
              >
                {processing
                  ? <ActivityIndicator size="small" color={Colors.surface} />
                  : <Text style={styles.modalDeleteText}>{pendingAction === 'close' ? 'Close' : 'Delete'}</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showFulfillModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFulfillModal(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => !fulfillSubmitting && setShowFulfillModal(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Fulfill Request</Text>
            <Text style={styles.modalText}>
              Upload a PDF, Word document, or image. Max {MAX_REQUEST_FILE_SIZE_MB} MB.
            </Text>

            <TouchableOpacity 
              style={[styles.filePicker, isPickingDocument && { opacity: 0.6 }]} 
              onPress={pickFulfillmentFile}
              disabled={isPickingDocument}
            >
              <Ionicons name="attach-outline" size={20} color={Colors.primary} />
              <Text style={styles.filePickerText} numberOfLines={1}>
                {isPickingDocument ? 'Selecting file...' : (fulfillFile ? fulfillFile.name : 'Tap to select a file')}
              </Text>
            </TouchableOpacity>

            <Text style={styles.label}>Small description</Text>
            <TextInput
              style={[styles.input, styles.descriptionInput]}
              placeholder="Add a short description..."
              placeholderTextColor={Colors.textMuted}
              value={fulfillDescription}
              onChangeText={setFulfillDescription}
              multiline
            />
            <Text style={styles.fileHint}>
              PDF, Word docs, and images only. Max {MAX_REQUEST_FILE_SIZE_MB} MB.
              {fulfillFile ? ` Selected: ${formatFileSize(fulfillFile.size)}.` : ''}
            </Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setShowFulfillModal(false)}
                disabled={fulfillSubmitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalDeleteButton, fulfillSubmitting && { opacity: 0.7 }]}
                onPress={submitFulfillment}
                disabled={fulfillSubmitting}
              >
                {fulfillSubmitting
                  ? <ActivityIndicator size="small" color={Colors.surface} />
                  : <Text style={styles.modalDeleteText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {dialogElement}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  blurOrb: {
    position: 'absolute',
    borderRadius: Radius.full,
  },
  blurOrbTop: {
    width: 240,
    height: 240,
    top: -90,
    right: -60,
    backgroundColor: 'rgba(59,130,246,0.13)',
  },
  blurOrbMid: {
    width: 180,
    height: 180,
    top: 180,
    left: -70,
    backgroundColor: 'rgba(96,165,250,0.12)',
  },
  blurOrbBottom: {
    width: 220,
    height: 220,
    bottom: -100,
    right: -80,
    backgroundColor: 'rgba(29,78,216,0.10)',
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  content: { padding: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '1F' },
  title: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  desc: { fontSize: FontSizes.md, color: Colors.textMuted, lineHeight: 22, marginBottom: Spacing.lg },
  subjectText: { color: Colors.textMuted, fontSize: FontSizes.sm, fontWeight: '600', marginBottom: Spacing.sm },
  statusBox: { padding: Spacing.sm, borderRadius: Radius.sm, alignSelf: 'flex-start', borderWidth: 1 },
  statusText: { fontWeight: '700', fontSize: FontSizes.sm },
  fulfillmentCard: { marginTop: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.primary + '1F' },
  fulfillmentHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '800' },
  visibilityBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  publicBadge: { backgroundColor: Colors.primary + '22', borderWidth: 1, borderColor: Colors.primary + '55' },
  privateBadge: { backgroundColor: '#DBEAFE', borderWidth: 1, borderColor: '#93C5FD' },
  visibilityText: { fontSize: FontSizes.xs, fontWeight: '700' },
  publicBadgeText: { color: '#1D4ED8' },
  privateBadgeText: { color: '#1E40AF' },
  fulfillmentTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  fulfillmentDescription: { color: Colors.textMuted, fontSize: FontSizes.sm, lineHeight: 20, marginTop: 6 },
  fulfillmentMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm, marginTop: 10 },
  fulfillmentMetaText: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4 },
  openFileButton: { marginTop: Spacing.md, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, backgroundColor: Colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  openFileText: { color: Colors.surface, fontSize: FontSizes.sm, fontWeight: '700' },
  saveNoteButton: { marginTop: Spacing.sm, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: Colors.primary + '38', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  saveNoteText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: '700' },
  visibilityActionButton: { marginTop: Spacing.sm, borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center' },
  makePublicButton: { backgroundColor: '#2563EB' },
  makePrivateButton: { backgroundColor: '#1D4ED8' },
  visibilityActionText: { color: Colors.surface, fontSize: FontSizes.sm, fontWeight: '700' },
  manageRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md },
  manageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
  },
  editButton: { backgroundColor: Colors.primary },
  closeButton: { backgroundColor: '#1D4ED8' },
  deleteButton: { backgroundColor: '#2563EB' },
  manageButtonText: { color: Colors.surface, fontSize: FontSizes.sm, fontWeight: '700' },
  button: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg },
  buttonText: { color: Colors.surface, fontSize: FontSizes.md, fontWeight: '700' },
  helperText: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: Spacing.sm, textAlign: 'center' },
  reopenButton: {
    marginTop: Spacing.md,
    backgroundColor: '#2563EB',
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  reopenButtonText: { color: Colors.surface, fontSize: FontSizes.md, fontWeight: '700' },
  fulfilledDeleteButton: {
    marginTop: Spacing.md,
    backgroundColor: '#1D4ED8',
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  fulfilledDeleteButtonText: { color: Colors.surface, fontSize: FontSizes.md, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    color: Colors.text,
    fontSize: FontSizes.xl,
    fontWeight: '800',
    marginBottom: Spacing.sm,
  },
  modalText: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalButton: {
    flex: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  modalCancelButton: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalDeleteButton: {
    backgroundColor: Colors.primary,
  },
  modalCancelText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  modalDeleteText: {
    color: Colors.surface,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  filePicker: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', gap: 10, marginTop: Spacing.md },
  filePickerText: { color: Colors.textMuted, flex: 1, fontSize: FontSizes.sm },
  label: { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: '600', marginBottom: 6, marginTop: Spacing.md },
  input: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: Spacing.md, color: Colors.text, fontSize: FontSizes.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
  descriptionInput: { minHeight: 90, textAlignVertical: 'top' },
  fileHint: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: -Spacing.xs, marginBottom: Spacing.sm },
});
