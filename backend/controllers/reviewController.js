const Review = require('../models/Review');
const Note   = require('../models/Note');

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

    const review = await Review.create({
      note:     req.params.noteId,
      reviewer: req.user._id,
      rating,
      comment,
    });

    await review.populate('reviewer', 'name avatar');

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    // Duplicate key = already reviewed
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this note.' });
    }
    next(error);
  }
};

// ─── @route  GET /api/notes/:noteId/reviews ──────────────────────────────────
// ─── @access Public
exports.getReviewsForNote = async (req, res, next) => {
  try {
    const reviews = await Review.find({ note: req.params.noteId })
      .populate('reviewer', 'name avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/reviews/:id ────────────────────────────────────────────
// ─── @access Public
exports.getReviewById = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id)
      .populate('reviewer', 'name avatar')
      .populate('note', 'title');

    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    res.status(200).json({ success: true, data: review });
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

    if (review.reviewer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised to update this review.' });
    }

    const { rating, comment } = req.body;
    review.rating  = rating  ?? review.rating;
    review.comment = comment ?? review.comment;
    await review.save();           // triggers post-save hook → recalculates avg

    res.status(200).json({ success: true, data: review });
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

    if (review.reviewer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this review.' });
    }

    await Review.findByIdAndDelete(req.params.id); // triggers post-delete hook

    res.status(200).json({ success: true, message: 'Review deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
