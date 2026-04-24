import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Modal, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { requestService } from '../../services/dataServices';
import { useAuth } from '../../context/AuthContext';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function RequestDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [requestItem, setRequestItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [fulfilling, setFulfilling] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<'delete' | 'close' | null>(null);

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
  const canManageRequest = !!user && (
    user.role === 'admin' || isRequestOwner
  );
  const canReopen = isRequestOwner && requestItem?.status === 'closed' && requestItem?.closedReason === 'cancelled';

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

  const confirmFulfill = () => {
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

    Alert.alert(
      'Fulfill Request',
      'Mark this request as fulfilled?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fulfill',
          onPress: async () => {
            try {
              setFulfilling(true);
              const res = await requestService.fulfillRequest(id as string);
              setRequestItem(res.data);
              Toast.show({ type: 'success', text1: 'Request marked as fulfilled' });
            } catch (e: any) {
              Toast.show({ type: 'error', text1: 'Fulfill failed', text2: e.message });
            } finally {
              setFulfilling(false);
            }
          },
        },
      ]
    );
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

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  if (!requestItem) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.text }}>Request not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: Spacing.md }}><Text style={{ color: Colors.primary }}>Go Back</Text></TouchableOpacity>
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
            (isRequestOwner || requestItem.status !== 'open') && { opacity: 0.7 },
          ]}
          onPress={confirmFulfill}
          disabled={fulfilling || isRequestOwner || requestItem.status !== 'open'}
        >
          {fulfilling
            ? <ActivityIndicator size="small" color={Colors.text} />
            : <Text style={styles.buttonText}>{requestItem.status === 'fulfilled' ? 'Already Fulfilled' : 'Fulfill Request'}</Text>}
        </TouchableOpacity>

        {isRequestOwner && requestItem.status === 'open' && (
          <Text style={styles.helperText}>Only other users can fulfill your request.</Text>
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
});
