const mongoose = require('mongoose');

// Sub-schema for group members with roles
const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['admin', 'member', 'pending'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // No separate _id for sub-docs
);

const joinRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: false }
);

const groupMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      default: '',
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    attachment: {
      fileId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        index: true,
      },
      fileType: {
        type: String,
        enum: ['pdf', 'image', 'doc', 'docx', 'other'],
        default: null,
      },
      fileMimeType: {
        type: String,
        default: null,
      },
      fileSize: {
        type: Number,
        default: null,
      },
      originalFileName: {
        type: String,
        default: null,
      },
      fileUrl: {
        type: String,
        default: null,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const studyGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Study group name is required'],
      trim: true,
      maxlength: [150, 'Group name cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: null,
    },
    // Optional: associate group with a specific subject/batch
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    batch: {
      type: String,
      trim: true,
      default: null, // e.g. "SE2020"
    },
    // Who created the group?
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator reference is required'],
    },
    privacy: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    joinMode: {
      type: String,
      enum: ['open', 'request'],
      default: 'open',
    },
    invitationCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      default: null,
      uppercase: true,
      index: true,
    },
    // Embedded members array with roles
    members: [memberSchema],
    joinRequests: [joinRequestSchema],
    // Notes shared specifically within this group
    sharedNotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Note',
      },
    ],
    messages: [groupMessageSchema],
    // Avatar/banner image URL for the group
    coverImage: {
      type: String,
      default: null, // Cloudinary secure_url
    },
    coverPublicId: {
      type: String,
      default: null, // Cloudinary public_id for deletion
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: member count (excludes pending)
studyGroupSchema.virtual('memberCount').get(function () {
  if (!this.members) return 0;
  return this.members.filter((m) => m.role !== 'pending').length;
});

studyGroupSchema.virtual('pendingRequestCount').get(function () {
  if (!this.joinRequests) return 0;
  return this.joinRequests.filter((r) => r.status === 'pending').length;
});

studyGroupSchema.index({ privacy: 1, joinMode: 1, createdAt: -1 });
studyGroupSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('StudyGroup', studyGroupSchema);
