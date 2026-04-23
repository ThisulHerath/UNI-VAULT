<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UniVault - Student Collaboration Platform</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                        'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
                        sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            overflow-x: hidden;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
        }

        /* Header & Hero Section */
        .hero {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 60px 20px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .hero::before {
            content: '';
            position: absolute;
            top: -50%;
            right: -10%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 50px 50px;
            animation: float 20s infinite;
        }

        @keyframes float {
            0%, 100% { transform: translate(0, 0) rotate(0deg); }
            50% { transform: translate(30px, -30px) rotate(180deg); }
        }

        .hero-content {
            position: relative;
            z-index: 2;
        }

        .logo {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 20px;
        }

        .logo-icon {
            font-size: 40px;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
        }

        h1 {
            font-size: 3.5em;
            margin-bottom: 15px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            animation: slideDown 0.8s ease-out;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .tagline {
            font-size: 1.3em;
            margin-bottom: 30px;
            opacity: 0.95;
            animation: slideDown 0.8s ease-out 0.2s both;
        }

        .badges {
            display: flex;
            gap: 10px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 40px;
            animation: slideDown 0.8s ease-out 0.4s both;
        }

        .badge {
            display: inline-block;
            padding: 6px 14px;
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 20px;
            font-size: 0.85em;
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
        }

        .badge:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }

        .cta-buttons {
            display: flex;
            gap: 15px;
            justify-content: center;
            flex-wrap: wrap;
            animation: slideDown 0.8s ease-out 0.6s both;
        }

        .btn {
            padding: 12px 30px;
            border-radius: 25px;
            border: none;
            font-size: 1em;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            text-decoration: none;
            display: inline-block;
        }

        .btn-primary {
            background: white;
            color: #667eea;
        }

        .btn-primary:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        }

        .btn-secondary {
            background: rgba(255,255,255,0.2);
            color: white;
            border: 2px solid white;
        }

        .btn-secondary:hover {
            background: white;
            color: #667eea;
        }

        /* Main Content */
        .content {
            background: white;
            padding: 60px 0;
        }

        .section {
            margin-bottom: 80px;
        }

        .section-title {
            font-size: 2.5em;
            margin-bottom: 40px;
            text-align: center;
            color: #667eea;
            position: relative;
            padding-bottom: 20px;
        }

        .section-title::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 4px;
            background: linear-gradient(90deg, #667eea, #764ba2);
            border-radius: 2px;
        }

        /* Features Grid */
        .features-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 30px;
            margin-bottom: 60px;
        }

        .feature-card {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            border-left: 4px solid transparent;
            position: relative;
        }

        .feature-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 15px 40px rgba(102, 126, 234, 0.2);
            border-left-color: #667eea;
        }

        .feature-icon {
            font-size: 2.5em;
            margin-bottom: 15px;
            display: inline-block;
            animation: bounce 2s infinite;
        }

        .feature-card:nth-child(2) .feature-icon { animation-delay: 0.2s; }
        .feature-card:nth-child(3) .feature-icon { animation-delay: 0.4s; }
        .feature-card:nth-child(4) .feature-icon { animation-delay: 0.6s; }
        .feature-card:nth-child(5) .feature-icon { animation-delay: 0.8s; }
        .feature-card:nth-child(6) .feature-icon { animation-delay: 1s; }

        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }

        .feature-card h3 {
            font-size: 1.3em;
            margin-bottom: 10px;
            color: #333;
        }

        .feature-card p {
            color: #666;
            font-size: 0.95em;
        }

        /* Architecture Section */
        .architecture {
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            padding: 40px;
            border-radius: 15px;
            margin-bottom: 60px;
            overflow-x: auto;
        }

        .architecture pre {
            background: transparent;
            color: #333;
            font-size: 0.9em;
            line-height: 1.8;
            margin: 0;
            padding: 20px;
            border-left: 4px solid #667eea;
        }

        /* Tech Stack */
        .tech-stack {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 30px;
        }

        .tech-category {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
        }

        .tech-category h3 {
            font-size: 1.4em;
            margin-bottom: 15px;
        }

        .tech-list {
            list-style: none;
        }

        .tech-list li {
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .tech-list li:last-child {
            border-bottom: none;
        }

        .tech-list li::before {
            content: '✓';
            font-weight: bold;
            color: #4ade80;
        }

        /* API Endpoints */
        .endpoints-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
        }

        .endpoint {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            border-left: 4px solid #667eea;
            transition: all 0.3s ease;
        }

        .endpoint:hover {
            background: #f0f3ff;
            transform: translateX(5px);
        }

        .endpoint-method {
            display: inline-block;
            padding: 4px 12px;
            background: #667eea;
            color: white;
            border-radius: 5px;
            font-size: 0.75em;
            font-weight: 700;
            margin-bottom: 8px;
            margin-right: 8px;
        }

        .endpoint-method.post { background: #10b981; }
        .endpoint-method.put { background: #f59e0b; }
        .endpoint-method.delete { background: #ef4444; }
        .endpoint-method.patch { background: #8b5cf6; }

        .endpoint-path {
            font-family: 'Courier New', monospace;
            font-size: 0.85em;
            color: #667eea;
            margin-bottom: 5px;
            word-break: break-all;
        }

        .endpoint-desc {
            color: #666;
            font-size: 0.9em;
        }

        /* Getting Started */
        .getting-started {
            background: white;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }

        .code-block {
            background: #1e293b;
            color: #e2e8f0;
            padding: 20px;
            border-radius: 10px;
            overflow-x: auto;
            margin: 15px 0;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            line-height: 1.6;
            border-left: 4px solid #667eea;
        }

        .code-block code {
            color: inherit;
        }

        .step {
            display: flex;
            gap: 20px;
            margin-bottom: 25px;
        }

        .step-number {
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.2em;
        }

        .step-content h3 {
            margin-bottom: 8px;
            color: #333;
        }

        .step-content p {
            color: #666;
            margin-bottom: 10px;
        }

        /* Database Schema */
        .schema-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }

        .schema-table thead {
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
        }

        .schema-table th,
        .schema-table td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }

        .schema-table tbody tr:hover {
            background: #f8f9ff;
        }

        .schema-table tbody tr:last-child td {
            border-bottom: none;
        }

        /* Roadmap */
        .roadmap-items {
            display: grid;
            gap: 15px;
            margin-top: 30px;
        }

        .roadmap-item {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            transition: all 0.3s ease;
        }

        .roadmap-item:hover {
            background: #f0f3ff;
            transform: translateX(5px);
        }

        .roadmap-checkbox {
            width: 24px;
            height: 24px;
            border: 2px solid #667eea;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            flex-shrink: 0;
        }

        .roadmap-item.completed .roadmap-checkbox {
            background: #667eea;
            color: white;
        }

        .roadmap-item.completed {
            opacity: 0.7;
        }

        /* Footer */
        footer {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
            margin-top: 60px;
        }

        .footer-content {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 30px;
            margin-bottom: 30px;
            text-align: left;
        }

        .footer-section h3 {
            margin-bottom: 15px;
        }

        .footer-section a {
            display: block;
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            margin-bottom: 8px;
            transition: all 0.3s ease;
        }

        .footer-section a:hover {
            color: white;
            padding-left: 5px;
        }

        .footer-bottom {
            border-top: 1px solid rgba(255,255,255,0.2);
            padding-top: 20px;
        }

        /* Responsive */
        @media (max-width: 768px) {
            h1 {
                font-size: 2.5em;
            }

            .section-title {
                font-size: 1.8em;
            }

            .features-grid {
                grid-template-columns: 1fr;
            }

            .step {
                flex-direction: column;
            }

            .footer-content {
                grid-template-columns: 1fr;
                text-align: center;
            }

            .footer-section a {
                padding-left: 0;
            }
        }

        /* Utility Classes */
        .highlight {
            background: linear-gradient(120deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .divider {
            height: 2px;
            background: linear-gradient(90deg, transparent, #667eea, transparent);
            margin: 60px 0;
        }

        .star-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 12px 24px;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            color: white;
            border: none;
            border-radius: 25px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 1em;
        }

        .star-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 25px rgba(245, 158, 11, 0.3);
        }
    </style>
</head>
<body>
    <!-- Hero Section -->
    <section class="hero">
        <div class="container">
            <div class="hero-content">
                <div class="logo">
                    <span class="logo-icon">📚</span>
                    <span>UniVault</span>
                </div>
                <h1>Collaborate. Learn. Share.</h1>
                <p class="tagline">A powerful platform for students to share notes, build study groups, and discover academic resources</p>
                
                <div class="badges">
                    <span class="badge">📱 React Native</span>
                    <span class="badge">🔧 Node.js</span>
                    <span class="badge">🗄️ MongoDB</span>
                    <span class="badge">✨ TypeScript</span>
                </div>

                <div class="cta-buttons">
                    <a href="#getting-started" class="btn btn-primary">Get Started</a>
                    <a href="#features" class="btn btn-secondary">Learn More</a>
                </div>
            </div>
        </div>
    </section>

    <!-- Main Content -->
    <section class="content">
        <div class="container">
            <!-- Features -->
            <section class="section" id="features">
                <h2 class="section-title">✨ Key Features</h2>
                <div class="features-grid">
                    <div class="feature-card">
                        <div class="feature-icon">📤</div>
                        <h3>Upload & Share</h3>
                        <p>Easily share study notes in PDF, image, or document format with classmates</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">⭐</div>
                        <h3>Rate & Review</h3>
                        <p>Rate notes 1-5 stars and provide feedback to help peers improve</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🏷️</div>
                        <h3>Tag & Organize</h3>
                        <p>Create personal collections and bookmark notes by subject</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">👥</div>
                        <h3>Study Groups</h3>
                        <p>Form collaborative groups with classmates to share resources</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">🔍</div>
                        <h3>Smart Search</h3>
                        <p>Full-text search across notes with filters for subject and tags</p>
                    </div>
                    <div class="feature-card">
                        <div class="feature-icon">💬</div>
                        <h3>Request Notes</h3>
                        <p>Ask the community for specific notes you can't find</p>
                    </div>
                </div>
            </section>

            <div class="divider"></div>

            <!-- Architecture -->
            <section class="section">
                <h2 class="section-title">🏗️ Architecture</h2>
                <div class="architecture">
                    <pre>┌─────────────────────────────────────────────────┐
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
└─────────────────────────────────────────────────┘</pre>
                </div>
            </section>

            <!-- Tech Stack -->
            <section class="section">
                <h2 class="section-title">🛠️ Tech Stack</h2>
                <div class="tech-stack">
                    <div class="tech-category">
                        <h3>📱 Frontend</h3>
                        <ul class="tech-list">
                            <li>React Native (Expo)</li>
                            <li>TypeScript</li>
                            <li>Expo Router</li>
                            <li>Context API</li>
                            <li>Axios</li>
                        </ul>
                    </div>
                    <div class="tech-category">
                        <h3>⚙️ Backend</h3>
                        <ul class="tech-list">
                            <li>Node.js v18+</li>
                            <li>Express.js</li>
                            <li>MongoDB</li>
                            <li>Mongoose ODM</li>
                            <li>JWT Authentication</li>
                        </ul>
                    </div>
                    <div class="tech-category">
                        <h3>🔧 Tools & Services</h3>
                        <ul class="tech-list">
                            <li>Cloudinary CDN</li>
                            <li>Multer</li>
                            <li>Express Validator</li>
                            <li>Bcryptjs</li>
                            <li>Git & npm</li>
                        </ul>
                    </div>
                </div>
            </section>

            <div class="divider"></div>

            <!-- Database Schema -->
            <section class="section">
                <h2 class="section-title">📊 Database Schema</h2>
                <table class="schema-table">
                    <thead>
                        <tr>
                            <th>Model</th>
                            <th>Purpose</th>
                            <th>Key Fields</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>User</strong></td>
                            <td>Student account & profile</td>
                            <td>name, email, password, university, batch, avatar</td>
                        </tr>
                        <tr>
                            <td><strong>Subject</strong></td>
                            <td>Course/subject tracked</td>
                            <td>name, code, semester, department, createdBy</td>
                        </tr>
                        <tr>
                            <td><strong>Note</strong></td>
                            <td>Shared study material</td>
                            <td>title, fileUrl, subject, uploadedBy, averageRating, tags</td>
                        </tr>
                        <tr>
                            <td><strong>Review</strong></td>
                            <td>Rating & feedback</td>
                            <td>note, reviewer, rating (1-5), comment</td>
                        </tr>
                        <tr>
                            <td><strong>Collection</strong></td>
                            <td>Bookmarked notes</td>
                            <td>name, owner, notes, isPrivate</td>
                        </tr>
                        <tr>
                            <td><strong>StudyGroup</strong></td>
                            <td>Collaborative groups</td>
                            <td>name, subject, members, sharedNotes, privacy</td>
                        </tr>
                        <tr>
                            <td><strong>NoteRequest</strong></td>
                            <td>Community requests</td>
                            <td>title, subject, requestedBy, status, fulfilledByNote</td>
                        </tr>
                    </tbody>
                </table>
            </section>

            <div class="divider"></div>

            <!-- Getting Started -->
            <section class="section" id="getting-started">
                <h2 class="section-title">🚀 Getting Started</h2>
                
                <div class="getting-started">
                    <h3>Prerequisites</h3>
                    <p style="margin: 15px 0; color: #666;">
                        ✓ Node.js v18 or higher<br>
                        ✓ npm or yarn package manager<br>
                        ✓ MongoDB instance (local or Atlas)<br>
                        ✓ Cloudinary account (for image uploads)<br>
                        ✓ Expo Go app (for testing mobile app)
                    </p>

                    <h3 style="margin-top: 40px; margin-bottom: 20px;">Backend Setup</h3>
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h4>Navigate to backend directory</h4>
                            <div class="code-block"><code>cd backend</code></div>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h4>Install dependencies</h4>
                            <div class="code-block"><code>npm install</code></div>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h4>Configure environment variables</h4>
                            <div class="code-block"><code>cp .env.example .env</code></div>
                            <p>Edit .env with your configuration:</p>
                            <div class="code-block"><code>MONGO_URI=mongodb+srv://username:password@cluster...
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_api_key
PORT=5000</code></div>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">4</div>
                        <div class="step-content">
                            <h4>Start the server</h4>
                            <div class="code-block"><code>npm start
# Or for development with auto-reload:
npm run dev</code></div>
                        </div>
                    </div>

                    <h3 style="margin-top: 40px; margin-bottom: 20px;">Mobile App Setup</h3>
                    <div class="step">
                        <div class="step-number">1</div>
                        <div class="step-content">
                            <h4>Navigate to mobile app directory</h4>
                            <div class="code-block"><code>cd mobile-app</code></div>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">2</div>
                        <div class="step-content">
                            <h4>Install dependencies & configure</h4>
                            <div class="code-block"><code>npm install</code></div>
                            <p>Create .env file:</p>
                            <div class="code-block"><code>EXPO_PUBLIC_API_URL=http://your-backend-url:5000/api</code></div>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">3</div>
                        <div class="step-content">
                            <h4>Start Expo development server</h4>
                            <div class="code-block"><code>npm run start</code></div>
                        </div>
                    </div>

                    <div class="step">
                        <div class="step-number">4</div>
                        <div class="step-content">
                            <h4>Run on device/emulator</h4>
                            <div class="code-block"><code>Press 'i' for iOS
Press 'a' for Android
Press 'w' for Web</code></div>
                        </div>
                    </div>
                </div>
            </section>

            <div class="divider"></div>

            <!-- API Endpoints -->
            <section class="section">
                <h2 class="section-title">📡 API Endpoints</h2>
                <p style="text-align: center; color: #666; margin-bottom: 30px;">
                    All endpoints require JWT authentication (except /auth routes)
                </p>

                <div class="endpoints-grid">
                    <div class="endpoint">
                        <span class="endpoint-method">POST</span>
                        <span class="endpoint-method" style="background: #10b981;">AUTH</span>
                        <div class="endpoint-path">/api/auth/register</div>
                        <div class="endpoint-desc">Register new user</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">POST</span>
                        <span class="endpoint-method" style="background: #10b981;">AUTH</span>
                        <div class="endpoint-path">/api/auth/login</div>
                        <div class="endpoint-desc">Login & get JWT token</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">GET</span>
                        <div class="endpoint-path">/api/notes</div>
                        <div class="endpoint-desc">Get all public notes</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">POST</span>
                        <div class="endpoint-path">/api/notes</div>
                        <div class="endpoint-desc">Upload new note</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">GET</span>
                        <div class="endpoint-path">/api/notes/:id</div>
                        <div class="endpoint-desc">Get note details</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method put">PUT</span>
                        <div class="endpoint-path">/api/notes/:id</div>
                        <div class="endpoint-desc">Update note</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method delete">DELETE</span>
                        <div class="endpoint-path">/api/notes/:id</div>
                        <div class="endpoint-desc">Delete note</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">GET</span>
                        <div class="endpoint-path">/api/reviews/:noteId</div>
                        <div class="endpoint-desc">Get reviews for note</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">POST</span>
                        <div class="endpoint-path">/api/reviews/:noteId</div>
                        <div class="endpoint-desc">Add review/rating</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">GET</span>
                        <div class="endpoint-path">/api/collections</div>
                        <div class="endpoint-desc">Get user collections</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">POST</span>
                        <div class="endpoint-path">/api/collections</div>
                        <div class="endpoint-desc">Create collection</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">GET</span>
                        <div class="endpoint-path">/api/groups</div>
                        <div class="endpoint-desc">Get all study groups</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">POST</span>
                        <div class="endpoint-path">/api/groups</div>
                        <div class="endpoint-desc">Create study group</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">GET</span>
                        <div class="endpoint-path">/api/subjects</div>
                        <div class="endpoint-desc">Get all subjects</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">GET</span>
                        <div class="endpoint-path">/api/requests</div>
                        <div class="endpoint-desc">Get open requests</div>
                    </div>

                    <div class="endpoint">
                        <span class="endpoint-method">POST</span>
                        <div class="endpoint-path">/api/requests</div>
                        <div class="endpoint-desc">Create request</div>
                    </div>
                </div>
            </section>

            <div class="divider"></div>

            <!-- Roadmap -->
            <section class="section">
                <h2 class="section-title">🎯 Roadmap</h2>
                <div class="roadmap-items">
                    <div class="roadmap-item">
                        <div class="roadmap-checkbox">☐</div>
                        <span>Real-time chat in study groups (Socket.io)</span>
                    </div>
                    <div class="roadmap-item">
                        <div class="roadmap-checkbox">☐</div>
                        <span>Push notifications for group updates</span>
                    </div>
                    <div class="roadmap-item">
                        <div class="roadmap-checkbox">☐</div>
                        <span>Advanced analytics & study insights</span>
                    </div>
                    <div class="roadmap-item">
                        <div class="roadmap-checkbox">☐</div>
                        <span>Integration with university calendar</span>
                    </div>
                    <div class="roadmap-item">
                        <div class="roadmap-checkbox">☐</div>
                        <span>Offline note access</span>
                    </div>
                    <div class="roadmap-item">
                        <div class="roadmap-checkbox">☐</div>
                        <span>Dark mode UI</span>
                    </div>
                    <div class="roadmap-item">
                        <div class="roadmap-checkbox">☐</div>
                        <span>Multi-language support</span>
                    </div>
                    <div class="roadmap-item">
                        <div class="roadmap-checkbox">☐</div>
                        <span>Admin dashboard</span>
                    </div>
                </div>
            </section>

            <div class="divider"></div>

            <!-- Contributing & Support -->
            <section class="section">
                <h2 class="section-title">🤝 Contributing & Support</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px;">
                    <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                        <h3 style="color: #667eea; margin-bottom: 15px;">📖 How to Contribute</h3>
                        <ol style="color: #666; line-height: 2;">
                            <li>Fork the repository</li>
                            <li>Create a feature branch</li>
                            <li>Commit your changes</li>
                            <li>Push to your fork</li>
                            <li>Create a Pull Request</li>
                        </ol>
                    </div>

                    <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                        <h3 style="color: #667eea; margin-bottom: 15px;">💡 Coding Standards</h3>
                        <ul style="color: #666; line-height: 2;">
                            <li>✓ Use TypeScript for type safety</li>
                            <li>✓ Follow existing code style</li>
                            <li>✓ Add comments for complex logic</li>
                            <li>✓ Test changes before PR</li>
                        </ul>
                    </div>

                    <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                        <h3 style="color: #667eea; margin-bottom: 15px;">🆘 Need Help?</h3>
                        <p style="color: #666; margin-bottom: 15px;">Having issues? Check the documentation or open an issue on GitHub.</p>
                        <ul style="color: #666; line-height: 2;">
                            <li>📚 Read the implementation plan</li>
                            <li>🐛 Report bugs via GitHub Issues</li>
                            <li>💬 Discuss ideas in Discussions</li>
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    </section>

    <!-- Footer -->
    <footer>
        <div class="container">
            <div class="footer-content">
                <div class="footer-section">
                    <h3>📚 UniVault</h3>
                    <p style="opacity: 0.8; margin-top: 10px;">A collaborative student platform for sharing notes and building study groups.</p>
                </div>
                <div class="footer-section">
                    <h3>Quick Links</h3>
                    <a href="#features">Features</a>
                    <a href="#getting-started">Getting Started</a>
                    <a href="#roadmap">Roadmap</a>
                </div>
                <div class="footer-section">
                    <h3>Resources</h3>
                    <a href="#">Implementation Plan</a>
                    <a href="#">API Documentation</a>
                    <a href="#">GitHub Repository</a>
                </div>
                <div class="footer-section">
                    <h3>Community</h3>
                    <a href="#">Report Bug</a>
                    <a href="#">Request Feature</a>
                    <a href="#">Join Discussion</a>
                </div>
            </div>
            <div class="footer-bottom">
                <p>Created with ❤️ for students, by students</p>
                <p style="opacity: 0.8; margin-top: 10px;">Licensed under MIT License © 2024 UniVault</p>
            </div>
        </div>
    </footer>
</body>
</html>