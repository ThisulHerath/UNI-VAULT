const Collection = require('../models/Collection');
const { setNoteFileUrls } = require('../utils/noteFiles');

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
        select: 'title fileUrl fileType averageRating totalReviews subject uploadedBy createdAt',
        populate: [
          { path: 'subject',    select: 'name code' },
          { path: 'uploadedBy', select: 'name avatar' },
        ],
      });

    if (!collection) {
      return res.status(404).json({ success: false, message: 'Collection not found.' });
    }

    // Only owner can view private collection
    if (collection.isPrivate && collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'This collection is private.' });
    }

    const plainCollection = collection.toObject();
    plainCollection.notes = setNoteFileUrls(plainCollection.notes, req);

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

    if (collection.owner.toString() !== req.user._id.toString()) {
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

    if (collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    const operator = action === 'add' ? { $addToSet: { notes: noteId } } : { $pull: { notes: noteId } };

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

    if (collection.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    await collection.deleteOne();

    res.status(200).json({ success: true, message: 'Collection deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
