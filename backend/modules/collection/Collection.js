const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Collection name is required'],
      trim: true,
      maxlength: [100, 'Collection name cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: null,
    },
    courseCode: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: [30, 'Course code cannot exceed 30 characters'],
      default: null,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
    // Who owns this collection/bookmark folder?
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner reference is required'],
      index: true,
    },
    // Array of bookmarked Note references
    notes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Note',
      },
    ],
    // Array of bookmarked request fulfillments (file-based)
    requestFulfillments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'NoteRequest',
      },
    ],
    isPrivate: {
      type: Boolean,
      default: true, // Collections are private by default
    },
    // Searchable tags for public collections
    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],
    // Reddit-style voting for public collections
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    downvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: count of notes in this collection
collectionSchema.virtual('noteCount').get(function () {
  return this.notes ? this.notes.length : 0;
});

collectionSchema.virtual('requestFulfillmentCount').get(function () {
  return this.requestFulfillments ? this.requestFulfillments.length : 0;
});

// Virtual: Reddit-style score
collectionSchema.virtual('score').get(function () {
  const up = this.upvotes ? this.upvotes.length : 0;
  const down = this.downvotes ? this.downvotes.length : 0;
  return up - down;
});

collectionSchema.index({ owner: 1, priority: 1, createdAt: -1 });
collectionSchema.index({ owner: 1, targetDate: 1 });

module.exports = mongoose.model('Collection', collectionSchema);
