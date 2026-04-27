import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, TextInput, Modal,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../context/AuthContext';
import { noteService, reviewService } from '../../../services/dataServices';
import {
  getNoteSaveState,
  removeNoteFromAllCollections,
  saveNoteToCollections,
} from '../../../services/collectionLogic';
import { useAppDialog } from '../../../hooks/use-app-dialog';
import { Colors, FontSizes, Spacing, Radius } from '../../../constants/theme';

const REVIEW_PREFS_KEY = 'univault_review_prefs';
const REVIEW_FILTERS = [
  { key: 'all', label: 'All' },
  { key: '4plus', label: '4-5 Stars' },
  { key: '3plus', label: '3+ Stars' },
  { key: 'low', label: '1-2 Stars' },
] as const;

const REVIEW_SORTS = [
  { key: 'helpful', label: 'Most Helpful' },
  { key: 'recent', label: 'Recent' },
  { key: 'highest', label: 'Highest Rating' },
  { key: 'lowest', label: 'Lowest Rating' },
] as const;

const REPORT_REASONS = [
  { label: 'Spam', value: 'spam' },
  { label: 'Offensive', value: 'offensive' },
  { label: 'Misleading', value: 'misleading' },
] as const;

type ReportReason = (typeof REPORT_REASONS)[number]['value'];

const getNoteSubjectLabel = (noteItem: any) => noteItem?.subject?.name || noteItem?.subjectText || 'No Subject';

const ratingRanges: Record<string, { minRating?: number; maxRating?: number }> = {
  all: {},
  '4plus': { minRating: 4, maxRating: 5 },
  '3plus': { minRating: 3, maxRating: 5 },
  low: { minRating: 1, maxRating: 2 },
};

