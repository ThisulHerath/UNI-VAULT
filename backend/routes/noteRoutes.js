const express = require('express');
const router  = express.Router();

const {
  createNote,
  getNotes,
  getNoteById,
  updateNote,
  deleteNote,
  getMyNotes,
} = require('../controllers/noteController');

const {
  createReview,
  getReviewsForNote,
} = require('../controllers/reviewController');

const { protect }      = require('../middleware/auth');
const { uploadNote }   = require('../middleware/upload');

// Public
router.get('/',    getNotes);
router.get('/my',  protect, getMyNotes);
router.get('/:id', getNoteById);

// Protected
router.post('/',    protect, uploadNote.single('file'), createNote);
router.put('/:id',  protect, uploadNote.single('file'), updateNote);
router.delete('/:id', protect, deleteNote);

// Nested: reviews for a note  →  /api/notes/:noteId/reviews
router.get('/:noteId/reviews',  getReviewsForNote);
router.post('/:noteId/reviews', protect, createReview);

module.exports = router;
