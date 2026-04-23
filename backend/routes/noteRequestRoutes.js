const express = require('express');
const router  = express.Router();

const {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  deleteRequest,
} = require('../controllers/noteRequestController');

const { protect } = require('../middleware/auth');

router.get('/',    getRequests);
router.get('/:id', getRequestById);
router.post('/',      protect, createRequest);
router.put('/:id',    protect, updateRequest);
router.delete('/:id', protect, deleteRequest);

module.exports = router;
