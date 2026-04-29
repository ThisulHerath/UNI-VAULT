import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, TextInput, Modal, Animated, Easing, Image,
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
import { SkeletonBlock } from '../../../components/ui/skeleton-block';

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

const REVIEWS_PAGE_SIZE = 10;

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

const toInitials = (name?: string) => {
  if (!name) return 'U';
  const pieces = name.trim().split(/\s+/).filter(Boolean);
  if (pieces.length === 1) return pieces[0].slice(0, 1).toUpperCase();
  return `${pieces[0].slice(0, 1)}${pieces[1].slice(0, 1)}`.toUpperCase();
};

const buildReviewPrefsKey = (noteId?: string) => `${REVIEW_PREFS_KEY}:${noteId || 'unknown'}`;

const resolveReviewParams = (
  sortBy: (typeof REVIEW_SORTS)[number]['key'],
  ratingFilter: (typeof REVIEW_FILTERS)[number]['key'],
  breakdownStarFilter: number | null,
) => {
  if (breakdownStarFilter) {
    return {
      sort: sortBy,
      minRating: breakdownStarFilter,
      maxRating: breakdownStarFilter,
    };
  }
  return {
    sort: sortBy,
    ...ratingRanges[ratingFilter],
  };
};

const applyOptimisticVote = (
  currentReviews: any[],
  reviewId: string,
  userId: string | undefined,
  nextValue: 'helpful' | 'notHelpful',
) => {
  return currentReviews.map((review) => {
    if (review._id !== reviewId) return review;

    const votes = Array.isArray(review.votes) ? [...review.votes] : [];
    const voteIndex = votes.findIndex((vote: any) => {
      const voteUserId = typeof vote.user === 'string' ? vote.user : vote.user?._id;
      return voteUserId === userId;
    });

    const previousVote = voteIndex >= 0 ? votes[voteIndex]?.value : null;
    if (previousVote === nextValue) {
      votes.splice(voteIndex, 1);
    } else if (voteIndex >= 0) {
      votes[voteIndex] = { ...votes[voteIndex], value: nextValue };
    } else if (userId) {
      votes.push({ user: userId, value: nextValue });
    }

    let helpfulVotesCount = Number(review.helpfulVotesCount || 0);
    let notHelpfulVotesCount = Number(review.notHelpfulVotesCount || 0);

    if (previousVote === 'helpful') helpfulVotesCount = Math.max(0, helpfulVotesCount - 1);
    if (previousVote === 'notHelpful') notHelpfulVotesCount = Math.max(0, notHelpfulVotesCount - 1);

    const nextStoredVote = previousVote === nextValue ? null : nextValue;
    if (nextStoredVote === 'helpful') helpfulVotesCount += 1;
    if (nextStoredVote === 'notHelpful') notHelpfulVotesCount += 1;

    return {
      ...review,
      votes,
      helpfulVotesCount,
      notHelpfulVotesCount,
    };
  });
};

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { showDialog, dialogElement } = useAppDialog();
  const [note, setNote]       = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewStats, setReviewStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [myReviewId, setMyReviewId] = useState<string | null>(null);
  const [myOriginalComment, setMyOriginalComment] = useState('');
  const [myOriginalRating, setMyOriginalRating] = useState(0);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [ratingValidationMessage, setRatingValidationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [sortBy, setSortBy] = useState<(typeof REVIEW_SORTS)[number]['key']>('helpful');
  const [ratingFilter, setRatingFilter] = useState<(typeof REVIEW_FILTERS)[number]['key']>('all');
  const [breakdownStarFilter, setBreakdownStarFilter] = useState<number | null>(null);
  const [visibleReviewCount, setVisibleReviewCount] = useState(REVIEWS_PAGE_SIZE);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportTargetReviewId, setReportTargetReviewId] = useState<string | null>(null);
  const [overflowReviewId, setOverflowReviewId] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [isSavedToCollections, setIsSavedToCollections] = useState(false);

  const listOpacityAnim = useRef(new Animated.Value(1)).current;
  const listTranslateAnim = useRef(new Animated.Value(0)).current;
  const filterUnderlineX = useRef(new Animated.Value(0)).current;
  const filterUnderlineWidth = useRef(new Animated.Value(0)).current;
  const filterLayoutsRef = useRef<Record<string, { x: number; width: number }>>({});
  const filterUnderlineInitializedRef = useRef(false);
  const starScaleAnims = useRef(Array.from({ length: 5 }, () => new Animated.Value(1))).current;
  const statsBarAnims = useRef([1, 2, 3, 4, 5].reduce((acc, star) => {
    acc[star] = new Animated.Value(0);
    return acc;
  }, {} as Record<number, Animated.Value>)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const visibleReviews = useMemo(
    () => reviews.slice(0, visibleReviewCount),
    [reviews, visibleReviewCount],
  );
  const canLoadMore = visibleReviewCount < reviews.length;

  useEffect(() => {
    const loadPrefs = async () => {
      setPrefsLoaded(false);
      try {
        const stored = await AsyncStorage.getItem(buildReviewPrefsKey(id));
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.sortBy) setSortBy(parsed.sortBy);
          if (parsed.ratingFilter) setRatingFilter(parsed.ratingFilter);
          if (parsed.breakdownStarFilter) setBreakdownStarFilter(parsed.breakdownStarFilter);
        }
      } catch (error) {
        console.warn('Failed to load review preferences', error);
      } finally {
        setPrefsLoaded(true);
      }
    };
    loadPrefs();
  }, [id]);

  useEffect(() => {
    if (!prefsLoaded) return;
    const persistPrefs = async () => {
      await AsyncStorage.setItem(
        buildReviewPrefsKey(id),
        JSON.stringify({ sortBy, ratingFilter, breakdownStarFilter }),
      );
    };
    persistPrefs();
  }, [prefsLoaded, id, sortBy, ratingFilter, breakdownStarFilter]);

  useEffect(() => {
    const loadNote = async () => {
      try {
        const noteRes = await noteService.getNoteById(id);
        setNote(noteRes.data);
      } catch (e: any) {
        Toast.show({ type: 'error', text1: 'Error', text2: e.message });
      } finally {
        setLoading(false);
      }
    };
    loadNote();
  }, [id]);

  useEffect(() => {
    if (!prefsLoaded) return;

    const transitionAndLoad = async () => {
      Animated.parallel([
        Animated.timing(listOpacityAnim, {
          toValue: 0.35,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(listTranslateAnim, {
          toValue: 8,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      await refreshReviews({ showLoader: true });

      Animated.parallel([
        Animated.timing(listOpacityAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(listTranslateAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    };

    transitionAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?._id, prefsLoaded, sortBy, ratingFilter, breakdownStarFilter, listOpacityAnim, listTranslateAnim]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  useEffect(() => {
    const total = Number(reviewStats?.totalReviews || 0);
    const animations = [5, 4, 3, 2, 1].map((star) => {
      const count = Number(reviewStats?.distribution?.[star] || 0);
      const percent = total > 0 ? count / total : 0;
      statsBarAnims[star].setValue(0);
      return Animated.timing(statsBarAnims[star], {
        toValue: percent,
        duration: 480,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
    });
    Animated.stagger(45, animations).start();
  }, [reviewStats, statsBarAnims]);

  useEffect(() => {
    const layout = filterLayoutsRef.current[ratingFilter];
    if (!layout) return;
    Animated.parallel([
      Animated.spring(filterUnderlineX, {
        toValue: layout.x,
        useNativeDriver: false,
        tension: 120,
        friction: 12,
      }),
      Animated.spring(filterUnderlineWidth, {
        toValue: layout.width,
        useNativeDriver: false,
        tension: 120,
        friction: 12,
      }),
    ]).start();
  }, [ratingFilter, filterUnderlineWidth, filterUnderlineX]);

  const refreshReviews = useCallback(async ({ showLoader = false, pullToRefresh = false } = {}) => {
    if (showLoader) setLoadingReviews(true);

    try {
      const res = await noteService.getReviews(id, resolveReviewParams(sortBy, ratingFilter, breakdownStarFilter));
      const incoming = res.data || [];
      setReviews(incoming);
      setReviewStats(res.stats || null);
      setVisibleReviewCount(REVIEWS_PAGE_SIZE);
      setOverflowReviewId(null);

      setNote((prev: any) => {
        if (!prev) return prev;
        if (!res.stats) return prev;
        return {
          ...prev,
          averageRating: res.stats.averageRating,
          totalReviews: res.stats.totalReviews,
        };
      });

      const mine = incoming.find((r: any) => String(r.reviewer?._id || r.reviewer) === String(user?._id));
      if (mine) {
        setMyReviewId(mine._id);
        setMyRating(mine.rating);
        setMyComment(mine.comment || '');
        setMyOriginalComment((mine.comment || '').trim());
        setMyOriginalRating(mine.rating || 0);
      } else {
        setMyReviewId(null);
        setMyRating(0);
        setMyComment('');
        setMyOriginalComment('');
        setMyOriginalRating(0);
      }
    } catch (e: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: e.message || 'Failed to load reviews' });
    } finally {
      setLoadingReviews(false);
      setLoadingMoreReviews(false);
    }
  }, [id, sortBy, ratingFilter, breakdownStarFilter, user?._id]);

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
    if (!myRating) {
      setRatingValidationMessage('Please select a star rating before submitting.');
      Toast.show({ type: 'error', text1: 'Rating Required', text2: 'Please select a rating between 1 and 5' });
      return;
    }
    setRatingValidationMessage('');

    if (myRating < 1 || myRating > 5) {
      Toast.show({ type: 'error', text1: 'Invalid Rating', text2: 'Rating must be between 1 and 5' });
      return;
    }
    const trimmedComment = myComment.trim();
    const isEditing = !!myReviewId;
    const originalTrimmedComment = myOriginalComment.trim();
    const commentChanged = trimmedComment !== originalTrimmedComment;

    if (trimmedComment && trimmedComment.length < 10 && (!isEditing || commentChanged)) {
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
      if (!isEditing) {
        if (trimmedComment) payload.comment = trimmedComment;
      } else if (commentChanged) {
        payload.comment = trimmedComment;
      }

      if (myReviewId) {
        await reviewService.updateReview(myReviewId, payload);
        Toast.show({ type: 'success', text1: '✅ Review updated!', text2: 'Your review was updated successfully' });
        setIsEditingReview(false);
      } else {
        await noteService.createReview(id, payload);
        Toast.show({ type: 'success', text1: '✅ Review submitted!', text2: 'Thank you for your feedback' });
      }
      await refreshReviews();
    } catch (e: any) {
      const errorMsg = e.message || 'Failed to submit review';
      Toast.show({ type: 'error', text1: 'Review Failed', text2: errorMsg });
    } finally { setSubmitting(false); }
  };

  const handleVote = async (reviewId: string, value: 'helpful' | 'notHelpful') => {
    const beforeVote = reviews;
    const optimistic = applyOptimisticVote(beforeVote, reviewId, user?._id, value);
    setReviews(optimistic);
    try {
      await reviewService.voteReview(reviewId, value);
    } catch (error: any) {
      setReviews(beforeVote);
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
      await refreshReviews();
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
            setMyOriginalComment('');
            setMyOriginalRating(0);
            setIsEditingReview(false);
            await refreshReviews();
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
    setMyOriginalComment((review.comment || '').trim());
    setMyOriginalRating(review.rating || 0);
    setIsEditingReview(true);
  };

  const handleStarSelect = (star: number) => {
    setRatingValidationMessage('');
    setMyRating(star);
    const target = starScaleAnims[star - 1];
    target.setValue(0.9);
    Animated.spring(target, {
      toValue: 1.18,
      tension: 170,
      friction: 7,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(target, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleLoadMore = async () => {
    if (loadingMoreReviews || !canLoadMore) return;
    setLoadingMoreReviews(true);
    setTimeout(() => {
      setVisibleReviewCount((prev) => Math.min(prev + REVIEWS_PAGE_SIZE, reviews.length));
      setLoadingMoreReviews(false);
    }, 140);
  };

  const onRefreshReviews = async () => {
    await refreshReviews({ pullToRefresh: true });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.topBar}>
          <SkeletonBlock width={24} height={24} borderRadius={12} />
          <View style={styles.actions}>
            <SkeletonBlock width={30} height={30} borderRadius={Radius.sm} />
            <SkeletonBlock width={30} height={30} borderRadius={Radius.sm} />
          </View>
        </View>
        <View style={styles.card}>
          <SkeletonBlock width={74} height={20} borderRadius={Radius.full} />
          <SkeletonBlock width="72%" height={22} borderRadius={10} style={{ marginTop: Spacing.sm }} />
          <SkeletonBlock width="96%" height={14} borderRadius={8} style={{ marginTop: Spacing.md }} />
          <SkeletonBlock width="65%" height={14} borderRadius={8} style={{ marginTop: 8 }} />
          <SkeletonBlock width="100%" height={44} borderRadius={Radius.md} style={{ marginTop: Spacing.md }} />
        </View>
      </View>
    );
  }
  if (!note)   return <View style={styles.center}><Text style={styles.err}>Note not found.</Text></View>;

  const isOwner = note && user && String(note.uploadedBy?._id || note.uploadedBy) === String(user._id);

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
          <Text style={[styles.meta, styles.metaPrimary]} numberOfLines={1}>
            {note.uploadedBy?.name}
          </Text>
          <Ionicons name="library-outline" size={13} color={Colors.textMuted} style={{ marginLeft: 12 }} />
          <Text style={[styles.meta, styles.metaSecondary]} numberOfLines={1} ellipsizeMode="tail">
            {getNoteSubjectLabel(note)}
          </Text>
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
      <Text style={styles.section}>Reviews ({reviewStats?.totalReviews ?? reviews.length})</Text>

      <View style={styles.filterCard}>
        <Text style={styles.filterLabel}>Sort</Text>
        <View style={styles.segmentedWrap}>
          {REVIEW_SORTS.map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[styles.segmentBtn, sortBy === option.key && styles.segmentBtnActive]}
              onPress={() => setSortBy(option.key)}
              activeOpacity={0.9}
            >
              <Text style={[styles.segmentText, sortBy === option.key && styles.segmentTextActive]} numberOfLines={1}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.filterLabel, { marginTop: Spacing.sm }]}>Filter by rating</Text>
        <View style={styles.filterPillWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {REVIEW_FILTERS.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[styles.filterPill, ratingFilter === option.key && styles.filterPillActive]}
                onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;
                  filterLayoutsRef.current[option.key] = { x, width };
                  if (option.key === ratingFilter && !filterUnderlineInitializedRef.current) {
                    filterUnderlineX.setValue(x);
                    filterUnderlineWidth.setValue(width);
                    filterUnderlineInitializedRef.current = true;
                  }
                }}
                onPress={() => {
                  setBreakdownStarFilter(null);
                  setRatingFilter(option.key);
                }}
              >
                <Text style={[styles.filterPillText, ratingFilter === option.key && styles.filterPillTextActive]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <Animated.View
            style={[
              styles.filterUnderline,
              {
                width: filterUnderlineWidth,
                transform: [{ translateX: filterUnderlineX }],
              },
            ]}
          />
        </View>
      </View>

      {/* Submit review */}
      {!isOwner && (!myReviewId || isEditingReview) && (
        <View style={styles.writeCard}>
          <Text style={styles.reviewLabel}>Write a Review</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <TouchableOpacity key={s} onPress={() => handleStarSelect(s)}>
                <Animated.View style={{ transform: [{ scale: starScaleAnims[s - 1] }] }}>
                  <Ionicons name={s <= myRating ? 'star' : 'star-outline'} size={34} color={Colors.star} />
                </Animated.View>
              </TouchableOpacity>
            ))}
          </View>
          {!!ratingValidationMessage && <Text style={styles.validationText}>{ratingValidationMessage}</Text>}
          <TextInput
            style={styles.commentInput}
            placeholder="Add a comment (10-500 characters, optional)"
            placeholderTextColor={Colors.textMuted}
            value={myComment}
            onChangeText={(value) => setMyComment(value.slice(0, 500))}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{myComment.length} / 500</Text>

          <View style={styles.writeActions}>
            <TouchableOpacity style={styles.submitBtn} onPress={submitReview} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color={Colors.text} />
              ) : (
                <Text style={styles.submitText}>{myReviewId ? 'Update Review' : 'Submit Review'}</Text>
              )}
            </TouchableOpacity>
            {myReviewId && (
              <>
                <TouchableOpacity style={styles.deleteReviewBtn} onPress={() => handleDeleteReview(myReviewId)}>
                  <Ionicons name="trash-outline" size={16} color={Colors.error} />
                  <Text style={styles.deleteReviewBtnText}>Delete Review</Text>
                </TouchableOpacity>
                {isEditingReview && (
                  <TouchableOpacity
                    style={[styles.deleteReviewBtn, { backgroundColor: Colors.surfaceAlt, borderColor: Colors.border, marginLeft: 8 }]}
                    onPress={() => {
                      setIsEditingReview(false);
                      setMyRating(myOriginalRating);
                      setMyComment(myOriginalComment);
                    }}
                  >
                    <Text style={{ color: Colors.textMuted, fontWeight: '700', fontSize: FontSizes.xs }}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      )}
      {reviewStats && (
        <View style={styles.statsCardStandalone}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Rating Breakdown</Text>
            <Text style={styles.statsSubtitle}>{reviewStats.totalReviews} active reviews</Text>
          </View>
          <View style={styles.statsSummaryRow}>
            <Text style={styles.statsSummaryValue}>{reviewStats.averageRating?.toFixed(1) || '0.0'}</Text>
            <Text style={styles.statsSummaryLabel}>Average Rating</Text>
          </View>
          {[5, 4, 3, 2, 1].map((star) => {
            const count = Number(reviewStats.distribution?.[star] || 0);
            const total = Number(reviewStats.totalReviews || 0);
            const percent = total ? Math.round((count / total) * 100) : 0;
            const rowActive = breakdownStarFilter === star;

            return (
              <TouchableOpacity
                key={star}
                style={[styles.ratingBarRow, rowActive && styles.ratingBarRowActive]}
                onPress={() => {
                  setRatingFilter('all');
                  setBreakdownStarFilter((prev) => (prev === star ? null : star));
                }}
                activeOpacity={0.9}
              >
                <Text style={[styles.ratingBarLabel, rowActive && styles.ratingBarLabelActive]}>{star}★</Text>
                <View style={styles.ratingBarTrack}>
                  <Animated.View
                    style={[
                      styles.ratingBarFill,
                      {
                        width: statsBarAnims[star].interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        }),
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.ratingBarCount, rowActive && styles.ratingBarLabelActive]}>{percent}%</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <Animated.View
        style={{
          opacity: listOpacityAnim,
          transform: [{ translateY: listTranslateAnim }],
        }}
      >
        {loadingReviews ? (
          <View style={styles.skeletonWrap}>
            {[0, 1, 2].map((idx) => (
              <View key={idx} style={styles.skeletonCard}>
                <View style={styles.skeletonAvatar} />
                <View style={styles.skeletonContent}>
                  <View style={styles.skeletonLineShort} />
                  <View style={styles.skeletonLine} />
                  <View style={styles.skeletonLineMedium} />
                </View>
                <Animated.View
                  style={[
                    styles.skeletonShimmer,
                    {
                      transform: [
                        {
                          translateX: shimmerAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-260, 260],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              </View>
            ))}
          </View>
        ) : reviews.length === 0 ? (
          <View style={styles.emptyStateCard}>
            <Ionicons name="chatbubble-ellipses-outline" size={42} color={Colors.textMuted} />
            <Text style={styles.emptyStateTitle}>No reviews yet</Text>
            <Text style={styles.emptyStateSubtitle}>Be the first to share your thoughts!</Text>
          </View>
        ) : (
          <View style={styles.reviewListContainer}>
            {visibleReviews.map((r) => {
              const currentVote = (r.votes || []).find((vote: any) => {
                const voteUserId = typeof vote.user === 'string' ? vote.user : vote.user?._id;
                return String(voteUserId) === String(user?._id);
              })?.value;
              const isHelpfulActive = currentVote === 'helpful';
              const isNotHelpfulActive = currentVote === 'notHelpful';
              const isMine = String(r.reviewer?._id || r.reviewer) === String(user?._id);
              const isNoteOwnerReview = String(r.reviewer?._id || r.reviewer) === String(note?.uploadedBy?._id || note?.uploadedBy);

              return (
                <View key={r._id} style={[styles.reviewCard, isMine && styles.myReviewCard]}>
                  {r.isHidden && (
                    <View style={styles.reportedBanner}>
                      <Text style={styles.reportedText}>This review has been reported.</Text>
                    </View>
                  )}

                  <View style={styles.reviewHeaderRow}>
                    <View style={styles.reviewerIdentityWrap}>
                      {r.reviewer?.avatar ? (
                        <Image source={{ uri: r.reviewer.avatar }} style={styles.reviewerAvatar} />
                      ) : (
                        <View style={styles.avatarFallback}>
                          <Text style={styles.avatarInitials}>{toInitials(r.reviewer?.name)}</Text>
                        </View>
                      )}

                      <View style={styles.reviewerBlock}>
                        <Text style={styles.reviewerName}>{r.reviewer?.name}</Text>
                        <View style={styles.starRowSmall}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Ionicons key={s} name={s <= r.rating ? 'star' : 'star-outline'} size={13} color={Colors.star} />
                          ))}
                        </View>

                        <View style={styles.badgeRow}>
                          {isNoteOwnerReview && (
                            <View style={styles.badge}><Text style={styles.badgeText}>Note Owner</Text></View>
                          )}
                          {r.reviewer?.isEmailVerified && (
                            <View style={styles.badge}><Text style={styles.badgeText}>Verified Upload</Text></View>
                          )}
                          {r.reviewer?.batch && (
                            <View style={styles.badge}><Text style={styles.badgeText}>{r.reviewer.batch}</Text></View>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.reviewOverflowWrap}>
                      {!isMine && (
                        <>
                          <TouchableOpacity
                            style={styles.overflowBtn}
                            onPress={() => setOverflowReviewId((prev) => (prev === r._id ? null : r._id))}
                          >
                            <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textMuted} />
                          </TouchableOpacity>
                          {overflowReviewId === r._id && (
                            <View style={styles.overflowMenu}>
                              <TouchableOpacity
                                style={styles.overflowMenuItem}
                                onPress={() => {
                                  setOverflowReviewId(null);
                                  handleReport(r._id);
                                }}
                              >
                                <Ionicons name="flag-outline" size={14} color={Colors.textMuted} />
                                <Text style={styles.overflowMenuText}>Report</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  </View>

                  <Text style={styles.reviewTimestamp}>
                    Posted {formatTimestamp(r.createdAt)}{r.isEdited ? ` · Edited ${formatTimestamp(r.editedAt || r.updatedAt)}` : ''}
                  </Text>
                  {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}

                  {!r.isHidden && (
                    <View style={styles.voteRow}>
                      <TouchableOpacity
                        style={[styles.voteGhostBtn, isHelpfulActive && styles.voteGhostBtnActive]}
                        onPress={() => handleVote(r._id, 'helpful')}
                      >
                        <Ionicons name="thumbs-up-outline" size={14} color={isHelpfulActive ? Colors.text : Colors.textMuted} />
                        <Text style={[styles.voteGhostText, isHelpfulActive && styles.voteGhostTextActive]}>
                          Helpful {r.helpfulVotesCount || 0}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.voteGhostBtn, isNotHelpfulActive && styles.voteGhostBtnActive]}
                        onPress={() => handleVote(r._id, 'notHelpful')}
                      >
                        <Ionicons name="thumbs-down-outline" size={14} color={isNotHelpfulActive ? Colors.text : Colors.textMuted} />
                        <Text style={[styles.voteGhostText, isNotHelpfulActive && styles.voteGhostTextActive]}>
                          Not Helpful {r.notHelpfulVotesCount || 0}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {isMine && (
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
                </View>
              );
            })}

            <TouchableOpacity style={styles.refreshReviewsBtn} onPress={onRefreshReviews}>
              <Ionicons name="refresh-outline" size={16} color={Colors.textMuted} />
              <Text style={styles.refreshReviewsText}>Refresh reviews</Text>
            </TouchableOpacity>

            {canLoadMore && (
              <TouchableOpacity style={styles.loadMoreBtn} onPress={handleLoadMore} disabled={loadingMoreReviews}>
                {loadingMoreReviews ? (
                  <ActivityIndicator size="small" color={Colors.text} />
                ) : (
                  <Text style={styles.loadMoreText}>Load More Reviews</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </Animated.View>

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
  metaRow:      { flexDirection: 'row', alignItems: 'center', marginTop: 4, minWidth: 0 },
  meta:         { fontSize: FontSizes.xs, color: Colors.textMuted, marginLeft: 4 },
  metaPrimary:  { maxWidth: '36%' },
  metaSecondary:{ flex: 1, minWidth: 0 },
  tagRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  tag:          { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  tagText:      { fontSize: FontSizes.xs, color: Colors.textMuted },
  openBtn:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Spacing.sm, marginTop: Spacing.md, gap: 8 },
  openBtnText:  { color: Colors.text, fontWeight: '700', fontSize: FontSizes.md },
  section:      { fontSize: FontSizes.lg, fontWeight: '700', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.sm, marginHorizontal: Spacing.md },
  reviewLabel:  { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text, marginBottom: Spacing.sm },
  starRow:      { flexDirection: 'row', gap: 6, marginBottom: Spacing.sm },
  starRowSmall: { flexDirection: 'row', gap: 2, marginTop: 3 },
  submitBtn:    { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', minHeight: 44 },
  submitText:   { color: Colors.text, fontWeight: '700', fontSize: FontSizes.xs },
  reviewCard:   { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, marginHorizontal: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border },
  myReviewCard: { borderLeftWidth: 3, borderLeftColor: Colors.primary },
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
  statsCardStandalone: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsHeader:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  statsTitle:    { fontSize: FontSizes.md, fontWeight: '700', color: Colors.text },
  statsSubtitle: { fontSize: FontSizes.xs, color: Colors.textMuted },
  statsSummaryRow:{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginVertical: Spacing.sm },
  statsSummaryValue:{ fontSize: FontSizes.xxxl, fontWeight: '800', color: Colors.text },
  statsSummaryLabel:{ fontSize: FontSizes.sm, color: Colors.textMuted },
  ratingBarRow:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, borderRadius: Radius.sm, paddingHorizontal: 4, paddingVertical: 5 },
  ratingBarRowActive: { backgroundColor: Colors.primary + '1E' },
  ratingBarLabel:{ width: 28, fontSize: FontSizes.xs, color: Colors.textMuted, fontWeight: '700' },
  ratingBarLabelActive: { color: Colors.text },
  ratingBarTrack: { flex: 1, height: 8, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, overflow: 'hidden' },
  ratingBarFill:  { height: '100%', backgroundColor: Colors.star },
  ratingBarCount: { width: 40, textAlign: 'right', fontSize: FontSizes.xs, color: Colors.textMuted, fontWeight: '700' },
  reportedBanner:{ backgroundColor: Colors.error + '15', borderRadius: Radius.md, padding: 8, marginBottom: Spacing.sm },
  reportedText:  { color: Colors.error, fontSize: FontSizes.xs, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: Spacing.md },
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
  segmentedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt,
    overflow: 'hidden',
  },
  segmentBtn: {
    width: '50%',
    paddingVertical: 10,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: Colors.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: Colors.text,
  },
  filterPillWrap: {
    position: 'relative',
    paddingBottom: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
  },
  filterPillActive: {
    backgroundColor: Colors.surface,
  },
  filterPillText: {
    fontSize: FontSizes.xs,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  filterPillTextActive: {
    color: Colors.text,
  },
  filterUnderline: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  writeCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '70',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 7,
  },
  validationText: {
    color: Colors.error,
    fontSize: FontSizes.xs,
    marginTop: -4,
    marginBottom: Spacing.sm,
    fontWeight: '700',
  },
  charCount: {
    textAlign: 'right',
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.sm,
  },
  writeActions: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  deleteReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.error + '80',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.error + '16',
    minHeight: 44,
  },
  deleteReviewBtnText: {
    color: Colors.error,
    fontWeight: '700',
    fontSize: FontSizes.xs,
  },
  skeletonWrap: {
    marginHorizontal: Spacing.md,
  },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  skeletonAvatar: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
  },
  skeletonContent: {
    flex: 1,
    marginLeft: Spacing.sm,
    gap: 8,
  },
  skeletonLine: {
    height: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    width: '95%',
  },
  skeletonLineShort: {
    height: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    width: '45%',
  },
  skeletonLineMedium: {
    height: 9,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    width: '68%',
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: '#FFFFFF10',
  },
  emptyStateCard: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
    gap: 8,
  },
  emptyStateTitle: {
    color: Colors.text,
    fontWeight: '800',
    fontSize: FontSizes.lg,
  },
  emptyStateSubtitle: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewerIdentityWrap: {
    flexDirection: 'row',
    flex: 1,
    paddingRight: Spacing.sm,
  },
  reviewerAvatar: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceAlt,
    marginRight: Spacing.sm,
  },
  avatarFallback: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '30',
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primary + '70',
  },
  avatarInitials: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '800',
  },
  reviewOverflowWrap: {
    position: 'relative',
  },
  overflowBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  overflowMenu: {
    position: 'absolute',
    top: 34,
    right: 0,
    zIndex: 20,
    minWidth: 122,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  overflowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  overflowMenuText: {
    color: Colors.text,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  voteGhostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  voteGhostBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  voteGhostText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  voteGhostTextActive: {
    color: Colors.text,
  },
  loadMoreBtn: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: Spacing.md,
  },
  loadMoreText: {
    color: Colors.text,
    fontSize: FontSizes.sm,
    fontWeight: '700',
  },
  refreshReviewsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    paddingVertical: 10,
  },
  refreshReviewsText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    fontWeight: '700',
  },
  reviewListContainer: {
    maxHeight: 520,
  },
});
