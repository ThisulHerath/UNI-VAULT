const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('./User');
const Review = require('../review/Review');
const fs = require('fs');
const path = require('path');

// Helper: sign and return a JWT token
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

const buildUserPayload = async (userDoc) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  const stats = await Review.aggregate([
    { $match: { reviewer: userDoc._id, isHidden: false } },
    {
      $group: {
        _id: '$reviewer',
        reviewCount: { $sum: 1 },
        averageReviewRating: { $avg: '$rating' },
      },
    },
  ]);

  const summary = stats[0] || { reviewCount: 0, averageReviewRating: 0 };
  return {
    ...user,
    reviewCount: summary.reviewCount,
    averageReviewRating: summary.reviewCount > 0 ? Math.round(summary.averageReviewRating * 10) / 10 : 0,
  };
};

const sendTokenResponse = async (user, statusCode, res) => {
  const token = signToken(user._id);
  const payload = await buildUserPayload(user);
  res.status(statusCode).json({
    success: true,
    token,
    data: payload,
  });
};

// ─── @route  POST /api/auth/register ────────────────────────────────────────
// ─── @access Public
exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, university, batch } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const userData = {
      name,
      email,
      password: hashedPassword,
      university,
      batch,
    };

    if (req.file) {
      const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
      userData.avatar = avatarUrl;
      userData.avatarPublicId = req.file.filename;
    }

    const user = await User.create(userData);

    await sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// ─── @route  POST /api/auth/login ────────────────────────────────────────────
// ─── @access Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) {
      return res.status(401).json({ success: false, message: 'Account deactivated. Contact support.' });
    }

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/auth/me ─────────────────────────────────────────────────
// ─── @access Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    const payload = await buildUserPayload(user);
    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/auth/me ─────────────────────────────────────────────────
// ─── @access Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, university, batch } = req.body;
    const updateData = { name, university, batch };

    // Handle avatar upload (file attached by uploadAvatar middleware)
    if (req.file) {
      // Delete old avatar from disk if it exists
      if (req.user.avatarPublicId) {
        const oldFilePath = path.join('uploads/avatars', req.user.avatarPublicId);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      const avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
      updateData.avatar = avatarUrl;           // Local file URL
      updateData.avatarPublicId = req.file.filename; // Store filename for deletion
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    });

    const payload = await buildUserPayload(user);
    res.status(200).json({ success: true, data: payload });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/auth/password ──────────────────────────────────────────
// ─── @access Private
exports.updatePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    await sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// ─── @route  DELETE /api/auth/me ─────────────────────────────────────────────
// ─── @access Private
exports.deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Delete avatar from disk
    if (user.avatarPublicId) {
      const filePath = path.join('uploads/avatars', user.avatarPublicId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Soft delete — keeps data integrity for reviews/notes
    await User.findByIdAndUpdate(req.user._id, { isActive: false });

    res.status(200).json({ success: true, message: 'Account deactivated successfully.' });
  } catch (error) {
    next(error);
  }
};
