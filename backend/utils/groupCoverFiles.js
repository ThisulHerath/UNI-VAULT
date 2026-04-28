const mongoose = require('mongoose');

const GROUP_COVER_BUCKET_NAME = 'groupCoverImages';

const getGroupCoverBucket = () => {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB connection is not ready.');
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: GROUP_COVER_BUCKET_NAME,
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

const buildRelativeGroupCoverUrl = (groupId) => `/api/groups/${groupId}/cover`;

const buildAbsoluteGroupCoverUrl = (req, groupId) =>
  `${req.protocol}://${req.get('host')}${buildRelativeGroupCoverUrl(groupId)}`;

const uploadGroupCoverToGridFs = (file, groupId) =>
  new Promise((resolve, reject) => {
    const bucket = getGroupCoverBucket();
    const uploadStream = bucket.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: {
        groupId: groupId.toString(),
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
      });
    });

    uploadStream.end(file.buffer);
  });

const deleteGroupCoverFromGridFs = async (fileId) => {
  const objectId = normalizeObjectId(fileId);
  if (!objectId) return;

  const bucket = getGroupCoverBucket();
  try {
    await bucket.delete(objectId);
  } catch (error) {
    if (error?.codeName !== 'FileNotFound') {
      throw error;
    }
  }
};

module.exports = {
  GROUP_COVER_BUCKET_NAME,
  buildAbsoluteGroupCoverUrl,
  buildRelativeGroupCoverUrl,
  deleteGroupCoverFromGridFs,
  getGroupCoverBucket,
  uploadGroupCoverToGridFs,
};
