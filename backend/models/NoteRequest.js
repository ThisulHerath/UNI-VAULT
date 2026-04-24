const mongoose = require('mongoose');

const noteRequestSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Request title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: null,
    },
    // Optional: link request to a specific subject
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      default: null,
    },
    // Who posted the request?
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Requester reference is required'],
      index: true,
    },
    status: {
      type: String,
      enum: ['open', 'fulfilled', 'closed'],
      default: 'open',
    },
    closedReason: {
      type: String,
      // Reason the request was closed; null means it is still open or fulfilled.
      default: null,
    },
    closedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
    // Optional: link to a Note that fulfilled this request
    fulfilledByNote: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Note',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('NoteRequest', noteRequestSchema);
