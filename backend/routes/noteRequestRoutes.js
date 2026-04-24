const express = require('express');
const router  = express.Router();

const {
  createRequest,
  getRequests,
  getRequestById,
  updateRequest,
  closeRequest,
  reopenRequest,
  fulfillRequest,
  deleteRequest,
} = require('../controllers/noteRequestController');

const { protect } = require('../middleware/auth');

router.get('/',    getRequests);
router.get('/:id', getRequestById);
router.post('/',      protect, createRequest);
router.post('/:id/close', protect, closeRequest);
router.post('/:id/reopen', protect, reopenRequest);
router.post('/:id/fulfill', protect, fulfillRequest);
router.put('/:id',    protect, updateRequest);
router.delete('/:id', protect, deleteRequest);

module.exports = router;
