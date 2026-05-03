const StudyGroup = require('./StudyGroup');
const User = require('../auth/User');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { setNoteFileUrls } = require('../../utils/noteFiles');
const {
  buildAbsoluteGroupCoverUrl,
  deleteGroupCoverFromGridFs,
  getGroupCoverBucket,
  uploadGroupCoverToGridFs,
} = require('../../utils/groupCoverFiles');
const {
  buildAbsoluteGroupMessageFileUrl,
  deleteGroupMessageFileFromGridFs,
  getGroupMessageBucket,
  setGroupMessageAttachmentUrl,
  setGroupMessageAttachmentUrls,
  uploadGroupMessageFileToGridFs,
} = require('../../utils/groupMessageFiles');

const buildInvitationCode = () => crypto.randomBytes(4).toString('hex').toUpperCase();

const generateUniqueInvitationCode = async () => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const code = buildInvitationCode();
    const exists = await StudyGroup.exists({ invitationCode: code });
    if (!exists) return code;
  }

  throw new Error('Failed to generate a unique invitation code. Please retry.');
};

const toObjectIdString = (value) => {
  if (!value) return null;

  if (typeof value === 'string') return value;

  // Supports populated docs: { _id: ObjectId, ... } or { id: string, ... }
  if (typeof value === 'object') {
    if (value._id) return value._id.toString();
    if (value.id) return value.id.toString();
  }

  return value.toString();
};

const isOwner = (group, userId) => toObjectIdString(group.createdBy) === toObjectIdString(userId);

const getMember = (group, userId) =>
  group.members.find((m) => toObjectIdString(m.user) === toObjectIdString(userId));

const isAdmin = (group, userId) => {
  if (isOwner(group, userId)) return true;
  const member = getMember(group, userId);
  return !!member && member.role === 'admin';
};

const isActiveMember = (group, userId) => {
  const member = getMember(group, userId);
  return !!member && member.role !== 'pending';
};

const normalizeGroupAccess = (body = {}) => {
  const privacy = body.privacy === 'private' ? 'private' : 'public';
  let joinMode = body.joinMode === 'request' ? 'request' : 'open';

  if (privacy === 'private') {
    joinMode = 'request';
  }

  return { privacy, joinMode };
};

const normalizeBooleanFlag = (value) => value === true || value === 'true' || value === '1';

const setGroupCoverImageUrl = (group, req) => {
  if (!group || !group._id) return group;

  const hasCover = !!group.coverFileId;
  group.coverImage = hasCover ? buildAbsoluteGroupCoverUrl(req, toObjectIdString(group._id)) : null;
  return group;
};

const setGroupCoverImageUrls = (groups, req) => {
  if (!Array.isArray(groups)) return groups;
  return groups.map((group) => setGroupCoverImageUrl(group, req));
};

const clearGroupCoverFields = (group) => {
  group.coverFileId = null;
  group.coverFileMimeType = null;
  group.coverFileSize = null;
  group.coverOriginalFileName = null;
  group.coverImage = null;
  group.coverPublicId = null;
};

const getCreatedGroupMessage = async (group, messageId) => {
  const createdMessage = group.messages.id(messageId);
  if (!createdMessage) return null;

  await StudyGroup.populate(createdMessage, { path: 'sender', select: 'name avatar' });
  return createdMessage;
};

