const express = require('express');
const router  = express.Router();

const {
  createGroup,
  getGroups,
  getMyGroups,
  getGroupCoverImage,
  getGroupById,
  updateGroup,
  joinGroup,
  joinGroupByCode,
  manageMember,
  leaveGroup,
  updateInvitationCode,
  manageGroupNote,
  getGroupMessages,
  createGroupMessage,
  getGroupMessageFile,
  deleteGroupMessage,
  deleteGroup,
} = require('./studyGroupController');

const { protect, optionalAuth } = require('../../middleware/auth');
const { uploadCover, uploadGroupMessageAttachment }  = require('../../middleware/upload');

router.get('/', getGroups);
router.get('/mine', protect, getMyGroups);
router.get('/:id/cover', optionalAuth, getGroupCoverImage);
router.get('/:id', optionalAuth, getGroupById);

router.post('/', protect, uploadCover.single('coverImage'), createGroup);
router.put('/:id', protect, uploadCover.single('coverImage'), updateGroup);
router.delete('/:id', protect, deleteGroup);

router.post('/join-by-code', protect, joinGroupByCode);
router.post('/:id/join', protect, joinGroup);
router.post('/:id/leave', protect, leaveGroup);

router.put('/:id/members/:userId', protect, manageMember);
router.put('/:id/invitation-code', protect, updateInvitationCode);
router.put('/:id/notes', protect, manageGroupNote);

router.get('/:id/messages', protect, getGroupMessages);
router.get('/:id/messages/:messageId/file', protect, getGroupMessageFile);
router.post('/:id/messages', protect, uploadGroupMessageAttachment.single('attachment'), createGroupMessage);
router.delete('/:id/messages/:messageId', protect, deleteGroupMessage);

module.exports = router;
