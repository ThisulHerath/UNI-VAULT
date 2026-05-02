const Review = require('./Review');
const Note   = require('../notes/Note');
const User   = require('../auth/User');
const { REPORT_REASONS, VOTE_VALUES } = require('./reviewRules');

const REVIEW_POPULATE = 'name avatar batch university email isEmailVerified';
const SORT_MAP = {
  helpful: { helpfulVotesCount: -1, notHelpfulVotesCount: 1, createdAt: -1 },
  recent: { createdAt: -1 },
  highest: { rating: -1, helpfulVotesCount: -1, createdAt: -1 },
  lowest: { rating: 1, helpfulVotesCount: -1, createdAt: -1 },
};

const parseNumber = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const buildFilteredQuery = (noteId, req) => {
  const query = { note: noteId };

  const minRating = parseNumber(req.query.minRating);
  const maxRating = parseNumber(req.query.maxRating);

  if (typeof minRating === 'number' || typeof maxRating === 'number') {
    query.rating = {};
    if (typeof minRating === 'number') query.rating.$gte = minRating;
    if (typeof maxRating === 'number') query.rating.$lte = maxRating;
  }

  if (req.query.includeHidden !== 'true') {
    query.isHidden = false;
  }

  return query;
};

const buildSort = (sortKey) => SORT_MAP[sortKey] || SORT_MAP.helpful;

const buildReviewerStatsMap = async (reviewerIds) => {
  if (!reviewerIds.length) {
    return new Map();
  }

  const stats = await Review.aggregate([
    { $match: { reviewer: { $in: reviewerIds }, isHidden: false } },
    {
      $group: {
        _id: '$reviewer',
        reviewCount: { $sum: 1 },
        averageReviewRating: { $avg: '$rating' },
      },
    },
  ]);

  return new Map(
    stats.map((item) => [
      String(item._id),
      {
        reviewCount: item.reviewCount || 0,
        averageReviewRating: item.reviewCount > 0 ? Math.round(item.averageReviewRating * 10) / 10 : 0,
        isActiveReviewer: (item.reviewCount || 0) >= 5,
      },
    ])
  );
};

const decorateReview = (review, reviewerStatsMap = new Map()) => {
  const obj = review.toObject ? review.toObject() : review;
  const reviewerId = obj.reviewer?._id ? String(obj.reviewer._id) : String(obj.reviewer);
  const stats = reviewerStatsMap.get(reviewerId) || {
    reviewCount: 0,
    averageReviewRating: 0,
    isActiveReviewer: false,
  };

  if (obj.reviewer && typeof obj.reviewer === 'object') {
    obj.reviewer.reviewCount = stats.reviewCount;
    obj.reviewer.averageReviewRating = stats.averageReviewRating;
    obj.reviewer.isActiveReviewer = stats.isActiveReviewer;
  }

  return obj;
};

const buildNoteStats = async (noteId) => {
  return Review.getNoteStats(noteId);
};

// ─── @route  POST /api/notes/:noteId/reviews ─────────────────────────────────
// ─── @access Private
exports.createReview = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.noteId);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    // Prevent owner from reviewing their own note
    if (note.uploadedBy.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot review your own note.' });
    }

    const { rating, comment } = req.body;
    const normalizedComment = typeof comment === 'string' ? comment.trim() : null;

    // Validate rating one more time on server
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
    }

    if (normalizedComment && (normalizedComment.length < 10 || normalizedComment.length > 500)) {
      return res.status(400).json({ success: false, message: 'Comment must be between 10 and 500 characters.' });
    }

    const existingReview = await Review.findOne({
      note: req.params.noteId,
      reviewer: req.user._id,
    });

    if (existingReview) {
      if (existingReview.reportCount > 0) {
        existingReview.rating = Number(rating);
        existingReview.comment = normalizedComment || null;
        existingReview.reports = [];
        existingReview.reportCount = 0;
        existingReview.isHidden = false;
        existingReview.hiddenAt = null;
        existingReview.votes = [];
        existingReview.helpfulVotesCount = 0;
        existingReview.notHelpfulVotesCount = 0;
        existingReview.isEdited = true;
        existingReview.editedAt = new Date();

        await existingReview.save();
        await existingReview.populate('reviewer', REVIEW_POPULATE);

        const reviewerStatsMap = await buildReviewerStatsMap([req.user._id]);
        return res.status(200).json({
          success: true,
          message: 'Your previously reported review was replaced with a new one.',
          data: decorateReview(existingReview, reviewerStatsMap),
        });
      }

      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this note. Update or delete your existing review.',
      });
    }

    const review = await Review.create({
      note: req.params.noteId,
      reviewer: req.user._id,
      rating,
      comment: normalizedComment || null,
    });

    await review.populate('reviewer', REVIEW_POPULATE);
    const reviewerStatsMap = await buildReviewerStatsMap([req.user._id]);
    res.status(201).json({ success: true, data: decorateReview(review, reviewerStatsMap) });
  } catch (error) {
    // Duplicate key = already reviewed
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this note. Update or delete your existing review.' });
    }
    next(error);
  }
};