// ─── @route  POST /api/groups ─────────────────────────────────────────────────
// ─── @access Private
exports.createGroup = async (req, res, next) => {
  let uploadedCoverFileId = null;

  try {
    const { name, description, subject, batch } = req.body;
    const { privacy, joinMode } = normalizeGroupAccess(req.body);
    const invitationCode = privacy === 'private'
      ? ((req.body.invitationCode || '').trim().toUpperCase() || await generateUniqueInvitationCode())
      : undefined;

    if (invitationCode) {
      const codeExists = await StudyGroup.exists({ invitationCode });
      if (codeExists) {
        return res.status(400).json({ success: false, message: 'Invitation code already exists. Use a different code.' });
      }
    }

    const groupData = {
      name,
      description,
      subject: subject || null,
      batch: batch || null,
      privacy,
      joinMode,
      createdBy: req.user._id,
      // Creator is automatically an admin member
      members: [{ user: req.user._id, role: 'admin' }],
    };

    if (invitationCode) {
      groupData.invitationCode = invitationCode;
    }

    const group = await StudyGroup.create(groupData);

    if (req.file) {
      const coverUpload = await uploadGroupCoverToGridFs(req.file, group._id);
      uploadedCoverFileId = coverUpload.fileId;
      group.coverFileId = coverUpload.fileId;
      group.coverFileMimeType = coverUpload.fileMimeType;
      group.coverFileSize = coverUpload.fileSize;
      group.coverOriginalFileName = coverUpload.fileName;
      group.coverImage = buildAbsoluteGroupCoverUrl(req, group._id.toString());
      group.coverPublicId = null;
      await group.save();
    }

    // Add group to user's studyGroups array
    await req.user.updateOne({ $addToSet: { studyGroups: group._id } });

    await group.populate('createdBy', 'name avatar');
    await group.populate('subject', 'name code');
    setGroupCoverImageUrl(group, req);

    res.status(201).json({ success: true, data: group });
  } catch (error) {
    if (uploadedCoverFileId) {
      try {
        await deleteGroupCoverFromGridFs(uploadedCoverFileId);
      } catch (cleanupError) {
        // Ignore cleanup failures; the main error should be surfaced.
      }
    }
    next(error);
  }
};

// ─── @route  GET /api/groups ──────────────────────────────────────────────────
// ─── @access Public (public groups only)
exports.getGroups = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { isActive: true, privacy: 'public' };
    if (req.query.joinMode === 'open' || req.query.joinMode === 'request') {
      filter.joinMode = req.query.joinMode;
    }
    if (req.query.subject) filter.subject = req.query.subject;
    if (req.query.batch) filter.batch = req.query.batch;
    if (req.query.search) {
      filter.$text = { $search: req.query.search };
    }

    const [groups, total] = await Promise.all([
      StudyGroup.find(filter)
        .populate('createdBy', 'name avatar')
        .populate('subject', 'name code')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StudyGroup.countDocuments(filter),
    ]);
    setGroupCoverImageUrls(groups, req);

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

