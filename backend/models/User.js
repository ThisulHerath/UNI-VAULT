const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries by default
    },
    avatar: {
      type: String,
      default: null, // Cloudinary secure_url
    },
    avatarPublicId: {
      type: String,
      default: null, // Cloudinary public_id for deletion
    },
    university: {
      type: String,
      trim: true,
      default: null,
    },
    batch: {
      type: String,
      trim: true,
      default: null, // e.g. "SE2020", "IT2021"
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // References to other collections
    studyGroups: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'StudyGroup',
      },
    ],
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: Notes uploaded by this user
userSchema.virtual('notes', {
  ref: 'Note',
  localField: '_id',
  foreignField: 'uploadedBy',
});

// Virtual: Collections owned by this user
userSchema.virtual('collections', {
  ref: 'Collection',
  localField: '_id',
  foreignField: 'owner',
});

module.exports = mongoose.model('User', userSchema);
