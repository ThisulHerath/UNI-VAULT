const mongoose = require('mongoose');

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
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce one review per user per note
reviewSchema.index({ note: 1, reviewer: 1 }, { unique: true });

// --- Static method to recalculate and update averageRating on Note ---
reviewSchema.statics.calcAverageRating = async function (noteId) {
  const stats = await this.aggregate([
    { $match: { note: noteId } },
    {
      $group: {
        _id: '$note',
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model('Note').findByIdAndUpdate(noteId, {
      averageRating: Math.round(stats[0].avgRating * 10) / 10,
      totalReviews: stats[0].count,
    });
  } else {
    await mongoose.model('Note').findByIdAndUpdate(noteId, {
      averageRating: 0,
      totalReviews: 0,
    });
  }
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
