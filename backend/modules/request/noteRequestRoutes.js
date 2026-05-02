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
  getRequestFile,
  updateFulfillmentVisibility,
  deleteRequest,
} = require('./noteRequestController');

const { protect, optionalAuth } = require('../../middleware/auth');
const { uploadRequestAttachment } = require('../../middleware/upload');

router.get('/', optionalAuth, getRequests);
router.get('/:id/file', optionalAuth, getRequestFile);
router.get('/:id', optionalAuth, getRequestById);
router.post('/',      protect, createRequest);
router.post('/:id/close', protect, closeRequest);
router.post('/:id/reopen', protect, reopenRequest);
router.post('/:id/fulfill', protect, uploadRequestAttachment.single('file'), fulfillRequest);
router.put('/:id/fulfillment/visibility', protect, updateFulfillmentVisibility);
router.put('/:id',    protect, updateRequest);
router.delete('/:id', protect, deleteRequest);

module.exports = router;
