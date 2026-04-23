const express = require('express');
const router  = express.Router();

const {
  createSubject,
  getSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
} = require('../controllers/subjectController');

const { protect } = require('../middleware/auth');

router.get('/',    getSubjects);
router.get('/:id', getSubjectById);
router.post('/',   protect, createSubject);
router.put('/:id',    protect, updateSubject);
router.delete('/:id', protect, deleteSubject);

module.exports = router;
