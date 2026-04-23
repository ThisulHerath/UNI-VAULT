const Note = require('../models/Note');
const fs = require('fs');
const path = require('path');

// ─── @route  POST /api/notes ──────────────────────────────────────────────────
// ─── @access Private
exports.createNote = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file.' });
    }

    const { title, description, subject, tags, isPublic } = req.body;

    // Determine file type from mimetype
    let fileType = 'other';
    if (req.file.mimetype === 'application/pdf') fileType = 'pdf';
    else if (req.file.mimetype.startsWith('image/')) fileType = 'image';
    else if (req.file.mimetype.includes('word')) fileType = 'docx';

    // Build file URL: http://localhost:5000/uploads/notes/filename
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/notes/${req.file.filename}`;

    const note = await Note.create({
      title,
      description,
      subject,
      uploadedBy: req.user._id,
      fileUrl,                          // Local file URL
      cloudinaryPublicId: req.file.filename, // Store filename for deletion
      fileType,
      fileSize: req.file.size || null,
      originalFileName: req.file.originalname,
      tags: tags ? tags.split(',').map((t) => t.trim().toLowerCase()) : [],
      isPublic: isPublic !== undefined ? isPublic : true,
    });

    await note.populate('uploadedBy', 'name avatar');
    await note.populate('subject', 'name code');

    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/notes ───────────────────────────────────────────────────
// ─── @access Public  (with optional auth for private notes)
// ─── @query  page, limit, subject, search, tag
exports.getNotes = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const filter = { isPublic: true };

    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.tag)     filter.tags    = req.query.tag.toLowerCase();
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    const [notes, total] = await Promise.all([
      Note.find(filter)
        .populate('uploadedBy', 'name avatar')
        .populate('subject', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Note.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: notes.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: notes,
    });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/notes/:id ───────────────────────────────────────────────
// ─── @access Public
exports.getNoteById = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id)
      .populate('uploadedBy', 'name avatar batch university')
      .populate('subject', 'name code department');

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    // Increment view count silently
    note.viewCount += 1;
    await note.save({ validateBeforeSave: false });

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/notes/:id ───────────────────────────────────────────────
// ─── @access Private (owner only)
exports.updateNote = async (req, res, next) => {
  try {
    let note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    if (note.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised to update this note.' });
    }

    const { title, description, tags, isPublic } = req.body;
    const updateData = {
      title,
      description,
      isPublic,
      tags: tags ? tags.split(',').map((t) => t.trim().toLowerCase()) : note.tags,
    };

    // Replace file if a new one is uploaded
    if (req.file) {
      // Delete old file from disk
      if (note.cloudinaryPublicId) {
        const oldFilePath = path.join('uploads/notes', note.cloudinaryPublicId);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/notes/${req.file.filename}`;
      updateData.fileUrl = fileUrl;
      updateData.cloudinaryPublicId = req.file.filename;

      // Determine new file type
      if (req.file.mimetype === 'application/pdf') updateData.fileType = 'pdf';
      else if (req.file.mimetype.startsWith('image/')) updateData.fileType = 'image';
      else if (req.file.mimetype.includes('word')) updateData.fileType = 'docx';
    }

    note = await Note.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('uploadedBy', 'name avatar')
      .populate('subject', 'name code');

    res.status(200).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
};

// ─── @route  DELETE /api/notes/:id ────────────────────────────────────────────
// ─── @access Private (owner or admin)
exports.deleteNote = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    if (note.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this note.' });
    }

    // Delete file from disk
    if (note.cloudinaryPublicId) {
      const filePath = path.join('uploads/notes', note.cloudinaryPublicId);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await note.deleteOne();

    res.status(200).json({ success: true, message: 'Note deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/notes/my ────────────────────────────────────────────────
// ─── @access Private — fetch notes uploaded by the logged-in user
exports.getMyNotes = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const [notes, total] = await Promise.all([
      Note.find({ uploadedBy: req.user._id })
        .populate('subject', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Note.countDocuments({ uploadedBy: req.user._id }),
    ]);

    res.status(200).json({
      success: true,
      count: notes.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: notes,
    });
  } catch (error) {
    next(error);
  }
};
