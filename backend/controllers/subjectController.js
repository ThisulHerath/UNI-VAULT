const Subject = require('../models/Subject');

const resolveEntityId = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value._id) return value._id.toString();
  return value.toString();
};

// ─── @route  GET /api/subjects/my ────────────────────────────────────────────
// ─── @access Private
exports.getMySubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    next(error);
  }
};

// ─── @route  POST /api/subjects ───────────────────────────────────────────────
// ─── @access Private
exports.createSubject = async (req, res, next) => {
  try {
    const { name, code, description, department, semester } = req.body;

    const subject = await Subject.create({
      name,
      code,
      description,
      department,
      semester,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/subjects ────────────────────────────────────────────────
// ─── @access Public
exports.getSubjects = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = new RegExp(req.query.department, 'i');
    if (req.query.semester)   filter.semester   = req.query.semester;

    const subjects = await Subject.find(filter)
      .populate('createdBy', 'name')
      .sort({ name: 1 });

    res.status(200).json({ success: true, count: subjects.length, data: subjects });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/subjects/:id ────────────────────────────────────────────
// ─── @access Public
exports.getSubjectById = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('createdBy', 'name');

    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/subjects/:id ────────────────────────────────────────────
// ─── @access Private (creator or admin)
exports.updateSubject = async (req, res, next) => {
  try {
    let subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const creatorId = resolveEntityId(subject.createdBy);
    if (creatorId !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised to update this subject.' });
    }

    subject = await Subject.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: subject });
  } catch (error) {
    next(error);
  }
};

// ─── @route  DELETE /api/subjects/:id ─────────────────────────────────────────
// ─── @access Private (creator or admin)
exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found.' });
    }

    const creatorId = resolveEntityId(subject.createdBy);
    if (creatorId !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorised to delete this subject.' });
    }

    await subject.deleteOne();

    res.status(200).json({ success: true, message: 'Subject deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
