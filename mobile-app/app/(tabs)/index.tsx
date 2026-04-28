import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Animated, Easing
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../context/AuthContext';
import { Colors } from '../../constants/theme';
import { noteService, requestService } from '../../services/dataServices';
import {
  getNoteSaveState,
  getSavedStateMapForNotes,
  removeNoteFromAllCollections,
  saveNoteToCollections,
} from '../../services/collectionLogic';
import { useAppDialog } from '../../hooks/use-app-dialog';
import { AmbientBackground } from '../../components/ambient-background';

// Matching the theme colors from your previous screen
const C = {
  bg: Colors.background,
  surface: Colors.surface,
  surfaceAlt: '#EFF6FF',
  border: Colors.border,
  primary: Colors.primary,
  primaryLight: '#60A5FA',
  accent: '#1D4ED8',
  text: Colors.text,
  textMuted: Colors.textMuted,
  textDim: '#64748B',
  placeholder: '#64748B',
  inputBg: '#EFF6FF',
};

const getNoteSubjectLabel = (item: any) => item.subject?.name || item.subjectText || 'No Subject';

export default function HomeScreen() {
  const { user } = useAuth();
  const { showDialog, dialogElement } = useAppDialog();
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [openRequests, setOpenRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedMap, setSavedMap] = useState<Record<string, boolean>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const waveAnim = useRef(new Animated.Value(0)).current;
  const greetingFillAnim = useRef(new Animated.Value(0)).current;
  const pageEntranceAnim = useRef(new Animated.Value(0)).current;

  const triggerWave = React.useCallback(() => {
    waveAnim.setValue(0);
    Animated.sequence([
      Animated.timing(waveAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: -1, duration: 220, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: 0.9, duration: 200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: -0.6, duration: 180, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(waveAnim, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [waveAnim]);

  useFocusEffect(
    React.useCallback(() => {
      pageEntranceAnim.setValue(0);
      Animated.timing(pageEntranceAnim, {
        toValue: 1,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();

      greetingFillAnim.setValue(0);
      Animated.timing(greetingFillAnim, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      triggerWave();
    }, [greetingFillAnim, pageEntranceAnim, triggerWave])
  );

  useEffect(() => {
    const load = async () => {
      try {
        const [notesRes, reqRes] = await Promise.all([
          noteService.getNotes({ limit: 4 }),
          requestService.getRequests({ status: 'open', limit: 4 }),
        ]);
        setRecentNotes(notesRes.data || []);
        setOpenRequests(reqRes.data || []);
      } catch (e) {
        console.warn('Home load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    let mounted = true;
    const syncSavedMap = async () => {
      if (!user?._id) {
        if (mounted) setSavedMap({});
        return;
      }
      const noteIds = recentNotes.map((note) => String(note?._id || '')).filter(Boolean);
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
    return () => { mounted = false; };
  }, [recentNotes, user?._id]);

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

  const QuickAction = ({ icon, label, onPress }: any) => (
    <TouchableOpacity style={s.qaCard} onPress={onPress} activeOpacity={0.7}>
      <View style={s.qaIconWrap}>
        <Ionicons name={icon} size={22} color={C.primary} />
      </View>
      <Text style={s.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const NoteCard = ({ item }: any) => {
    const isSaved = savedMap[String(item._id)];
    return (
      <View style={s.noteCard}>
        <TouchableOpacity style={s.noteMain} onPress={() => router.push(`/note/${item._id}`)} activeOpacity={0.6}>
          <View style={s.noteIcon}>
             <LinearGradient colors={[C.surfaceAlt, C.border]} style={s.iconGrad}>
                <Ionicons name="document-text" size={20} color={C.primary} />
             </LinearGradient>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.noteTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={s.noteMeta}>{getNoteSubjectLabel(item)} • ⭐ {item.averageRating?.toFixed(1) || '0.0'}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.noteSaveBtn, savingNoteId === String(item._id) && { opacity: 0.7 }]}
          onPress={() => toggleSave(item)}
          disabled={savingNoteId === String(item._id)}
        >
          {savingNoteId === String(item._id) ? (
            <ActivityIndicator size="small" color={C.primary} />
          ) : (
            <Ionicons 
              name={isSaved ? 'bookmark' : 'bookmark-outline'} 
              size={18} 
              color={isSaved ? C.primary : C.textDim} 
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={C.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <AmbientBackground primary={C.primary} secondary={C.primaryLight} />
      <Animated.View
        style={[
          s.pageAnimatedWrap,
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
      >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        
        {/* Header */}
        <View style={s.header}>
          <View>
            <View style={s.greetingRow}>
              <Animated.Text
                style={[
                  s.greeting,
                  {
                    opacity: greetingFillAnim.interpolate({
                      inputRange: [0, 0.25, 1],
                      outputRange: [0, 0.6, 1],
                    }),
                    transform: [
                      {
                        translateX: greetingFillAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-120, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                Hello, {user?.name?.split(' ')[0]}
              </Animated.Text>
              <Animated.Text
                style={[
                  s.waveEmoji,
                  {
                    transform: [
                      { perspective: 400 },
                      {
                        rotate: waveAnim.interpolate({
                          inputRange: [-1, 0, 1],
                          outputRange: ['-16deg', '0deg', '16deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                {'\u{1F44B}'}
              </Animated.Text>
            </View>
            <Text style={s.sub}>{user?.batch ? `Batch: ${user.batch}` : 'Welcome back to UniVault'}</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.8}>
             <View style={s.avatarOuter}>
                <View style={s.avatarRing}>
                  {user?.avatar ? (
                    <Image source={{ uri: user.avatar }} style={s.avatarImg} />
                  ) : (
                    <LinearGradient colors={[C.primaryLight, C.primary]} style={s.avatarImg}>
                      <Text style={s.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
                    </LinearGradient>
                  )}
                </View>
             </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={s.sectionTitle}>Quick Actions</Text>
        
        <View style={s.qaRow}>
          <QuickAction icon="cloud-upload-outline" label="Upload" onPress={() => router.push('/note/upload')} />
          <QuickAction icon="bookmark-outline" label="Saved" onPress={() => router.push('/collections')} />
          <QuickAction icon="people-outline" label="Groups" onPress={() => router.push('/(tabs)/groups')} />
          <QuickAction icon="help-circle-outline" label="Requests" onPress={() => router.push('/(tabs)/requests')} />
        </View>

        {/* Recent Notes */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Recent Notes</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/notes')}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {recentNotes.length === 0
          ? <Text style={s.empty}>No notes yet. Be the first to upload!</Text>
          : recentNotes.map(item => <NoteCard key={item._id} item={item} />)
        }

        {/* Open Requests */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Open Requests</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/requests')}>
            <Text style={s.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>
        {openRequests.length === 0
          ? <Text style={s.empty}>No open requests.</Text>
          : openRequests.map(item => (
              <TouchableOpacity key={item._id} style={s.reqCard} onPress={() => router.push(`/request/${item._id}`)} activeOpacity={0.7}>
                <View style={s.reqIconCircle}>
                  <Ionicons name="help-buoy-outline" size={16} color={C.accent} />
                </View>
                <Text style={s.reqText} numberOfLines={1}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={16} color={C.textDim} />
              </TouchableOpacity>
            ))
        }

        <View style={{ height: 120 }} />
      </ScrollView>
      </Animated.View>
      {dialogElement}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  pageAnimatedWrap: { flex: 1, zIndex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 120 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  greeting: { fontSize: 24, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  waveEmoji: { fontSize: 24, marginLeft: 8 },
  sub: { fontSize: 13, color: C.textMuted, fontWeight: '500', marginTop: 2 },
  
  avatarOuter: { padding: 3, borderRadius: 25, borderWidth: 1, borderColor: C.border },
  avatarRing: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: C.surfaceAlt, borderWidth: 1, borderColor: C.primary + '30' },
  avatarImg: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },

  // Sections
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 28, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: C.text, letterSpacing: 0.5, textTransform: 'uppercase' },
  seeAll: { fontSize: 13, color: C.primary, fontWeight: '700' },

  // Quick Actions
  qaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  qaCard: {
    flex: 1, backgroundColor: C.surface, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', borderWidth: 1, borderColor: C.primary + '24',
  },
  qaIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.inputBg, justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 1, borderColor: C.primary + '22' },
  qaLabel: { fontSize: 11, color: C.textMuted, fontWeight: '700', textAlign: 'center' },

  // Note Cards
  noteCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: C.primary + '20',
  },
  noteMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  noteIcon: { width: 48, height: 48, borderRadius: 12, overflow: 'hidden', marginRight: 12 },
  iconGrad: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  noteTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 4 },
  noteMeta: { fontSize: 12, color: C.textDim, fontWeight: '500' },
  noteSaveBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.inputBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.primary + '20' },

  // Request Cards
  reqCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: C.primary + '20',
  },
  reqIconCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.accent + '15', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  reqText: { fontSize: 14, color: C.text, flex: 1, fontWeight: '500' },
  
  empty: { fontSize: 13, color: C.textDim, textAlign: 'center', paddingVertical: 20, fontStyle: 'italic' },
});

