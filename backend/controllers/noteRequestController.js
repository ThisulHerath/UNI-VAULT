const NoteRequest = require('../models/NoteRequest');
const Note = require('../models/Note');
const { setNoteFileUrl } = require('../utils/noteFiles');

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
  await request.populate('closedBy', 'name avatar');

  const plainRequest = request.toObject();
  plainRequest.fulfilledByNote = setNoteFileUrl(plainRequest.fulfilledByNote, req);
  return plainRequest;
};

// ─── @route  POST /api/requests ───────────────────────────────────────────────
// ─── @access Private
exports.createRequest = async (req, res, next) => {
  try {
    const { title, description, subject } = req.body;

    const request = await NoteRequest.create({
      title,
      description,
      subject: subject || null,
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
      .populate('fulfilledByNote', 'title fileUrl');

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

    if (request.requestedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised to update this request.' });
    }

    if (request.status === 'closed') {
      return res.status(400).json({ success: false, message: 'Closed requests cannot be edited.' });
    }

    const { title, description, status, fulfilledByNote } = req.body;
    const isRequestOwner = request.requestedBy.toString() === req.user._id.toString();
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
  try {
    const request = await NoteRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (request.requestedBy.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You cannot fulfill your own request.',
      });
    }

    if (request.status === 'fulfilled') {
      return res.status(400).json({ success: false, message: 'Request is already fulfilled.' });
    }

    const { noteId } = req.body;

    if (noteId) {
      const note = await Note.findById(noteId).select('uploadedBy');
      if (!note) {
        return res.status(404).json({ success: false, message: 'Note not found.' });
      }

      if (note.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only fulfill with your own uploaded note.',
        });
      }

      request.fulfilledByNote = note._id;
    }

    request.status = 'fulfilled';
    await request.save();

    await request.populate('requestedBy', 'name avatar');
    await request.populate('subject', 'name code');
    await request.populate('fulfilledByNote', 'title fileUrl');

    const plainRequest = request.toObject();
    plainRequest.fulfilledByNote = setNoteFileUrl(plainRequest.fulfilledByNote, req);

    res.status(200).json({ success: true, data: plainRequest });
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

    if (request.requestedBy.toString() !== req.user._id.toString()) {
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

    if (request.requestedBy.toString() !== req.user._id.toString()) {
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

    if (request.requestedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this request.' });
    }

    applyClosedState(request, req, 'deleted');
    await request.save();

    res.status(200).json({ success: true, message: 'Request deleted successfully.', data: await populateRequest(request, req) });
  } catch (error) {
    next(error);
  }
};
