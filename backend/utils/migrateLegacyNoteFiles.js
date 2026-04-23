const fs = require('fs');
const path = require('path');
const Note = require('../models/Note');
const {
  buildRelativeNoteFileUrl,
  getLegacyNoteFilePath,
  resolveNoteFileType,
  uploadNoteFileToGridFs,
} = require('./noteFiles');

const MIME_BY_EXTENSION = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const inferMimeType = (filePath, note) => {
  if (note.fileMimeType) return note.fileMimeType;

  const extension = path.extname(filePath).toLowerCase();
  return MIME_BY_EXTENSION[extension] || 'application/octet-stream';
};

const migrateLegacyNoteFiles = async () => {
  const legacyNotes = await Note.find({
    fileId: null,
    $or: [
      { cloudinaryPublicId: { $exists: true, $ne: null } },
      { fileUrl: { $regex: /^\/uploads\/notes\// } },
    ],
  }).select('cloudinaryPublicId fileUrl originalFileName fileType fileSize fileMimeType title');

  if (!legacyNotes.length) {
    console.log('ℹ️ No legacy note files found to migrate.');
    return;
  }

  let migratedCount = 0;
  let skippedCount = 0;

  for (const note of legacyNotes) {
    const legacyPath = getLegacyNoteFilePath(note);
    if (!legacyPath || !fs.existsSync(legacyPath)) {
      skippedCount += 1;
      continue;
    }

    const fileBuffer = fs.readFileSync(legacyPath);
    const mimeType = inferMimeType(legacyPath, note);

    const uploadResult = await uploadNoteFileToGridFs(
      {
        originalname: note.originalFileName || path.basename(legacyPath),
        mimetype: mimeType,
        buffer: fileBuffer,
        size: fileBuffer.length,
      },
      note._id
    );

    await Note.findByIdAndUpdate(note._id, {
      fileId: uploadResult.fileId,
      fileUrl: buildRelativeNoteFileUrl(note._id.toString()),
      fileType: resolveNoteFileType(mimeType) || note.fileType,
      fileMimeType: mimeType,
      fileSize: uploadResult.fileSize || fileBuffer.length,
      originalFileName: note.originalFileName || path.basename(legacyPath),
      cloudinaryPublicId: null,
    });

    try {
      fs.unlinkSync(legacyPath);
    } catch (error) {
      // Best effort only. The file is already in MongoDB.
    }

    migratedCount += 1;
  }

  console.log(`✅ Migrated ${migratedCount} legacy note file(s) into MongoDB GridFS.`);
  if (skippedCount > 0) {
    console.log(`⚠️ Skipped ${skippedCount} legacy note file(s) because the disk file was missing.`);
  }
};

module.exports = migrateLegacyNoteFiles;