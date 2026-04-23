import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../../context/AuthContext';
import { noteService, reviewService } from '../../../services/dataServices';
import { Colors, FontSizes, Spacing, Radius } from '../../../constants/theme';

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [note, setNote]       = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [noteRes, revRes] = await Promise.all([
          noteService.getNoteById(id),
          noteService.getReviews(id),
        ]);
        setNote(noteRes.data);
        setReviews(revRes.data || []);
        const mine = revRes.data?.find((r: any) => r.reviewer?._id === user?._id);
        if (mine) { setMyRating(mine.rating); setMyComment(mine.comment || ''); }
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Error', text2: e.message });
      } finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Delete Note', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await noteService.deleteNote(id); Toast.show({ type: 'success', text1: 'Deleted' }); router.back(); }
        catch (e: any) { Toast.show({ type: 'error', text1: 'Error', text2: e.message }); }
      }},
    ]);
  };

  const submitReview = async () => {
    if (!myRating) { Toast.show({ type: 'error', text1: 'Select a rating 1–5' }); return; }
    setSubmitting(true);
    try {
      await noteService.createReview(id, { rating: myRating, comment: myComment });
      Toast.show({ type: 'success', text1: 'Review submitted!' });
      const res = await noteService.getReviews(id);
      setReviews(res.data || []);
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message });
    } finally { setSubmitting(false); }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!note)   return <View style={styles.center}><Text style={styles.err}>Note not found.</Text></View>;

  const isOwner = note.uploadedBy?._id === user?._id;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Back + actions */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        {isOwner && (
          <View style={styles.actions}>
            <TouchableOpacity onPress={() => router.push(`/note/${id}/edit`)} style={styles.actionBtn}>
              <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Meta */}
      <View style={styles.card}>
        <View style={styles.fileTypeBadge}><Text style={styles.fileTypeText}>{note.fileType?.toUpperCase()}</Text></View>
        <Text style={styles.title}>{note.title}</Text>
        {note.description && <Text style={styles.desc}>{note.description}</Text>}

        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.meta}>{note.uploadedBy?.name}</Text>
          <Ionicons name="library-outline" size={13} color={Colors.textMuted} style={{ marginLeft: 12 }} />
          <Text style={styles.meta}>{note.subject?.name}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={13} color={Colors.star} />
          <Text style={styles.meta}>{note.averageRating?.toFixed(1)} ({note.totalReviews} reviews)</Text>
          <Ionicons name="eye-outline" size={13} color={Colors.textMuted} style={{ marginLeft: 12 }} />
          <Text style={styles.meta}>{note.viewCount} views</Text>
        </View>

        {note.tags?.length > 0 && (
          <View style={styles.tagRow}>
            {note.tags.map((t: string) => (
              <View key={t} style={styles.tag}><Text style={styles.tagText}>#{t}</Text></View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.openBtn} onPress={() => Linking.openURL(note.fileUrl)}>
          <Ionicons name="open-outline" size={18} color={Colors.text} />
          <Text style={styles.openBtnText}>Open File</Text>
        </TouchableOpacity>
      </View>

      {/* Reviews */}
      <Text style={styles.section}>Reviews ({reviews.length})</Text>

      {/* Submit review */}
      {!isOwner && (
        <View style={styles.card}>
          <Text style={styles.reviewLabel}>Your Rating</Text>
          <View style={styles.starRow}>
            {[1,2,3,4,5].map(s => (
              <TouchableOpacity key={s} onPress={() => setMyRating(s)}>
                <Ionicons name={s <= myRating ? 'star' : 'star-outline'} size={28} color={Colors.star} />
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.submitBtn} onPress={submitReview} disabled={submitting}>
            {submitting ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.submitText}>Submit Review</Text>}
          </TouchableOpacity>
        </View>
      )}

      {reviews.map(r => (
        <View key={r._id} style={styles.reviewCard}>
          <View style={styles.reviewHeader}>
            <Text style={styles.reviewerName}>{r.reviewer?.name}</Text>
            <View style={styles.starRowSmall}>
              {[1,2,3,4,5].map(s => <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={12} color={Colors.star} />)}
            </View>
          </View>
          {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
        </View>
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: Colors.background },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  err:          { color: Colors.error, fontSize: FontSizes.md },
  topBar:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: 54, paddingBottom: Spacing.sm },
  actions:      { flexDirection: 'row', gap: 8 },
  actionBtn:    { padding: 6, backgroundColor: Colors.surface, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.border },
  card:         { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  fileTypeBadge:{ alignSelf: 'flex-start', backgroundColor: Colors.primary + '22', borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3, marginBottom: Spacing.sm },
  fileTypeText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '700' },
  title:        { fontSize: FontSizes.xl, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  desc:         { fontSize: FontSizes.md, color: Colors.textMuted, marginBottom: Spacing.sm },
  metaRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  meta:         { fontSize: FontSizes.xs, color: Colors.textMuted, marginLeft: 4 },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  tag:          { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:      { fontSize: FontSizes.xs, color: Colors.textMuted },
  openBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.sm, marginTop: Spacing.md, gap: 8 },
  openBtnText:  { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  section:      { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm, marginHorizontal: Spacing.md },
  reviewLabel:  { fontSize: FontSizes.md, fontWeight: '600', color: Colors.text, marginBottom: Spacing.sm },
  starRow:      { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm },
  starRowSmall: { flexDirection: 'row', gap: 2 },
  submitBtn:    { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.sm, alignItems: 'center' },
  submitText:   { color: Colors.text, fontWeight: '700' },
  reviewCard:   { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  reviewerName: { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.text },
  reviewComment:{ fontSize: FontSizes.sm, color: Colors.textMuted, marginTop: 4 },
});