// ─── @route  GET /api/notes/:noteId/reviews ──────────────────────────────────
// ─── @access Public
exports.getReviewsForNote = async (req, res, next) => {
  try {
    const reviews = await Review.find(buildFilteredQuery(req.params.noteId, req))
      .populate('reviewer', REVIEW_POPULATE)
      .sort(buildSort(req.query.sort));

    let mergedReviews = reviews;
    if (req.user) {
      const ownReview = await Review.findOne({ note: req.params.noteId, reviewer: req.user._id }).populate('reviewer', REVIEW_POPULATE);
      if (ownReview && ownReview.isHidden && !reviews.some((review) => review._id.toString() === ownReview._id.toString())) {
        mergedReviews = [ownReview, ...reviews];
      }
    }

    const reviewerIds = [...new Set(mergedReviews.map((review) => String(review.reviewer?._id || review.reviewer)))];
    const reviewerStatsMap = await buildReviewerStatsMap(reviewerIds);
    const decoratedReviews = mergedReviews.map((review) => decorateReview(review, reviewerStatsMap));
    const stats = await buildNoteStats(req.params.noteId);

    res.status(200).json({ success: true, count: decoratedReviews.length, stats, data: decoratedReviews });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/reviews/:id ────────────────────────────────────────────
// ─── @access Public
exports.getReviewById = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('reviewer', REVIEW_POPULATE)
      .populate('note', 'title');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const reviewerStatsMap = await buildReviewerStatsMap([review.reviewer?._id || review.reviewer]);
    res.status(200).json({ success: true, data: decorateReview(review, reviewerStatsMap) });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/reviews/:id ────────────────────────────────────────────
// ─── @access Private (reviewer only)
exports.updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const reviewerId = String(review.reviewer?._id || review.reviewer);
    if (reviewerId !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorised to update this review.' });
    }

    const { rating, comment } = req.body;
    const updates = {};

    if (rating !== undefined) {
      const normalizedRating = Number(rating);
      if (Number.isNaN(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5.' });
      }
      updates.rating = normalizedRating;
    }

    if (comment !== undefined) {
      const normalizedComment = typeof comment === 'string' ? comment.trim() : '';
      if (normalizedComment && (normalizedComment.length < 10 || normalizedComment.length > 500)) {
        return res.status(400).json({ success: false, message: 'Comment must be between 10 and 500 characters.' });
      }
      updates.comment = normalizedComment || null;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'Provide a rating or comment to update.' });
    }

    const hasChanges = Object.entries(updates).some(([key, value]) => String(review[key]) !== String(value));
    Object.assign(review, updates);
    if (hasChanges) {
      review.isEdited = true;
      review.editedAt = new Date();
    }

    await review.save();

    await review.populate('reviewer', REVIEW_POPULATE);
    const reviewerStatsMap = await buildReviewerStatsMap([review.reviewer._id || review.reviewer]);
    res.status(200).json({ success: true, data: decorateReview(review, reviewerStatsMap) });
  } catch (error) {
    next(error);
  }
};

