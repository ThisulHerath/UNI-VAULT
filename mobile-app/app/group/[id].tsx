import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import Toast from 'react-native-toast-message';
import { io, Socket } from 'socket.io-client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { groupService } from '../../services/dataServices';
import { getSavedStateMapForNotes } from '../../services/collectionLogic';
import { useAppDialog } from '../../hooks/use-app-dialog';
import { API_ORIGIN } from '../../services/api';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';
import { useAuth } from '../../context/AuthContext';

const MAX_CHAT_ATTACHMENT_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const MAX_CHAT_ATTACHMENT_FILE_SIZE_MB = 15;
const ALLOWED_CHAT_ATTACHMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const formatFileSize = (bytes?: number) => {
  if (!bytes && bytes !== 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getAttachmentKind = (mimeType?: string, fileName?: string) => {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType?.startsWith('image/')) return 'image';
  if (mimeType === 'application/msword') return 'doc';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';

  const extension = fileName?.split('.').pop()?.toLowerCase();
  if (extension === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
  if (extension === 'doc') return 'doc';
  if (extension === 'docx') return 'docx';
  return 'file';
};

const isAllowedChatAttachment = (mimeType?: string, fileName?: string) => {
  if (mimeType && ALLOWED_CHAT_ATTACHMENT_MIME_TYPES.has(mimeType)) {
    return true;
  }

  const extension = fileName?.split('.').pop()?.toLowerCase();
  return extension ? ['pdf', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'doc', 'docx'].includes(extension) : false;
};

const withAuthToken = (url: string, token?: string | null) => {
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};

const formatRelativeTime = (date?: Date | string) => {
  if (!date) return 'recently';
  const requestDate = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - requestDate.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  return requestDate.toLocaleDateString();
};

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams();
  const { user, token } = useAuth();
  const { dialogElement } = useAppDialog();
  const insets = useSafeAreaInsets();

  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState('');
  const [messageText, setMessageText] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<'info' | 'chat'>('info');
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string; text: string } | null>(null);
  const [leaveConfirmationVisible, setLeaveConfirmationVisible] = useState(false);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [attachmentPickerVisible, setAttachmentPickerVisible] = useState(false);
  const [isPickingDocument, setIsPickingDocument] = useState(false);
  const [memberActionConfirmation, setMemberActionConfirmation] = useState<{
    userId: string;
    memberName: string;
    action: 'remove' | 'promote' | 'demote';
  } | null>(null);
  const [activeAttachment, setActiveAttachment] = useState<{
    url: string;
    fileType?: string;
    fileMimeType?: string;
    name?: string;
  } | null>(null);
  const [draftCoverImage, setDraftCoverImage] = useState<{ uri: string } | null>(null);
  const [, setSharedNoteSavedState] = useState<Record<string, boolean>>({});
  const socketRef = useRef<Socket | null>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);
  const shouldAutoScrollRef = useRef(false);

  const currentUserId = user?._id;
  const requesterRole = group?.requesterRole || 'guest';
  const requesterRoleFromPayload = requesterRole === 'owner' || requesterRole === 'admin' || requesterRole === 'member';
  const derivedMembership = Array.isArray(group?.members) && !!currentUserId
    ? group.members.some((member: any) => {
        const memberId = member?.user?._id || member?.user;
        return String(memberId) === String(currentUserId) && member?.role !== 'pending';
      })
    : false;
  const isOwner = requesterRole === 'owner';
  const isAdmin = requesterRole === 'admin' || isOwner;
  const isMember = (requesterRole === 'member' || isAdmin) || (!requesterRoleFromPayload && derivedMembership);

  const load = useCallback(async () => {
    try {
      console.log('Loading group data for ID:', id);
      const res = await groupService.getGroupById(id as string);
      console.log('Group data loaded:', res.data);
      setGroup(res.data);
    } catch (e: any) {
      console.error('Error loading group:', e);
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  useEffect(() => {
    if (!isMember && activeSection === 'chat') {
      setActiveSection('info');
    }
  }, [isMember, activeSection]);

  useEffect(() => {
    if (activeSection === 'chat') {
      shouldAutoScrollRef.current = true;
    }
  }, [activeSection]);

  useEffect(() => {
    let mounted = true;

    const syncSavedState = async () => {
      if (!user?._id) {
        if (mounted) setSharedNoteSavedState({});
        return;
      }

      const sharedNotes = Array.isArray(group?.sharedNotes) ? group.sharedNotes : [];
      const noteIds = sharedNotes
        .map((note: any) => note?._id || note?.id)
        .filter(Boolean)
        .map((noteId: any) => String(noteId));

      if (!noteIds.length) {
        if (mounted) setSharedNoteSavedState({});
        return;
      }

      try {
        const nextState = await getSavedStateMapForNotes(noteIds);
        if (mounted) setSharedNoteSavedState(nextState);
      } catch {
        if (mounted) setSharedNoteSavedState({});
      }
    };

    syncSavedState();
    return () => {
      mounted = false;
    };
  }, [group?.sharedNotes, user?._id]);

  // Socket.IO setup for real-time chat
  useEffect(() => {
    if (isMember && activeSection === 'chat' && id) {
      console.log('Setting up socket connection for group:', id);
      // Connect to socket
      const socket = io(API_ORIGIN, {
        transports: ['websocket'],
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('Socket connected:', socket.id);
        // Re-join group room after reconnection
        setTimeout(() => {
          socket.emit('join-group', id);
          console.log('Joined group room after connection:', id);
        }, 100);
      });

      socket.on('disconnect', () => {
        console.log('Socket disconnected');
      });

      // Test socket connection
      socket.emit('ping', 'test');
      socket.on('pong', (data) => {
        console.log('Socket test response:', data);
      });

      // Join group room
      socket.emit('join-group', id);
      console.log('Joined group room:', id);

      // Listen for new messages
      socket.on('new-message', (data: { groupId: string; message: any }) => {
        console.log('Received new message:', data);
        if (data.groupId === id) {
          setGroup((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: [...prev.messages, data.message],
            };
          });
        }
      });

      // Listen for deleted messages
      socket.on('delete-message', (data: { groupId: string; messageId: string }) => {
        console.log('Received delete message:', data);
        if (data.groupId === id) {
          setGroup((prev: any) => {
            if (!prev) return prev;
            return {
              ...prev,
              messages: prev.messages.filter((msg: any) => msg._id !== data.messageId),
            };
          });
        }
      });

      return () => {
        console.log('Cleaning up socket connection');
        socket.emit('leave-group', id);
        socket.disconnect();
        socketRef.current = null;
      };
    } else if (socketRef.current) {
      // Leave group if not in chat anymore
      console.log('Leaving group room:', id);
      socketRef.current.emit('leave-group', id);
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, [isMember, activeSection, id]);

  const runAction = async (key: string, task: () => Promise<void>) => {
    setBusyAction(key);
    try {
      await task();
    } catch (error: any) {
      const message = error?.message || 'Something went wrong.';
      Toast.show({ type: 'error', text1: 'Failed', text2: message });
    } finally {
      setBusyAction(null);
    }
  };

  const handleJoin = async () => {
    if (!group) return;

    await runAction('join', async () => {
      if (group.privacy === 'private') {
        if (!inviteCode.trim()) {
          Toast.show({ type: 'error', text1: 'Invitation code required' });
          return;
        }
        const res = await groupService.joinGroupByCode(inviteCode.trim().toUpperCase());
        Toast.show({ type: 'success', text1: 'Success', text2: res.message || 'Joined successfully.' });
      } else {
        const res = await groupService.joinGroup(group._id);
        Toast.show({ type: 'success', text1: 'Success', text2: res.message || 'Request submitted.' });
      }
      await load();
    });
  };

  const handleRequestAction = async (userId: string, action: 'approve' | 'reject') => {
    if (!group) return;
    await runAction(`${action}-${userId}`, async () => {
      const res = await groupService.manageMember(group._id, userId, action);
      Toast.show({ type: 'success', text1: 'Updated', text2: res.message || `Request ${action}d.` });
      await load();
    });
  };

  const handleMemberAction = async (userId: string, action: 'remove' | 'promote' | 'demote') => {
    if (!group) return;
    await runAction(`${action}-${userId}`, async () => {
      const res = await groupService.manageMember(group._id, userId, action);
      Toast.show({ type: 'success', text1: 'Updated', text2: res.message || `Member ${action}d.` });
      await load();
    });
  };

  const confirmMemberAction = (userId: string, memberName: string, action: 'remove' | 'promote' | 'demote') => {
    setMemberActionConfirmation({ userId, memberName, action });
  };

  const cancelMemberAction = () => setMemberActionConfirmation(null);

  const approveMemberAction = async () => {
    if (!memberActionConfirmation) return;

    const { userId, action } = memberActionConfirmation;
    setMemberActionConfirmation(null);
    await handleMemberAction(userId, action);
  };

  const handleRotateCode = async () => {
    if (!group) return;
    await runAction('rotate-code', async () => {
      const res = await groupService.updateInvitationCode(group._id);
      Toast.show({
        type: 'success',
        text1: 'Code Updated',
        text2: res.data?.invitationCode || 'New invitation code generated.',
      });
      await load();
    });
  };

  const handleLeave = () => {
    if (!group) return;

    setLeaveConfirmationVisible(true);
  };

  const cancelAttachment = () => setPendingAttachment(null);

  const validateAttachment = (file: any) => {
    if (!isAllowedChatAttachment(file.mimeType, file.name)) {
      Toast.show({
        type: 'error',
        text1: 'Unsupported file type',
        text2: 'Only images, PDFs, and docs are allowed.',
      });
      return false;
    }

    if (file.size && file.size > MAX_CHAT_ATTACHMENT_FILE_SIZE_BYTES) {
      Toast.show({
        type: 'error',
        text1: 'File too large',
        text2: `Maximum size is ${MAX_CHAT_ATTACHMENT_FILE_SIZE_MB} MB.`,
      });
      return false;
    }

    return true;
  };

  const pickDocumentAttachment = async () => {
    if (isPickingDocument) return; // Prevent concurrent calls
    
    setIsPickingDocument(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/*',
        ],
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      const nextAttachment = {
        uri: file.uri,
        name: file.name,
        mimeType: file.mimeType || 'application/octet-stream',
        size: file.size,
        kind: getAttachmentKind(file.mimeType, file.name),
      };

      if (validateAttachment(nextAttachment)) {
        setPendingAttachment(nextAttachment);
      }
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

  const promptAttachmentPicker = () => {
    setAttachmentPickerVisible(true);
  };

  const closeAttachmentPicker = () => setAttachmentPickerVisible(false);

  const chooseAttachmentFile = async () => {
    setAttachmentPickerVisible(false);
    await pickDocumentAttachment();
  };

  const cancelLeave = () => setLeaveConfirmationVisible(false);

  const pickGroupCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets?.[0]) {
      setDraftCoverImage({ uri: result.assets[0].uri });
    }
  };

  const saveGroupCoverImage = async () => {
    if (!group || !draftCoverImage) return;

    await runAction('cover-update', async () => {
      await groupService.updateGroupProfileImage(group._id, {
        uri: draftCoverImage.uri,
        type: 'image/jpeg',
        name: 'group-profile.jpg',
      });
      setDraftCoverImage(null);
      Toast.show({ type: 'success', text1: 'Updated', text2: 'Group profile picture saved.' });
      await load();
    });
  };

  const removeGroupCoverImage = async () => {
    if (!group) return;

    if (draftCoverImage) {
      setDraftCoverImage(null);
      if (!group.coverImage) return;
    }

    if (!group.coverImage) return;

    await runAction('cover-remove', async () => {
      await groupService.deleteGroupProfileImage(group._id);
      setDraftCoverImage(null);
      Toast.show({ type: 'success', text1: 'Removed', text2: 'Group profile picture deleted.' });
      await load();
    });
  };

  const confirmLeave = async () => {
    if (!group) return;

    await runAction('leave', async () => {
      const res = await groupService.leaveGroup(group._id);
      setLeaveConfirmationVisible(false);
      Toast.show({ type: 'success', text1: 'Left Group', text2: res.message || 'You left the group.' });
      router.replace('/(tabs)/groups');
    });
  };

  const handleDelete = async () => {
    if (!group) return;
    await runAction('delete', async () => {
      const res = await groupService.deleteGroup(group._id);
      Toast.show({ type: 'success', text1: 'Deleted', text2: res.message || 'Group deleted.' });
      router.replace('/(tabs)/groups');
    });
  };

  const handleSendMessage = async () => {
    if (!group) return;

    const trimmedMessage = messageText.trim();
    if (!trimmedMessage && !pendingAttachment) return;

    console.log('Sending message:', trimmedMessage);
    console.log('Socket connected:', socketRef.current?.connected);
    await runAction('send-message', async () => {
      try {
        const formData = new FormData();
        formData.append('text', trimmedMessage);

        if (pendingAttachment) {
          formData.append('attachment', {
            uri: pendingAttachment.uri,
            type: pendingAttachment.mimeType || 'application/octet-stream',
            name: pendingAttachment.name,
          } as any);
        }

        const result = await groupService.sendMessage(group._id, formData);
        console.log('Message sent successfully:', result);
        Toast.show({ type: 'success', text1: 'Message sent!' });
        setMessageText('');
        setPendingAttachment(null);
        shouldAutoScrollRef.current = true;
        // Fallback: refresh messages if socket doesn't work
        await load();
      } catch (error) {
        console.error('Error sending message:', error);
        const message = error instanceof Error ? error.message : 'Unknown error';
        Toast.show({ type: 'error', text1: 'Failed to send message', text2: message });
      }
    });
  };

  const confirmDeleteMessage = (messageId: string, messageText: string) => {
    if (!group) return;
    setDeleteConfirmation({ id: messageId, text: messageText });
  };

  const deleteSelectedMessage = async () => {
    if (!group || !deleteConfirmation) return;
    const { id: messageId } = deleteConfirmation;
    await runAction(`delete-message-${messageId}`, async () => {
      await groupService.deleteMessage(group._id, messageId);
      Toast.show({ type: 'success', text1: 'Deleted', text2: 'Message deleted.' });
      setDeleteConfirmation(null);
      // No need to call load() - socket will handle real-time update
    });
  };

  const cancelDeleteMessage = () => setDeleteConfirmation(null);
  const closeAttachmentPreview = () => setActiveAttachment(null);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!group) {
    return (
      <View style={styles.center}>
        <Text style={{ color: Colors.text }}>Group not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ color: Colors.primary, marginTop: 10 }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pendingRequests = Array.isArray(group.joinRequests)
    ? group.joinRequests.filter((request: any) => request.status === 'pending')
    : [];

  const visibleMessages = Array.isArray(group.messages) ? group.messages.slice(-30) : [];
  const ownerId = group.createdBy?._id || group.createdBy;
  const ownerFromMembers = Array.isArray(group.members)
    ? group.members.find((member: any) => {
        const memberId = member.user?._id || member.user;
        return String(memberId) === String(ownerId);
      })
    : null;
  const groupAdminName =
    group.createdBy?.name ||
    ownerFromMembers?.user?.name ||
    ownerFromMembers?.name ||
    (group.createdBy && typeof group.createdBy === 'string' ? 'Group Owner' : 'Unknown');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: Spacing.sm }}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Group Details</Text>
      </View>

      <View style={styles.switchRow}>
        <TouchableOpacity
          style={[styles.switchBtn, activeSection === 'info' && styles.switchBtnActive]}
          onPress={() => setActiveSection('info')}
        >
          <Text style={[styles.switchText, activeSection === 'info' && styles.switchTextActive]}>Group Info</Text>
        </TouchableOpacity>

        {isMember && (
          <TouchableOpacity
            style={[styles.switchBtn, activeSection === 'chat' && styles.switchBtnActive]}
            onPress={() => setActiveSection('chat')}
          >
            <Text style={[styles.switchText, activeSection === 'chat' && styles.switchTextActive]}>Chat</Text>
          </TouchableOpacity>
        )}
      </View>

      {activeSection === 'info' ? (
        <ScrollView contentContainerStyle={styles.content}>
          {activeSection === 'info' && (
            <>
              <View style={styles.card}>
                <View style={styles.groupCoverHeader}>
                  {draftCoverImage?.uri || group.coverImage ? (
                    <Image source={{ uri: draftCoverImage?.uri || group.coverImage }} style={styles.groupCoverImage} />
                  ) : (
                    <View style={styles.groupCoverPlaceholder}>
                      <Ionicons name="people" size={34} color={Colors.primary} />
                    </View>
                  )}
                  {isAdmin && (
                    <View style={styles.groupCoverActions}>
                      <TouchableOpacity
                        style={styles.groupCoverActionBtn}
                        onPress={pickGroupCoverImage}
                        disabled={busyAction === 'cover-update' || busyAction === 'cover-remove'}
                      >
                        <Ionicons name="image-outline" size={16} color={Colors.primary} />
                        <Text style={styles.groupCoverActionText}>
                          {group.coverImage || draftCoverImage ? 'Change' : 'Add'}
                        </Text>
                      </TouchableOpacity>

                      {!!(group.coverImage || draftCoverImage) && (
                        <TouchableOpacity
                          style={[styles.groupCoverActionBtn, styles.groupCoverDeleteBtn]}
                          onPress={removeGroupCoverImage}
                          disabled={busyAction === 'cover-update' || busyAction === 'cover-remove'}
                        >
                          {busyAction === 'cover-remove' ? (
                            <ActivityIndicator size="small" color={Colors.error} />
                          ) : (
                            <>
                              <Ionicons name="trash-outline" size={16} color={Colors.error} />
                              <Text style={[styles.groupCoverActionText, styles.groupCoverDeleteText]}>Delete</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {draftCoverImage && (
                        <TouchableOpacity
                          style={[styles.groupCoverActionBtn, styles.groupCoverSaveBtn]}
                          onPress={saveGroupCoverImage}
                          disabled={busyAction === 'cover-update' || busyAction === 'cover-remove'}
                        >
                          {busyAction === 'cover-update' ? (
                            <ActivityIndicator size="small" color={Colors.text} />
                          ) : (
                            <>
                              <Ionicons name="checkmark" size={16} color={Colors.text} />
                              <Text style={[styles.groupCoverActionText, styles.groupCoverSaveText]}>Save</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                <Text style={styles.sectionTitle}>Group Overview</Text>
                <Text style={styles.title}>{group.name}</Text>
                <Text style={styles.desc}>{group.description || 'No description provided'}</Text>
                <View style={styles.groupMetaPanel}>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Privacy</Text>
                    <Text style={styles.metaValue}>{group.privacy}</Text>
                  </View>
                  {group.privacy === 'public' && (
                    <View style={styles.metaRow}>
                      <Text style={styles.metaLabel}>Join Mode</Text>
                      <Text style={styles.metaValue}>{group.joinMode === 'request' ? 'Request approval' : 'Open'}</Text>
                    </View>
                  )}
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Members</Text>
                    <Text style={styles.metaValue}>{group.memberCount || group.members?.length || 0}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Group Admin</Text>
                    <Text style={styles.metaValue}>{groupAdminName}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaLabel}>Your Role</Text>
                    <Text style={styles.metaValue}>{requesterRole}</Text>
                  </View>
                </View>

                {group.privacy === 'public' && (
                  <View style={styles.infoBadgeRow}>
                    <View style={styles.infoBadge}>
                      <Ionicons name="earth-outline" size={14} color={Colors.primary} />
                      <Text style={styles.infoBadgeText}>Public Group</Text>
                    </View>
                    <View style={styles.infoBadge}>
                      <Ionicons name="people-outline" size={14} color={Colors.primary} />
                      <Text style={styles.infoBadgeText}>{group.memberCount || group.members?.length || 0} members</Text>
                    </View>
                  </View>
                )}
                {isAdmin && group.privacy === 'private' && !!group.invitationCode && (
                  <Text style={styles.meta}>Invitation Code: {group.invitationCode}</Text>
                )}
              </View>

              {!isMember && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Join This Group</Text>
                  {group.privacy === 'private' && (
                    <TextInput
                      style={styles.input}
                      value={inviteCode}
                      onChangeText={setInviteCode}
                      placeholder="Enter invitation code"
                      placeholderTextColor={Colors.textMuted}
                      autoCapitalize="characters"
                    />
                  )}
                  <TouchableOpacity style={styles.button} onPress={handleJoin} disabled={busyAction === 'join'}>
                    {busyAction === 'join' ? (
                      <ActivityIndicator color={Colors.text} />
                    ) : (
                      <Text style={styles.buttonText}>
                        {group.privacy === 'private'
                          ? 'Join with Code'
                          : group.joinMode === 'request'
                            ? 'Request to Join'
                            : 'Join Now'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {isAdmin && group.privacy === 'private' && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Invitation Code Management</Text>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleRotateCode}
                    disabled={busyAction === 'rotate-code'}
                  >
                    {busyAction === 'rotate-code' ? (
                      <ActivityIndicator color={Colors.text} />
                    ) : (
                      <Text style={styles.buttonText}>Regenerate Invitation Code</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {isAdmin && pendingRequests.length > 0 && (
                <View style={styles.card}>
                  <View style={styles.requestsHeader}>
                    <Text style={styles.sectionTitle}>Pending Requests</Text>
                    <View style={styles.requestCountBadge}>
                      <Text style={styles.requestCountText}>{pendingRequests.length}</Text>
                    </View>
                  </View>
                  <View style={styles.requestsList}>
                    {pendingRequests.map((request: any, index: number) => {
                      const requestUserId = request.user?._id || request.user;
                      const userName = request.user?.name || 'Unknown user';
                      const userInitial = userName.charAt(0).toUpperCase();
                      const userAvatar = request.user?.avatar;
                      const requestTime = formatRelativeTime(request.requestedAt);
                      const isProcessing = busyAction?.startsWith(`approve-${requestUserId}`) || busyAction?.startsWith(`reject-${requestUserId}`);

                      return (
                        <View key={requestUserId} style={styles.requestItem}>
                          <View style={styles.requestInfo}>
                            <View style={styles.userBadge}>
                              {userAvatar ? (
                                <Image source={{ uri: userAvatar }} style={styles.userBadgeImage} />
                              ) : (
                                <Text style={styles.userInitial}>{userInitial}</Text>
                              )}
                            </View>
                            <View style={styles.requestDetails}>
                              <Text style={styles.requestUserName}>{userName}</Text>
                              <Text style={styles.requestTime}>Requested {requestTime}</Text>
                            </View>
                          </View>
                          <View style={styles.requestActions}>
                            <TouchableOpacity
                              style={[styles.requestBtn, styles.approveBtnStyle]}
                              onPress={() => handleRequestAction(requestUserId, 'approve')}
                              disabled={isProcessing}
                            >
                              {busyAction === `approve-${requestUserId}` ? (
                                <ActivityIndicator size="small" color={Colors.success} />
                              ) : (
                                <>
                                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                                  <Text style={[styles.requestBtnText, { color: Colors.success }]}>Approve</Text>
                                </>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.requestBtn, styles.rejectBtnStyle]}
                              onPress={() => handleRequestAction(requestUserId, 'reject')}
                              disabled={isProcessing}
                            >
                              {busyAction === `reject-${requestUserId}` ? (
                                <ActivityIndicator size="small" color={Colors.error} />
                              ) : (
                                <>
                                  <Ionicons name="close-circle" size={16} color={Colors.error} />
                                  <Text style={[styles.requestBtnText, { color: Colors.error }]}>Reject</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {isAdmin && Array.isArray(group.members) && (
                <View style={styles.card}>
                  <Text style={styles.sectionTitle}>Members</Text>
                  {group.members.map((member: any) => {
                    const memberId = member.user?._id || member.user;
                    const memberName = member.user?.name || 'Unknown';
                    const memberAvatar = member.user?.avatar;
                    const roleLabel = String(memberId) === String(group.createdBy?._id) ? 'owner' : member.role;

                    if (member.role === 'pending') return null;

                    return (
                      <View key={memberId} style={styles.memberRow}>
                        <View style={styles.memberInfo}>
                          <View style={styles.memberAvatarWrap}>
                            {memberAvatar ? (
                              <Image source={{ uri: memberAvatar }} style={styles.memberAvatar} />
                            ) : (
                              <Text style={styles.memberAvatarText}>{memberName.charAt(0).toUpperCase()}</Text>
                            )}
                          </View>
                          <Text style={styles.memberName}>{memberName} ({roleLabel})</Text>
                        </View>
                        <View style={styles.rowActions}>
                          {isOwner && String(memberId) !== String(group.createdBy?._id) && member.role !== 'admin' && (
                            <TouchableOpacity
                              style={styles.chip}
                              onPress={() => confirmMemberAction(memberId, memberName, 'promote')}
                            >
                              <Text style={styles.chipText}>Promote</Text>
                            </TouchableOpacity>
                          )}
                          {isOwner && String(memberId) !== String(group.createdBy?._id) && member.role === 'admin' && (
                            <TouchableOpacity
                              style={styles.chip}
                              onPress={() => confirmMemberAction(memberId, memberName, 'demote')}
                            >
                              <Text style={styles.chipText}>Demote</Text>
                            </TouchableOpacity>
                          )}
                          {String(memberId) !== String(group.createdBy?._id) && (
                            <TouchableOpacity
                              style={[styles.chip, { backgroundColor: Colors.error + '20' }]}
                              onPress={() => confirmMemberAction(memberId, memberName, 'remove')}
                            >
                              <Text style={[styles.chipText, { color: Colors.error }]}>Remove</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {isMember && !isOwner && (
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.leaveButton, { marginTop: Spacing.sm }]}
                  onPress={handleLeave}
                  disabled={busyAction === 'leave'}
                >
                  {busyAction === 'leave' ? <ActivityIndicator color={Colors.error} /> : <Text style={styles.leaveButtonText}>Leave Group</Text>}
                </TouchableOpacity>
              )}

              {isOwner && (
                <TouchableOpacity
                  style={[styles.secondaryButton, { marginTop: Spacing.sm, backgroundColor: Colors.error }]}
                  onPress={() => setDeleteConfirmationVisible(true)}
                  disabled={busyAction === 'delete'}
                >
                  {busyAction === 'delete' ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>Delete Group</Text>}
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      ) : isMember ? (
        <KeyboardAvoidingView
          style={styles.chatSection}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={[styles.card, styles.chatCard, styles.chatContentCard]}>
            <Text style={styles.sectionTitle}>Group Chat</Text>

            <ScrollView
              ref={chatScrollRef}
              style={styles.chatMessagesWrap}
              contentContainerStyle={styles.chatMessagesContainer}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
              onContentSizeChange={() => {
                if (!shouldAutoScrollRef.current) return;
                chatScrollRef.current?.scrollToEnd({ animated: true });
                shouldAutoScrollRef.current = false;
              }}
            >
              {visibleMessages.length > 0 ? (
                visibleMessages.map((msg: any) => {
                  const senderId = msg.sender?._id || msg.sender;
                  const isMine = String(senderId) === String(currentUserId);
                  const hasAttachment = !!msg.attachment?.fileUrl;
                  const messageBody = (msg.text || '').trim();
                  const senderName = msg.sender?.name || 'Member';
                  const senderAvatar = msg.sender?.avatar;

                  const openAttachment = async () => {
                    if (!msg.attachment?.fileUrl) return;

                    const inferredType = getAttachmentKind(
                      msg.attachment.fileMimeType,
                      msg.attachment.originalFileName
                    );
                    const attachmentType = inferredType === 'file'
                      ? (msg.attachment.fileType || inferredType)
                      : inferredType;
                    const authUrl = withAuthToken(msg.attachment.fileUrl, token);

                    if (attachmentType === 'image') {
                      setActiveAttachment({
                        url: authUrl,
                        fileType: attachmentType,
                        fileMimeType: msg.attachment.fileMimeType,
                        name: msg.attachment.originalFileName,
                      });
                      return;
                    }

                    if (attachmentType === 'pdf') {
                      try {
                        await Linking.openURL(authUrl);
                      } catch {
                        Toast.show({ type: 'error', text1: 'Unable to open PDF' });
                      }
                      return;
                    }

                    try {
                      await Linking.openURL(authUrl);
                    } catch {
                      Toast.show({ type: 'error', text1: 'Unable to open attachment' });
                    }
                  };

                  return (
                    <TouchableOpacity
                      key={msg._id}
                      activeOpacity={isMine && !hasAttachment ? 0.75 : 1}
                      onPress={() => {
                        if (hasAttachment) {
                          openAttachment();
                          return;
                        }

                        if (isMine) {
                          confirmDeleteMessage(msg._id, messageBody || 'message');
                        }
                      }}
                      style={[styles.messageRow, isMine ? styles.messageRowMine : styles.messageRowOther]}
                    >
                      {!isMine && (
                        <View style={styles.messageAuthorRow}>
                          <View style={styles.messageAvatarWrap}>
                            {senderAvatar ? (
                              <Image source={{ uri: senderAvatar }} style={styles.messageAvatar} />
                            ) : (
                              <Text style={styles.messageAvatarText}>{senderName.charAt(0).toUpperCase()}</Text>
                            )}
                          </View>
                          <Text style={styles.messageAuthor}>{senderName}</Text>
                        </View>
                      )}
                      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleOther]}>
                        {messageBody ? (
                          <Text style={[styles.messageText, isMine ? styles.messageTextMine : styles.messageTextOther]}>
                            {msg.text}
                          </Text>
                        ) : null}

                        {hasAttachment && (
                          <TouchableOpacity style={styles.attachmentCard} onPress={openAttachment} activeOpacity={0.85}>
                            {msg.attachment.fileType === 'image' ? (
                              <Image source={{ uri: msg.attachment.fileUrl }} style={styles.attachmentImage} />
                            ) : (
                              <View style={styles.attachmentFileIconWrap}>
                                <Ionicons
                                  name={msg.attachment.fileType === 'pdf' ? 'document-text' : 'document'}
                                  size={26}
                                  color={isMine ? Colors.text : Colors.primary}
                                />
                              </View>
                            )}
                            <View style={styles.attachmentMeta}>
                              <Text style={[styles.attachmentName, isMine ? styles.messageTextMine : styles.messageTextOther]} numberOfLines={1}>
                                {msg.attachment.originalFileName || 'Attachment'}
                              </Text>
                              <Text style={styles.attachmentSubText} numberOfLines={1}>
                                {msg.attachment.fileType?.toUpperCase() || 'FILE'}
                                {msg.attachment.fileSize ? ` • ${formatFileSize(msg.attachment.fileSize)}` : ''}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        )}
                      </View>

                      {isMine && hasAttachment && (
                        <TouchableOpacity
                          style={styles.messageDeleteButton}
                          onPress={() => confirmDeleteMessage(msg._id, msg.attachment.originalFileName || 'attachment')}
                        >
                          <Ionicons name="trash-outline" size={14} color={Colors.error} />
                          <Text style={styles.messageDeleteText}>Delete attachment</Text>
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={styles.meta}>No messages yet.</Text>
              )}

              <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={styles.chatDismissArea} />
              </TouchableWithoutFeedback>
            </ScrollView>
          </View>

          <View
            style={[
              styles.chatInputBar,
              { paddingBottom: Math.max(insets.bottom, Spacing.sm) },
            ]}
          >
            {pendingAttachment && (
              <View style={styles.attachmentPreviewRow}>
                <View style={styles.attachmentPreviewInfo}>
                  <Ionicons name={pendingAttachment.kind === 'image' ? 'image-outline' : 'document-attach-outline'} size={18} color={Colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.attachmentPreviewTitle} numberOfLines={1}>{pendingAttachment.name}</Text>
                    <Text style={styles.attachmentPreviewSubTitle} numberOfLines={1}>
                      {pendingAttachment.kind?.toUpperCase() || 'FILE'}{pendingAttachment.size ? ` • ${formatFileSize(pendingAttachment.size)}` : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity onPress={cancelAttachment}>
                  <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.chatInputRow}>
              <TouchableOpacity style={styles.attachButton} onPress={promptAttachmentPicker} disabled={busyAction === 'send-message'}>
                <Ionicons name="attach" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={[styles.input, styles.chatTextInput]}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type a message"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="send"
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={[styles.button, styles.sendButton]}
                onPress={handleSendMessage}
                disabled={busyAction === 'send-message'}
              >
                {busyAction === 'send-message' ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <Ionicons name="send" size={18} color={Colors.text} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      ) : null}

      <Modal visible={attachmentPickerVisible} transparent animationType="fade" onRequestClose={closeAttachmentPicker}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Attach to Message</Text>
            <Text style={styles.modalBody}>Only images, PDFs, and docs are allowed. Maximum size: {MAX_CHAT_ATTACHMENT_FILE_SIZE_MB} MB.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.button, styles.modalCancel]} 
                onPress={closeAttachmentPicker}
                disabled={isPickingDocument}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.button, styles.modalConfirm, styles.modalDeleteSpacing, isPickingDocument && { opacity: 0.6 }]} 
                onPress={chooseAttachmentFile}
                disabled={isPickingDocument}
              >
                <Text style={styles.buttonText}>{isPickingDocument ? 'Selecting...' : 'Choose file'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!memberActionConfirmation} transparent animationType="fade" onRequestClose={cancelMemberAction}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {memberActionConfirmation?.action === 'remove'
                ? 'Remove Member'
                : memberActionConfirmation?.action === 'promote'
                  ? 'Promote Member'
                  : 'Demote Admin'}
            </Text>
            <Text style={styles.modalBody}>
              {memberActionConfirmation?.action === 'remove'
                ? `Are you sure you want to remove ${memberActionConfirmation.memberName} from this group?`
                : memberActionConfirmation?.action === 'promote'
                  ? `Are you sure you want to promote ${memberActionConfirmation.memberName} to admin?`
                  : `Are you sure you want to demote ${memberActionConfirmation?.memberName} to member?`}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.button, styles.modalCancel]} onPress={cancelMemberAction}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  memberActionConfirmation?.action === 'remove' ? styles.modalDelete : styles.modalConfirm,
                  styles.modalDeleteSpacing,
                ]}
                onPress={approveMemberAction}
                disabled={busyAction === `${memberActionConfirmation?.action}-${memberActionConfirmation?.userId}`}
              >
                {busyAction === `${memberActionConfirmation?.action}-${memberActionConfirmation?.userId}` ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <Text style={styles.buttonText}>Yes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!deleteConfirmation} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Message</Text>
            <Text style={styles.modalBody}>Are you sure you want to delete this message?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.button, styles.modalCancel]} onPress={cancelDeleteMessage}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.modalDelete, styles.modalDeleteSpacing]} onPress={deleteSelectedMessage}>
                {busyAction?.startsWith('delete-message-') ? (
                  <ActivityIndicator color={Colors.text} />
                ) : (
                  <Text style={styles.buttonText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={leaveConfirmationVisible} transparent animationType="fade" onRequestClose={cancelLeave}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Leave Group</Text>
            <Text style={styles.modalBody}>Are you sure you want to leave this group?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.button, styles.modalCancel]} onPress={cancelLeave}>
                <Text style={styles.modalCancelText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.modalConfirm, styles.modalDeleteSpacing]}
                onPress={confirmLeave}
                disabled={busyAction === 'leave'}
              >
                {busyAction === 'leave' ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>Yes</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={deleteConfirmationVisible} transparent animationType="fade" onRequestClose={() => setDeleteConfirmationVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Group</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to delete &quot;{group?.name}&quot;? This action cannot be undone and will permanently remove the group and all its content.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.button, styles.modalCancel]} onPress={() => setDeleteConfirmationVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.modalDelete, styles.modalDeleteSpacing]}
                onPress={handleDelete}
                disabled={busyAction === 'delete'}
              >
                {busyAction === 'delete' ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.buttonText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!activeAttachment} animationType="slide" onRequestClose={closeAttachmentPreview}>
        <View style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <Text style={styles.viewerTitle} numberOfLines={1}>{activeAttachment?.name || 'Attachment'}</Text>
            <TouchableOpacity onPress={closeAttachmentPreview}>
              <Ionicons name="close" size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>

          {activeAttachment?.fileType === 'image' ? (
            <View style={styles.viewerBody}>
              <Image
                source={{
                  uri: activeAttachment.url,
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={styles.viewerUnsupportedWrap}>
              <Text style={styles.viewerUnsupportedText}>Preview is available for images only.</Text>
            </View>
          )}
        </View>
      </Modal>

      {dialogElement}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
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
  pageTitle: { fontSize: FontSizes.xl, fontWeight: '700', color: Colors.text },
  switchRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  switchBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  switchBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  switchText: { color: Colors.textMuted, fontWeight: '700', fontSize: FontSizes.sm },
  switchTextActive: { color: Colors.text },
  content: { padding: Spacing.md, paddingBottom: Spacing.lg },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  chatCard: { borderColor: Colors.primary + '55' },
  groupCoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  groupCoverImage: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  groupCoverPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupCoverActions: {
    flex: 1,
    marginLeft: Spacing.md,
    alignItems: 'flex-end',
  },
  groupCoverActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    marginBottom: 8,
  },
  groupCoverActionText: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  groupCoverDeleteBtn: {
    borderColor: Colors.error + '45',
    backgroundColor: Colors.error + '12',
  },
  groupCoverDeleteText: {
    color: Colors.error,
  },
  groupCoverSaveBtn: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  groupCoverSaveText: {
    color: Colors.text,
  },
  title: { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.text, marginBottom: Spacing.xs },
  desc: { fontSize: FontSizes.md, color: Colors.textMuted, marginBottom: Spacing.md },
  meta: { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: '600', marginBottom: 4 },
  sectionTitle: { fontSize: FontSizes.md, color: Colors.text, fontWeight: '700', marginBottom: Spacing.sm },
  groupMetaPanel: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border + '70',
  },
  metaLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    fontWeight: '700',
    textTransform: 'capitalize',
    maxWidth: '60%',
    textAlign: 'right',
  },
  infoBadgeRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  infoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primary + '18',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary + '35',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  infoBadgeText: {
    color: Colors.primary,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  sharedNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sharedNoteInfo: { flex: 1 },
  sharedNoteTitle: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  sharedNoteMeta: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  sharedNoteSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  sharedNoteSaveBtnActive: { backgroundColor: Colors.primary },
  sharedNoteSaveText: { color: Colors.text, fontSize: FontSizes.xs, fontWeight: '700' },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  button: { backgroundColor: Colors.primary, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.sm },
  secondaryButton: { backgroundColor: Colors.surfaceAlt, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'center', marginTop: Spacing.sm },
  leaveButton: {
    backgroundColor: Colors.error + '12',
    borderWidth: 1.5,
    borderColor: Colors.error + '70',
  },
  leaveButtonText: { color: Colors.error, fontSize: FontSizes.md, fontWeight: '700' },
  buttonText: { color: Colors.text, fontSize: FontSizes.md, fontWeight: '700' },
  memberRow: { borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm, marginTop: Spacing.sm },
  memberInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  memberAvatarWrap: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 8,
  },
  memberAvatar: { width: '100%', height: '100%' },
  memberAvatarText: { color: Colors.primary, fontWeight: '800', fontSize: FontSizes.sm },
  memberName: { color: Colors.text, fontWeight: '600', marginBottom: 6 },
  rowActions: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { backgroundColor: Colors.primary + '20', borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: 10 },
  chipText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '700' },
  requestsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  requestCountBadge: { backgroundColor: Colors.primary, borderRadius: Radius.full, minWidth: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  requestCountText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.sm },
  requestsList: { gap: Spacing.sm },
  requestItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  requestInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  userBadge: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: Colors.primary + '30', justifyContent: 'center', alignItems: 'center' },
  userBadgeImage: { width: '100%', height: '100%' },
  userInitial: { color: Colors.primary, fontWeight: '800', fontSize: FontSizes.lg },
  requestDetails: { flex: 1 },
  requestUserName: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md, marginBottom: 2 },
  requestTime: { color: Colors.textMuted, fontSize: FontSizes.xs },
  requestActions: { flexDirection: 'row', gap: Spacing.xs },
  requestBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: Radius.md, borderWidth: 1.5 },
  approveBtnStyle: { backgroundColor: Colors.success + '15', borderColor: Colors.success + '40' },
  rejectBtnStyle: { backgroundColor: Colors.error + '15', borderColor: Colors.error + '40' },
  requestBtnText: { fontWeight: '700', fontSize: FontSizes.xs },
  chatSection: { flex: 1, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, marginTop: Spacing.sm },
  chatContentCard: { flex: 1, marginBottom: Spacing.sm },
  chatMessagesWrap: { flex: 1, marginBottom: Spacing.sm },
  chatMessagesContainer: { paddingBottom: Spacing.sm, flexGrow: 1 },
  chatDismissArea: { flexGrow: 1, minHeight: Spacing.xl },
  chatInputBar: {
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    paddingTop: Spacing.xs,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  attachmentPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  attachmentPreviewInfo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, paddingRight: Spacing.sm },
  attachmentPreviewTitle: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.sm },
  attachmentPreviewSubTitle: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  chatInputRow: { flexDirection: 'row', alignItems: 'center' },
  attachButton: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
  },
  chatTextInput: { flex: 1, marginBottom: 0, marginRight: Spacing.sm },
  sendButton: { marginTop: 0, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  attachmentImage: { width: 160, height: 110, backgroundColor: Colors.surfaceAlt },
  attachmentFileIconWrap: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  attachmentMeta: { flex: 1, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm },
  attachmentName: { fontSize: FontSizes.sm, fontWeight: '700' },
  attachmentSubText: { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  messageDeleteButton: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  messageDeleteText: { color: Colors.error, fontSize: FontSizes.xs, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: '85%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  modalBody: {
    color: Colors.textMuted,
    fontSize: FontSizes.md,
    marginBottom: Spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.xs,
  },
  modalCancel: {
    backgroundColor: Colors.surfaceAlt,
  },
  modalDeleteSpacing: {
    marginLeft: Spacing.md,
  },
  modalCancelText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  modalDelete: {
    backgroundColor: Colors.error,
  },
  modalConfirm: {
    backgroundColor: Colors.primary,
  },
  messageRow: { marginBottom: Spacing.sm },
  messageRowMine: { alignItems: 'flex-end' },
  messageRowOther: { alignItems: 'flex-start' },
  messageAuthorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  messageAuthor: { color: Colors.textMuted, fontWeight: '700', fontSize: FontSizes.xs },
  messageAvatarWrap: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary + '30',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 6,
  },
  messageAvatar: { width: '100%', height: '100%' },
  messageAvatarText: { color: Colors.primary, fontSize: 11, fontWeight: '800' },
  bubble: {
    maxWidth: '84%',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
  },
  bubbleMine: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  bubbleOther: { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border },
  messageText: { fontSize: FontSizes.sm },
  messageTextMine: { color: Colors.text, fontWeight: '600' },
  messageTextOther: { color: Colors.text },
  viewerContainer: { flex: 1, backgroundColor: Colors.background },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: 56,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  viewerTitle: { flex: 1, color: Colors.text, fontSize: FontSizes.md, fontWeight: '700', marginRight: Spacing.sm },
  viewerBody: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  viewerImage: { width: '100%', height: '100%' },
  viewerUnsupportedWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  viewerUnsupportedText: { color: Colors.textMuted, fontSize: FontSizes.md, textAlign: 'center' },
});
