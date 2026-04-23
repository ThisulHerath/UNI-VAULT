# 📚 UniVault

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

---

## 🛠️ Tech Stack

### **Frontend (Mobile App)**
- **Framework:** React Native (Expo)
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based routing)
- **State Management:** React Context API
- **HTTP Client:** Axios (via custom API service)
- **Styling:** React Native built-in + theme constants

### **Backend**
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **File Storage:** Cloudinary CDN
- **File Upload:** Multer middleware
- **Validation:** Express Validator

### **Tools & DevOps**
- **Version Control:** Git
- **Package Manager:** npm
- **Environment:** `.env` configuration

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
│   ├── controllers/                 # Route handlers
│   │   ├── authController.js
│   │   ├── noteController.js
│   │   ├── reviewController.js
│   │   ├── collectionController.js
│   │   ├── studyGroupController.js
│   │   ├── subjectController.js
│   │   └── noteRequestController.js
│   ├── middleware/
│   │   ├── auth.js                  # JWT verification
│   │   ├── errorHandler.js          # Global error handling
│   │   └── upload.js                # Multer configuration
│   ├── models/                      # Mongoose schemas
│   │   ├── User.js
│   │   ├── Note.js
│   │   ├── Subject.js
│   │   ├── Review.js
│   │   ├── Collection.js
│   │   ├── StudyGroup.js
│   │   └── NoteRequest.js
│   ├── routes/                      # API endpoints
│   │   ├── authRoutes.js
│   │   ├── noteRoutes.js
│   │   ├── reviewRoutes.js
│   │   ├── collectionRoutes.js
│   │   ├── studyGroupRoutes.js
│   │   ├── subjectRoutes.js
│   │   └── noteRequestRoutes.js
│   ├── .env.example
│   ├── package.json
│   └── server.js                    # Express app entry point
│
├── mobile-app/                      # React Native (Expo) frontend
│   ├── app/                         # Expo Router pages
│   │   ├── (auth)/                  # Authentication screens
│   │   │   ├── login.tsx
│   │   │   ├── register.tsx
│   │   │   └── welcome.tsx
│   │   ├── (tabs)/                  # Main app tabs
│   │   │   ├── explore.tsx          # Browse notes
│   │   │   ├── notes.tsx            # User's notes
│   │   │   ├── subjects.tsx         # Subject browser
│   │   │   ├── groups.tsx           # Study groups
│   │   │   ├── requests.tsx         # Note requests
│   │   │   ├── profile.tsx          # User profile
│   │   │   └── index.tsx            # Home feed
│   │   ├── note/
│   │   │   ├── upload.tsx           # Upload new note
│   │   │   └── [id]/                # Note detail pages
│   │   ├── group/
│   │   ├── profile/
│   │   ├── subject/
│   │   ├── request/
│   │   └── collections.tsx
│   ├── components/                  # Reusable UI components
│   │   ├── ui/
│   │   ├── themed-text.tsx
│   │   ├── themed-view.tsx
│   │   └── ...
│   ├── services/
│   │   ├── api.ts                   # Axios configuration
│   │   ├── authService.ts           # Auth API calls
│   │   └── dataServices.ts          # Data API calls
│   ├── context/
│   │   └── AuthContext.tsx          # Auth state management
│   ├── hooks/                       # Custom React hooks
│   ├── constants/
│   ├── package.json
│   └── tsconfig.json
│
├── implementation_plan.md           # Detailed project specs
└── README.md                        # This file
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

3. **Create .env file for API configuration:**
   ```bash
   # Create .env in mobile-app root
   EXPO_PUBLIC_API_URL=http://your-backend-url:5000/api
   ```

4. **Start Expo development server:**
   ```bash
   npm run start
   ```

5. **Run on device/emulator:**
   - **iOS:** Press `i` in terminal
   - **Android:** Press `a` in terminal
   - **Web:** Press `w` in terminal

---

## 📡 API Endpoints Overview

All endpoints require JWT authentication (except `/auth` routes).

### Authentication
```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login & get JWT token
```

