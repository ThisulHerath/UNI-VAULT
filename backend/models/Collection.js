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
    isPrivate: {
      type: Boolean,
      default: true, // Collections are private by default
    },
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

module.exports = mongoose.model('Collection', collectionSchema);
