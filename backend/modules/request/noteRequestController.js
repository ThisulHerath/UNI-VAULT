const NoteRequest = require('./NoteRequest');
const Note = require('../notes/Note');
const { setNoteFileUrl } = require('../../utils/noteFiles');
const mongoose = require('mongoose');
const {
  deleteRequestFileFromGridFs,
  getRequestBucket,
  isAllowedRequestMimeType,
  REQUEST_MAX_FILE_SIZE_BYTES,
  setRequestFulfillmentFileUrl,
  uploadRequestFileToGridFs,
} = require('../../utils/requestFiles');

const resolveEntityId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

const canViewFulfillment = (request, req) => {
  if (!request?.fulfillment) return false;
  if (request.fulfillment.isPublic) return true;
  if (!req?.user) return false;

  const viewerId = resolveEntityId(req.user._id || req.user);
  return [
    resolveEntityId(request.requestedBy),
    resolveEntityId(request.fulfillment.uploadedBy),
  ].includes(viewerId) || req.user.role === 'admin';
};

const applyClosedState = (request, req, reason) => {
  request.status = 'closed';
  request.closedReason = reason;
  request.closedBy = req.user._id;
  request.closedAt = new Date();
};

const populateRequest = async (request, req) => {
  await request.populate('requestedBy', 'name avatar');
  await request.populate('subject', 'name code');
  await request.populate('fulfilledByNote', 'title fileUrl');
  await request.populate('fulfillment.uploadedBy', 'name avatar');
  await request.populate('closedBy', 'name avatar');

  const plainRequest = request.toObject();
  if (plainRequest.fulfillment) {
    if (canViewFulfillment(plainRequest, req)) {
      setRequestFulfillmentFileUrl(plainRequest, req);
    } else {
      delete plainRequest.fulfillment;
    }
  }
  plainRequest.fulfilledByNote = setNoteFileUrl(plainRequest.fulfilledByNote, req);
  return plainRequest;
};

