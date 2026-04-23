const express = require('express');
const router  = express.Router();
const { body, param, validationResult } = require('express-validator');

const {
  createNote,
  getNotes,
  getNoteById,
  getNoteFile,
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

// ─── Validation middleware ────────────────────────────────────────────────────
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Public
router.get('/',    getNotes);
router.get('/my',  protect, getMyNotes);
router.get('/:id/file', getNoteFile);
router.get('/:id', getNoteById);

// Protected
router.post('/',    protect, uploadNote.single('file'), createNote);
router.put('/:id',  protect, uploadNote.single('file'), updateNote);
router.delete('/:id', protect, deleteNote);

// Nested: reviews for a note  →  /api/notes/:noteId/reviews
router.get(
  '/:noteId/reviews',
  param('noteId').isMongoId().withMessage('Invalid note ID'),
  validateRequest,
  getReviewsForNote
);

router.post(
  '/:noteId/reviews',
  protect,
  param('noteId').isMongoId().withMessage('Invalid note ID'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  body('comment')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Comment must be between 10 and 500 characters'),
  validateRequest,
  createReview
);

module.exports = router;