// ─── @route  GET /api/groups/mine ─────────────────────────────────────────────
// ─── @access Private
exports.getMyGroups = async (req, res, next) => {
  try {
    const groups = await StudyGroup.find({
      isActive: true,
      members: {
        $elemMatch: {
          user: req.user._id,
          role: { $ne: 'pending' },
        },
      },
    })
      .populate('createdBy', 'name avatar')
      .populate('subject', 'name code')
      .sort({ createdAt: -1 });

    setGroupCoverImageUrls(groups, req);

    res.status(200).json({ success: true, count: groups.length, data: groups });
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
      .populate('joinRequests.user', 'name avatar batch')
      .populate('joinRequests.resolvedBy', 'name')
      .populate('messages.sender', 'name avatar')
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

    const requesterId = req.user?._id;
    const requesterIsMember = requesterId ? isActiveMember(group, requesterId) : false;
    const requesterIsAdmin = requesterId ? isAdmin(group, requesterId) : false;

    if (group.privacy === 'private') {
      if (!requesterIsMember) {
        return res.status(403).json({ success: false, message: 'You are not a member of this private group.' });
      }
    }

    const plainGroup = group.toObject();
    setGroupCoverImageUrl(plainGroup, req);
    plainGroup.sharedNotes = setNoteFileUrls(plainGroup.sharedNotes, req);
    plainGroup.messages = setGroupMessageAttachmentUrls(plainGroup.messages, req, plainGroup._id);

    // Group chat and materials are only visible to active members.
    if (!requesterIsMember) {
      plainGroup.messages = [];
      plainGroup.sharedNotes = [];
    }

    if (!requesterIsAdmin) {
      plainGroup.joinRequests = [];
      if (!requesterIsMember && plainGroup.invitationCode) {
        delete plainGroup.invitationCode;
      }
    }

    // Keep response counters consistent with redacted join request data.
    plainGroup.pendingRequestCount = requesterIsAdmin
      ? (Array.isArray(plainGroup.joinRequests)
        ? plainGroup.joinRequests.filter((request) => request.status === 'pending').length
        : 0)
      : 0;

    plainGroup.requesterRole = requesterIsAdmin
      ? (isOwner(group, requesterId) ? 'owner' : 'admin')
      : (requesterIsMember ? 'member' : 'guest');

    res.status(200).json({ success: true, data: plainGroup });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/groups/:id ─────────────────────────────────────────────
// ─── @access Private (group admin only)
exports.updateGroup = async (req, res, next) => {
  let newCoverFileId = null;

  try {
    let group = await StudyGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    if (!isAdmin(group, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only group admins can update this group.' });
    }

    const { name, description, batch } = req.body;
    if (name) group.name = name;
    if (description) group.description = description;
    if (batch) group.batch = batch;

    const accessInput = normalizeGroupAccess(req.body);
    if (req.body.privacy) {
      group.privacy = accessInput.privacy;
    }

    if (group.privacy === 'public') {
      if (req.body.joinMode) {
        group.joinMode = accessInput.joinMode;
      }
      group.invitationCode = undefined;
    }

    if (group.privacy === 'private') {
      group.joinMode = 'request';
      const codeFromBody = (req.body.invitationCode || '').trim().toUpperCase();
      const shouldRegenerate = req.body.regenerateInvitationCode === true || req.body.regenerateInvitationCode === 'true';

      if (codeFromBody) {
        const codeInUse = await StudyGroup.exists({
          invitationCode: codeFromBody,
          _id: { $ne: group._id },
        });
        if (codeInUse) {
          return res.status(400).json({ success: false, message: 'Invitation code already exists. Use a different code.' });
        }
        group.invitationCode = codeFromBody;
      } else if (shouldRegenerate || !group.invitationCode) {
        group.invitationCode = await generateUniqueInvitationCode();
      }
    }

    const previousCoverFileId = group.coverFileId;
    const removeCoverImage = normalizeBooleanFlag(req.body.removeCoverImage);

    if (req.file) {
      const coverUpload = await uploadGroupCoverToGridFs(req.file, group._id);
      newCoverFileId = coverUpload.fileId;
      group.coverFileId = coverUpload.fileId;
      group.coverFileMimeType = coverUpload.fileMimeType;
      group.coverFileSize = coverUpload.fileSize;
      group.coverOriginalFileName = coverUpload.fileName;
      group.coverImage = buildAbsoluteGroupCoverUrl(req, group._id.toString());
      group.coverPublicId = null;
    } else if (removeCoverImage) {
      clearGroupCoverFields(group);
    }

    await group.save();
    setGroupCoverImageUrl(group, req);

    if ((req.file || removeCoverImage) && previousCoverFileId && String(previousCoverFileId) !== String(group.coverFileId || '')) {
      await deleteGroupCoverFromGridFs(previousCoverFileId);
    }

    res.status(200).json({ success: true, data: group });
  } catch (error) {
    if (newCoverFileId) {
      try {
        await deleteGroupCoverFromGridFs(newCoverFileId);
      } catch (cleanupError) {
        // Ignore cleanup failures; the main error should be surfaced.
      }
    }
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

    const member = getMember(group, req.user._id);
    if (member && member.role !== 'pending') {
      return res.status(400).json({ success: false, message: 'You are already in this group.' });
    }

    if (group.privacy === 'private') {
      return res.status(403).json({
        success: false,
        message: 'This is a private group. Use a valid invitation code to join.',
      });
    }

    if (group.joinMode === 'open') {
      if (!member) {
        group.members.push({ user: req.user._id, role: 'member' });
      }
      await group.save();
      await req.user.updateOne({ $addToSet: { studyGroups: group._id } });

      return res.status(200).json({ success: true, message: 'Joined group successfully.' });
    }

    const existingPendingRequest = group.joinRequests.find(
      (request) => toObjectIdString(request.user) === toObjectIdString(req.user._id) && request.status === 'pending'
    );

    if (existingPendingRequest) {
      return res.status(400).json({ success: false, message: 'Join request already pending.' });
    }

    const existingRequest = group.joinRequests.find(
      (request) => toObjectIdString(request.user) === toObjectIdString(req.user._id)
    );

    if (existingRequest) {
      existingRequest.status = 'pending';
      existingRequest.requestedAt = new Date();
      existingRequest.resolvedAt = null;
      existingRequest.resolvedBy = null;
    } else {
      group.joinRequests.push({ user: req.user._id, status: 'pending' });
    }

    await group.save();

    return res.status(200).json({
      success: true,
      message: 'Join request sent. Awaiting admin approval.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── @route  POST /api/groups/join-by-code ────────────────────────────────────
// ─── @access Private
exports.joinGroupByCode = async (req, res, next) => {
  try {
    const code = (req.body.invitationCode || '').trim().toUpperCase();
    if (!code) {
      return res.status(400).json({ success: false, message: 'Invitation code is required.' });
    }

    const group = await StudyGroup.findOne({ isActive: true, privacy: 'private', invitationCode: code });

    if (!group) {
      return res.status(404).json({ success: false, message: 'Invalid invitation code.' });
    }

    const member = getMember(group, req.user._id);
    if (member && member.role !== 'pending') {
      return res.status(200).json({ success: true, message: 'You are already in this group.', data: { groupId: group._id } });
    }

    group.joinRequests = group.joinRequests.filter(
      (request) => toObjectIdString(request.user) !== toObjectIdString(req.user._id)
    );

    if (!member) {
      group.members.push({ user: req.user._id, role: 'member' });
    } else {
      member.role = 'member';
      member.joinedAt = new Date();
    }

    await group.save();
    await req.user.updateOne({ $addToSet: { studyGroups: group._id } });

    return res.status(200).json({
      success: true,
      message: 'Joined private group successfully.',
      data: { groupId: group._id },
    });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/groups/:id/members/:userId ──────────────────────────────
// ─── @access Private (RBAC action handler)
exports.manageMember = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    const requesterIsAdmin = isAdmin(group, req.user._id);
    if (!requesterIsAdmin) {
      return res.status(403).json({ success: false, message: 'Only group admins can manage members.' });
    }

    const requesterIsOwner = isOwner(group, req.user._id);
    const targetUserId = req.params.userId;
    const { action } = req.body; // approve | reject | remove | promote | demote

    if (!['approve', 'reject', 'remove', 'promote', 'demote'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be one of: 'approve', 'reject', 'remove', 'promote', 'demote'.",
      });
    }

    if (action === 'approve' || action === 'reject') {
      const requestIndex = group.joinRequests.findIndex(
        (request) => toObjectIdString(request.user) === toObjectIdString(targetUserId) && request.status === 'pending'
      );

      if (requestIndex === -1) {
        return res.status(404).json({ success: false, message: 'Pending join request not found.' });
      }

      const request = group.joinRequests[requestIndex];
      request.status = action === 'approve' ? 'approved' : 'rejected';
      request.resolvedAt = new Date();
      request.resolvedBy = req.user._id;

      if (action === 'approve') {
        const existingMember = getMember(group, targetUserId);
        if (!existingMember) {
          group.members.push({ user: targetUserId, role: 'member' });
        } else {
          existingMember.role = 'member';
          existingMember.joinedAt = existingMember.joinedAt || new Date();
        }
        await User.updateOne({ _id: targetUserId }, { $addToSet: { studyGroups: group._id } });
      }

      await group.save();
      return res.status(200).json({
        success: true,
        message: `Join request ${action}d successfully.`,
        data: group,
      });
    }

    const memberIndex = group.members.findIndex(
      (m) => toObjectIdString(m.user) === toObjectIdString(targetUserId)
    );

    if (memberIndex === -1) {
      return res.status(404).json({ success: false, message: 'Member not found in group.' });
    }

    const targetMember = group.members[memberIndex];
    const targetIsOwner = isOwner(group, targetUserId);
    const targetIsAdmin = targetMember.role === 'admin';

    if (targetIsOwner) {
      return res.status(400).json({ success: false, message: 'Owner cannot be modified via this endpoint.' });
    }

    if ((action === 'promote' || action === 'demote') && !requesterIsOwner) {
      return res.status(403).json({ success: false, message: 'Only the owner can change admin privileges.' });
    }

    if (action === 'remove' && targetIsAdmin && !requesterIsOwner) {
      return res.status(403).json({ success: false, message: 'Only the owner can remove another admin.' });
    }

    if (action === 'remove') {
      group.members.splice(memberIndex, 1);
      group.joinRequests = group.joinRequests.filter(
        (request) => toObjectIdString(request.user) !== toObjectIdString(targetUserId)
      );
      await User.updateOne({ _id: targetUserId }, { $pull: { studyGroups: group._id } });
    }

    if (action === 'promote') {
      targetMember.role = 'admin';
    }

    if (action === 'demote') {
      targetMember.role = 'member';
    }

    await group.save();

    res.status(200).json({ success: true, message: `Member ${action}d successfully.`, data: group });
  } catch (error) {
    next(error);
  }
};

// ─── @route  POST /api/groups/:id/leave ───────────────────────────────────────
// ─── @access Private
exports.leaveGroup = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    if (!isActiveMember(group, req.user._id)) {
      return res.status(400).json({ success: false, message: 'You are not an active member of this group.' });
    }

    if (isOwner(group, req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Owner cannot leave the group. Delete the group or transfer ownership first.',
      });
    }

    group.members = group.members.filter((member) => toObjectIdString(member.user) !== toObjectIdString(req.user._id));
    group.joinRequests = group.joinRequests.filter((request) => toObjectIdString(request.user) !== toObjectIdString(req.user._id));

    await group.save();
    await req.user.updateOne({ $pull: { studyGroups: group._id } });

    res.status(200).json({ success: true, message: 'You left the group successfully.' });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/groups/:id/transfer-ownership ───────────────────────────
// ─── @access Private (owner only)
exports.transferOwnership = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    if (!isOwner(group, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the owner can transfer ownership.' });
    }

    const { newOwnerId } = req.body;
    if (!newOwnerId) {
      return res.status(400).json({ success: false, message: 'New owner ID is required.' });
    }

    // Verify new owner exists and is a member
    const newOwnerMember = getMember(group, newOwnerId);
    if (!newOwnerMember) {
      return res.status(404).json({ success: false, message: 'Target user is not a member of this group.' });
    }

    if (newOwnerMember.role === 'pending') {
      return res.status(400).json({ success: false, message: 'Cannot transfer ownership to a pending member.' });
    }

    // Transfer ownership
    group.createdBy = newOwnerId;
    
    // Ensure new owner has admin role
    if (newOwnerMember.role !== 'admin') {
      newOwnerMember.role = 'admin';
    }

    await group.save();

    res.status(200).json({
      success: true,
      message: 'Ownership transferred successfully.',
      data: group,
    });
  } catch (error) {
    next(error);
  }
};

// ─── @route  POST /api/groups/:id/cancel-request ──────────────────────────────
// ─── @access Private
exports.cancelJoinRequest = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    // Find pending request from current user
    const requestIndex = group.joinRequests.findIndex(
      (request) => toObjectIdString(request.user) === toObjectIdString(req.user._id) && request.status === 'pending'
    );

    if (requestIndex === -1) {
      return res.status(404).json({ success: false, message: 'No pending join request found.' });
    }

    // Remove the request
    group.joinRequests.splice(requestIndex, 1);
    await group.save();

    res.status(200).json({
      success: true,
      message: 'Join request cancelled successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// ─── @route  PUT /api/groups/:id/invitation-code ─────────────────────────────
// ─── @access Private (owner/admin)
exports.updateInvitationCode = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    if (group.privacy !== 'private') {
      return res.status(400).json({ success: false, message: 'Invitation codes are only available for private groups.' });
    }

    if (!isAdmin(group, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only owner/admin can update invitation code.' });
    }

    const customCode = (req.body.invitationCode || '').trim().toUpperCase();
    let nextCode = customCode;

    if (!nextCode) {
      nextCode = await generateUniqueInvitationCode();
    } else {
      const codeInUse = await StudyGroup.exists({ invitationCode: nextCode, _id: { $ne: group._id } });
      if (codeInUse) {
        return res.status(400).json({ success: false, message: 'Invitation code already exists. Use a different code.' });
      }
    }

    group.invitationCode = nextCode;
    await group.save();

    res.status(200).json({ success: true, message: 'Invitation code updated.', data: { invitationCode: nextCode } });
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

    if (!isActiveMember(group, req.user._id)) {
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

// ─── @route  GET /api/groups/:id/cover ─────────────────────────────────────
// ─── @access Public for public groups, member-only for private groups
exports.getGroupCoverImage = async (req, res, next) => {
  try {
    const group = await StudyGroup.findById(req.params.id).select(
      'coverFileId coverFileMimeType coverOriginalFileName privacy members createdBy'
    );

    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    if (!group.coverFileId) {
      return res.status(404).json({ success: false, message: 'Group image not found.' });
    }

    if (group.privacy === 'private' && !isActiveMember(group, req.user?._id)) {
      return res.status(403).json({ success: false, message: 'You are not allowed to view this group image.' });
    }

    const fileId = group.coverFileId instanceof mongoose.Types.ObjectId
      ? group.coverFileId
      : new mongoose.Types.ObjectId(group.coverFileId);

    const bucket = getGroupCoverBucket();
    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) {
      return res.status(404).json({ success: false, message: 'Group image file not found.' });
    }

    const file = files[0];
    res.setHeader('Content-Type', file.contentType || group.coverFileMimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${(group.coverOriginalFileName || file.filename || 'group-cover').replace(/"/g, '\\"')}"`
    );

    return bucket.openDownloadStream(fileId).on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/groups/:id/messages ─────────────────────────────────────
// ─── @access Private (group member)
exports.getGroupMessages = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 200);

    const group = await StudyGroup.findById(req.params.id)
      .select('name messages members createdBy')
      .populate('messages.sender', 'name avatar');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    if (!isActiveMember(group, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only group members can view group chat.' });
    }

    const messages = group.messages.slice(-limit);
    res.status(200).json({ success: true, count: messages.length, data: setGroupMessageAttachmentUrls(messages, req, group._id.toString()) });
  } catch (error) {
    next(error);
  }
};

// ─── @route  POST /api/groups/:id/messages ────────────────────────────────────
// ─── @access Private (group member)
exports.createGroupMessage = async (req, res, next) => {
  let uploadedFileId = null;

  try {
    const group = await StudyGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    if (!isActiveMember(group, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only group members can send messages.' });
    }

    const text = (req.body.text || '').trim();
    if (!text && !req.file) {
      return res.status(400).json({ success: false, message: 'Message text or an attachment is required.' });
    }

    const message = group.messages.create({
      sender: req.user._id,
      text,
    });

    if (req.file) {
      const uploadResult = await uploadGroupMessageFileToGridFs(req.file, group._id, message._id);
      uploadedFileId = uploadResult.fileId;
      message.attachment = {
        fileId: uploadResult.fileId,
        fileType: uploadResult.fileType,
        fileMimeType: uploadResult.fileMimeType,
        fileSize: uploadResult.fileSize,
        originalFileName: uploadResult.fileName,
        fileUrl: buildAbsoluteGroupMessageFileUrl(req, group._id.toString(), message._id.toString()),
      };
    }

    group.messages.push(message);
    await group.save();

    const createdMessage = await getCreatedGroupMessage(group, message._id);
    const plainMessage = setGroupMessageAttachmentUrl(createdMessage, req, group._id.toString());

    // Emit real-time message event
    const io = req.app.get('io');
    if (io) {
      console.log('Emitting new-message event for group:', req.params.id);
      io.to(`group-${req.params.id}`).emit('new-message', {
        groupId: req.params.id,
        message: plainMessage,
      });
    }

    res.status(201).json({ success: true, data: plainMessage });
  } catch (error) {
    if (uploadedFileId) {
      try {
        await deleteGroupMessageFileFromGridFs(uploadedFileId);
      } catch (cleanupError) {
        // Ignore cleanup failures; the main error should be surfaced.
      }
    }
    next(error);
  }
};

// ─── @route  PUT /api/groups/:id/messages/:messageId ───────────────────────
// ─── @access Private (message sender only)
exports.updateGroupMessage = async (req, res, next) => {
  try {
    const { id, messageId } = req.params;
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';

    const group = await StudyGroup.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    const message = group.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    if (String(message.sender) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the sender can edit this message.' });
    }

    if (!isActiveMember(group, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only group members can modify messages.' });
    }

    if (!text && !message.attachment?.fileId) {
      return res.status(400).json({ success: false, message: 'Message text is required.' });
    }

    message.text = text;
    await group.save();

    const updatedMessage = await getCreatedGroupMessage(group, message._id);
    const plainMessage = setGroupMessageAttachmentUrl(updatedMessage, req, group._id.toString());

    const io = req.app.get('io');
    if (io) {
      io.to(`group-${req.params.id}`).emit('update-message', {
        groupId: req.params.id,
        message: plainMessage,
      });
    }

    res.status(200).json({ success: true, data: plainMessage });
  } catch (error) {
    next(error);
  }
};

// ─── @route  GET /api/groups/:id/messages/:messageId/file ───────────────────
// ─── @access Private (group member)
exports.getGroupMessageFile = async (req, res, next) => {
  try {
    const { id, messageId } = req.params;

    const group = await StudyGroup.findById(id)
      .select('messages members createdBy')
      .populate('messages.sender', 'name avatar');

    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    if (!isActiveMember(group, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only group members can view attachments.' });
    }

    const message = group.messages.id(messageId);
    if (!message || !message.attachment?.fileId) {
      return res.status(404).json({ success: false, message: 'Attachment not found.' });
    }

    const bucket = getGroupMessageBucket();
    const fileId = message.attachment.fileId instanceof mongoose.Types.ObjectId
      ? message.attachment.fileId
      : new mongoose.Types.ObjectId(message.attachment.fileId);

    const files = await bucket.find({ _id: fileId }).toArray();
    if (!files.length) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }

    const file = files[0];
    res.setHeader('Content-Type', file.contentType || message.attachment.fileMimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${(message.attachment.originalFileName || file.filename || 'group-attachment').replace(/"/g, '\\"')}"`
    );

    return bucket.openDownloadStream(fileId).on('error', next).pipe(res);
  } catch (error) {
    next(error);
  }
};

// ─── @route  DELETE /api/groups/:id/messages/:messageId ───────────────────────
// ─── @access Private (message sender only)
exports.deleteGroupMessage = async (req, res, next) => {
  try {
    const { id, messageId } = req.params;
    const group = await StudyGroup.findById(id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Study group not found.' });
    }

    const message = group.messages.id(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    if (String(message.sender) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only the sender can delete this message.' });
    }

    if (!isActiveMember(group, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only group members can modify messages.' });
    }

    const attachmentFileId = message.attachment?.fileId;

    group.messages.pull(message._id);
    await group.save();

    if (attachmentFileId) {
      try {
        await deleteGroupMessageFileFromGridFs(attachmentFileId);
      } catch (cleanupError) {
        // Ignore cleanup failures so the delete still succeeds.
      }
    }

    // Emit real-time message deletion event
    const io = req.app.get('io');
    if (io) {
      io.to(`group-${req.params.id}`).emit('delete-message', {
        groupId: req.params.id,
        messageId: req.params.messageId,
      });
    }

    res.status(200).json({ success: true, message: 'Message deleted.' });
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

    if (!isOwner(group, req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the group owner can delete this group.' });
    }

    if (group.coverFileId) {
      try {
        await deleteGroupCoverFromGridFs(group.coverFileId);
      } catch (cleanupError) {
        // Ignore cover cleanup failures so delete flow can continue.
      }
    }

    const attachmentFileIds = Array.isArray(group.messages)
      ? group.messages
        .map((message) => message.attachment?.fileId)
        .filter(Boolean)
      : [];

    await Promise.allSettled(
      attachmentFileIds.map((fileId) => deleteGroupMessageFileFromGridFs(fileId))
    );

    await User.updateMany({ studyGroups: group._id }, { $pull: { studyGroups: group._id } });
    await group.deleteOne();

    res.status(200).json({ success: true, message: 'Study group deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