// ─── @route  DELETE /api/reviews/:id ─────────────────────────────────────────
// ─── @access Private (reviewer or admin)
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const reviewerId = String(review.reviewer?._id || review.reviewer);
    if (reviewerId !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this review.' });
    }

    await Review.findOneAndDelete({ _id: req.params.id }); // triggers post-delete hook

    res.status(200).json({ success: true, message: 'Review deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── @route  POST /api/reviews/:id/vote ─────────────────────────────────────
// ─── @access Private
exports.voteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const { value } = req.body;
    const voteValue = VOTE_VALUES.includes(value) ? value : null;
    if (!voteValue) {
      return res.status(400).json({ success: false, message: `Vote value must be one of: ${VOTE_VALUES.join(', ')}` });
    }

    const existingVote = review.votes.find((vote) => String(vote.user) === String(req.user._id));
    if (existingVote && existingVote.value === voteValue) {
      review.votes = review.votes.filter((vote) => String(vote.user) !== String(req.user._id));
    } else if (existingVote) {
      existingVote.value = voteValue;
      existingVote.votedAt = new Date();
    } else {
      review.votes.push({ user: req.user._id, value: voteValue, votedAt: new Date() });
    }

    review.helpfulVotesCount = review.votes.filter((vote) => vote.value === 'helpful').length;
    review.notHelpfulVotesCount = review.votes.filter((vote) => vote.value === 'notHelpful').length;
    await review.save();

    await review.populate('reviewer', REVIEW_POPULATE);
    const reviewerStatsMap = await buildReviewerStatsMap([review.reviewer._id || review.reviewer]);
    const hasVote = review.votes.some((vote) => String(vote.user) === String(req.user._id));
    res.status(200).json({
      success: true,
      message: hasVote ? 'Vote saved.' : 'Vote removed.',
      data: decorateReview(review, reviewerStatsMap),
    });
  } catch (error) {
    next(error);
  }
};

// ─── @route  POST /api/reviews/:id/report ───────────────────────────────────
// ─── @access Private
exports.reportReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    const { reason } = req.body;
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ success: false, message: `Invalid report reason. Allowed: ${REPORT_REASONS.join(', ')}` });
    }

    const alreadyReported = review.reports.some((report) => report.reporter.toString() === req.user._id.toString());
    if (alreadyReported) {
      return res.status(400).json({ success: false, message: 'You have already reported this review.' });
    }

    review.reports.push({ reporter: req.user._id, reason, reportedAt: new Date() });
    review.reportCount = review.reports.length;

    if (review.reportCount >= 3) {
      await Review.findOneAndDelete({ _id: review._id });

      const author = await User.findById(review.reviewer);
      if (!author) {
        return res.status(200).json({
          success: true,
          message: 'Review reached 3 reports and was deleted.',
        });
      }

      const nextStrikeCount = (author.moderationStrikeCount || 0) + 1;
      const shouldBan = nextStrikeCount >= 3;

      author.moderationStrikeCount = nextStrikeCount;
      if (shouldBan) {
        author.isActive = false;
      }
      await author.save();

      if (shouldBan) {
        return res.status(200).json({
          success: true,
          message: 'Review reached 3 reports and was deleted. The author account has been banned after 3 moderation strikes.',
          moderationStrikeCount: nextStrikeCount,
        });
      }

      if (nextStrikeCount === 1) {
        return res.status(200).json({
          success: true,
          message: 'Review reached 3 reports and was deleted. Warning issued: if this happens 3 times, the author account will be banned.',
          moderationStrikeCount: nextStrikeCount,
        });
      }

      return res.status(200).json({
        success: true,
        message: `Review reached 3 reports and was deleted. Strike ${nextStrikeCount}/3 recorded for the author.`,
        moderationStrikeCount: nextStrikeCount,
      });
    }

    await review.save();

    const remainingReports = 3 - review.reportCount;
    const warningMessage =
      review.reportCount === 1
        ? 'This review has been reported. If it gets 3 reports, the review will be deleted and the author account will be banned.'
        : `This review has been reported. ${remainingReports} more report${remainingReports === 1 ? '' : 's'} will delete the review and ban the author account.`;

    return res.status(200).json({
      success: true,
      message: warningMessage,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};
