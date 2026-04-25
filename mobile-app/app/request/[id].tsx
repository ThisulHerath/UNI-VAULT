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
import { useAuth } from '../../context/AuthContext';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

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
  const isFulfillmentPublic = !!requestItem?.fulfillment?.isPublic;
  const canPublishFulfillment = isRequestOwner && !!requestItem?.fulfillment && !isFulfillmentPublic;
  const fulfillmentNoteId = requestItem?.fulfilledByNote?._id || requestItem?.fulfilledByNote?.id || null;

  const closedReasonLabel = requestItem?.closedReason
    ? requestItem.closedReason.charAt(0).toUpperCase() + requestItem.closedReason.slice(1)
    : 'Closed';

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
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/pdf',
        'image/*',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ],
      copyToCacheDirectory: true,
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

  const handleMakePublic = async () => {
    try {
      setProcessing(true);
      const res = await requestService.updateFulfillmentVisibility(id as string, true);
      setRequestItem(res.data);
      Toast.show({ type: 'success', text1: 'Fulfillment is now public' });
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
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
          <View style={styles.statusBox}>
            <Text style={styles.statusText}>
              Status: {requestItem.status === 'closed' ? `closed (${closedReasonLabel.toLowerCase()})` : requestItem.status}
            </Text>
          </View>
        </View>

        {fulfillment && (
          <View style={styles.fulfillmentCard}>
            <View style={styles.fulfillmentHeaderRow}>
              <Text style={styles.sectionTitle}>Fulfillment</Text>
              <View style={[styles.visibilityBadge, isFulfillmentPublic ? styles.publicBadge : styles.privateBadge]}>
                <Text style={styles.visibilityText}>{isFulfillmentPublic ? 'Public' : 'Private'}</Text>
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
                <Ionicons name="open-outline" size={18} color={Colors.text} />
                <Text style={styles.openFileText}>{openingFulfillment ? 'Opening...' : fulfillmentNoteId ? 'Open note' : 'Open attachment'}</Text>
              </TouchableOpacity>
            )}

            {canPublishFulfillment && (
              <TouchableOpacity
                style={[styles.publishButton, processing && { opacity: 0.7 }]}
                onPress={handleMakePublic}
                disabled={processing}
              >
                {processing
                  ? <ActivityIndicator size="small" color={Colors.text} />
                  : <Text style={styles.publishButtonText}>Make Public</Text>}
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
              <Ionicons name="create-outline" size={16} color={Colors.text} />
              <Text style={styles.manageButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.manageButton, styles.deleteButton, processing && pendingAction === 'delete' && { opacity: 0.7 }]}
              onPress={confirmDelete}
              disabled={processing}
            >
              {processing && pendingAction === 'delete'
                ? <ActivityIndicator size="small" color={Colors.text} />
                : <Ionicons name="trash-outline" size={16} color={Colors.text} />}
              <Text style={styles.manageButtonText}>{processing && pendingAction === 'delete' ? 'Deleting...' : 'Delete'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.manageButton, styles.closeButton, processing && pendingAction === 'close' && { opacity: 0.7 }]}
              onPress={confirmClose}
              disabled={processing}
            >
              {processing && pendingAction === 'close'
                ? <ActivityIndicator size="small" color={Colors.text} />
                : <Ionicons name="close-circle-outline" size={16} color={Colors.text} />}
              <Text style={styles.manageButtonText}>{processing && pendingAction === 'close' ? 'Closing...' : 'Close'}</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            (!canFulfill || requestItem.status !== 'open') && { opacity: 0.7 },
          ]}
          onPress={openFulfillModal}
          disabled={fulfillSubmitting || !canFulfill || requestItem.status !== 'open'}
        >
          {fulfillSubmitting
            ? <ActivityIndicator size="small" color={Colors.text} />
            : <Text style={styles.buttonText}>{requestItem.status === 'fulfilled' ? 'Already Fulfilled' : 'Fulfill Request'}</Text>}
        </TouchableOpacity>

        {isRequestOwner && requestItem.status === 'open' && (
          <Text style={styles.helperText}>Only other users can fulfill your request.</Text>
        )}

        {requestItem.status === 'fulfilled' && !fulfillment && (
          <Text style={styles.helperText}>This request has been fulfilled privately.</Text>
        )}

        {requestItem.status === 'closed' && (
          <Text style={styles.helperText}>
            Closed as {closedReasonLabel.toLowerCase()}.
          </Text>
        )}

        {canReopen && (
          <TouchableOpacity
            style={[styles.reopenButton, reopening && { opacity: 0.7 }]}
            onPress={handleReopen}
            disabled={reopening}
          >
            {reopening
              ? <ActivityIndicator size="small" color={Colors.text} />
              : <Text style={styles.reopenButtonText}>Reopen Request</Text>}
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
                  ? <ActivityIndicator size="small" color={Colors.text} />
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

            <TouchableOpacity style={styles.filePicker} onPress={pickFulfillmentFile}>
              <Ionicons name="attach-outline" size={20} color={Colors.primary} />
              <Text style={styles.filePickerText} numberOfLines={1}>
                {fulfillFile ? fulfillFile.name : 'Tap to select a file'}
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
                  ? <ActivityIndicator size="small" color={Colors.text} />
                  : <Text style={styles.modalDeleteText}>Submit</Text>}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.sm, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  content: { padding: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  title: { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.sm },
  desc: { fontSize: FontSizes.md, color: Colors.textMuted, lineHeight: 22, marginBottom: Spacing.lg },
  statusBox: { backgroundColor: Colors.primary + '20', padding: Spacing.sm, borderRadius: Radius.sm, alignSelf: 'flex-start' },
  statusText: { color: Colors.primary, fontWeight: '700', fontSize: FontSizes.sm },
  fulfillmentCard: { marginTop: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  fulfillmentHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  sectionTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '800' },
  visibilityBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  publicBadge: { backgroundColor: Colors.success + '25' },
  privateBadge: { backgroundColor: Colors.warning + '25' },
  visibilityText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '700' },
  fulfillmentTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  fulfillmentDescription: { color: Colors.textMuted, fontSize: FontSizes.sm, lineHeight: 20, marginTop: 6 },
  fulfillmentMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm, marginTop: 10 },
  fulfillmentMetaText: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4 },
  openFileButton: { marginTop: Spacing.md, borderRadius: Radius.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, backgroundColor: Colors.primary, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  openFileText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '700' },
  publishButton: { marginTop: Spacing.sm, borderRadius: Radius.md, paddingVertical: Spacing.sm, alignItems: 'center', backgroundColor: Colors.warning },
  publishButtonText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '700' },
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
  editButton: { backgroundColor: Colors.secondary },
  closeButton: { backgroundColor: Colors.warning },
  deleteButton: { backgroundColor: Colors.error },
  manageButtonText: { color: Colors.text, fontSize: FontSizes.sm, fontWeight: '700' },
  button: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.lg },
  buttonText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  helperText: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: Spacing.sm, textAlign: 'center' },
  reopenButton: {
    marginTop: Spacing.md,
    backgroundColor: Colors.success,
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  reopenButtonText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
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
    backgroundColor: Colors.error,
  },
  modalCancelText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  modalDeleteText: {
    color: Colors.text,
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