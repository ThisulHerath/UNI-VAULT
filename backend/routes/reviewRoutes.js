const express = require('express');
const router  = express.Router();

const {
  getReviewById,
  updateReview,
  deleteReview,
} = require('../controllers/reviewController');

const { protect } = require('../middleware/auth');

// Individual review management (create + list are on /api/notes/:noteId/reviews)
router.get('/:id',    getReviewById);
router.put('/:id',    protect, updateReview);
router.delete('/:id', protect, deleteReview);

module.exports = router;
