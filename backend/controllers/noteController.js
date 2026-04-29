const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Note = require('../models/Note');
const {
  buildRelativeNoteFileUrl,
  deleteNoteFileFromGridFs,
  getLegacyNoteFilePath,
  getNoteBucket,
  resolveNoteFileType,
  setNoteFileUrl,
  setNoteFileUrls,
  uploadNoteFileToGridFs,
} = require('../utils/noteFiles');

const resolveEntityId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const sendLegacyNoteFile = (res, legacyPath, note) => {
  const downloadName = note?.originalFileName || path.basename(legacyPath);
  res.setHeader('Content-Disposition', `inline; filename="${downloadName.replace(/"/g, '\\"')}"`);
  return res.sendFile(legacyPath);
};

// ─── @route  POST /api/notes ──────────────────────────────────────────────────
// ─── @access Private
exports.createNote = async (req, res, next) => {
  let uploadedFileId = null;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file.' });
    }

    const { title, description, subject, subjectText, tags, isPublic } = req.body;

    const normalizedSubjectText = subjectText ? subjectText.trim() : '';
    if (!subject && !normalizedSubjectText) {
      return res.status(400).json({ success: false, message: 'Please select a subject or add a note-only subject label.' });
    }

    const note = new Note({
      title,
      description,
      subject: subject || null,
      subjectText: subject ? null : normalizedSubjectText,
      uploadedBy: req.user._id,
      tags: tags ? tags.split(',').map((t) => t.trim().toLowerCase()) : [],
      isPublic: isPublic !== undefined ? isPublic : true,
    });
    note.fileUrl = buildRelativeNoteFileUrl(note._id.toString());

    const uploadResult = await uploadNoteFileToGridFs(req.file, note._id);
    uploadedFileId = uploadResult.fileId;
    note.fileId = uploadResult.fileId;
    note.fileUrl = buildRelativeNoteFileUrl(note._id.toString());
    note.fileType = resolveNoteFileType(req.file.mimetype);
    note.fileMimeType = req.file.mimetype;
    note.fileSize = uploadResult.fileSize || req.file.size || null;
    note.originalFileName = req.file.originalname;
    note.cloudinaryPublicId = null;

    await note.save();

    await note.populate('uploadedBy', 'name avatar');
    await note.populate('subject', 'name code');

    res.status(201).json({ success: true, data: setNoteFileUrl(note, req) });
  } catch (error) {
    if (uploadedFileId) {
      try {
        await deleteNoteFileFromGridFs(uploadedFileId);
      } catch (cleanupError) {
        // Ignore cleanup failures; the main error should be surfaced.
      }
    }
    next(error);
  }
};

// ─── @route  GET /api/notes/:id/file ─────────────────────────────────────────
// ─── @access Public
exports.getNoteFile = async (req, res, next) => {
  try {
    const note = await Note.findById(req.params.id).select('fileId fileMimeType fileUrl originalFileName cloudinaryPublicId');

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    if (note.fileId) {
      const bucket = getNoteBucket();
      const fileId = note.fileId instanceof mongoose.Types.ObjectId
        ? note.fileId
        : new mongoose.Types.ObjectId(note.fileId);

      const files = await bucket.find({ _id: fileId }).toArray();
      if (!files.length) {
        return res.status(404).json({ success: false, message: 'File not found.' });
      }

      const file = files[0];
      res.setHeader('Content-Type', file.contentType || note.fileMimeType || 'application/octet-stream');
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${(note.originalFileName || file.filename || 'note-file').replace(/"/g, '\\"')}"`
      );

      return bucket.openDownloadStream(fileId).on('error', next).pipe(res);
    }

    const legacyPath = getLegacyNoteFilePath(note);
    if (legacyPath && fs.existsSync(legacyPath)) {
      return sendLegacyNoteFile(res, legacyPath, note);
    }

    return res.status(404).json({ success: false, message: 'File not found.' });
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
      data: setNoteFileUrls(notes, req),
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

    res.status(200).json({ success: true, data: setNoteFileUrl(note, req) });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/notes/:id ───────────────────────────────────────────────
// ─── @access Private (owner only)
exports.updateNote = async (req, res, next) => {
  let newlyUploadedFileId = null;

  try {
    let note = await Note.findById(req.params.id);
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found.' });
    }

    const uploaderId = resolveEntityId(note.uploadedBy);
    if (uploaderId !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorised to update this note.' });
    }

    const { title, description, subject, subjectText, tags, isPublic } = req.body;
    const hasSubjectUpdate = Object.prototype.hasOwnProperty.call(req.body, 'subject')
      || Object.prototype.hasOwnProperty.call(req.body, 'subjectText');

    const updateData = {
      title,
      description,
      isPublic,
      tags: tags ? tags.split(',').map((t) => t.trim().toLowerCase()) : note.tags,
    };
    if (hasSubjectUpdate) {
      const normalizedSubjectText = subjectText ? subjectText.trim() : '';
      if (!subject && !normalizedSubjectText) {
        return res.status(400).json({ success: false, message: 'Please select a subject or add a note-only subject label.' });
      }

      updateData.subject = subject || null;
      updateData.subjectText = subject ? null : normalizedSubjectText;
    }
    const previousFileId = note.fileId;
    const previousLegacyPath = getLegacyNoteFilePath(note);

    // Replace file if a new one is uploaded
    if (req.file) {
      const uploadResult = await uploadNoteFileToGridFs(req.file, note._id);
      newlyUploadedFileId = uploadResult.fileId;
      updateData.fileId = uploadResult.fileId;
      updateData.fileUrl = buildRelativeNoteFileUrl(note._id.toString());
      updateData.fileType = resolveNoteFileType(req.file.mimetype);
      updateData.fileMimeType = req.file.mimetype;
      updateData.fileSize = uploadResult.fileSize || req.file.size || null;
      updateData.originalFileName = req.file.originalname;
      updateData.cloudinaryPublicId = null;
    }

    note = await Note.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('uploadedBy', 'name avatar')
      .populate('subject', 'name code');

    if (req.file) {
      if (previousFileId) {
        await deleteNoteFileFromGridFs(previousFileId);
      } else if (previousLegacyPath && fs.existsSync(previousLegacyPath)) {
        fs.unlinkSync(previousLegacyPath);
      }
    }

    res.status(200).json({ success: true, data: setNoteFileUrl(note, req) });
  } catch (error) {
    if (newlyUploadedFileId) {
      try {
        await deleteNoteFileFromGridFs(newlyUploadedFileId);
      } catch (cleanupError) {
        // Ignore cleanup failures; the main error should be surfaced.
      }
    }
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

    const uploaderId = resolveEntityId(note.uploadedBy);
    if (uploaderId !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this note.' });
    }

    if (note.fileId) {
      await deleteNoteFileFromGridFs(note.fileId);
    } else {
      const filePath = getLegacyNoteFilePath(note);
      if (filePath && fs.existsSync(filePath)) {
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
      data: setNoteFileUrls(notes, req),
    });
  } catch (error) {
    next(error);
  }
};
