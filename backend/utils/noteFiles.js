const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const NOTE_BUCKET_NAME = 'noteFiles';
const NOTE_MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;

const ALLOWED_NOTE_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const getNoteBucket = () => {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB connection is not ready.');
  }

  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: NOTE_BUCKET_NAME,
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

const resolveNoteFileType = (mimeType = '') => {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
  return 'other';
};

const isAllowedNoteMimeType = (mimeType) => ALLOWED_NOTE_MIME_TYPES.has(mimeType);

const buildRelativeNoteFileUrl = (noteId) => `/api/notes/${noteId}/file`;

const buildAbsoluteNoteFileUrl = (req, noteId) => `${req.protocol}://${req.get('host')}${buildRelativeNoteFileUrl(noteId)}`;

const setNoteFileUrl = (note, req) => {
  if (!note?._id) return note;

  const fileUrl = buildAbsoluteNoteFileUrl(req, note._id.toString());
  if (typeof note.toObject === 'function') {
    const plainNote = note.toObject();
    plainNote.fileUrl = fileUrl;
    return plainNote;
  }

  note.fileUrl = fileUrl;
  return note;
};

const setNoteFileUrls = (notes, req) => (Array.isArray(notes) ? notes.map((note) => setNoteFileUrl(note, req)) : notes);

const uploadNoteFileToGridFs = (file, noteId) => new Promise((resolve, reject) => {
  const bucket = getNoteBucket();
  const uploadStream = bucket.openUploadStream(file.originalname, {
    contentType: file.mimetype,
    metadata: {
      noteId: noteId.toString(),
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

const deleteNoteFileFromGridFs = async (fileId) => {
  const objectId = normalizeObjectId(fileId);
  if (!objectId) return;

  const bucket = getNoteBucket();
  try {
    await bucket.delete(objectId);
  } catch (error) {
    if (error?.codeName !== 'FileNotFound') {
      throw error;
    }
  }
};

const getLegacyNoteFilePath = (note) => {
  if (!note) return null;

  const legacyFilename = note.cloudinaryPublicId || note.originalFileName || null;
  if (!legacyFilename) return null;

  return path.join(process.cwd(), 'uploads', 'notes', legacyFilename);
};

const legacyNoteFileExists = (note) => {
  const legacyPath = getLegacyNoteFilePath(note);
  return legacyPath ? fs.existsSync(legacyPath) : false;
};

module.exports = {
  NOTE_MAX_FILE_SIZE_BYTES,
  buildAbsoluteNoteFileUrl,
  buildRelativeNoteFileUrl,
  deleteNoteFileFromGridFs,
  getLegacyNoteFilePath,
  getNoteBucket,
  isAllowedNoteMimeType,
  legacyNoteFileExists,
  resolveNoteFileType,
  setNoteFileUrl,
  setNoteFileUrls,
  uploadNoteFileToGridFs,
};