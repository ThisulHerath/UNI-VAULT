const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  NOTE_MAX_FILE_SIZE_BYTES,
  isAllowedNoteMimeType,
} = require('../utils/noteFiles');

// ─── Create upload directories if they don't exist ────────────────────────────
const uploadDirs = ['uploads/avatars', 'uploads/covers'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ─── Helper: Sanitize filename ────────────────────────────────────────────────
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
    .slice(0, 100); // Limit length
};

// ─── Note / Document uploads (stored in MongoDB via GridFS) ───────────────────
const noteStorage = multer.memoryStorage();

// ─── User avatar uploads ──────────────────────────────────────────────────────
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars');
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const userId = req.user?._id || 'anonymous';
    const ext = path.extname(file.originalname);
    cb(null, `${userId}-${timestamp}${ext}`);
  },
});

// ─── Study group cover image uploads ───────────────────────────────────────────
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/covers');
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const groupId = req.params?.id || 'new';
    const ext = path.extname(file.originalname);
    cb(null, `${groupId}-${timestamp}${ext}`);
  },
});

// ─── File filter: allowed types ────────────────────────────────────────────────
const fileFilter = {
  note: (req, file, cb) => {
    if (isAllowedNoteMimeType(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}. Allowed: PDF, JPG, PNG, GIF, WebP, DOCX`));
    }
  },
  avatar: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Only JPG, PNG, WebP allowed for avatars'));
  },
  cover: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(allowed.includes(file.mimetype) ? null : new Error('Only JPG, PNG, WebP allowed for covers'));
  },
};

// File size limit: 15 MB to stay safely under MongoDB's document/file overhead.
const limits = { fileSize: NOTE_MAX_FILE_SIZE_BYTES };

exports.uploadNote   = multer({ storage: noteStorage,   fileFilter: fileFilter.note,   limits });
exports.uploadAvatar = multer({ storage: avatarStorage, fileFilter: fileFilter.avatar, limits });
exports.uploadCover  = multer({ storage: coverStorage,  fileFilter: fileFilter.cover,  limits });
