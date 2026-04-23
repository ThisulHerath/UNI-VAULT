const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Cloudinary is configured in config/cloudinary.js
// (must be required in server.js before this middleware is used)

// ─── Note / Document uploads ────────────────────────────────────────────────
const noteStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'univault/notes',
    resource_type: 'auto', // supports PDFs, images, docx
    allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'doc'],
  },
});

// ─── User avatar uploads ─────────────────────────────────────────────────────
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'univault/avatars',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
  },
});

// ─── Study group cover image uploads ─────────────────────────────────────────
const coverStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'univault/covers',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 400, crop: 'fill' }],
  },
});

// File size limit: 20 MB
const limits = { fileSize: 20 * 1024 * 1024 };

exports.uploadNote   = multer({ storage: noteStorage,   limits });
exports.uploadAvatar = multer({ storage: avatarStorage, limits });
exports.uploadCover  = multer({ storage: coverStorage,  limits });
