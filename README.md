# 📚 UniVault APP


> **A collaborative student platform for sharing notes, building study groups, and discovering academic resources**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=node.js)](https://nodejs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-Expo-blue?logo=react)](https://expo.dev/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB-green?logo=mongodb)](https://www.mongodb.com/)

---

## 🎯 Overview

**UniVault** is a full-stack mobile application that empowers students to:
- 📄 **Upload & Share** study notes (PDFs, images, documents)
- ⭐ **Rate & Review** notes from peers to build trust
- 📚 **Organize Collections** of bookmarked notes by subject
- 👥 **Form Study Groups** with classmates and collaborate
- 🔍 **Search & Discover** notes by subject, tags, and ratings
- 💬 **Request Notes** when you can't find what you need

---

## 🏗️ Architecture

UniVault follows a **three-tier architecture**:

```
┌─────────────────────────────────────────────────┐
│  Mobile App (React Native + Expo)               │
│  - Expo Router for navigation                    │
│  - TypeScript for type safety                    │
│  - Context API for state management              │
└────────────────┬────────────────────────────────┘
                 │ REST API
                 ↓
┌─────────────────────────────────────────────────┐
│  Backend Server (Node.js + Express)             │
│  - JWT authentication & authorization           │
│  - Multer for file uploads (Cloudinary)          │
│  - Mongoose ODM for database operations          │
│  - Global error handling middleware              │
└────────────────┬────────────────────────────────┘
                 │ Database
                 ↓
┌─────────────────────────────────────────────────┐
│  MongoDB Database                               │
│  - 7 Mongoose models (User, Note, Subject, etc) │
│  - Indexed text search for performance           │
│  - Hooks for automatic data consistency          │
└─────────────────────────────────────────────────┘
```

### Data Flow Example

```
User uploads a note:
  1. Mobile app UI → Selects files, fills metadata
  2. Axios → Posts to /api/notes with files + JWT
  3. Express → Validates JWT, checks file size
  4. Multer → Uploads file to Cloudinary
  5. Controller → Creates Note document in MongoDB
  6. Index → Updates text search indexes
  7. Response → Returns note ID + URL to mobile
  8. Mobile → Updates UI with success message
```

---

## 🛠️ Tech Stack.

### **Frontend (Mobile App)**
- **Framework:** React Native (Expo) - v50+
- **Language:** TypeScript (for type safety)
- **Navigation:** Expo Router (file-based routing, similar to Next.js)
- **State Management:** React Context API
- **HTTP Client:** Axios (with custom interceptors for auth)
- **Styling:** React Native built-in + NativeWind (if used)
- **Theme:** Dual light/dark theme support
- **Storage:** Secure storage for JWT tokens

### **Backend**
- **Runtime:** Node.js v18+
- **Framework:** Express.js v4+
- **Database:** MongoDB + Mongoose v7+ ODM
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **File Upload:** Multer middleware
- **CDN:** Cloudinary for file storage
- **Validation:** Express Validator
- **Error Handling:** Custom global middleware

### **Tools & DevOps**
- **Version Control:** Git
- **Package Manager:** npm (v9+) or yarn
- **Development:** Expo CLI, nodemon for auto-reload
- **Build:** EAS Build for mobile app distribution
- **Environment:** .env configuration files
- **API Testing:** Postman collections included

### **Development Dependencies**
- **Linting:** ESLint with TypeScript support
- **Formatting:** Prettier for code consistency
- **Testing:** Jest (prepared for implementation)

---

## 📊 Database Schema

### Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ NOTE : "uploads"
    USER ||--o{ REVIEW : "writes"
    USER ||--o{ NOTEREQUEST : "posts"
    USER ||--o{ COLLECTION : "owns"
    USER }|--o{ STUDYGROUP : "member of"
    
    SUBJECT ||--o{ NOTE : "has"
    SUBJECT ||--o{ NOTEREQUEST : "referenced by"
    SUBJECT ||--o{ STUDYGROUP : "linked to"
    
    NOTE ||--o{ REVIEW : "receives"
    NOTE }o--o{ COLLECTION : "saved in"
    NOTE }o--o{ STUDYGROUP : "shared in"
    
    NOTEREQUEST |o--o| NOTE : "fulfilled by"
```

### Core Models

| Model | Purpose | Key Fields |
|-------|---------|-----------|
| **User** | Student account & profile | name, email, password, university, batch, avatar, studyGroups |
| **Subject** | Course/subject tracked | name, code, semester, department, createdBy |
| **Note** | Shared study material | title, fileUrl, subject, uploadedBy, averageRating, tags, isPublic |
| **Review** | Rating & feedback | note, reviewer, rating (1-5), comment |
| **Collection** | Bookmarked notes | name, owner, notes, isPrivate |
| **StudyGroup** | Collaborative groups | name, subject, members, sharedNotes, privacy |
| **NoteRequest** | Community requests | title, subject, requestedBy, status, fulfilledByNote |

*See [implementation_plan.md](./implementation_plan.md) for detailed schema specifications.*

---

## 📁 Project Structure

```
UniVault/
├── backend/                          # Node.js + Express server
│   ├── config/
│   │   ├── cloudinary.js            # Cloudinary CDN config
│   │   └── db.js                    # MongoDB connection
│   ├── controllers/
│   │   └── devController.js         # Development utilities
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification
│   │   ├── errorHandler.js          # Global error handling
│   │   └── upload.js                # Multer configuration
│   ├── modules/                     # Feature-based organization
│   │   ├── auth/
│   │   │   ├── authController.js
│   │   │   ├── authRoutes.js
│   │   │   └── User.js              # User model
│   │   ├── collection/
│   │   │   ├── Collection.js
│   │   │   ├── collectionController.js
│   │   │   └── collectionRoutes.js
│   │   ├── groups/
│   │   │   ├── StudyGroup.js
│   │   │   ├── studyGroupController.js
│   │   │   └── studyGroupRoutes.js
│   │   ├── notes/
│   │   │   ├── Note.js
│   │   │   ├── noteController.js
│   │   │   └── noteRoutes.js
│   │   ├── request/
│   │   │   ├── NoteRequest.js
│   │   │   ├── noteRequestController.js
│   │   │   └── noteRequestRoutes.js
│   │   ├── review/
│   │   │   ├── Review.js
│   │   │   ├── reviewController.js
│   │   │   ├── reviewRoutes.js
│   │   │   └── reviewRules.js
│   │   └── subject/
│   │       ├── Subject.js
│   │       ├── subjectController.js
│   │       └── subjectRoutes.js
│   ├── routes/
│   │   └── devRoutes.js
│   ├── seeds/
│   │   └── seedSubjects.js          # Database seeding
│   ├── uploads/                     # File storage structure
│   │   ├── avatars/
│   │   ├── covers/
│   │   └── notes/
│   ├── utils/
│   │   ├── groupCoverFiles.js
│   │   ├── groupMessageFiles.js
│   │   ├── migrateLegacyNoteFiles.js
│   │   ├── noteFiles.js
│   │   └── requestFiles.js
│   ├── .env.example
│   ├── package.json
│   └── server.js                    # Express app entry point
│
├── mobile-app/                      # React Native (Expo) frontend
│   ├── app/                         # Expo Router pages (file-based routing)
│   │   ├── _layout.tsx              # Root layout
│   │   ├── +not-found.tsx           # 404 page
│   │   ├── collections.tsx          # Collections view
│   │   ├── modal.tsx                # Modal layout
│   │   ├── my-notes.tsx             # User's uploaded notes
│   │   │
│   │   ├── (auth)/                  # Authentication group
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── welcome.tsx
│   │   │
│   │   ├── (tabs)/                  # Main app tabs group
│   │   │   ├── _layout.tsx          # Tab navigation
│   │   │   ├── index.tsx            # Home/feed
│   │   │   ├── notes.tsx            # My notes tab
│   │   │   ├── subjects.tsx         # Subjects browser tab
│   │   │   ├── groups.tsx           # Study groups tab
│   │   │   ├── requests.tsx         # Note requests tab
│   │   │   └── profile.tsx          # User profile tab
│   │   │
│   │   ├── collection/
│   │   │   └── [id].tsx             # Collection details
│   │   │
│   │   ├── group/
│   │   │   ├── [id].tsx             # Group details
│   │   │   └── create.tsx           # Create new group
│   │   │
│   │   ├── note/
│   │   │   ├── upload.tsx           # Upload new note
│   │   │   └── [id]/
│   │   │       └── index.tsx        # Note details
│   │   │
│   │   ├── profile/                 # Profile management
│   │   ├── request/                 # Request details
│   │   ├── search/                  # Search results
│   │   └── subject/                 # Subject details
│   │
│   ├── components/                  # Reusable UI components
│   │   ├── ui/                      # Base UI components
│   │   ├── ambient-background.tsx
│   │   ├── external-link.tsx
│   │   ├── haptic-tab.tsx
│   │   ├── hello-wave.tsx
│   │   ├── parallax-scroll-view.tsx
│   │   ├── themed-text.tsx
│   │   ├── themed-view.tsx
│   │   └── ...
│   │
│   ├── features/                    # Feature-based modules
│   │   ├── auth/
│   │   ├── collection/
│   │   ├── groups/
│   │   ├── notes/
│   │   ├── request/
│   │   ├── review/
│   │   └── subject/
│   │
│   ├── services/
│   │   ├── api.ts                   # Axios configuration & interceptors
│   │   ├── authService.ts           # Auth API calls
│   │   ├── collectionLogic.ts       # Collection business logic
│   │   └── dataServices.ts          # General data API calls
│   │
│   ├── context/
│   │   └── AuthContext.tsx          # Auth state management
│   │
│   ├── hooks/                       # Custom React hooks
│   │   ├── use-app-dialog.tsx
│   │   ├── use-color-scheme.ts
│   │   ├── use-color-scheme.web.ts
│   │   ├── use-fade-animation.ts
│   │   └── use-theme-color.ts
│   │
│   ├── constants/
│   │   ├── subject-catalog.ts       # Subject data
│   │   ├── theme.ts                 # Theme configuration
│   │   └── university-catalog.ts    # University data
│   │
│   ├── assets/
│   │   └── images/                  # App images
│   │
│   ├── scripts/
│   │   └── reset-project.js
│   │
│   ├── package.json
│   ├── tsconfig.json
│   └── expo-env.d.ts
│
├── dev_create_review.json          # Development utility config
├── prompt.md                       # Development prompts
├── implementation_plan.md          # Detailed project specs
└── README.md                       # This file
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18 or higher
- **npm** or **yarn** package manager
- **MongoDB** instance (local or Atlas)
- **Cloudinary** account (for image uploads)
- **Expo Go** app (for testing mobile app on device)

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Environment Variables Required:**
   ```env
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/univault
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=7d
   CLOUDINARY_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   PORT=5000
   NODE_ENV=development
   ```

5. **Start the server:**
   ```bash
   npm start
   # Or for development with auto-reload:
   npm run dev
   ```

   Server runs on `http://localhost:5000`

### Mobile App Setup

1. **Navigate to mobile app directory:**
   ```bash
   cd mobile-app
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create `.env.local` or `.env` in the mobile-app root:
   ```env
   EXPO_PUBLIC_API_URL=http://192.168.x.x:5000/api
   # For production, use your deployed backend URL
   ```
   > **Note:** Use your machine's IP address instead of `localhost` when testing on physical devices

4. **Start Expo development server:**
   ```bash
   npm run start
   ```

5. **Run on device/emulator:**
   - **iOS:** Press `i` in terminal (requires Xcode)
   - **Android:** Press `a` in terminal (requires Android Studio)
   - **Web:** Press `w` in terminal
   - **Expo Go App:** Scan QR code with Expo Go app on your phone

### Mobile App Navigation Structure

The app uses **Expo Router** with file-based routing:

- **Auth Flow:** `(auth)` group - `login`, `register`, `welcome` pages
- **Main Tabs:** `(tabs)` group with bottom tab navigation
  - 🏠 `index.tsx` - Home/feed
  - 📝 `notes.tsx` - My notes
  - 📚 `subjects.tsx` - Browse subjects
  - 👥 `groups.tsx` - Study groups
  - 🔔 `requests.tsx` - Note requests
  - 👤 `profile.tsx` - User profile
- **Collections:** `collections.tsx` - Bookmarked notes
- **Detail Pages:** Dynamic routes for note, group, subject, request details
- **Upload Flow:** `note/upload.tsx` - Upload new notes
- **Search:** `search/` - Search functionality

---

## 📡 API Endpoints Overview

All endpoints require JWT authentication (except `/auth` routes).

### Authentication
```
POST   /api/auth/register            Register new user
POST   /api/auth/login               Login & get JWT token
GET    /api/auth/me                  Get current user profile
PUT    /api/auth/profile             Update user profile
```

### Notes
```
GET    /api/notes                    Get all public notes (paginated)
GET    /api/notes/:id                Get note details
POST   /api/notes                    Upload new note
PUT    /api/notes/:id                Update note metadata
DELETE /api/notes/:id                Delete note
GET    /api/notes/subject/:subjectId Get notes by subject
GET    /api/notes/user/:userId       Get user's uploaded notes
GET    /api/notes/search             Search notes (full-text)
```

### Reviews & Ratings
```
GET    /api/reviews/:noteId          Get reviews for a note
POST   /api/reviews/:noteId          Add review/rating (1-5 stars)
PUT    /api/reviews/:id              Update own review
DELETE /api/reviews/:id              Delete own review
GET    /api/reviews/user/me          Get my reviews
```

### Collections
```
GET    /api/collections              Get user's collections
POST   /api/collections              Create new collection
GET    /api/collections/:id          Get collection details
PUT    /api/collections/:id          Update collection
DELETE /api/collections/:id          Delete collection
POST   /api/collections/:id/notes/:noteId    Add note to collection
DELETE /api/collections/:id/notes/:noteId   Remove note from collection
```

### Study Groups
```
GET    /api/groups                   Get all study groups (paginated)
GET    /api/groups/:id               Get group details
POST   /api/groups                   Create new study group
PUT    /api/groups/:id               Update group (owner only)
DELETE /api/groups/:id               Delete group (owner only)
POST   /api/groups/:id/members       Join study group
DELETE /api/groups/:id/members       Leave study group
POST   /api/groups/:id/notes/:noteId Share note with group
```

### Subjects
```
GET    /api/subjects                 Get all subjects
GET    /api/subjects/:id             Get subject details
POST   /api/subjects                 Create subject (admin)
PUT    /api/subjects/:id             Update subject (admin)
```

### Note Requests
```
GET    /api/requests                 Get all open requests
POST   /api/requests                 Create new request
GET    /api/requests/:id             Get request details
PATCH  /api/requests/:id             Fulfill/close request
DELETE /api/requests/:id             Delete own request
GET    /api/requests/user/me         Get my requests
```

### Development Routes
```
GET    /api/dev/*                    Development utilities (dev only)
```

*Full API documentation with request/response examples coming soon*

---

## 🏗️ System Architecture Details

### Backend Module Organization

UniVault uses a **modular, feature-based architecture** in the backend:

```
modules/
├── auth/              → User authentication & account management
├── collection/       → Bookmark collections
├── groups/          → Study group functionality
├── notes/           → Note upload & management
├── request/         → Note request system
├── review/          → Rating & review system with validation rules
└── subject/         → Subject catalog management
```

Each module is self-contained with:
- **Controller** - Route handlers and business logic
- **Routes** - Express route definitions
- **Model** - Mongoose schema and data validation

### Frontend Feature Organization

Mobile app uses a parallel **feature-based structure** for consistency:

```
features/
├── auth/             → Login/register screens & logic
├── collection/       → Collection management
├── groups/          → Group interaction
├── notes/           → Note browsing & upload
├── request/         → Request creation & browsing
├── review/          → Review composition & display
└── subject/         → Subject browsing
```

### File Upload Pipeline

UniVault handles multi-type file uploads:

1. **User Avatars** - Cloudinary (compressed images)
2. **Group Covers** - Cloudinary (optimized covers)
3. **Notes** - Cloudinary + local storage (PDF, images, documents)
4. **Request Files** - Cloudinary (supporting documents)

Utility files in `backend/utils/`:
- `noteFiles.js` - Note file management
- `groupCoverFiles.js` - Group cover handling
- `groupMessageFiles.js` - Message attachments
- `requestFiles.js` - Request attachments
- `migrateLegacyNoteFiles.js` - Migration tools for existing files

---

## 🔐 Authentication & Security

### JWT Authentication Workflow

1. **Registration:** User creates account with email/password
2. **Hashing:** Password hashed with bcryptjs (never stored in plain text)
3. **Login:** Credentials verified, JWT token generated
4. **Token Storage:** Mobile app stores token in secure storage
5. **API Calls:** Token included in `Authorization: Bearer <token>` header
6. **Verification:** Backend middleware validates token before processing
7. **Expiration:** Default 7-day expiration (configurable)

### Protected Routes

All API endpoints except `/auth/register` and `/auth/login` require valid JWT token via middleware:

```javascript
// Middleware validates token in Authorization header
// Extracts user info and attaches to request object
```

### Password Security

- Bcryptjs hashing with salt rounds for secure storage
- No plain passwords logged or transmitted
- Client-side validation on mobile app

---

## ⭐ Review & Rating System

UniVault implements a sophisticated review system to maintain data quality and prevent abuse:

### Review Rules & Validation

Located in `backend/modules/review/reviewRules.js`:

1. **One Review Per User Per Note** - Users can only submit one rating per note
2. **Update Capability** - Users can edit their own reviews (rating & comment)
3. **Rating Range** - Ratings must be 1-5 stars
4. **Comment Optional** - Comments are encouraged but not required
5. **Auto-Aggregation** - Note's average rating updates when reviews change/delete

### Review Lifecycle

```
User submits review (1-5 stars + optional comment)
    ↓
Validation: Check if user already reviewed this note
    ↓
If new: Create review, increment note review count
       Update note's average rating
    ↓
If edit: Update review, recalculate note's average
    ↓
If delete: Remove review, recalculate average rating
    ↓
Updated statistics returned to frontend
```

### Duplicate Prevention

Compound database index on `(note, reviewer)` ensures:
- No duplicate reviews from same user for same note
- Efficient lookup when updating/deleting reviews
- Data integrity enforced at database level

---

## 🔗 Database Relationships

All relationships established through Mongoose schemas with proper references:

| Relationship | Type | Purpose |
|-------------|------|---------|
| User → Note | 1:N | User uploads multiple notes |
| User → Review | 1:N | User writes multiple reviews |
| Note → Review | 1:N | Note receives multiple reviews |
| User → Collection | 1:N | User owns multiple collections |
| Collection → Note | N:M | Collections contain multiple notes |
| User → StudyGroup | N:M | Users are members of groups |
| StudyGroup → Note | N:M | Groups share multiple notes |
| Subject → Note | 1:N | Subject has multiple notes |
| Subject → StudyGroup | 1:N | Subject linked to groups |
| Note → NoteRequest | 1:1 | Request fulfilled by note |

---

## 📝 Key Features & Functionality

### ✨ For Students

#### Note Management
- 📤 **Upload notes** in multiple formats (PDF, images, documents)
- 📝 **Edit metadata** (title, subject, tags, visibility)
- 🗑️ **Organize & delete** your uploaded notes
- 📊 **Track note statistics** (views, ratings, downloads)

#### Social Learning
- ⭐ **Rate & review** peer notes (1-5 star ratings)
- 💬 **Read peer feedback** to discover quality notes
- 🏷️ **Auto-calculated ratings** based on review aggregation
- 🔍 **Full-text search** across all notes with subject filtering

#### Collections & Organization
- 🔖 **Create personal collections** to bookmark important notes
- 📚 **Organize by subject** or custom categories
- 🔒 **Public/private** collection options
- ✏️ **Manage collection contents** dynamically

#### Study Groups
- 👥 **Create or join** study groups by subject
- 🔒 **Private/public** group options
- 📌 **Share notes** within group
- 👤 **Group member management** (add/remove/leave)

#### Note Requests
- 🙋 **Request specific notes** from the community
- 📌 **Track fulfillment status** (open/fulfilled/closed)
- 💡 **Discover unmet academic needs** in your subject

#### User Profile
- 🎨 **Custom avatar** profile pictures
- ⭐ **View upload statistics** and ratings received
- 📊 **Track your contributions** to the platform
- ✏️ **Edit profile information** and preferences

### 🛡️ For Data Integrity & Performance
- **Automatic Rating Calculation:** Review hooks auto-update note ratings and prevent duplicate reviews
- **Soft Deletes:** User accounts can be safely deactivated
- **Text Indexing:** Full-text indexes on notes for fast search performance
- **Compound Indexes:** Prevent duplicate reviews per user-note combination
- **File Organization:** Automatic file management for avatars, covers, and note uploads
- **Legacy Migration:** Utils to migrate existing note files to new structure

---

## ▶️ Running the Complete Application

### Quick Start (Both Backend & Mobile)

1. **Terminal 1 - Start Backend:**
   ```bash
   cd backend
   npm install        # First time only
   npm run dev        # Start with auto-reload
   ```
   Backend will be available at `http://localhost:5000`

2. **Terminal 2 - Start Mobile App:**
   ```bash
   cd mobile-app
   npm install        # First time only
   npm run start      # Start Expo dev server
   ```
   Scan QR code with Expo Go or press `a`/`i` for emulator

3. **Access the App:**
   - Sign up with test credentials
   - Browse subjects & existing notes
   - Try uploading a note
   - Rate & review notes from other users
   - Create a study group

### Production Build

```bash
# Build backend Docker image
cd backend
docker build -t univault-api .
docker run -p 5000:5000 univault-api

# Build mobile app for distribution
cd mobile-app
eas build --platform ios        # iOS build
eas build --platform android    # Android build
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how to get involved:

### Development Workflow

1. **Fork the repository** on GitHub
2. **Clone your fork locally:**
   ```bash
   git clone https://github.com/your-username/univault.git
   cd univault
   ```
3. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/bug-description
   ```
4. **Make your changes** with clear, focused commits:
   ```bash
   git commit -m "feat: add new feature description"
   git commit -m "fix: resolve issue description"
   ```
5. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request** with:
   - Clear title describing the change
   - Detailed description of what was changed and why
   - Screenshots for UI changes
   - Link to related issues

### Coding Standards

- **TypeScript:** Use for all frontend code - no untyped any
- **Comments:** Explain complex logic, especially in controllers
- **Code Style:** Follow existing patterns in the codebase
- **Error Handling:** Use consistent error handling patterns
- **Database:** Use Mongoose for all database operations
- **File Uploads:** Use Cloudinary for all file storage

### Testing Before PR

```bash
# Backend
cd backend
npm run lint      # Check for style issues

# Mobile
cd mobile-app
npm run lint      # Check TypeScript & style
npx tsc --noEmit # Type checking
```

### Commit Message Format

```
feat: add new authentication feature
fix: resolve issue with note uploads
docs: update API documentation
style: format code consistently
refactor: reorganize module structure
test: add unit tests for review system
chore: update dependencies
```

---

## 🐛 Troubleshooting & Common Issues

### Backend Connection Issues

#### MongoDB Connection Errors
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution:**
- Verify `MONGO_URI` in `.env` file is correct
- Check MongoDB Atlas IP whitelist includes your IP (use `0.0.0.0/0` for development)
- Ensure database user has collection access permissions
- Test connection string in MongoDB Compass

#### Cloudinary Upload Failures
```
Error: Upload failed - Authentication failed
```
**Solution:**
- Verify `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env`
- Check file size limits (default 100MB)
- Verify folder structure exists in Cloudinary dashboard
- Test API credentials in Cloudinary settings

#### Port Already in Use
```
Error: listen EADDRINUSE :::5000
```
**Solution:**
```bash
# Windows: Find process on port 5000
$tcpProperties = [System.Net.NetworkInformation.IPGlobalProperties]::GetIPGlobalProperties()
$connections = $tcpProperties.GetActiveTcpConnections()
$connections | where {$_.LocalEndPoint.Port -eq 5000}

# Kill the process or use different PORT in .env
```

### Mobile App Connection Issues

#### Can't Connect to Backend
```
Error: Network Error: connect ECONNREFUSED
```
**Solution:**
- Update `EXPO_PUBLIC_API_URL` to your machine's IP (not `localhost`)
- Verify backend is running: `npm run dev` in backend folder
- Check firewall allows port 5000
- Test with `curl http://192.168.x.x:5000/api/health`

#### CORS Errors
```
Error: Access to XMLHttpRequest blocked by CORS policy
```
**Solution:**
- Backend should have CORS enabled for mobile app origin
- Verify `EXPO_PUBLIC_API_URL` matches backend CORS config
- Check that credentials are being sent if needed

#### File Upload Fails on Mobile
```
Error: Image/PDF upload failed
```
**Solution:**
- Check file size limits in Multer config
- Verify device has internet connectivity
- Check Cloudinary credentials are correct
- Review file permissions on device

### Development Issues

#### Hot Reload Not Working
**Solution:**
```bash
# Clear cache and restart
cd mobile-app
npm run start -- --clear

# Or for Expo CLI
npx expo start --clear
```

#### Syntax/TypeScript Errors
**Solution:**
```bash
# Validate TypeScript config
cd mobile-app
npx tsc --noEmit

# Check ESLint
npm run lint
```

---

## 🚀 Development Features

### Database Seeding

Seed initial subjects into database:

```bash
cd backend
npm run seed
```

Located in `seeds/seedSubjects.js` - contains university subjects and departments.

### Development Routes

Dev utility endpoints available in development:

```bash
GET  /api/dev/*              # Development utilities (dev-only)
```

See `routes/devRoutes.js` for available dev endpoints.

### File Organization Utilities

Automated tools in `backend/utils/`:
- **Note Files:** Organize uploaded notes
- **Group Covers:** Manage group cover images
- **Request Files:** Handle request attachments
- **Legacy Migration:** Migrate old note files to new structure

---

## 📚 Documentation

- **[Implementation Plan](./implementation_plan.md)** - Detailed database schema, API specs & development roadmap
- **[Mobile App Config](./mobile-app/app.json)** - Expo configuration & app details
- **[Backend Setup](./backend/.env.example)** - Environment variables reference
- **[Postman Collections](./dev_create_review.json)** - API request examples

---

## 📜 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 👨‍💻 Author

**Created with ❤️ for students, by students.**

For questions or support, please open an issue on GitHub.

---

## 🎯 Roadmap & Future Enhancements

### ✅ Implemented Features
- [x] User authentication (login/register)
- [x] Note upload & management (PDF, images, documents)
- [x] Review & rating system (1-5 stars)
- [x] Collections / bookmarks
- [x] Study groups
- [x] Note requests
- [x] Subject catalog
- [x] Full-text search
- [x] File upload with Cloudinary
- [x] Mobile app with Expo Router
- [x] JWT authentication & authorization

### 🚀 In Development / Planned
- [ ] **Real-time Chat** - Socket.io for group messaging
- [ ] **Push Notifications** - Group updates and mentions
- [ ] **Advanced Analytics** - Study insights & trends
- [ ] **University Integration** - Calendar & course sync
- [ ] **Offline Mode** - Download notes for offline access
- [ ] **Dark Mode** - UI theme support
- [ ] **Multi-language** - i18n support
- [ ] **Admin Dashboard** - Moderation & analytics
- [ ] **Social Features** - Following & recommendations
- [ ] **Export Options** - Download collections as PDFs
- [ ] **Collaborative Notes** - Real-time co-authoring
- [ ] **Mobile Optimization** - Performance improvements

---

**⭐ If you find UniVault helpful, please star the repository!**