### Notes
```
GET    /api/notes                  Get all public notes
GET    /api/notes/:id              Get note details
POST   /api/notes                  Upload new note
PUT    /api/notes/:id              Update note
DELETE /api/notes/:id              Delete note
GET    /api/notes/subject/:subjectId  Get notes by subject
```

### Reviews
```
GET    /api/reviews/:noteId        Get reviews for a note
POST   /api/reviews/:noteId        Add review/rating
DELETE /api/reviews/:id            Delete own review
```

### Collections
```
GET    /api/collections            Get user's collections
POST   /api/collections            Create new collection
POST   /api/collections/:id/notes  Add note to collection
DELETE /api/collections/:id/notes/:noteId  Remove note
```

### Study Groups
```
GET    /api/groups                 Get all groups
POST   /api/groups                 Create new group
POST   /api/groups/:id/join        Join a study group
POST   /api/groups/:id/notes       Share note with group
```

### Subjects
```
GET    /api/subjects               Get all subjects
GET    /api/subjects/:id           Get subject details
POST   /api/subjects               Create subject (admin)
```

### Note Requests
```
GET    /api/requests               Get open requests
POST   /api/requests               Create new request
PATCH  /api/requests/:id           Fulfill/close request
```

*Full API documentation available at `/api-docs` (Swagger coming soon)*

---

## 🔐 Authentication

UniVault uses **JWT (JSON Web Token)** for secure authentication:

1. User registers/logs in with email & password
2. Backend returns JWT token (expires in 7 days by default)
3. Mobile app stores token in secure storage
4. Include token in `Authorization: Bearer <token>` header for protected routes
5. Backend middleware verifies token before processing request

**Password Security:** Passwords are hashed using `bcryptjs` before storage.

---

## 📝 Key Features

### ✨ For Students
- 📤 Upload notes (PDF, images, documents)
- ⭐ Rate and review peer notes (1-5 stars)
- 🏷️ Tag and categorize notes
- 🔖 Create personal collections/bookmarks
- 🔍 Full-text search across notes
- 👥 Join or create study groups
- 💬 Request specific notes from community
- 📊 Track note popularity (ratings & downloads)

### 🛡️ For Data Integrity
- **Automatic Rating Calculation:** Review hooks auto-update note ratings
- **Soft Deletes:** Users can deactivate accounts safely
- **Indexing:** Full-text indexes on notes for fast search
- **Compound Indexes:** Prevent duplicate reviews per user per note

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and commit:
   ```bash
   git commit -m "Add: your descriptive commit message"
   ```
4. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Create a Pull Request** with a clear description

### Coding Standards
- Use TypeScript for type safety
- Follow existing code style
- Add comments for complex logic
- Test your changes before submitting PR

---

## 🐛 Troubleshooting

### MongoDB Connection Issues
- Verify `MONGO_URI` in `.env` file
- Check MongoDB Atlas IP whitelist (add `0.0.0.0/0` for development)
- Ensure database user has correct permissions

### Cloudinary Upload Errors
- Verify API credentials in `.env`
- Check file size limits (Cloudinary default: 100MB)
- Ensure correct folder structure in Cloudinary dashboard

### Mobile App Connection
- Update `EXPO_PUBLIC_API_URL` to match backend URL
- Check CORS settings in Express (should allow mobile app origin)
- Verify backend is running and accessible

---

## 📚 Documentation

- **[Implementation Plan](./implementation_plan.md)** - Detailed schema design & roadmap
- **[Backend Setup Guide](./backend/.env.example)** - Environment configuration
- **[Mobile App README](./mobile-app/README.md)** - Frontend-specific instructions

---

## 📜 License

This project is licensed under the **MIT License** - see the LICENSE file for details.

---

## 👨‍💻 Author

**Created with ❤️ for students, by students.**

For questions or support, please open an issue on GitHub.

---

## 🎯 Roadmap

- [ ] Real-time chat in study groups (Socket.io)
- [ ] Push notifications for group updates
- [ ] Advanced analytics & study insights
- [ ] Integration with university calendar
- [ ] Offline note access
- [ ] Dark mode UI
- [ ] Multi-language support
- [ ] Admin dashboard

---

**⭐ If you find UniVault helpful, please star the repository!**
