const mongoose = require('mongoose');
const Review = require('../models/Review');

// Create a review document directly for local testing
exports.createTestReview = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: 'Not allowed in production.' });
    }

    const { noteId, reviewer, rating = 5, comment = 'Test review created by dev route' } = req.body;
    const noteObjectId = noteId || new mongoose.Types.ObjectId();

    const review = await Review.create({
      note: noteObjectId,
      reviewer,
      rating,
      comment,
    });

    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
};
