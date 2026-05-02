import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Modal, Dimensions, Animated, Easing, TextInput,
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
import { Colors, Spacing, Radius } from '../../constants/theme';
import { SkeletonBlock } from '../../components/ui/skeleton-block';

const { width } = Dimensions.get('window');

// Enhanced color palette
const C = {
  bg: Colors.background,
  surface: Colors.surface,
  surfaceAlt: '#EFF6FF',
  border: Colors.border,
  borderGlow: '#BFDBFE',
  primary: Colors.primary,
  primaryLight: '#60A5FA',
  primaryGlow: '#93C5FD',
  accent: '#1D4ED8',
  text: Colors.text,
  textMuted: Colors.textMuted,
  textDim: '#94A3B8',
  success: '#22C55E',
  error: '#EF4444',
  card: Colors.surface,
};

export default function ProfileScreen() {
  const { user, logout, updateUser } = useAuth();
  const { showDialog, dialogElement } = useAppDialog();
  const [myNotes, setMyNotes] = useState<any[]>([]);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const pageEntranceAnim = React.useRef(new Animated.Value(0)).current;
  const profileHeroAnim = React.useRef(new Animated.Value(0)).current;
  const profileMetaAnim = React.useRef(new Animated.Value(0)).current;
  const profileStatsAnim = React.useRef(new Animated.Value(0)).current;
  const bgOrbAnim = React.useRef(new Animated.Value(0)).current;
  const heroOrbAnim = React.useRef(new Animated.Value(0)).current;
  const arcAnim = React.useRef(new Animated.Value(0)).current;

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
      pageEntranceAnim.setValue(0);
      Animated.timing(pageEntranceAnim, {
        toValue: 1,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      profileHeroAnim.setValue(0);
      profileMetaAnim.setValue(0);
      profileStatsAnim.setValue(0);
      Animated.sequence([
        Animated.spring(profileHeroAnim, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.parallel([
          Animated.timing(profileMetaAnim, {
            toValue: 1,
            duration: 360,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(profileStatsAnim, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
      ]).start();
      bgOrbAnim.setValue(0);
      heroOrbAnim.setValue(0);
      arcAnim.setValue(0);
      const bgLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(bgOrbAnim, {
            toValue: 1,
            duration: 9000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(bgOrbAnim, {
            toValue: 0,
            duration: 9000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      const heroLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(heroOrbAnim, {
            toValue: 1,
            duration: 7600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(heroOrbAnim, {
            toValue: 0,
            duration: 7600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      const arcLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(arcAnim, {
            toValue: 1,
            duration: 12000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(arcAnim, {
            toValue: 0,
            duration: 12000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      bgLoop.start();
      heroLoop.start();
      arcLoop.start();
      return () => {
        bgLoop.stop();
        heroLoop.stop();
        arcLoop.stop();
      };
    }, [arcAnim, bgOrbAnim, heroOrbAnim, pageEntranceAnim, profileHeroAnim, profileMetaAnim, profileStatsAnim])
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

  const confirmDeleteAccount = () => {
    setDeletePassword('');
    setShowDeleteAccountModal(true);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Toast.show({ type: 'error', text1: 'Password Required', text2: 'Enter your password to continue.' });
      return;
    }

    try {
      setDeletingAccount(true);
      await authService.deleteAccount(deletePassword);
      await logout();
      setShowDeleteAccountModal(false);
      setDeletePassword('');
      Toast.show({ type: 'success', text1: 'Account Deleted' });
      router.replace('/(auth)/welcome');
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Delete Failed', text2: e.message });
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) return (
    <ScrollView style={s.container} showsVerticalScrollIndicator={false}>
      <View style={s.heroWrap}>
        <SkeletonBlock width={92} height={92} borderRadius={46} />
        <SkeletonBlock width={170} height={22} borderRadius={10} style={{ marginTop: 14 }} />
        <SkeletonBlock width={200} height={14} borderRadius={8} style={{ marginTop: 8 }} />
      </View>

      <View style={s.statsCard}>
        {[0, 1, 2].map((idx) => (
          <React.Fragment key={idx}>
            <View style={s.statItem}>
              <SkeletonBlock width={28} height={28} borderRadius={8} />
              <SkeletonBlock width={44} height={18} borderRadius={8} style={{ marginTop: 8 }} />
              <SkeletonBlock width={52} height={10} borderRadius={8} style={{ marginTop: 6 }} />
            </View>
            {idx < 2 && <View style={s.statDivider} />}
          </React.Fragment>
        ))}
      </View>

      <View style={{ marginHorizontal: 16 }}>
        {[0, 1, 2, 3].map((idx) => (
          <View key={idx} style={s.menuItem}>
            <SkeletonBlock width={38} height={38} borderRadius={10} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <SkeletonBlock width="58%" height={13} borderRadius={8} />
              <SkeletonBlock width="72%" height={10} borderRadius={8} style={{ marginTop: 8 }} />
            </View>
          </View>
        ))}
      </View>
      <View style={{ height: 120 }} />
    </ScrollView>
  );

  const statusColor = (status: string) =>
    status === 'open' ? C.primary : status === 'fulfilled' ? C.success : C.textMuted;

  return (
    <Animated.ScrollView
      style={[
        s.container,
        {
          opacity: pageEntranceAnim.interpolate({
            inputRange: [0, 0.2, 1],
            outputRange: [0, 0.6, 1],
          }),
          transform: [
            {
              translateY: pageEntranceAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-28, 0],
              }),
            },
          ],
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View pointerEvents="none" style={s.blurLayer}>
        <Animated.View
          style={[
            s.blurOrb,
            s.blurOrbTop,
            {
              transform: [
                {
                  translateX: bgOrbAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 14],
                  }),
                },
                {
                  translateY: bgOrbAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 12],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            s.blurOrb,
            s.blurOrbBottom,
            {
              transform: [
                {
                  translateX: bgOrbAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, -10],
                  }),
                },
                {
                  translateY: bgOrbAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-6, 10],
                  }),
                },
              ],
            },
          ]}
        />
      </View>

      {/* ── HERO HEADER ── */}
      <View style={s.heroWrap}>
        <View style={s.heroGrad} />
        <Animated.View
          style={[
            s.heroOrbLeft,
            {
              transform: [
                {
                  translateX: heroOrbAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 14],
                  }),
                },
                {
                  translateY: heroOrbAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -10],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            s.heroOrbRight,
            {
              transform: [
                {
                  translateX: heroOrbAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -12],
                  }),
                },
                {
                  translateY: heroOrbAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 10],
                  }),
                },
              ],
            },
          ]}
        />
        {/* Decorative arcs */}
        <Animated.View
          style={[
            s.arcOuter,
            {
              transform: [
                {
                  rotate: arcAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['-2deg', '2deg'],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            s.arcInner,
            {
              transform: [
                {
                  rotate: arcAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['2deg', '-2deg'],
                  }),
                },
              ],
            },
          ]}
        />

        <Animated.View
          style={{
            opacity: profileHeroAnim,
            transform: [
              {
                scale: profileHeroAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.82, 1],
                }),
              },
              {
                translateY: profileHeroAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          }}
        >
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
        </Animated.View>

        <Animated.View
          style={{
            opacity: profileMetaAnim,
            transform: [
              {
                translateY: profileMetaAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [14, 0],
                }),
              },
            ],
          }}
        >
          <Text style={s.name}>{user?.name}</Text>
          <Text style={s.email}>{user?.email}</Text>
        </Animated.View>

        {(user?.batch || user?.university) && (
          <Animated.View
            style={[
              s.tagRow,
              {
                opacity: profileMetaAnim,
                transform: [
                  {
                    translateY: profileMetaAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [18, 0],
                    }),
                  },
                ],
              },
            ]}
          >
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
          </Animated.View>
        )}
      </View>

      {/* ── STATS ── */}
      <Animated.View
        style={{
          opacity: profileStatsAnim,
          transform: [
            {
              translateY: profileStatsAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [22, 0],
              }),
            },
          ],
        }}
      >
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
      </Animated.View>

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
        { icon: 'layers-outline', label: 'Manage Subjects', sub: 'Create & manage subjects', route: '/profile/subjects', danger: false },
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

      <TouchableOpacity
        style={[s.signOutItem, { marginTop: 4 }]}
        onPress={confirmDeleteAccount}
        disabled={deletingAccount}
      >
        <View style={s.signOutIconBg}>
          <Ionicons name="trash-outline" size={18} color={C.error} />
        </View>
        <View style={s.menuText}>
          <Text style={[s.menuLabel, { color: C.error }]}>
            {deletingAccount ? 'Deleting Account...' : 'Delete Account'}
          </Text>
          <Text style={s.menuSub}>Permanently remove your account</Text>
        </View>
        {deletingAccount
          ? <ActivityIndicator size="small" color={C.error} />
          : <Ionicons name="chevron-forward" size={16} color={C.error + '60'} />
        }
      </TouchableOpacity>

      {/* ── SIGN OUT MODAL ── */}
      <Modal visible={showSignOutModal} transparent animationType="fade" onRequestClose={() => setShowSignOutModal(false)}>
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconCircle}>
              <Ionicons name="log-out-outline" size={26} color={C.error} />
            </View>
            <Text style={s.modalTitle}>Sign Out?</Text>
            <Text style={s.modalBody}>You&apos;ll need to log back in to access your account.</Text>
            <View style={s.modalBtns}>
              <TouchableOpacity style={s.modalCancel} onPress={() => setShowSignOutModal(false)} disabled={signingOut}>
                <Text style={s.modalCancelText}>Stay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.modalConfirm, signingOut && { opacity: 0.7 }]} onPress={confirmLogout} disabled={signingOut}>
                {signingOut ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.modalConfirmText}>Sign Out</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteAccountModal}
        transparent
        animationType="fade"
        onRequestClose={() => !deletingAccount && setShowDeleteAccountModal(false)}
      >
        <View style={s.overlay}>
          <View style={s.modalCard}>
            <View style={s.modalIconCircle}>
              <Ionicons name="warning-outline" size={26} color={C.error} />
            </View>
            <Text style={s.modalTitle}>Delete Account?</Text>
            <Text style={s.modalBody}>
              This action is permanent. Enter your password to confirm account deletion.
            </Text>

            <View style={s.passwordWrap}>
              <Text style={s.passwordLabel}>Password</Text>
              <TextInput
                style={s.passwordInput}
                value={deletePassword}
                onChangeText={setDeletePassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!deletingAccount}
                placeholder="Enter your password"
                placeholderTextColor={C.textDim}
              />
            </View>

            <View style={s.modalBtns}>
              <TouchableOpacity
                style={s.modalCancel}
                onPress={() => {
                  setShowDeleteAccountModal(false);
                  setDeletePassword('');
                }}
                disabled={deletingAccount}
              >
                <Text style={s.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.modalConfirm, deletingAccount && { opacity: 0.7 }]}
                onPress={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.modalConfirmText}>Delete</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {dialogElement}
      <View style={{ height: 120 }} />
    </Animated.ScrollView>
  );
}

