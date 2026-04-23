const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    value: {
      type: String,
      enum: ['helpful', 'notHelpful'],
      required: true,
    },
    votedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      enum: ['spam', 'offensive', 'misleading'],
      required: true,
    },
    reportedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const reviewSchema = new mongoose.Schema(
  {
    // Which note is being reviewed?
    note: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      required: [true, 'Note reference is required'],
      index: true,
    },
    // Who wrote this review?
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Reviewer reference is required'],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5'],
    },
    comment: {
      type: String,
      trim: true,
      minlength: [10, 'Comment must be at least 10 characters'],
      maxlength: [500, 'Comment cannot exceed 500 characters'],
      default: null,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    hiddenAt: {
      type: Date,
      default: null,
    },
    helpfulVotesCount: {
      type: Number,
      default: 0,
    },
    notHelpfulVotesCount: {
      type: Number,
      default: 0,
    },
    reportCount: {
      type: Number,
      default: 0,
    },
    votes: {
      type: [voteSchema],
      default: [],
    },
    reports: {
      type: [reportSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Production Indexes ──────────────────────────────────────────────────────
// Enforce one review per user per note (unique constraint)
reviewSchema.index({ note: 1, reviewer: 1 }, { unique: true });

// Fast lookups for reviews by note (for rating aggregation)
reviewSchema.index({ note: 1, isHidden: 1, createdAt: -1 });

// Fast lookups for user's reviews (for profile pages, etc.)
reviewSchema.index({ reviewer: 1, isHidden: 1, createdAt: -1 });

// For avg rating calculations
reviewSchema.index({ note: 1, rating: 1 });

// Sort by helpful votes first
reviewSchema.index({ note: 1, helpfulVotesCount: -1, createdAt: -1 });

// --- Static method to recalculate and update averageRating on Note ---
reviewSchema.statics.calcAverageRating = async function (noteId) {
  const stats = await this.getNoteStats(noteId);

  await mongoose.model('Note').findByIdAndUpdate(noteId, {
    averageRating: stats.averageRating,
    totalReviews: stats.totalReviews,
  });
};

reviewSchema.statics.getNoteStats = async function (noteId) {
  const stats = await this.aggregate([
    { $match: { note: new mongoose.Types.ObjectId(noteId), isHidden: false } },
    {
      $group: {
        _id: '$note',
        totalReviews: { $sum: 1 },
        avgRating: { $avg: '$rating' },
        helpfulVotes: { $sum: '$helpfulVotesCount' },
        notHelpfulVotes: { $sum: '$notHelpfulVotesCount' },
        oneStars: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        twoStars: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        threeStars: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        fourStars: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
      },
    },
  ]);

  if (stats.length === 0) {
    return {
      totalReviews: 0,
      averageRating: 0,
      helpfulVotes: 0,
      notHelpfulVotes: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  const result = stats[0];
  return {
    totalReviews: result.totalReviews || 0,
    averageRating: result.totalReviews > 0 ? Math.round(result.avgRating * 10) / 10 : 0,
    helpfulVotes: result.helpfulVotes || 0,
    notHelpfulVotes: result.notHelpfulVotes || 0,
    distribution: {
      1: result.oneStars || 0,
      2: result.twoStars || 0,
      3: result.threeStars || 0,
      4: result.fourStars || 0,
      5: result.fiveStars || 0,
    },
  };
};

// Hook: recalculate after save
reviewSchema.post('save', function () {
  this.constructor.calcAverageRating(this.note);
});

// Hook: recalculate after delete
reviewSchema.post('findOneAndDelete', function (doc) {
  if (doc) {
    doc.constructor.calcAverageRating(doc.note);
  }
});

module.exports = mongoose.model('Review', reviewSchema);