// ─── @route  POST /api/requests ───────────────────────────────────────────────
// ─── @access Private
exports.createRequest = async (req, res, next) => {
  try {
    const { title, description, subject, subjectLabel } = req.body;

    const request = await NoteRequest.create({
      title,
      description,
      subject: subject || null,
      subjectLabel: typeof subjectLabel === 'string' && subjectLabel.trim()
        ? subjectLabel.trim()
        : null,
      requestedBy: req.user._id,
    });

    await request.populate('requestedBy', 'name avatar');
    await request.populate('subject', 'name code');

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/requests ────────────────────────────────────────────────
// ─── @access Public
// ─── @query  status, subject, requestedBy, page, limit
exports.getRequests = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.status)  filter.status  = req.query.status;
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.requestedBy) filter.requestedBy = req.query.requestedBy;

    const [requests, total] = await Promise.all([
      NoteRequest.find(filter)
        .populate('requestedBy', 'name avatar')
        .populate('subject', 'name code')
        .populate('fulfilledByNote', 'title fileUrl')
        .populate('fulfillment.uploadedBy', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      NoteRequest.countDocuments(filter),
    ]);

    const plainRequests = [];
    for (const request of requests) {
      plainRequests.push(await populateRequest(request, req));
    }

    res.status(200).json({
      success: true,
      count: plainRequests.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: plainRequests,
    });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/requests/:id ────────────────────────────────────────────
// ─── @access Public
exports.getRequestById = async (req, res, next) => {
  try {
    const request = await NoteRequest.findById(req.params.id)
      .populate('requestedBy', 'name avatar')
      .populate('subject', 'name code')
      .populate('fulfilledByNote', 'title fileUrl')
      .populate('fulfillment.uploadedBy', 'name avatar');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    res.status(200).json({ success: true, data: await populateRequest(request, req) });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/requests/:id ────────────────────────────────────────────
// ─── @access Private (owner or admin)
exports.updateRequest = async (req, res, next) => {
  try {
    let request = await NoteRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const requesterId = resolveEntityId(request.requestedBy);
    if (requesterId !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised to update this request.' });
    }

    if (request.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Closed requests cannot be edited.' });
    }

    const { title, description, status, fulfilledByNote } = req.body;
    const isRequestOwner = requesterId === String(req.user._id);
    const isTryingToFulfill = status === 'fulfilled' || fulfilledByNote;

    if (isRequestOwner && isTryingToFulfill) {
      return res.status(403).json({
        success: false,
        message: 'You cannot fulfill your own request.',
      });
    }

    if (title)           request.title           = title;
    if (description)     request.description     = description;
    if (status)          request.status          = status;
    if (fulfilledByNote) request.fulfilledByNote = fulfilledByNote;

    await request.save();

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// ─── @route  POST /api/requests/:id/fulfill ─────────────────────────────────
// ─── @access Private (non-owner only)
exports.fulfillRequest = async (req, res, next) => {
  let uploadedFileId = null;

  try {
    const request = await NoteRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const requesterId = resolveEntityId(request.requestedBy);
    if (requesterId === String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot fulfill your own request.',
      });
    }

    if (request.status === 'fulfilled') {
      return res.status(400).json({ success: false, message: 'Request is already fulfilled.' });
    }

    const { noteId } = req.body;
    const fulfillmentDescription = typeof req.body.description === 'string'
      ? req.body.description.trim()
      : '';

    if (req.file) {
      if (!isAllowedRequestMimeType(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Allowed: PDF, JPG, PNG, GIF, WebP, DOCX.',
        });
      }

      if (!req.file.size || req.file.size > REQUEST_MAX_FILE_SIZE_BYTES) {
        return res.status(400).json({
          success: false,
          message: 'File size cannot exceed 15 MB.',
        });
      }

      const uploadResult = await uploadRequestFileToGridFs(req.file, request._id);
      uploadedFileId = uploadResult.fileId;

      request.fulfillment = {
        fileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        fileMimeType: uploadResult.fileMimeType,
        fileSize: uploadResult.fileSize,
        fileType: uploadResult.fileType,
        description: fulfillmentDescription || null,
        isPublic: false,
        uploadedBy: req.user._id,
        uploadedAt: new Date(),
      };
      request.fulfilledByNote = null;
    } else if (noteId) {
      const note = await Note.findById(noteId).select('uploadedBy');
      if (!note) {
        return res.status(404).json({ success: false, message: 'Note not found.' });
      }

      const noteOwnerId = resolveEntityId(note.uploadedBy);
      if (noteOwnerId !== String(req.user._id) && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only fulfill with your own uploaded note.',
        });
      }

      request.fulfilledByNote = note._id;
      request.fulfillment = null;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file or provide a note to fulfill this request.',
      });
    }

    request.status = 'fulfilled';
    await request.save();

    await request.populate('requestedBy', 'name avatar');
    await request.populate('subject', 'name code');
    await request.populate('fulfilledByNote', 'title fileUrl');
    await request.populate('fulfillment.uploadedBy', 'name avatar');

    const plainRequest = request.toObject();
    if (plainRequest.fulfillment) {
      setRequestFulfillmentFileUrl(plainRequest, req);
    }
    plainRequest.fulfilledByNote = setNoteFileUrl(plainRequest.fulfilledByNote, req);

    res.status(200).json({ success: true, data: plainRequest });
  } catch (error) {
    if (uploadedFileId) {
      try {
        await deleteRequestFileFromGridFs(uploadedFileId);
      } catch (cleanupError) {
        // Ignore cleanup failures; the main error should be surfaced.
      }
    }
    next(error);
  }
};

