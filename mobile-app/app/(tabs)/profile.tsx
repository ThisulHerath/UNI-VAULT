import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Modal,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { noteService, requestService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const [myNotes, setMyNotes]   = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const load = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const [meRes, notesRes] = await Promise.all([
        authService.getMe(),
        noteService.getMyNotes({ limit: 5 }),
      ]);
      updateUser(meRes.data);
      setMyNotes(notesRes.data || []);

      const requestsRes = await requestService.getRequests({ requestedBy: meRes.data?._id, limit: 5 });
      setMyRequests(requestsRes.data || []);
    } catch (e) {
      console.warn(e);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (loading) {
        load(true);
      } else {
        load(false);
      }
    }, [loading])
  );

  const handleLogout = () => {
    setShowSignOutModal(true);
  };

  const confirmLogout = async () => {
    try {
      setSigningOut(true);
      await logout();
      setShowSignOutModal(false);
      router.replace('/(auth)/welcome');
    } finally {
      setSigningOut(false);
    }
  };

  const StatBox = ({ label, value }: any) => (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const MenuItem = ({ icon, label, color, onPress }: any) => (
    <TouchableOpacity style={styles.menu} onPress={onPress}>
      <View style={[styles.menuIcon, { backgroundColor: (color || Colors.primary) + '22' }]}>
        <Ionicons name={icon} size={18} color={color || Colors.primary} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Avatar + Info */}
      <View style={styles.profileSection}>
        {user?.avatar
          ? <Image source={{ uri: user.avatar }} style={styles.avatar} />
          : <View style={styles.avatarPlaceholder}><Text style={styles.avatarInitial}>{user?.name?.[0]?.toUpperCase()}</Text></View>
        }
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {(user?.batch || user?.university) && (
          <View style={styles.batchRow}>
            {user.batch && <View style={styles.tag}><Text style={styles.tagText}>{user.batch}</Text></View>}
            {user.university && <View style={styles.tag}><Text style={styles.tagText} numberOfLines={1}>{user.university}</Text></View>}
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatBox label="Notes" value={myNotes.length} />
        <View style={styles.divider} />
        <StatBox label="Reviews" value={user?.reviewCount ?? 0} />
        <View style={styles.divider} />
        <StatBox label="Avg Rating" value={(user?.averageReviewRating ?? 0).toFixed(1)} />
      </View>

      {(user?.isEmailVerified || (user?.reviewCount ?? 0) >= 5) && (
        <View style={styles.badgeRow}>
          {user?.isEmailVerified && (
            <View style={styles.badge}><Text style={styles.badgeText}>Verified Email</Text></View>
          )}
          {(user?.reviewCount ?? 0) >= 5 && (
            <View style={styles.badge}><Text style={styles.badgeText}>Active Reviewer</Text></View>
          )}
        </View>
      )}

      {/* My recent notes */}
      <Text style={styles.section}>My Notes</Text>
      {myNotes.length === 0
        ? <Text style={styles.empty}>You haven&apos;t uploaded any notes yet.</Text>
        : myNotes.map(n => (
            <TouchableOpacity key={n._id} style={styles.noteCard} onPress={() => router.push(`/note/${n._id}`)}>
              <Ionicons name="document-text-outline" size={18} color={Colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.noteTitle} numberOfLines={1}>{n.title}</Text>
            </TouchableOpacity>
          ))
      }
      <TouchableOpacity onPress={() => router.push('/my-notes')}>
        <Text style={styles.seeAll}>See all my notes →</Text>
      </TouchableOpacity>

      {/* My recent requests */}
      <Text style={styles.section}>My Requests</Text>
      {myRequests.length === 0
        ? <Text style={styles.empty}>You haven&apos;t posted any requests yet.</Text>
        : myRequests.map(r => (
            <TouchableOpacity key={r._id} style={styles.requestCard} onPress={() => router.push(`/request/${r._id}`)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.requestTitle} numberOfLines={1}>{r.title}</Text>
                <Text style={styles.requestMeta} numberOfLines={1}>{r.description || 'No details provided'}</Text>
                {r.status === 'closed' && r.closedReason && (
                  <Text style={styles.requestMeta}>Closed as {r.closedReason}</Text>
                )}
              </View>
              <View style={[styles.requestStatus, r.status === 'open' ? styles.statusOpen : r.status === 'fulfilled' ? styles.statusFulfilled : styles.statusClosed]}>
                <Text style={styles.requestStatusText}>{r.status === 'closed' && r.closedReason ? r.closedReason : r.status}</Text>
              </View>
            </TouchableOpacity>
          ))
      }
      <TouchableOpacity onPress={() => router.push('/(tabs)/requests')}>
        <Text style={styles.seeAll}>See all my requests →</Text>
      </TouchableOpacity>

      {/* Menu */}
      <Text style={styles.section}>Account</Text>
      <MenuItem icon="person-outline"        label="Edit Profile"      onPress={() => router.push('/profile/edit')} />
      <MenuItem icon="lock-closed-outline"   label="Change Password"   onPress={() => router.push('/profile/password')} />
      <MenuItem icon="bookmark-outline"      label="My Collections"    onPress={() => router.push('/collections')} />
      <MenuItem icon="log-out-outline"       label="Sign Out"  color={Colors.error} onPress={handleLogout} />

      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              </View>
              <Text style={styles.modalTitle}>Sign Out</Text>
            </View>

            <Text style={styles.modalMessage}>Are you sure you want to sign out from UniVault?</Text>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSignOutModal(false)}
                disabled={signingOut}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSignOutBtn, signingOut && { opacity: 0.7 }]}
                onPress={confirmLogout}
                disabled={signingOut}
              >
                {signingOut
                  ? <ActivityIndicator color={Colors.text} size="small" />
                  : <Text style={styles.modalSignOutText}>Sign Out</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: Colors.background },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  profileSection:   { alignItems: 'center', paddingTop: 60, paddingBottom: Spacing.lg },
  avatar:           { width: 90, height: 90, borderRadius: 45, marginBottom: Spacing.sm },
  avatarPlaceholder:{ width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.sm },
  avatarInitial:    { fontSize: FontSizes.xxxl, fontWeight: '700', color: Colors.text },
  name:             { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text },
  email:            { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 4 },
  batchRow:         { flexDirection: 'row', gap: 8, marginTop: Spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
  tag:              { backgroundColor: Colors.primary + '22', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 3 },
  tagText:          { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '700' },
  statsRow:         { flexDirection: 'row', backgroundColor: Colors.surface, marginHorizontal: Spacing.md, borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  stat:             { flex: 1, alignItems: 'center' },
  statVal:          { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text },
  statLabel:        { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  divider:          { width: 1, backgroundColor: Colors.border },
  badgeRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: Spacing.md, marginTop: Spacing.sm },
  badge:            { backgroundColor: Colors.primary + '18', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  badgeText:        { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '700' },
  section:          { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginTop: Spacing.lg, marginBottom: Spacing.sm, marginHorizontal: Spacing.md },
  noteCard:         { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, marginHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  noteTitle:        { flex: 1, fontSize: FontSizes.md, color: Colors.text },
  seeAll:           { color: Colors.primary, textAlign: 'center', marginBottom: Spacing.sm, fontWeight: '600' },
  requestCard:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, marginHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  requestTitle:     { fontSize: FontSizes.md, color: Colors.text, fontWeight: '600' },
  requestMeta:      { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2, marginRight: Spacing.sm },
  requestStatus:    { borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  statusOpen:       { backgroundColor: Colors.success + '22' },
  statusFulfilled:  { backgroundColor: Colors.success + '22' },
  statusClosed:     { backgroundColor: Colors.textMuted + '22' },
  requestStatusText:{ fontSize: FontSizes.xs, fontWeight: '700', color: Colors.text, textTransform: 'capitalize' },
  menu:             { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, marginHorizontal: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  menuIcon:         { width: 34, height: 34, borderRadius: Radius.sm, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  menuLabel:        { flex: 1, fontSize: FontSizes.md, color: Colors.text, fontWeight: '500' },
  empty:            { textAlign: 'center', color: Colors.textMuted, fontSize: FontSizes.sm, marginHorizontal: Spacing.md },
  modalOverlay:     { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: Spacing.lg },
  modalCard:        { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  modalHeader:      { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  modalIconWrap:    { width: 36, height: 36, borderRadius: Radius.full, backgroundColor: Colors.error + '1A', justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  modalTitle:       { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  modalMessage:     { fontSize: FontSizes.md, color: Colors.textMuted, lineHeight: 22 },
  modalActions:     { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.md, gap: Spacing.sm },
  modalCancelBtn:   { paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  modalCancelText:  { color: Colors.textMuted, fontWeight: '700', fontSize: FontSizes.sm },
  modalSignOutBtn:  { minWidth: 100, paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radius.md, backgroundColor: Colors.error, alignItems: 'center', justifyContent: 'center' },
  modalSignOutText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.sm },
});