const formatTimestamp = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMinutes / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString();
};

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showDialog, dialogElement } = useAppDialog();
  const [note, setNote]       = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [myReviewId, setMyReviewId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [sortBy, setSortBy] = useState<(typeof REVIEW_SORTS)[number]['key']>('helpful');
  const [ratingFilter, setRatingFilter] = useState<(typeof REVIEW_FILTERS)[number]['key']>('all');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTargetReviewId, setReportTargetReviewId] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [isSavedToCollections, setIsSavedToCollections] = useState(false);

  useEffect(() => {
    const loadPrefs = async () => {
      try {
        const stored = await AsyncStorage.getItem(REVIEW_PREFS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.sortBy) setSortBy(parsed.sortBy);
          if (parsed.ratingFilter) setRatingFilter(parsed.ratingFilter);
        }
      } catch (error) {
        console.warn('Failed to load review preferences', error);
      } finally {
        setPrefsLoaded(true);
      }
    };
    loadPrefs();
  }, []);

  useEffect(() => {
    if (!prefsLoaded) return;
    const persistPrefs = async () => {
      await AsyncStorage.setItem(REVIEW_PREFS_KEY, JSON.stringify({ sortBy, ratingFilter }));
    };
    persistPrefs();
  }, [prefsLoaded, sortBy, ratingFilter]);

  useEffect(() => {
    if (!prefsLoaded) return;

    const load = async () => {
      try {
        const [noteRes, revRes] = await Promise.all([
          noteService.getNoteById(id),
          noteService.getReviews(id, {
            sort: sortBy,
            ...ratingRanges[ratingFilter],
          }),
        ]);
        setNote(noteRes.data);
        setReviews(revRes.data || []);
        setReviewStats(revRes.stats || null);
        const mine = revRes.data?.find((r: any) => r.reviewer?._id === user?._id);
        if (mine) {
          setMyReviewId(mine._id);
          setMyRating(mine.rating);
          setMyComment(mine.comment || '');
        } else {
          setMyReviewId(null);
        }
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Error', text2: e.message });
      } finally { setLoading(false); }
    };
    load();
  }, [id, user?._id, prefsLoaded, sortBy, ratingFilter]);

  useEffect(() => {
    let isMounted = true;

    const syncSavedState = async () => {
      if (!id || !user?._id) {
        if (isMounted) setIsSavedToCollections(false);
        return;
      }

      try {
        const state = await getNoteSaveState(id);
        if (isMounted) {
          setIsSavedToCollections(state.isSaved);
        }
      } catch {
        if (isMounted) {
          setIsSavedToCollections(false);
        }
      }
    };

    syncSavedState();
    return () => {
      isMounted = false;
    };
  }, [id, user?._id]);

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const handleToggleSave = () => {
    if (!id) return;

    if (!user?._id) {
      showDialog('Sign In Required', 'Please sign in to save notes to your collections.', [
        { label: 'Okay', role: 'default' },
      ]);
      return;
    }

    if (saveBusy) return;

    if (!isSavedToCollections) {
      showDialog('Save Note', 'Save this note to your collections?', [
        { label: 'Not Now', role: 'cancel' },
        {
          label: 'Save',
          onPress: async () => {
            try {
              setSaveBusy(true);
              const result = await saveNoteToCollections(id);
              setIsSavedToCollections(true);
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
                text2: error?.message || 'Unable to save this note right now.',
              });
            } finally {
              setSaveBusy(false);
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
            setSaveBusy(true);
            const saveState = await getNoteSaveState(id);
            if (!saveState.collectionCount) {
              setIsSavedToCollections(false);
              Toast.show({
                type: 'error',
                text1: 'Already Removed',
                text2: 'This note is not in your collections anymore.',
              });
              return;
            }

            const removedCount = await removeNoteFromAllCollections(id);
            setIsSavedToCollections(false);
            Toast.show({
              type: 'success',
              text1: 'Removed from Collections',
              text2: `Removed from ${removedCount} collection${removedCount === 1 ? '' : 's'}.`,
            });
          } catch (error: any) {
            Toast.show({
              type: 'error',
              text1: 'Remove Failed',
              text2: error?.message || 'Unable to remove this note right now.',
            });
          } finally {
            setSaveBusy(false);
          }
        },
      },
    ]);
  };

  const confirmDeleteNote = async () => {
    try {
      setDeletingNote(true);
      await noteService.deleteNote(id);
      setDeleteModalVisible(false);
      Toast.show({ type: 'success', text1: 'Note deleted' });
      router.back();
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Delete failed', text2: e.message });
    } finally {
      setDeletingNote(false);
    }
  };

  const submitReview = async () => {
    // Comprehensive client-side validation
    if (!myRating) { 
      Toast.show({ type: 'error', text1: 'Rating Required', text2: 'Please select a rating between 1 and 5' }); 
      return; 
    }
    if (myRating < 1 || myRating > 5) {
      Toast.show({ type: 'error', text1: 'Invalid Rating', text2: 'Rating must be between 1 and 5' });
      return;
    }
    const trimmedComment = myComment.trim();
    if (trimmedComment && trimmedComment.length < 10) {
      Toast.show({ type: 'error', text1: 'Comment Too Short', text2: 'Comments must be at least 10 characters when provided' });
      return;
    }
    if (trimmedComment.length > 500) {
      Toast.show({ type: 'error', text1: 'Comment Too Long', text2: 'Comment cannot exceed 500 characters' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: { rating: number; comment?: string } = { rating: myRating };
      if (trimmedComment) {
        payload.comment = trimmedComment;
      }

      if (myReviewId) {
        await reviewService.updateReview(myReviewId, payload);
        Toast.show({ type: 'success', text1: '✅ Review updated!', text2: 'Your review was updated successfully' });
      } else {
        await noteService.createReview(id, payload);
        Toast.show({ type: 'success', text1: '✅ Review submitted!', text2: 'Thank you for your feedback' });
      }

      setMyRating(0);
      setMyComment('');
      setMyReviewId(null);
      const [noteRes, res] = await Promise.all([
        noteService.getNoteById(id),
        noteService.getReviews(id, { sort: sortBy, ...ratingRanges[ratingFilter] }),
      ]);
      setNote(noteRes.data);
      setReviews(res.data || []);
      setReviewStats(res.stats || null);
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to submit review';
      Toast.show({ type: 'error', text1: 'Review Failed', text2: errorMsg });
    } finally { setSubmitting(false); }
  };

  const handleVote = async (reviewId: string, value: 'helpful' | 'notHelpful') => {
    try {
      await reviewService.voteReview(reviewId, value);
      const [noteRes, res] = await Promise.all([
        noteService.getNoteById(id),
        noteService.getReviews(id, { sort: sortBy, ...ratingRanges[ratingFilter] }),
      ]);
      setNote(noteRes.data);
      setReviews(res.data || []);
      setReviewStats(res.stats || null);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Vote Failed', text2: error.message || 'Unable to save vote' });
    }
  };

  const handleReport = (reviewId: string) => {
    setReportTargetReviewId(reviewId);
    setReportModalVisible(true);
  };

  const submitReport = async (reviewId: string, reason: ReportReason) => {
    const isValidReason = REPORT_REASONS.some((option) => option.value === reason);
    if (!isValidReason) {
      Toast.show({ type: 'error', text1: 'Report Failed', text2: 'Invalid report reason selected' });
      return;
    }

    try {
      setReportModalVisible(false);
      const reportRes = await reviewService.reportReview(reviewId, reason);
      Toast.show({
        type: 'success',
        text1: 'Report sent',
        text2: reportRes.message || 'Thanks for helping keep reviews trustworthy',
      });
      const [noteRes, reviewsRes] = await Promise.all([
        noteService.getNoteById(id),
        noteService.getReviews(id, { sort: sortBy, ...ratingRanges[ratingFilter] }),
      ]);
      setNote(noteRes.data);
      setReviews(reviewsRes.data || []);
      setReviewStats(reviewsRes.stats || null);
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Report Failed', text2: error.message || 'Unable to report review' });
    } finally {
      setReportTargetReviewId(null);
    }
  };

  const handleDeleteReview = (reviewId: string) => {
    showDialog('Delete Review', 'Are you sure you want to delete your review?', [
      { label: 'Cancel', role: 'cancel' },
      {
        label: 'Delete',
        role: 'destructive',
        onPress: async () => {
          try {
            await reviewService.deleteReview(reviewId);
            Toast.show({ type: 'success', text1: 'Review deleted' });
            setMyReviewId(null);
            setMyRating(0);
            setMyComment('');
            const [noteRes, res] = await Promise.all([
              noteService.getNoteById(id),
              noteService.getReviews(id, { sort: sortBy, ...ratingRanges[ratingFilter] }),
            ]);
            setNote(noteRes.data);
            setReviews(res.data || []);
            setReviewStats(res.stats || null);
          } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Delete Failed', text2: error.message || 'Unable to delete review' });
          }
        },
      },
    ]);
  };

  const beginEditReview = (review: any) => {
    setMyReviewId(review._id);
    setMyRating(review.rating);
    setMyComment(review.comment || '');
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>;
  if (!note)   return <View style={styles.center}><Text style={styles.err}>Note not found.</Text></View>;

  const isOwner = note.uploadedBy?._id === user?._id;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Back + actions */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color={Colors.text} /></TouchableOpacity>
        <View style={styles.actions}>
          {user?._id && (
            <TouchableOpacity onPress={handleToggleSave} style={styles.actionBtn} disabled={saveBusy}>
              {saveBusy ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons
                  name={isSavedToCollections ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={isSavedToCollections ? Colors.primary : Colors.textMuted}
                />
              )}
            </TouchableOpacity>
          )}
          {isOwner && (
            <>
              <TouchableOpacity onPress={() => router.push(`/note/${id}/edit`)} style={styles.actionBtn}>
                <Ionicons name="pencil-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDelete} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </>
          )}
        </View>
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
          <Text style={styles.meta}>{getNoteSubjectLabel(note)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="star" size={13} color={Colors.star} />
          <Text style={styles.meta}>{note.averageRating?.toFixed(1)} ({note.totalReviews} reviews)</Text>
          <Ionicons name="eye-outline" size={13} color={Colors.textMuted} style={{ marginLeft: 12 }} />
          <Text style={styles.meta}>{note.viewCount} views</Text>
        </View>

        {reviewStats && (
          <View style={styles.statsCard}>
            <View style={styles.statsHeader}>
              <Text style={styles.statsTitle}>Rating Breakdown</Text>
              <Text style={styles.statsSubtitle}>{reviewStats.totalReviews} active reviews</Text>
            </View>
            <View style={styles.statsSummaryRow}>
              <Text style={styles.statsSummaryValue}>{reviewStats.averageRating?.toFixed(1) || '0.0'}</Text>
              <Text style={styles.statsSummaryLabel}>Average Rating</Text>
            </View>
            {[5,4,3,2,1].map(star => {
              const count = reviewStats.distribution?.[star] || 0;
              const percent = reviewStats.totalReviews ? (count / reviewStats.totalReviews) * 100 : 0;
              return (
                <View key={star} style={styles.ratingBarRow}>
                  <Text style={styles.ratingBarLabel}>{star}★</Text>
                  <View style={styles.ratingBarTrack}>
                    <View style={[styles.ratingBarFill, { width: `${percent}%` }]} />
                  </View>
                  <Text style={styles.ratingBarCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        )}

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

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Sort</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {REVIEW_SORTS.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[styles.chip, sortBy === option.key && styles.chipActive]}
              onPress={() => setSortBy(option.key)}
            >
              <Text style={[styles.chipText, sortBy === option.key && styles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={[styles.filterLabel, { marginTop: Spacing.sm }]}>Filter by rating</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {REVIEW_FILTERS.map(option => (
            <TouchableOpacity
              key={option.key}
              style={[styles.chip, ratingFilter === option.key && styles.chipActive]}
              onPress={() => setRatingFilter(option.key)}
            >
              <Text style={[styles.chipText, ratingFilter === option.key && styles.chipTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Submit review */}
      {!isOwner && (
        <View style={styles.card}>
          <Text style={styles.reviewLabel}>{myReviewId ? 'Edit Your Review' : 'Write a Review'}</Text>
          <View style={styles.starRow}>
            {[1,2,3,4,5].map(s => (
              <TouchableOpacity key={s} onPress={() => setMyRating(s)}>
                <Ionicons name={s <= myRating ? 'star' : 'star-outline'} size={28} color={Colors.star} />
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment (10-500 characters, optional)"
            placeholderTextColor={Colors.textMuted}
            value={myComment}
            onChangeText={setMyComment}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.submitBtn} onPress={submitReview} disabled={submitting}>
            {submitting ? <ActivityIndicator color={Colors.text} /> : <Text style={styles.submitText}>{myReviewId ? 'Update Review' : 'Submit Review'}</Text>}
          </TouchableOpacity>
        </View>
      )}

      {reviews.map(r => (
        <View key={r._id} style={styles.reviewCard}>
          {(() => {
            const currentVote = (r.votes || []).find((vote: any) => {
              const voteUserId = typeof vote.user === 'string' ? vote.user : vote.user?._id;
              return voteUserId === user?._id;
            })?.value;

            const isHelpfulActive = currentVote === 'helpful';
            const isNotHelpfulActive = currentVote === 'notHelpful';

            return (
              <>
          {r.isHidden && (
            <View style={styles.reportedBanner}>
              <Text style={styles.reportedText}>This review has been reported.</Text>
            </View>
          )}
          <View style={styles.reviewHeader}>
            <View style={styles.reviewerBlock}>
              <Text style={styles.reviewerName}>{r.reviewer?.name}</Text>
              <View style={styles.badgeRow}>
                {r.reviewer?.batch && <View style={styles.badge}><Text style={styles.badgeText}>{r.reviewer.batch}</Text></View>}
                {r.reviewer?.isEmailVerified && <View style={styles.badge}><Text style={styles.badgeText}>Verified</Text></View>}
                {r.reviewer?.isActiveReviewer && <View style={styles.badge}><Text style={styles.badgeText}>Active Reviewer</Text></View>}
                {typeof r.reviewer?.averageReviewRating === 'number' && <View style={styles.badge}><Text style={styles.badgeText}>Avg {r.reviewer.averageReviewRating.toFixed(1)}</Text></View>}
              </View>
            </View>
            <View style={styles.starRowSmall}>
              {[1,2,3,4,5].map(s => <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={12} color={Colors.star} />)}
            </View>
          </View>
          <Text style={styles.reviewTimestamp}>
            Posted {formatTimestamp(r.createdAt)}{r.isEdited ? ` · Edited ${formatTimestamp(r.editedAt || r.updatedAt)}` : ''}
          </Text>
          {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}

          {!r.isHidden && (
            <View style={styles.voteRow}>
              <TouchableOpacity
                style={[styles.voteBtn, isHelpfulActive && styles.voteBtnHelpfulActive]}
                onPress={() => handleVote(r._id, 'helpful')}
              >
                <Ionicons name="thumbs-up-outline" size={16} color={isHelpfulActive ? Colors.text : Colors.primary} />
                <Text style={[styles.voteText, isHelpfulActive && styles.voteTextActive]}>{r.helpfulVotesCount || 0} Helpful</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteBtn, isNotHelpfulActive && styles.voteBtnNotHelpfulActive]}
                onPress={() => handleVote(r._id, 'notHelpful')}
              >
                <Ionicons name="thumbs-down-outline" size={16} color={isNotHelpfulActive ? Colors.text : Colors.error} />
                <Text style={[styles.voteText, isNotHelpfulActive && styles.voteTextActive]}>{r.notHelpfulVotesCount || 0} Not Helpful</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.voteBtn} onPress={() => handleReport(r._id)}>
                <Ionicons name="flag-outline" size={16} color={Colors.textMuted} />
                <Text style={styles.voteText}>Report</Text>
              </TouchableOpacity>
            </View>
          )}

          {r.reviewer?._id === user?._id && (
            <View style={styles.ownerActions}>
              <TouchableOpacity style={styles.ownerActionBtn} onPress={() => beginEditReview(r)}>
                <Ionicons name="pencil-outline" size={16} color={Colors.primary} />
                <Text style={styles.ownerActionText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ownerActionBtn} onPress={() => handleDeleteReview(r._id)}>
                <Ionicons name="trash-outline" size={16} color={Colors.error} />
                <Text style={[styles.ownerActionText, { color: Colors.error }]}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
              </>
            );
          })()}
        </View>
      ))}

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Delete Note</Text>
            <Text style={styles.modalSubtitle}>Are you sure? This cannot be undone.</Text>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deletingNote}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteModalDeleteBtn, deletingNote && { opacity: 0.7 }]}
                onPress={confirmDeleteNote}
                disabled={deletingNote}
              >
                {deletingNote
                  ? <ActivityIndicator size="small" color={Colors.text} />
                  : <Text style={styles.deleteModalDeleteText}>Delete</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={reportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setReportModalVisible(false);
          setReportTargetReviewId(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Report Review</Text>
            <Text style={styles.modalSubtitle}>Choose a reason for this report</Text>

            <View style={styles.modalReasonList}>
              {REPORT_REASONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={styles.modalReasonBtn}
                  onPress={() => {
                    if (!reportTargetReviewId) return;
                    submitReport(reportTargetReviewId, option.value);
                  }}
                >
                  <Text style={styles.modalReasonText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setReportModalVisible(false);
                setReportTargetReviewId(null);
              }}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />

      {dialogElement}
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
  reviewerBlock: { flex: 1, paddingRight: Spacing.sm },
  badgeRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge:         { backgroundColor: Colors.primary + '18', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText:     { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: '700' },
  reviewTimestamp:{ fontSize: FontSizes.xs, color: Colors.textMuted, marginTop: 4 },
  voteRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: Spacing.sm },
  voteBtn:       { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 10, paddingVertical: 6 },
  voteText:      { fontSize: FontSizes.xs, color: Colors.text, fontWeight: '600' },
  voteBtnHelpfulActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  voteBtnNotHelpfulActive: { backgroundColor: Colors.error, borderColor: Colors.error },
  voteTextActive: { color: Colors.text },
  ownerActions:  { flexDirection: 'row', gap: 10, marginTop: Spacing.sm },
  ownerActionBtn:{ flexDirection: 'row', alignItems: 'center', gap: 6 },
  ownerActionText:{ fontSize: FontSizes.xs, color: Colors.primary, fontWeight: '700' },
  commentInput:  { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.text, minHeight: 88, padding: Spacing.sm, marginBottom: Spacing.sm, fontSize: FontSizes.md },
  filterCard:    { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  filterLabel:   { fontSize: FontSizes.sm, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  chipRow:       { flexDirection: 'row', gap: 8, paddingRight: Spacing.sm },
  chip:          { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt },
  chipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:      { fontSize: FontSizes.xs, color: Colors.textMuted, fontWeight: '700' },
  chipTextActive:{ color: Colors.text },
  statsCard:     { marginTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  statsHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statsTitle:    { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  statsSubtitle: { fontSize: FontSizes.xs, color: Colors.textMuted },
  statsSummaryRow:{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: Spacing.sm },
  statsSummaryValue:{ fontSize: FontSizes.xxxl, fontWeight: '800', color: Colors.text },
  statsSummaryLabel:{ fontSize: FontSizes.sm, color: Colors.textMuted },
  ratingBarRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  ratingBarLabel:{ width: 24, fontSize: FontSizes.xs, color: Colors.textMuted, fontWeight: '700' },
  ratingBarTrack: { flex: 1, height: 8, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
  ratingBarFill:  { height: '100%', backgroundColor: Colors.star },
  ratingBarCount: { width: 24, textAlign: 'right', fontSize: FontSizes.xs, color: Colors.textMuted },
  reportedBanner:{ backgroundColor: Colors.error + '15', borderRadius: Radius.md, padding: 8, marginBottom: Spacing.sm },
  reportedText:  { color: Colors.error, fontSize: FontSizes.xs, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'center', padding: Spacing.md },
  modalCard: { backgroundColor: Colors.surface, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: Spacing.md },
  modalTitle: { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text },
  modalSubtitle: { marginTop: 4, fontSize: FontSizes.sm, color: Colors.textMuted },
  modalReasonList: { marginTop: Spacing.md, gap: 8 },
  modalReasonBtn: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingVertical: 10, paddingHorizontal: 12 },
  modalReasonText: { fontSize: FontSizes.sm, color: Colors.text, fontWeight: '600' },
  modalCancelBtn: { marginTop: Spacing.md, alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 10 },
  modalCancelText: { fontSize: FontSizes.sm, color: Colors.textMuted, fontWeight: '700' },
  deleteModalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.md, gap: Spacing.sm },
  deleteModalCancelBtn: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  deleteModalCancelText: { color: Colors.textMuted, fontWeight: '700', fontSize: FontSizes.sm },
  deleteModalDeleteBtn: { minWidth: 100, backgroundColor: Colors.error, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  deleteModalDeleteText: { color: Colors.text, fontWeight: '700', fontSize: FontSizes.sm },
});
