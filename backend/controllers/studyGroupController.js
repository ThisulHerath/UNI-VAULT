const StudyGroup = require('../models/StudyGroup');
const cloudinary  = require('../config/cloudinary');

// ─── @route  POST /api/groups ─────────────────────────────────────────────────
// ─── @access Private
exports.createGroup = async (req, res, next) => {
  try {
    const { name, description, subject, batch, privacy } = req.body;

    const groupData = {
      name,
      description,
      subject: subject || null,
      batch:   batch   || null,
      privacy: privacy || 'public',
      createdBy: req.user._id,
      // Creator is automatically an admin member
      members: [{ user: req.user._id, role: 'admin' }],
    };

    if (req.file) {
      groupData.coverImage    = req.file.path;
      groupData.coverPublicId = req.file.filename;
    }

    const group = await StudyGroup.create(groupData);

    // Add group to user's studyGroups array
    await req.user.updateOne({ $addToSet: { studyGroups: group._id } });

    await group.populate('createdBy', 'name avatar');
    await group.populate('subject', 'name code');

    res.status(201).json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/groups ──────────────────────────────────────────────────
// ─── @access Public (public groups only)
exports.getGroups = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip  = (page - 1) * limit;

    const filter = { isActive: true };
    if (!req.query.all) filter.privacy = 'public'; // default: public only
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.batch)   filter.batch   = req.query.batch;

    const [groups, total] = await Promise.all([
      StudyGroup.find(filter)
        .populate('createdBy', 'name avatar')
        .populate('subject', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StudyGroup.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      count: groups.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: groups,
    });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/groups/:id ─────────────────────────────────────────────
// ─── @access Public (private groups visible to members only)
exports.getGroupById = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id)
      .populate('createdBy', 'name avatar')
      .populate('subject', 'name code')
      .populate('members.user', 'name avatar batch')
      .populate({
        path: 'sharedNotes',
        select: 'title fileUrl fileType averageRating subject uploadedBy',
        populate: [
          { path: 'subject',    select: 'name code' },
          { path: 'uploadedBy', select: 'name avatar' },
        ],
      });

    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    if (group.privacy === 'private') {
      // Must be logged in and a non-pending member
      if (!req.user) {
        return res.status(403).json({ success: false, message: 'This group is private.' });
      }
      const isMember = group.members.some(
        (m) => m.user._id.toString() === req.user._id.toString() && m.role !== 'pending'
      );
      if (!isMember) {
        return res.status(403).json({ success: false, message: 'You are not a member of this private group.' });
      }
    }

    res.status(200).json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/groups/:id ─────────────────────────────────────────────
// ─── @access Private (group admin only)
exports.updateGroup = async (req, res, next) => {
  try {
    let group = await StudyGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    const isAdmin = group.members.some(
      (m) => m.user.toString() === req.user._id.toString() && m.role === 'admin'
    );
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only group admins can update this group.' });
    }

    const { name, description, privacy, batch } = req.body;
    if (name)        group.name        = name;
    if (description) group.description = description;
    if (privacy)     group.privacy     = privacy;
    if (batch)       group.batch       = batch;

    if (req.file) {
      if (group.coverPublicId) {
        await cloudinary.uploader.destroy(group.coverPublicId);
      }
      group.coverImage    = req.file.path;
      group.coverPublicId = req.file.filename;
    }

    await group.save();

    res.status(200).json({ success: true, data: group });
  } catch (error) {
    next(error);
  }
};

// ─── @route  POST /api/groups/:id/join ────────────────────────────────────────
// ─── @access Private
exports.joinGroup = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    const alreadyMember = group.members.some(
      (m) => m.user.toString() === req.user._id.toString()
    );
    if (alreadyMember) {
      return res.status(400).json({ success: false, message: 'You are already in this group.' });
    }

    const role = group.privacy === 'public' ? 'member' : 'pending';
    group.members.push({ user: req.user._id, role });
    await group.save();

    await req.user.updateOne({ $addToSet: { studyGroups: group._id } });

    res.status(200).json({
      success: true,
      message: role === 'pending' ? 'Join request sent. Awaiting admin approval.' : 'Joined group successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/groups/:id/members/:userId ──────────────────────────────
// ─── @access Private (group admin) — approve or remove a member
exports.manageMember = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    const isAdmin = group.members.some(
      (m) => m.user.toString() === req.user._id.toString() && m.role === 'admin'
    );
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: 'Only group admins can manage members.' });
    }

    const { action } = req.body; // 'approve' | 'remove'
    const memberIndex = group.members.findIndex(
      (m) => m.user.toString() === req.params.userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({ success: false, message: 'Member not found in group.' });
    }

    if (action === 'approve') {
      group.members[memberIndex].role = 'member';
    } else if (action === 'remove') {
      group.members.splice(memberIndex, 1);
    } else {
      return res.status(400).json({ success: false, message: "Action must be 'approve' or 'remove'." });
    }

    await group.save();

    res.status(200).json({ success: true, message: `Member ${action}d successfully.`, data: group });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/groups/:id/notes ────────────────────────────────────────
// ─── @access Private (group member) — share or unshare a note in the group
exports.manageGroupNote = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    const isMember = group.members.some(
      (m) => m.user.toString() === req.user._id.toString() && m.role !== 'pending'
    );
    if (!isMember) {
      return res.status(403).json({ success: false, message: 'Only group members can share notes.' });
    }

    const { noteId, action } = req.body;
    const operator = action === 'add'
      ? { $addToSet: { sharedNotes: noteId } }
      : { $pull:     { sharedNotes: noteId } };

    const updated = await StudyGroup.findByIdAndUpdate(req.params.id, operator, { new: true });

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── @route  DELETE /api/groups/:id ──────────────────────────────────────────
// ─── @access Private (group admin only)
exports.deleteGroup = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    const isAdmin = group.members.some(
      (m) => m.user.toString() === req.user._id.toString() && m.role === 'admin'
    );
    if (!isAdmin && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only group admins can delete this group.' });
    }

    if (group.coverPublicId) {
      await cloudinary.uploader.destroy(group.coverPublicId);
    }

    await group.deleteOne();

    res.status(200).json({ success: true, message: 'Study group deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
