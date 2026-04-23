const NoteRequest = require('../models/NoteRequest');
const { setNoteFileUrl } = require('../utils/noteFiles');

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
// ─── @query  status, subject, page, limit
exports.getRequests = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.status)  filter.status  = req.query.status;
    if (req.query.subject) filter.subject = req.query.subject;

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

    const plainRequests = requests.map((request) => {
      const plainRequest = request.toObject();
      plainRequest.fulfilledByNote = setNoteFileUrl(plainRequest.fulfilledByNote, req);
      return plainRequest;
    });

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

    const plainRequest = request.toObject();
    plainRequest.fulfilledByNote = setNoteFileUrl(plainRequest.fulfilledByNote, req);

    res.status(200).json({ success: true, data: plainRequest });
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

    const { title, description, status, fulfilledByNote } = req.body;
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

    await request.deleteOne();

    res.status(200).json({ success: true, message: 'Request deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
