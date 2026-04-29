const express = require('express');
const router = express.Router();

const { createTestReview } = require('../controllers/devController');

// Dev-only: create a review directly (no auth) — only in non-production
router.post('/create-review', createTestReview);

module.exports = router;
