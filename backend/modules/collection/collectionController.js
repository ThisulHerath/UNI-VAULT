const Collection = require('./Collection');
const NoteRequest = require('../request/NoteRequest');
const { setNoteFileUrls } = require('../../utils/noteFiles');
const { setRequestFulfillmentFileUrl } = require('../../utils/requestFiles');

const resolveEntityId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  if (value.id) return value.id.toString();
  return value.toString();
};

const canViewFulfillment = (request, user) => {
  if (!request?.fulfillment?.fileId || !user?._id) return false;
  if (request.fulfillment.isPublic) return true;

  const viewerId = resolveEntityId(user._id || user);
  return [
    resolveEntityId(request.requestedBy),
    resolveEntityId(request.fulfillment.uploadedBy),
  ].includes(viewerId) || user.role === 'admin';
};

// ─── @route  POST /api/collections ────────────────────────────────────────────
// ─── @access Private
exports.createCollection = async (req, res, next) => {
  try {
    const { name, description, isPrivate } = req.body;

    const collection = await Collection.create({
      name,
      description,
      owner: req.user._id,
      isPrivate: isPrivate !== undefined ? isPrivate : true,
    });

    res.status(201).json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/collections ─────────────────────────────────────────────
// ─── @access Private — only the owner sees their collections
exports.getMyCollections = async (req, res, next) => {
  try {
    const collections = await Collection.find({ owner: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: collections.length, data: collections });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/collections/:id ─────────────────────────────────────────
// ─── @access Private — fully populated notes inside the collection
exports.getCollectionById = async (req, res, next) => {
  try {
    const collection = await Collection.findById(req.params.id)
      .populate({
        path: 'notes',
        select: 'title fileUrl fileType averageRating totalReviews subject subjectText uploadedBy createdAt',
        populate: [
          { path: 'subject',    select: 'name code' },
          { path: 'uploadedBy', select: 'name avatar' },
        ],
      })
      .populate({
        path: 'requestFulfillments',
        select: 'title subject subjectLabel requestedBy status fulfillment',
        populate: [
          { path: 'subject', select: 'name code' },
          { path: 'requestedBy', select: 'name avatar' },
          { path: 'fulfillment.uploadedBy', select: 'name avatar' },
        ],
      });

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    // Only owner can view private collection
    const ownerId = resolveEntityId(collection.owner);
    if (collection.isPrivate && ownerId !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'This collection is private.' });
    }

    const plainCollection = collection.toObject();
    plainCollection.notes = setNoteFileUrls(plainCollection.notes, req);
    plainCollection.requestFulfillments = (plainCollection.requestFulfillments || []).map((requestItem) => {
      if (!requestItem?.fulfillment?.fileId) return requestItem;

      if (!canViewFulfillment(requestItem, req.user)) {
        return {
          ...requestItem,
          fulfillment: {
            ...requestItem.fulfillment,
            fileUrl: null,
          },
        };
      }

      return setRequestFulfillmentFileUrl(requestItem, req);
    });

    res.status(200).json({ success: true, data: plainCollection });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/collections/:id ─────────────────────────────────────────
// ─── @access Private (owner only) — edit name / description / privacy
exports.updateCollection = async (req, res, next) => {
  try {
    let collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    const ownerId = resolveEntityId(collection.owner);
    if (ownerId !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    const { name, description, isPrivate } = req.body;
    if (name !== undefined)      collection.name      = name;
    if (description !== undefined) collection.description = description;
    if (isPrivate !== undefined) collection.isPrivate = isPrivate;
    await collection.save();

    res.status(200).json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/collections/:id/notes ───────────────────────────────────
// ─── @access Private — add or remove a note
// ─── @body   { noteId, action: 'add' | 'remove' }
exports.updateCollectionNotes = async (req, res, next) => {
  try {
    const { noteId, action } = req.body;

    if (!noteId || !['add', 'remove'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Provide noteId and action ('add' or 'remove').",
      });
    }

    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    const ownerId = resolveEntityId(collection.owner);
    if (ownerId !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    const operator = action === 'add' ? { $addToSet: { notes: noteId } } : { $pull: { notes: noteId } };

    const updated = await Collection.findByIdAndUpdate(req.params.id, operator, { new: true });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/collections/:id/fulfillments ───────────────────────────
// ─── @access Private — add or remove a fulfilled request attachment
// ─── @body   { requestId, action: 'add' | 'remove' }
exports.updateCollectionFulfillments = async (req, res, next) => {
  try {
    const { requestId, action } = req.body;

    if (!requestId || !['add', 'remove'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Provide requestId and action ('add' or 'remove').",
      });
    }

    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    const ownerId = resolveEntityId(collection.owner);
    if (ownerId !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    if (action === 'add') {
      const request = await NoteRequest.findById(requestId)
        .select('requestedBy status fulfillment')
        .populate('fulfillment.uploadedBy', 'name avatar');

      if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found.' });
      }

      if (!request.fulfillment?.fileId || request.status !== 'fulfilled') {
        return res.status(400).json({ success: false, message: 'Only fulfilled requests with attachments can be saved.' });
      }

      if (!canViewFulfillment(request.toObject(), req.user)) {
        return res.status(403).json({ success: false, message: 'You cannot save this private fulfillment.' });
      }
    }

    const operator = action === 'add'
      ? { $addToSet: { requestFulfillments: requestId } }
      : { $pull: { requestFulfillments: requestId } };

    const updated = await Collection.findByIdAndUpdate(req.params.id, operator, { new: true });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── @route  DELETE /api/collections/:id ──────────────────────────────────────
// ─── @access Private (owner only)
exports.deleteCollection = async (req, res, next) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    const ownerId = resolveEntityId(collection.owner);
    if (ownerId !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    await collection.deleteOne();

    res.status(200).json({ success: true, message: 'Collection deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
