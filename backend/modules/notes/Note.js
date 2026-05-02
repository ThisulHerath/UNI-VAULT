const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Note title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: null,
    },
    // File information (populated by Multer)
    fileUrl: {
      type: String,
      required: [true, 'File URL is required'],
    },
    // MongoDB GridFS file identifier for the uploaded note file.
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },
    fileType: {
      type: String,
      enum: ['pdf', 'image', 'doc', 'docx', 'other'],
      default: 'other',
    },
    fileMimeType: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number, // size in bytes
      default: null,
    },
    originalFileName: {
      type: String,
      default: null,
    },
    // Legacy filename retained only for fallback migration from disk storage.
    cloudinaryPublicId: {
      type: String,
      default: null,
    },
    // Relationship: Which subject does this note belong to?
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
      index: true,
    },
    // Fallback subject label for notes that do not use a global Subject record.
    subjectText: {
      type: String,
      trim: true,
      maxlength: [200, 'Subject label cannot exceed 200 characters'],
      default: null,
    },
    // Relationship: Who uploaded this note?
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader reference is required'],
      index: true,
    },
    // Aggregated rating cache (updated when reviews are added/deleted)
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    isPublic: {
      type: Boolean,
      default: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    downloadCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Production Indexes ───────────────────────────────────────────────────────
// Text index for full-text search (title, description, tags)
noteSchema.index({ title: 'text', description: 'text', tags: 'text' });

// Fast filtering by subject
noteSchema.index({ subject: 1, isPublic: 1, createdAt: -1 });

// Fast filtering by uploader (my notes)
noteSchema.index({ uploadedBy: 1, createdAt: -1 });

// Fast sorting by rating and views
noteSchema.index({ averageRating: -1, totalReviews: -1, viewCount: -1 });

// Fast lookup by tag
noteSchema.index({ tags: 1, isPublic: 1 });

// For timestamp queries (recent notes)
noteSchema.index({ createdAt: -1 });

// Virtual: All reviews for this note
noteSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'note',
});

module.exports = mongoose.model('Note', noteSchema);
