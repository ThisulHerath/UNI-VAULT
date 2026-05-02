const mongoose = require('mongoose');

const subjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
      maxlength: [120, 'Subject name cannot exceed 120 characters'],
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: null, // e.g. "CS3012", "SE2020"
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: null,
    },
    department: {
      type: String,
      trim: true,
      default: null, // e.g. "Faculty of Computing"
    },
    semester: {
      type: Number,
      min: [1, 'Semester must be at least 1'],
      max: [12, 'Semester cannot exceed 12'],
      default: null,
    },
    // Who created this subject entry
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: All notes belonging to this subject
subjectSchema.virtual('notes', {
  ref: 'Note',
  localField: '_id',
  foreignField: 'subject',
});

module.exports = mongoose.model('Subject', subjectSchema);
