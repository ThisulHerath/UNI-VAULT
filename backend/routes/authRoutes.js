const express = require('express');
const router  = express.Router();
const { body } = require('express-validator');

const {
  register,
  login,
  getMe,
  updateProfile,
  updatePassword,
  deleteAccount,
} = require('../controllers/authController');

const { protect }        = require('../middleware/auth');
const { uploadAvatar }   = require('../middleware/upload');

// Validation rules
const registerRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

router.post('/register', uploadAvatar.single('avatar'), registerRules, register);
router.post('/login', login);

router.get('/me',       protect, getMe);
router.put('/me',       protect, uploadAvatar.single('avatar'), updateProfile);
router.put('/password', protect, updatePassword);
router.delete('/me',    protect, deleteAccount);

module.exports = router;
