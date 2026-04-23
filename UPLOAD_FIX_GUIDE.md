# File Upload Fix - Setup & Testing Guide

## Problem Fixed
The note upload feature was failing with "Unknown API key your.api_key" error because Cloudinary credentials were placeholders. We've implemented **local file storage** as an alternative that works without external dependencies.

---

## What Changed

### Backend Changes

1. **Middleware** (`backend/middleware/upload.js`)
   - Switched from Cloudinary to **local disk storage** using multer
   - Stores files in `/uploads/notes`, `/uploads/avatars`, `/uploads/covers`
   - Sanitizes filenames and validates file types
   - Supports: PDF, PNG, JPG, GIF, DOCX, DOC

2. **Server** (`backend/server.js`)
   - Added static file serving: `/uploads` directory is now accessible via HTTP
   - Files are served at: `http://localhost:5000/uploads/notes/filename`

3. **Controllers** (authController.js, noteController.js, studyGroupController.js)
   - Replaced Cloudinary API calls with local file deletion
   - File URLs now point to local server paths
   - Metadata (filename, size, type) stored in MongoDB

### Mobile App Changes
✅ No changes needed (already compatible)

---

## Setup Instructions

### 1. Start Fresh (Recommended)
```bash
# Delete old uploads (if any contain test data)
rm -r backend/uploads/*

# Or on Windows:
rmdir /s backend\uploads\notes
rmdir /s backend\uploads\avatars
rmdir /s backend\uploads\covers
```

### 2. Start Backend Server
```bash
cd backend
npm run dev
# Should see: "🚀 UniVault server running on port 5000"
```

### 3. Verify Setup
```bash
# Test health check
curl http://localhost:5000/api/health

# Should return:
# {"success":true,"message":"✅ UniVault API is running."}
```

---

## Testing the Upload Flow

### Step 1: Register User
- Open mobile app
- Create account (email, password, name, university, batch)
- Login with new credentials

### Step 2: Create Subject
- Go to **Subjects** tab
- Create a subject (name, code)
- Should see it in the subject list

### Step 3: Upload a Note
1. Go to **Notes** tab
2. Tap **Upload Note** button
3. Fill form:
   - **Title**: "AIML Final Evaluation"
   - **Description**: "FinalEvaluation"
   - **Subject**: Select "SADF" (or your created subject)
   - **Tags**: "Final PP"
   - **File**: Tap "Tap to select PDF, Image, or DOCX"
4. Pick any PDF/image/DOCX file from your device
5. Tap **Upload to Cloudinary** button (button label can be updated later)
6. Should show ✅ success toast and return to notes list

### Step 4: View Your Note
- Note should appear in the notes list
- Tap it to view details
- File URL should be `http://10.0.2.2:5000/uploads/notes/filename`

### Step 5: Test File Accessibility
- On Android emulator, open a browser
- Navigate to: `http://10.0.2.2:5000/uploads/notes`
- Should be able to see/download the uploaded file

---

## Database Schema - Unchanged

### Note Document
```javascript
{
  title: "AIML Final Evaluation",
  description: "FinalEvaluation",
  fileUrl: "http://10.0.2.2:5000/uploads/notes/userid-timestamp-filename.pdf",
  cloudinaryPublicId: "userid-timestamp-filename.pdf",  // Used for deletion
  fileType: "pdf|image|docx|other",
  fileSize: 1024576,
  originalFileName: "4-IT2021_FinalPresentationInstructions.pdf",
  subject: ObjectId,
  uploadedBy: ObjectId,
  tags: ["final", "pp"],
  isPublic: true,
  viewCount: 0,
  downloadCount: 0,
  averageRating: 0,
  totalReviews: 0,
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T10:30:00Z"
}
```

### User Avatar - Same Structure
```javascript
{
  avatar: "http://10.0.2.2:5000/uploads/avatars/userid-timestamp.jpg",
  avatarPublicId: "userid-timestamp.jpg"
}
```

---

## File Structure on Server

```
backend/
├── uploads/
│   ├── notes/              # 20GB max per file
│   │   └── userid-timestamp-filename.pdf
│   ├── avatars/            # 20GB max per file
│   │   └── userid-timestamp.jpg
│   └── covers/             # 20GB max per file
│       └── groupid-timestamp.png
├── server.js
└── ...
```

---

## Benefits

✅ **No External Dependencies** - No Cloudinary account needed  
✅ **Database Compatible** - All metadata stored in MongoDB  
✅ **Component Reusable** - File URLs work everywhere  
✅ **Easy Management** - Simple filesystem operations  
✅ **Development Friendly** - Fast uploads, no API delays  

---

## Troubleshooting

### Issue: "Cannot POST /api/notes"
- **Solution**: Ensure `protect` middleware is passing (check auth token)

### Issue: File upload succeeds but file not found at URL
- **Solution**: Check that `uploads/` directories exist
  ```bash
  mkdir -p backend/uploads/{notes,avatars,covers}
  ```

### Issue: "EACCES: permission denied, open 'uploads/...'"
- **Solution**: Check folder permissions
  ```bash
  chmod 755 backend/uploads
  chmod 755 backend/uploads/notes backend/uploads/avatars backend/uploads/covers
  ```

### Issue: Large files fail to upload
- **Solution**: Current limit is 20MB. In `middleware/upload.js`, change:
  ```javascript
  const limits = { fileSize: 100 * 1024 * 1024 }; // 100MB
  ```

### Issue: File persists after note deletion
- **Solution**: File cleanup happens automatically via `fs.unlinkSync()`. If you see orphaned files:
  ```bash
  # Manual cleanup (optional)
  find backend/uploads -type f -mtime +30 -delete  # Remove files older than 30 days
  ```

---

## Future Enhancements

1. **Switch Back to Cloudinary**
   - Just update `middleware/upload.js` to use CloudinaryStorage
   - Cloudinary auto-deletes files so no cleanup needed

2. **Add Download Tracking**
   - Track `downloadCount` when users access `/uploads/notes/:filename`
   - Add middleware to intercept download requests

3. **File Compression**
   - Compress PDFs/images before storing
   - Reduce storage usage

4. **Virus Scanning**
   - Use ClamAV or similar to scan uploads for malware

5. **S3 / Cloud Storage**
   - Migrate uploads to AWS S3 or Google Cloud Storage
   - Better scalability for production

---

## Notes

- Files are stored **locally on server disk**
- Suitable for **development and small deployments**
- For **production**, consider cloud storage (S3, Azure Blob, etc.)
- Backup `backend/uploads/` directory regularly
- Current implementation creates files with format: `{userId}-{timestamp}-{sanitizedFilename}.{ext}`
