import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Modal, Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { noteService, requestService } from '../../services/dataServices';
import {
  getNoteSaveState,
  getSavedStateMapForNotes,
  removeNoteFromAllCollections,
  saveNoteToCollections,
} from '../../services/collectionLogic';
import { useAppDialog } from '../../hooks/use-app-dialog';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

const { width } = Dimensions.get('window');

// Enhanced color palette
const C = {
  bg: '#0A0705',
  surface: '#130F0C',
  surfaceAlt: '#1A1410',
  border: '#2A1F18',
  borderGlow: '#8B2A1A',
  primary: '#C8392B',
  primaryLight: '#E8503F',
  primaryGlow: '#FF6B5B',
  accent: '#F5A623',
  text: '#F5EDE8',
  textMuted: '#8A7060',
  textDim: '#5A4030',
  success: '#2ECC71',
  error: '#E74C3C',
  card: '#160E0A',
};

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const { showDialog, dialogElement } = useAppDialog();
  const [myNotes, setMyNotes] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  const load = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const [meRes, notesRes] = await Promise.all([
        authService.getMe(),
        noteService.getMyNotes({ limit: 5 }),
      ]);
      await updateUser(meRes.data);
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
      if (loading) { load(true); } else { load(false); }
    }, [loading])
  );

  useFocusEffect(
    React.useCallback(() => {
      let mounted = true;
      const syncSavedMap = async () => {
        if (!user?._id) { if (mounted) setSavedMap({}); return; }
        const noteIds = myNotes.map((note) => String(note?._id || '')).filter(Boolean);
        if (!noteIds.length) { if (mounted) setSavedMap({}); return; }
        try {
          const nextMap = await getSavedStateMapForNotes(noteIds);
          if (mounted) setSavedMap(nextMap);
        } catch { if (mounted) setSavedMap({}); }
      };
      syncSavedMap();
      return () => { mounted = false; };
    }, [myNotes, user?._id])
  );

  const toggleSave = (note: any) => {
    const noteId = String(note?._id || '');
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
              Toast.show({ type: 'success', text1: 'Saved', text2: result.collectionName });
            } catch (error: any) {
              Toast.show({ type: 'error', text1: 'Save Failed', text2: error?.message });
            } finally { setSavingNoteId(null); }
          },
        },
      ]);
      return;
    }
    showDialog('Remove Note', 'Remove from your saved collections?', [
      { label: 'Cancel', role: 'cancel' },
      {
        label: 'Remove', role: 'destructive',
        onPress: async () => {
          try {
            setSavingNoteId(noteId);
            const state = await getNoteSaveState(noteId);
            if (!state.collectionCount) {
              setSavedMap((prev) => ({ ...prev, [noteId]: false }));
              Toast.show({ type: 'error', text1: 'Already Removed' });
              return;
            }
            const removedCount = await removeNoteFromAllCollections(noteId);
            setSavedMap((prev) => ({ ...prev, [noteId]: false }));
            Toast.show({ type: 'success', text1: 'Removed', text2: `From ${removedCount} collection${removedCount === 1 ? '' : 's'}.` });
          } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Failed', text2: error?.message });
          } finally { setSavingNoteId(null); }
        },
      },
    ]);
  };

  const confirmLogout = async () => {
    try {
      setSigningOut(true);
      await logout();
      setShowSignOutModal(false);
      router.replace('/(auth)/welcome');
    } finally { setSigningOut(false); }
  };

  if (loading) return (
    <View style={[s.center, { backgroundColor: C.bg }]}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  );

  const statusColor = (status: string) =>
    status === 'open' ? C.success : status === 'fulfilled' ? C.accent : C.textMuted;

  return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>

      {/* ── HERO HEADER ── */}
      <View style={s.heroWrap}>
        <View style={s.heroGrad} />
        {/* Decorative arcs */}
        <View style={s.arcOuter} />
        <View style={s.arcInner} />

        <View style={s.avatarRing}>
          <View style={s.avatarRingInner}>
            {user?.avatar
              ? <Image source={{ uri: user.avatar }} style={s.avatar} />
              : (
                <View style={[s.avatar, { backgroundColor: C.primary }]}> 
                  <Text style={s.avatarInitial}>{user?.name?.[0]?.toUpperCase()}</Text>
                </View>
              )
            }
          </View>
        </View>

        <Text style={s.name}>{user?.name}</Text>
        <Text style={s.email}>{user?.email}</Text>

        {(user?.batch || user?.university) && (
          <View style={s.tagRow}>
            {user.batch && (
              <View style={s.tag}>
                <Ionicons name="school-outline" size={10} color={C.primary} style={{ marginRight: 4 }} />
                <Text style={s.tagText}>{user.batch}</Text>
              </View>
            )}
            {user.university && (
              <View style={s.tag}>
                <Ionicons name="business-outline" size={10} color={C.primary} style={{ marginRight: 4 }} />
                <Text style={s.tagText} numberOfLines={1}>{user.university}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── STATS ── */}
      <View style={s.statsCard}>
        {[
          { label: 'Notes', value: myNotes.length, icon: 'document-text-outline' },
          { label: 'Reviews', value: user?.reviewCount ?? 0, icon: 'star-outline' },
          { label: 'Avg Rating', value: (user?.averageReviewRating ?? 0).toFixed(1), icon: 'trending-up-outline' },
        ].map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <View style={s.statItem}>
              <View style={s.statIconWrap}>
                <Ionicons name={item.icon as any} size={14} color={C.primary} />
              </View>
              <Text style={s.statVal}>{item.value}</Text>
              <Text style={s.statLabel}>{item.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={s.statDivider} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── BADGES ── */}
      {(user?.isEmailVerified || (user?.reviewCount ?? 0) >= 5) && (
        <View style={s.badgesRow}>
          {user?.isEmailVerified && (
            <View style={s.badge}>
              <Ionicons name="checkmark-circle" size={13} color={C.accent} style={{ marginRight: 5 }} />
              <Text style={s.badgeText}>Verified</Text>
            </View>
          )}
          {(user?.reviewCount ?? 0) >= 5 && (
            <View style={s.badge}>
              <Ionicons name="flame" size={13} color={C.primaryGlow} style={{ marginRight: 5 }} />
              <Text style={s.badgeText}>Active Reviewer</Text>
            </View>
          )}
        </View>
      )}

      {/* ── MY NOTES ── */}
      <View style={s.sectionHeader}>
        <View style={s.sectionAccent} />
        <Text style={s.sectionTitle}>My Notes</Text>
      </View>

      {myNotes.length === 0
        ? (
          <View style={s.emptyCard}>
            <Ionicons name="documents-outline" size={28} color={C.textDim} />
            <Text style={s.emptyText}>No notes uploaded yet</Text>
          </View>
        )
        : myNotes.map(n => (
          <View key={n._id} style={s.noteCard}>
            <TouchableOpacity style={s.noteMain} onPress={() => router.push(`/note/${n._id}`)}>
              <View style={[s.noteIconWrap, { backgroundColor: C.primary + '15' }]}> 
                <Ionicons name="document-text" size={16} color={C.primary} />
              </View>
              <Text style={s.noteTitle} numberOfLines={1}>{n.title}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.bookmarkBtn, savedMap[String(n._id)] && s.bookmarkActive]}
              onPress={() => toggleSave(n)}
              disabled={savingNoteId === String(n._id)}
            >
              {savingNoteId === String(n._id)
                ? <ActivityIndicator size="small" color={C.text} />
                : <Ionicons name={savedMap[String(n._id)] ? 'bookmark' : 'bookmark-outline'} size={16} color={savedMap[String(n._id)] ? C.primary : C.textMuted} />
              }
            </TouchableOpacity>
          </View>
        ))
      }
      <TouchableOpacity style={s.seeAllBtn} onPress={() => router.push('/my-notes')}>
        <Text style={s.seeAllText}>View all notes</Text>
        <Ionicons name="arrow-forward" size={14} color={C.primary} />
      </TouchableOpacity>

      {/* ── MY REQUESTS ── */}
      <View style={s.sectionHeader}>
        <View style={s.sectionAccent} />
        <Text style={s.sectionTitle}>My Requests</Text>
      </View>

      {myRequests.length === 0
        ? (
          <View style={s.emptyCard}>
            <Ionicons name="help-circle-outline" size={28} color={C.textDim} />
            <Text style={s.emptyText}>No requests posted yet</Text>
          </View>
        )
        : myRequests.map(r => (
          <TouchableOpacity key={r._id} style={s.requestCard} onPress={() => router.push(`/request/${r._id}`)}>
            <View style={{ flex: 1, marginRight: Spacing.sm }}>
              <Text style={s.requestTitle} numberOfLines={1}>{r.title}</Text>
              <Text style={s.requestDesc} numberOfLines={1}>{r.description || 'No details provided'}</Text>
            </View>
            <View style={[s.statusPill, { borderColor: statusColor(r.status) + '60' }]}>
              <View style={[s.statusDot, { backgroundColor: statusColor(r.status) }]} />
              <Text style={[s.statusText, { color: statusColor(r.status) }]}>
                {r.status === 'closed' && r.closedReason ? r.closedReason : r.status}
              </Text>
            </View>
          </TouchableOpacity>
        ))
      }
      <TouchableOpacity style={s.seeAllBtn} onPress={() => router.push('/(tabs)/requests')}>
        <Text style={s.seeAllText}>View all requests</Text>
        <Ionicons name="arrow-forward" size={14} color={C.primary} />
      </TouchableOpacity>

      {/* ── ACCOUNT MENU ── */}
      <View style={s.sectionHeader}>
        <View style={s.sectionAccent} />
        <Text style={s.sectionTitle}>Account</Text>
      </View>

      {[
        { icon: 'person-outline', label: 'Edit Profile', sub: 'Update your info & photo', route: '/profile/edit', danger: false },
        { icon: 'lock-closed-outline', label: 'Change Password', sub: 'Keep your account secure', route: '/profile/password', danger: false },
        { icon: 'bookmark-outline', label: 'My Collections', sub: 'Saved notes & resources', route: '/collections', danger: false },
      ].map((item) => (
        <TouchableOpacity key={item.label} style={s.menuItem} onPress={() => router.push(item.route as any)}>
          <View style={s.menuIconBg}>
            <Ionicons name={item.icon as any} size={18} color={C.primary} />
          </View>
          <View style={s.menuText}>
            <Text style={s.menuLabel}>{item.label}</Text>
            <Text style={s.menuSub}>{item.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={C.textDim} />
        </TouchableOpacity>
      ))}

      {/* Sign Out — separate danger card */}
      <TouchableOpacity style={s.signOutItem} onPress={() => setShowSignOutModal(true)}>
        <View style={s.signOutIconBg}>
          <Ionicons name="log-out-outline" size={18} color={C.error} />
        </View>
        <View style={s.menuText}>
          <Text style={[s.menuLabel, { color: C.error }]}>Sign Out</Text>
          <Text style={s.menuSub}>Log out of your account</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={C.error + '60'} />
      </TouchableOpacity>

      {/* ── SIGN OUT MODAL ── */}
      <Modal visible={showSignOutModal} transparent animationType="fade" onRequestClose={() => setShowSignOutModal(false)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconCircle}>
              <Ionicons name="log-out-outline" size={26} color={C.error} />
            </View>
            <Text style={s.modalTitle}>Sign Out?</Text>
            <Text style={s.modalBody}>You'll need to log back in to access your account.</Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowSignOutModal(false)} disabled={signingOut}>
                <Text style={s.modalCancelText}>Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirm, signingOut && { opacity: 0.6 }]} onPress={confirmLogout} disabled={signingOut}>
                {signingOut ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.modalConfirmText}>Sign Out</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {dialogElement}
      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Hero
  heroWrap:       { alignItems: 'center', paddingTop: 70, paddingBottom: 32, overflow: 'hidden', position: 'relative' },
  heroGrad:       { ...StyleSheet.absoluteFillObject, backgroundColor: C.surface },
  arcOuter:       { position: 'absolute', width: width * 1.4, height: width * 1.4, borderRadius: width * 0.7, borderWidth: 1, borderColor: C.primary + '18', top: -width * 0.5, alignSelf: 'center' },
  arcInner:       { position: 'absolute', width: width * 0.9, height: width * 0.9, borderRadius: width * 0.45, borderWidth: 1, borderColor: C.primary + '10', top: -width * 0.22, alignSelf: 'center' },

  avatarRing:     { width: 102, height: 102, borderRadius: 51, borderWidth: 2, borderColor: C.primary + '60', padding: 3, marginBottom: 14, backgroundColor: C.bg },
  avatarRingInner:{ borderRadius: 48, overflow: 'hidden', width: 92, height: 92 },
  avatar:         { width: 92, height: 92, justifyContent: 'center', alignItems: 'center' },
  avatarInitial:  { fontSize: 38, fontWeight: '800', color: '#fff' },
  name:           { fontSize: 22, fontWeight: '800', color: C.text, letterSpacing: 0.3 },
  email:          { fontSize: 13, color: C.textMuted, marginTop: 3 },
  tagRow:         { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  tag:            { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary + '15', borderWidth: 1, borderColor: C.primary + '30', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  tagText:        { color: C.primary, fontSize: 11, fontWeight: '700' },

  // Stats
  statsCard:      { flexDirection: 'row', marginHorizontal: 16, backgroundColor: C.surfaceAlt, borderRadius: 16, borderWidth: 1, borderColor: C.border, paddingVertical: 16, marginBottom: 12 },
  statItem:       { flex: 1, alignItems: 'center', gap: 4 },
  statIconWrap:   { width: 28, height: 28, borderRadius: 8, backgroundColor: C.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  statVal:        { fontSize: 20, fontWeight: '800', color: C.text },
  statLabel:      { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  statDivider:    { width: 1, backgroundColor: C.border, marginVertical: 8 },

  // Badges
  badgesRow:      { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 8, flexWrap: 'wrap' },
  badge:          { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.border, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText:      { fontSize: 12, color: C.text, fontWeight: '600' },

  // Section
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 10, marginHorizontal: 16, gap: 8 },
  sectionAccent:  { width: 3, height: 18, backgroundColor: C.primary, borderRadius: 2 },
  sectionTitle:   { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: 0.2 },

  // Notes
  noteCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, marginHorizontal: 16 },
  noteMain:       { flexDirection: 'row', alignItems: 'center', flex: 1 },
  noteIconWrap:   { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  noteTitle:      { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  bookmarkBtn:    { width: 32, height: 32, borderRadius: 8, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.border },
  bookmarkActive: { backgroundColor: C.primary + '15', borderColor: C.primary + '50' },

  // Empty
  emptyCard:      { alignItems: 'center', paddingVertical: 24, marginHorizontal: 16, backgroundColor: C.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: C.border, gap: 8, marginBottom: 8 },
  emptyText:      { color: C.textMuted, fontSize: 13 },

  // See all
  seeAllBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginBottom: 4 },
  seeAllText:     { color: C.primary, fontSize: 13, fontWeight: '700' },

  // Requests
  requestCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8, marginHorizontal: 16 },
  requestTitle:   { fontSize: 14, color: C.text, fontWeight: '600' },
  requestDesc:    { fontSize: 12, color: C.textMuted, marginTop: 2 },
  statusPill:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, gap: 5 },
  statusDot:      { width: 5, height: 5, borderRadius: 3 },
  statusText:     { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  // Menu
  menuItem:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: C.border, padding: 14, marginBottom: 8, marginHorizontal: 16 },
  menuIconBg:     { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: C.primary + '15' },
  menuText:       { flex: 1 },
  menuLabel:      { fontSize: 14, color: C.text, fontWeight: '700' },
  menuSub:        { fontSize: 11, color: C.textMuted, marginTop: 1 },

  signOutItem:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.error + '08', borderRadius: 12, borderWidth: 1, borderColor: C.error + '25', padding: 14, marginBottom: 8, marginHorizontal: 16 },
  signOutIconBg:  { width: 38, height: 38, borderRadius: 10, backgroundColor: C.error + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 },

  // Modal
  overlay:        { flex: 1, backgroundColor: '#00000099', justifyContent: 'center', padding: 24 },
  modalCard:      { backgroundColor: C.surfaceAlt, borderRadius: 20, borderWidth: 1, borderColor: C.border, padding: 24, alignItems: 'center' },
  modalIconCircle:{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.error + '15', borderWidth: 1, borderColor: C.error + '30', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle:     { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 8 },
  modalBody:      { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalBtns:      { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel:    { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  modalCancelText:{ color: C.textMuted, fontWeight: '700', fontSize: 14 },
  modalConfirm:   { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: C.error, alignItems: 'center' },
  modalConfirmText:{ color: '#fff', fontWeight: '800', fontSize: 14 },
});
