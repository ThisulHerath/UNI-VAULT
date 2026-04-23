import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { noteService, requestService } from '../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../constants/theme';

export default function HomeScreen() {
  const { user } = useAuth();
  const [recentNotes, setRecentNotes] = useState<any[]>([]);
  const [openRequests, setOpenRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const QuickAction = ({ icon, label, onPress }: any) => (
    <TouchableOpacity style={styles.qaCard} onPress={onPress}>
      <Ionicons name={icon} size={26} color={Colors.primary} />
      <Text style={styles.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const NoteCard = ({ item }: any) => (
    <TouchableOpacity style={styles.noteCard} onPress={() => router.push(`/note/${item._id}`)}>
      <View style={styles.noteIcon}><Ionicons name="document-text" size={20} color={Colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.noteTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.noteMeta}>{item.subject?.name || 'No Subject'} • ⭐ {item.averageRating?.toFixed(1) || '0.0'}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.sub}>{user?.batch ? `Batch: ${user.batch}` : 'Welcome to UniVault'}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.qaRow}>
        <QuickAction icon="cloud-upload-outline" label="Upload Note"  onPress={() => router.push('/note/upload')} />
        <QuickAction icon="bookmark-outline"     label="Collections" onPress={() => router.push('/collections')} />
        <QuickAction icon="people-outline"       label="Groups"      onPress={() => router.push('/(tabs)/groups')} />
        <QuickAction icon="help-circle-outline"  label="Requests"    onPress={() => router.push('/(tabs)/requests')} />
      </View>

      {/* Recent Notes */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Notes</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/notes')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      {recentNotes.length === 0
        ? <Text style={styles.empty}>No notes yet. Be the first to upload!</Text>
        : recentNotes.map(item => <NoteCard key={item._id} item={item} />)
      }

      {/* Open Requests */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Open Requests</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/requests')}>
          <Text style={styles.seeAll}>See All</Text>
        </TouchableOpacity>
      </View>
      {openRequests.length === 0
        ? <Text style={styles.empty}>No open requests.</Text>
        : openRequests.map(item => (
            <TouchableOpacity key={item._id} style={styles.reqCard} onPress={() => router.push(`/request/${item._id}`)}>
              <Ionicons name="help-buoy-outline" size={18} color={Colors.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.reqText} numberOfLines={1}>{item.title}</Text>
            </TouchableOpacity>
          ))
      }
      <View style={{ height: Spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background, paddingHorizontal: Spacing.md },
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingBottom: Spacing.lg },
  greeting:    { fontSize: FontSizes.xxl, fontWeight: '800', color: Colors.text },
  sub:         { fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 2 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  avatarText:  { color: Colors.text, fontWeight: '700', fontSize: FontSizes.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Spacing.lg, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm },
  seeAll:      { fontSize: FontSizes.sm, color: Colors.primary, fontWeight: '600' },
  qaRow:       { flexDirection: 'row', justifyContent: 'space-between' },
  qaCard: {
    flex: 1, marginHorizontal: 4, backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: Colors.border,
  },
  qaLabel:     { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 4, textAlign: 'center' },
  noteCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  noteIcon:    { width: 40, height: 40, borderRadius: Radius.sm, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.sm },
  noteTitle:   { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text },
  noteMeta:    { fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 2 },
  reqCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface,
    borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
  },
  reqText:     { fontSize: FontSizes.md, color: Colors.text, flex: 1 },
  empty:       { fontSize: FontSizes.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md },
});

