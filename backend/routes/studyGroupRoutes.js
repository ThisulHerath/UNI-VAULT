const express = require('express');
const router  = express.Router();

const {
  createGroup,
  getGroups,
  getGroupById,
  updateGroup,
  joinGroup,
  manageMember,
  manageGroupNote,
  deleteGroup,
} = require('../controllers/studyGroupController');

const { protect }      = require('../middleware/auth');
const { uploadCover }  = require('../middleware/upload');

router.get('/',    getGroups);
router.get('/:id', getGroupById);

router.post('/',   protect, uploadCover.single('coverImage'), createGroup);
router.put('/:id', protect, uploadCover.single('coverImage'), updateGroup);
router.delete('/:id', protect, deleteGroup);

router.post('/:id/join', protect, joinGroup);
router.put('/:id/members/:userId', protect, manageMember);  // approve/remove
router.put('/:id/notes', protect, manageGroupNote);         // share/unshare note

module.exports = router;