// ─── @route  PUT /api/requests/:id/fulfillment/visibility ────────────────────
// ─── @access Private (owner only)
exports.updateFulfillmentVisibility = async (req, res, next) => {
  try {
    const request = await NoteRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const requesterId = resolveEntityId(request.requestedBy);
    if (requesterId !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised to update this request.' });
    }

    if (request.status !== 'fulfilled' || !request.fulfillment) {
      return res.status(400).json({ success: false, message: 'Only fulfilled requests with an attachment can be made public.' });
    }

    request.fulfillment.isPublic = req.body.isPublic === true || req.body.isPublic === 'true';
    await request.save();

    res.status(200).json({ success: true, data: await populateRequest(request, req) });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/requests/:id/file ──────────────────────────────────────
// ─── @access Public (private for requester and fulfiller)
exports.getRequestFile = async (req, res, next) => {
  try {
    const request = await NoteRequest.findById(req.params.id)
      .populate('requestedBy', 'name avatar')
      .populate('fulfillment.uploadedBy', 'name avatar');

    if (!request || !request.fulfillment?.fileId) {
      return res.status(404).json({ success: false, message: 'Fulfillment file not found.' });
    }

    if (!canViewFulfillment(request.toObject(), req)) {
      return res.status(403).json({ success: false, message: 'Not authorised to view this file.' });
    }

    const bucket = getRequestBucket();
    const fileId = request.fulfillment.fileId instanceof mongoose.Types.ObjectId
      ? request.fulfillment.fileId
      : new mongoose.Types.ObjectId(request.fulfillment.fileId);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const file = files[0];
    res.setHeader('Content-Type', file.contentType || request.fulfillment.fileMimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${(request.fulfillment.fileName || file.filename || 'request-file').replace(/"/g, '\\"')}"`
    );

    return bucket.openDownloadStream(fileId).on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
};

// ─── @route  POST /api/requests/:id/close ─────────────────────────────────────
// ─── @access Private (owner only)
exports.closeRequest = async (req, res, next) => {
  try {
    const request = await NoteRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const requesterId = resolveEntityId(request.requestedBy);
    if (requesterId !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorised to close this request.' });
    }

    if (request.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Request is already closed.' });
    }

    applyClosedState(request, req, 'cancelled');
    await request.save();

    res.status(200).json({ success: true, message: 'Request closed successfully.', data: await populateRequest(request, req) });
  } catch (error) {
    next(error);
  }
};

// ─── @route  POST /api/requests/:id/reopen ───────────────────────────────────
// ─── @access Private (owner only, cancelled requests only)
exports.reopenRequest = async (req, res, next) => {
  try {
    const request = await NoteRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const requesterId = resolveEntityId(request.requestedBy);
    if (requesterId !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorised to reopen this request.' });
    }

    if (request.status !== 'closed') {
      return res.status(400).json({ success: false, message: 'Only closed requests can be reopened.' });
    }

    if (request.closedReason === 'deleted') {
      return res.status(400).json({ success: false, message: 'Deleted requests cannot be reopened.' });
    }

    if (request.closedReason !== 'cancelled') {
      return res.status(400).json({ success: false, message: 'Only cancelled requests can be reopened.' });
    }

    request.status = 'open';
    request.closedReason = null;
    request.closedBy = null;
    request.closedAt = null;
    await request.save();

    res.status(200).json({ success: true, message: 'Request reopened successfully.', data: await populateRequest(request, req) });
  } catch (error) {
    next(error);
  }
};

// ─── @route  DELETE /api/requests/:id ─────────────────────────────────────────
// ─── @access Private (owner or admin)
exports.deleteRequest = async (req, res, next) => {
  try {
    const request = await NoteRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const requesterId = resolveEntityId(request.requestedBy);
    if (requesterId !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this request.' });
    }

    if (request.fulfillment?.fileId) {
      await deleteRequestFileFromGridFs(request.fulfillment.fileId);
    }

    request.fulfillment = null;
    request.fulfilledByNote = null;
    applyClosedState(request, req, 'deleted');
    await request.save();

    res.status(200).json({ success: true, message: 'Request deleted successfully.', data: await populateRequest(request, req) });
  } catch (error) {
    next(error);
  }
};
