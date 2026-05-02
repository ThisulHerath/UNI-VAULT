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
} = require('./authController');

const { protect }        = require('../../middleware/auth');
const { uploadAvatar }   = require('../../middleware/upload');

// Validation rules
const { checkPassword } = require('./passwordPolicy');

const registerRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').custom(checkPassword),
];

const updatePasswordRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').custom(checkPassword),
];
const deleteAccountRules = [
  body('password').notEmpty().withMessage('Password is required to delete account'),
];

router.post('/register', uploadAvatar.single('avatar'), registerRules, register);
router.post('/login', login);

router.get('/me',       protect, getMe);
router.put('/me',       protect, uploadAvatar.single('avatar'), updateProfile);
router.put('/password', protect, updatePasswordRules, updatePassword);
router.delete('/me',    protect, deleteAccountRules, deleteAccount);

module.exports = router;
