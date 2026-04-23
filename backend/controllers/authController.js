const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const cloudinary = require('../config/cloudinary');

// Helper: sign and return a JWT token
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });

const sendTokenResponse = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      university: user.university,
      batch: user.batch,
    },
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

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      university,
      batch,
    });

    sendTokenResponse(user, 201, res);
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

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/auth/me ─────────────────────────────────────────────────
// ─── @access Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, data: user });
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

    // Handle avatar upload via Cloudinary (file attached by uploadAvatar middleware)
    if (req.file) {
      // Delete old avatar from Cloudinary if it exists
      if (req.user.avatarPublicId) {
        await cloudinary.uploader.destroy(req.user.avatarPublicId);
      }
      updateData.avatar = req.file.path;           // Cloudinary secure_url
      updateData.avatarPublicId = req.file.filename; // Cloudinary public_id
    }

    const user = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/auth/password ──────────────────────────────────────────
// ─── @access Private
exports.updatePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// ─── @route  DELETE /api/auth/me ─────────────────────────────────────────────
// ─── @access Private
exports.deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    // Delete avatar from Cloudinary
    if (user.avatarPublicId) {
      await cloudinary.uploader.destroy(user.avatarPublicId);
    }

    // Soft delete — keeps data integrity for reviews/notes
    await User.findByIdAndUpdate(req.user._id, { isActive: false });

    res.status(200).json({ success: true, message: 'Account deactivated successfully.' });
  } catch (error) {
    next(error);
  }
};