const s = StyleSheet.create({
  container:      { flex: 1, backgroundColor: C.bg },
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  blurLayer:      { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  blurOrb:        { position: 'absolute', borderRadius: Radius.full },
  blurOrbTop:     { width: 220, height: 220, top: -100, right: -70, backgroundColor: 'rgba(59,130,246,0.12)' },
  blurOrbBottom:  { width: 200, height: 200, bottom: 120, left: -80, backgroundColor: 'rgba(96,165,250,0.11)' },

  // Hero
  heroWrap:       { alignItems: 'center', paddingTop: 70, paddingBottom: 32, overflow: 'hidden', position: 'relative' },
  heroGrad:       { ...StyleSheet.absoluteFillObject, backgroundColor: C.surface },
  heroOrbLeft:    { position: 'absolute', width: 180, height: 180, borderRadius: 90, left: -60, top: 10, backgroundColor: 'rgba(59,130,246,0.10)' },
  heroOrbRight:   { position: 'absolute', width: 160, height: 160, borderRadius: 80, right: -50, top: 60, backgroundColor: 'rgba(96,165,250,0.09)' },
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
  statsCard:      { flexDirection: 'row', marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.primary + '20', paddingVertical: 16, marginBottom: 12, shadowColor: C.primary, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  statItem:       { flex: 1, alignItems: 'center', gap: 4 },
  statIconWrap:   { width: 28, height: 28, borderRadius: 8, backgroundColor: C.primary + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  statVal:        { fontSize: 20, fontWeight: '800', color: C.text },
  statLabel:      { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  statDivider:    { width: 1, backgroundColor: C.border, marginVertical: 8 },

  // Badges
  badgesRow:      { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginBottom: 8, flexWrap: 'wrap' },
  badge:          { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: C.primary + '30', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText:      { fontSize: 12, color: C.text, fontWeight: '600' },

  // Section
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 10, marginHorizontal: 16, gap: 8 },
  sectionAccent:  { width: 3, height: 18, backgroundColor: C.primary, borderRadius: 2 },
  sectionTitle:   { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: 0.2 },

  // Notes
  noteCard:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.primary + '20', paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, marginHorizontal: 16 },
  noteMain:       { flexDirection: 'row', alignItems: 'center', flex: 1 },
  noteIconWrap:   { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  noteTitle:      { flex: 1, fontSize: 14, color: C.text, fontWeight: '500' },
  bookmarkBtn:    { width: 32, height: 32, borderRadius: 8, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: C.primary + '22' },
  bookmarkActive: { backgroundColor: C.primary + '15', borderColor: C.primary + '50' },

  // Empty
  emptyCard:      { alignItems: 'center', paddingVertical: 24, marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.primary + '1E', gap: 8, marginBottom: 8 },
  emptyText:      { color: C.textMuted, fontSize: 13 },

  // See all
  seeAllBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginBottom: 4 },
  seeAllText:     { color: C.primary, fontSize: 13, fontWeight: '700' },

  // Requests
  requestCard:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.primary + '20', padding: 14, marginBottom: 8, marginHorizontal: 16 },
  requestTitle:   { fontSize: 14, color: C.text, fontWeight: '600' },
  requestDesc:    { fontSize: 12, color: C.textMuted, marginTop: 2 },
  statusPill:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, gap: 5, backgroundColor: '#EFF6FF' },
  statusDot:      { width: 5, height: 5, borderRadius: 3 },
  statusText:     { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  // Menu
  menuItem:       { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderRadius: 12, borderWidth: 1, borderColor: C.primary + '20', padding: 14, marginBottom: 8, marginHorizontal: 16 },
  menuIconBg:     { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: C.primary + '15' },
  menuText:       { flex: 1 },
  menuLabel:      { fontSize: 14, color: C.text, fontWeight: '700' },
  menuSub:        { fontSize: 11, color: C.textMuted, marginTop: 1 },

  signOutItem:    { flexDirection: 'row', alignItems: 'center', backgroundColor: C.error + '10', borderRadius: 12, borderWidth: 1, borderColor: C.error + '25', padding: 14, marginBottom: 8, marginHorizontal: 16 },
  signOutIconBg:  { width: 38, height: 38, borderRadius: 10, backgroundColor: C.error + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 },

  // Modal
  overlay:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  modalCard:      { backgroundColor: C.surface, borderRadius: 20, borderWidth: 1, borderColor: C.primary + '30', padding: 24, alignItems: 'center' },
  modalIconCircle:{ width: 60, height: 60, borderRadius: 30, backgroundColor: C.error + '15', borderWidth: 1, borderColor: C.error + '30', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  modalTitle:     { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 8 },
  modalBody:      { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  passwordWrap:   { width: '100%', marginBottom: 16 },
  passwordLabel:  { color: C.textMuted, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 },
  passwordInput:  { width: '100%', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: C.text, backgroundColor: C.bg },
  modalBtns:      { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancel:    { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  modalCancelText:{ color: C.textMuted, fontWeight: '700', fontSize: 14 },
  modalConfirm:   { flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: C.error, alignItems: 'center' },
  modalConfirmText:{ color: '#fff', fontWeight: '700', fontSize: 14 },
});
