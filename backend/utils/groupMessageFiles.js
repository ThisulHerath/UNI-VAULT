const mongoose = require('mongoose');
const {
  NOTE_MAX_FILE_SIZE_BYTES,
  isAllowedNoteMimeType,
  resolveNoteFileType,
} = require('./noteFiles');

const GROUP_MESSAGE_BUCKET_NAME = 'groupMessageFiles';
const GROUP_MESSAGE_MAX_FILE_SIZE_BYTES = NOTE_MAX_FILE_SIZE_BYTES;

const getGroupMessageBucket = () => {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB connection is not ready.');
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: GROUP_MESSAGE_BUCKET_NAME,
  });
};

const normalizeObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) return value;

  try {
    return new mongoose.Types.ObjectId(value);
  } catch (error) {
    return null;
  }
};

const buildRelativeGroupMessageFileUrl = (groupId, messageId) => `/api/groups/${groupId}/messages/${messageId}/file`;

const buildAbsoluteGroupMessageFileUrl = (req, groupId, messageId) => `${req.protocol}://${req.get('host')}${buildRelativeGroupMessageFileUrl(groupId, messageId)}`;

const setGroupMessageAttachmentUrl = (message, req, groupId) => {
  if (!message?._id || !message.attachment?.fileId) return message;

  const fileUrl = buildAbsoluteGroupMessageFileUrl(req, groupId, message._id.toString());
  if (typeof message.toObject === 'function') {
    const plainMessage = message.toObject();
    if (plainMessage.attachment) {
      plainMessage.attachment.fileUrl = fileUrl;
    }
    return plainMessage;
  }

  if (!message.attachment) {
    message.attachment = {};
  }
  message.attachment.fileUrl = fileUrl;
  return message;
};

const setGroupMessageAttachmentUrls = (messages, req, groupId) => (
  Array.isArray(messages) ? messages.map((message) => setGroupMessageAttachmentUrl(message, req, groupId)) : messages
);

const uploadGroupMessageFileToGridFs = (file, groupId, messageId) => new Promise((resolve, reject) => {
  const bucket = getGroupMessageBucket();
  const uploadStream = bucket.openUploadStream(file.originalname, {
    contentType: file.mimetype,
    metadata: {
      groupId: groupId.toString(),
      messageId: messageId.toString(),
      originalFileName: file.originalname,
    },
  });

  uploadStream.on('error', reject);
  uploadStream.on('finish', () => {
    resolve({
      fileId: uploadStream.id,
      fileName: file.originalname,
      fileMimeType: file.mimetype,
      fileSize: file.size,
      fileType: resolveNoteFileType(file.mimetype),
    });
  });

  uploadStream.end(file.buffer);
});

const deleteGroupMessageFileFromGridFs = async (fileId) => {
  const objectId = normalizeObjectId(fileId);
  if (!objectId) return;

  const bucket = getGroupMessageBucket();
  try {
    await bucket.delete(objectId);
  } catch (error) {
    if (error?.codeName !== 'FileNotFound') {
      throw error;
    }
  }
};

module.exports = {
  GROUP_MESSAGE_BUCKET_NAME,
  GROUP_MESSAGE_MAX_FILE_SIZE_BYTES,
  buildAbsoluteGroupMessageFileUrl,
  buildRelativeGroupMessageFileUrl,
  deleteGroupMessageFileFromGridFs,
  getGroupMessageBucket,
  isAllowedGroupMessageMimeType: isAllowedNoteMimeType,
  resolveGroupMessageFileType: resolveNoteFileType,
  setGroupMessageAttachmentUrl,
  setGroupMessageAttachmentUrls,
  uploadGroupMessageFileToGridFs,
};