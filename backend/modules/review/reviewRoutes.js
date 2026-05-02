const express = require('express');
const router  = express.Router();
const { body, param, validationResult } = require('express-validator');
const { REPORT_REASONS, VOTE_VALUES } = require('./reviewRules');

const {
  getReviewById,
  updateReview,
  deleteReview,
  voteReview,
  reportReview,
} = require('./reviewController');

const { protect } = require('../../middleware/auth');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// Individual review management (create + list are on /api/notes/:noteId/reviews)
router.get('/:id',    getReviewById);
router.put(
  '/:id',
  protect,
  param('id').isMongoId().withMessage('Invalid review ID'),
  body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('comment')
    .optional({ checkFalsy: true })
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Comment must be between 10 and 500 characters'),
  validateRequest,
  updateReview
);
router.delete('/:id', protect, deleteReview);
router.post(
  '/:id/vote',
  protect,
  param('id').isMongoId().withMessage('Invalid review ID'),
  body('value').isIn(VOTE_VALUES).withMessage(`Vote must be one of: ${VOTE_VALUES.join(', ')}`),
  validateRequest,
  voteReview
);
router.post(
  '/:id/report',
  protect,
  param('id').isMongoId().withMessage('Invalid review ID'),
  body('reason').isIn(REPORT_REASONS).withMessage(`Invalid report reason. Allowed: ${REPORT_REASONS.join(', ')}`),
  validateRequest,
  reportReview
);

module.exports = router;
