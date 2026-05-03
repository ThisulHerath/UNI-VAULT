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
    const { name, description, courseCode, targetDate, priority, isPrivate, tags } = req.body;

    const collection = await Collection.create({
      name,
      description,
      courseCode: courseCode || null,
      targetDate: targetDate || null,
      priority: priority || 'normal',
      owner: req.user._id,
      isPrivate: isPrivate !== undefined ? isPrivate : true,
      tags: tags || [],
    });

    res.status(201).json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/collections/public ──────────────────────────────────────
// ─── @access Private (but fetches public collections)
exports.getPublicCollections = async (req, res, next) => {
  try {
    const { search, tag, page = 1, limit = 10 } = req.query;

    const query = { isPrivate: false };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (tag) {
      query.tags = tag.toLowerCase();
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    const collections = await Collection.find(query)
      .populate('owner', 'name avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await Collection.countDocuments(query);

    res.status(200).json({
      success: true,
      count: collections.length,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      data: collections,
    });
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

    const { name, description, courseCode, targetDate, priority, isPrivate, tags } = req.body;
    if (name !== undefined)      collection.name      = name;
    if (description !== undefined) collection.description = description;
    if (courseCode !== undefined) collection.courseCode = courseCode || null;
    if (targetDate !== undefined) collection.targetDate = targetDate || null;
    if (priority !== undefined) collection.priority = priority;
    if (isPrivate !== undefined) collection.isPrivate = isPrivate;
    if (tags !== undefined)      collection.tags      = tags;
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

// ─── @route  PUT /api/collections/:id/vote ────────────────────────────────────
// ─── @access Private
// ─── @body   { value: 'upvote' | 'downvote' | 'none' }
exports.voteCollection = async (req, res, next) => {
  try {
    const { value } = req.body;
    const collectionId = req.params.id;
    const userId = req.user._id;

    if (!['upvote', 'downvote', 'none'].includes(value)) {
      return res.status(400).json({ success: false, message: "Value must be 'upvote', 'downvote', or 'none'" });
    }

    const collection = await Collection.findById(collectionId);
    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found' });
    }
    
    // Check if it's private and user is not owner
    if (collection.isPrivate && resolveEntityId(collection.owner) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Cannot vote on a private collection' });
    }

    // Remove existing votes first
    collection.upvotes = collection.upvotes.filter((id) => String(id) !== String(userId));
    collection.downvotes = collection.downvotes.filter((id) => String(id) !== String(userId));

    // Add new vote
    if (value === 'upvote') {
      collection.upvotes.push(userId);
    } else if (value === 'downvote') {
      collection.downvotes.push(userId);
    }

    await collection.save();

    res.status(200).json({ success: true, data: collection });
  } catch (error) {
    next(error);
  }
};
