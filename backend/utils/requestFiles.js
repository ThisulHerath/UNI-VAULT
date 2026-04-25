const mongoose = require('mongoose');
const {
  NOTE_MAX_FILE_SIZE_BYTES,
  isAllowedNoteMimeType,
  resolveNoteFileType,
} = require('./noteFiles');

const REQUEST_MAX_FILE_SIZE_BYTES = NOTE_MAX_FILE_SIZE_BYTES;

const REQUEST_BUCKET_NAME = 'requestFiles';

const getRequestBucket = () => {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB connection is not ready.');
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: REQUEST_BUCKET_NAME,
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

const buildRelativeRequestFileUrl = (requestId) => `/api/requests/${requestId}/file`;

const buildAbsoluteRequestFileUrl = (req, requestId) => `${req.protocol}://${req.get('host')}${buildRelativeRequestFileUrl(requestId)}`;

const setRequestFulfillmentFileUrl = (request, req) => {
  if (!request?._id || !request.fulfillment?.fileId) return request;

  const fileUrl = buildAbsoluteRequestFileUrl(req, request._id.toString());
  if (typeof request.toObject === 'function') {
    const plainRequest = request.toObject();
    if (plainRequest.fulfillment) {
      plainRequest.fulfillment.fileUrl = fileUrl;
    }
    return plainRequest;
  }

  request.fulfillment.fileUrl = fileUrl;
  return request;
};

const uploadRequestFileToGridFs = (file, requestId) => new Promise((resolve, reject) => {
  const bucket = getRequestBucket();
  const uploadStream = bucket.openUploadStream(file.originalname, {
    contentType: file.mimetype,
    metadata: {
      requestId: requestId.toString(),
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

const deleteRequestFileFromGridFs = async (fileId) => {
  const objectId = normalizeObjectId(fileId);
  if (!objectId) return;

  const bucket = getRequestBucket();
  try {
    await bucket.delete(objectId);
  } catch (error) {
    if (error?.codeName !== 'FileNotFound') {
      throw error;
    }
  }
};

module.exports = {
  REQUEST_BUCKET_NAME,
  REQUEST_MAX_FILE_SIZE_BYTES,
  buildAbsoluteRequestFileUrl,
  buildRelativeRequestFileUrl,
  deleteRequestFileFromGridFs,
  getRequestBucket,
  isAllowedRequestMimeType: isAllowedNoteMimeType,
  resolveRequestFileType: resolveNoteFileType,
  setRequestFulfillmentFileUrl,
  uploadRequestFileToGridFs,
};