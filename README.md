# Nexus — Social Media Platform

A modern, fast, full-stack social media platform built for the **CodeAlpha Full Stack Development Internship — Task 2**.

Nexus connects creators, engineers, and thinkers through photo and text posts, comments, likes, follows, and topic discovery. It features a clean, responsive three-column editorial interface built with Vanilla HTML5, CSS3, and JavaScript on top of a robust Node.js / Express.js 5 REST backend backed by a serverless PostgreSQL database on Neon.

---

## Features

- **Visual Social Experience & Photo Sharing:** Share rich image posts with captions and hashtags. Integrated click-to-zoom Lightbox viewer for high-resolution photo exploration.
- **Three-Column Desktop Layout:**
  - **Left Sidebar:** Brand navigation (Home, Explore, Following, Profile) and active creator profile card.
  - **Center Feed:** Top tabs ("For You" and "Following"), rich post composer with quick-sample photo chips and image URL preview, and chronological post stream.
  - **Right Sidebar:** Live database-backed "Discover People" recommendations, "Trending Topics" with post counts, "Community Activity" comments, and platform overview.
- **Explore & Discovery Engine:** Real-time search across posts, hashtags (`#webdev`, `#photography`), and creators. Filter tabs for "All Posts" and "📸 Photos" with a responsive photo gallery grid.
- **User Authentication:** Registration, login, session persistence via `HttpOnly` cookies carrying a 256-bit cryptographically secure random token (hashed server-side with HMAC-SHA256 and stored in PostgreSQL), duplicate email & username prevention, and salted bcrypt password hashing.
- **User Profiles:** Unique handle/username, custom display name, bio, account creation date, followers count, following count, profile post list, avatar image support, and profile editing.
- **Posts & Feed:** Create photo and text posts (up to 500 characters), global chronological feed with pagination, author attribution, relative timestamps, and owner-only post deletion.
- **Following Feed:** Authenticated view filtering posts exclusively from creators you follow.
- **Comments:** Threaded comments on posts (up to 300 characters), author timestamps, and owner-only comment deletion.
- **Like System:** Instant like/unlike interactions with real-time counter updates, duplicate-like prevention enforced via composite primary key constraints.
- **Follow System:** Follow/unfollow other users, self-follow prevention, duplicate follow protection via database constraints, and dynamic follower/following counters.
- **Responsive Interface:** Modern, polished editorial interface designed from scratch (no bloated UI frameworks), adapting smoothly from desktop (3 columns) to tablet (2 columns) and mobile devices.

---

## Technology Stack

### Frontend
- **HTML5:** Semantic document structure and accessible forms.
- **CSS3:** Custom design system, CSS custom properties (variables), Flexbox, CSS Grid, Lightbox modal, and responsive media queries.
- **Vanilla JavaScript:** Single-Page Application (SPA) architecture with modular client-side routing, state observers, dynamic DOM rendering, and the Fetch API.

### Backend
- **Node.js (>=20.x):** Server execution environment.
- **Express.js 5:** RESTful API architecture and middleware pipeline.
- **Security:** `bcryptjs` password hashing, `helmet` security headers with Content Security Policy (CSP), `cookie-parser` for HttpOnly session management, `express-rate-limit` against brute-force attacks, and CORS configuration.

### Database
- **PostgreSQL on Neon:** Serverless relational database with pooled SSL connections.
- **Integrity & Constraints:** Relational foreign keys with `ON DELETE CASCADE`, composite uniqueness (`likes_pk`, `follows_pk`), check constraints (username regex, content length, `follows_no_self`), automated `updated_at` triggers, and composite query indexes.
- **Migration Ledger:** Dedicated `schema_migrations` tracking table with migrations `001_initial_schema.sql` and `002_post_images.sql`.

---

## Project Structure

```
CodeAlpha_SocialMediaPlatform/
├── api/
│   └── index.js              # Vercel serverless function entrypoint
├── db/
│   └── migrations/           # SQL migration scripts
│       ├── 001_initial_schema.sql
│       └── 002_post_images.sql
├── docs/                     # Project documentation & test reports
│   ├── ACCEPTANCE.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── REQUIREMENTS.md
│   ├── PHASE_2_REPORT.md
│   ├── PHASE_3_REPORT.md
│   ├── FINAL_SUBMISSION_AUDIT.md
│   └── VISUAL_UPGRADE_REPORT.md
├── public/                   # Static frontend assets
│   ├── css/
│   │   └── main.css          # Design system, 3-column shell & responsive styles
│   ├── images/
│   │   ├── avatars/          # User avatar portraits (8 creator portraits)
│   │   └── demo/             # Web-optimized high-resolution demo photos (10 photos)
│   ├── js/
│   │   ├── api.js            # Fetch wrapper for REST API endpoints
│   │   ├── app.js            # Client router, history, and app bootstrap
│   │   ├── auth.js           # Authentication state manager
│   │   ├── components.js     # UI components (PostCard, Avatar, Composer, Lightbox, etc.)
│   │   └── pages.js          # Route page renderers (feed, explore, profile, postDetail)
│   └── index.html            # SPA application shell
├── scripts/
│   ├── migrate.js            # Idempotent migration runner
│   ├── seed_demo.js          # Realistic demo content seeder
│   ├── verify_db.js          # Database schema verification utility
│   └── verify_e2e_journey.js # API-level E2E user journey audit suite (68 assertions)
├── src/
│   ├── db/
│   │   ├── pool.js           # PostgreSQL connection pool configuration
│   │   └── queries.js        # Parameterized SQL query abstractions
│   ├── middleware/
│   │   ├── auth.js           # Session authentication & guard middleware
│   │   ├── errors.js         # Centralized error & 404 handler
│   │   └── validate.js       # Input validation rules
│   ├── routes/
│   │   ├── auth.js           # /api/auth routes
│   │   ├── health.js         # /api/health monitoring endpoint
│   │   ├── posts.js          # /api/posts routes (feed, explore, trending, activity)
│   │   └── users.js          # /api/users routes (profile, suggestions, follow)
│   ├── app.js                # Express app setup & middleware stack
│   └── server.js             # Standalone HTTP server entrypoint
├── tests/
│   ├── health.test.js        # Unit tests & API route validation (mocked DB)
│   ├── integration.test.js   # 49 live database integration tests
│   └── setup.js              # Test environment bootstrap
├── .env.example              # Environment variables template
├── .gitignore                # Git exclusions (.env, node_modules, etc.)
├── jest.config.js            # Jest testing configuration
├── package.json              # Project dependencies & scripts
├── vercel.json               # Vercel deployment configuration
└── README.md                 # Project documentation
```

---

## Setup & Local Installation

### Prerequisites
- Node.js >= 20.x
- A Neon PostgreSQL database connection string (`DATABASE_URL`)

### 1. Clone the repository
```bash
git clone https://github.com/Jogesh-Joshua/CodeAlpha_SocialMediaPlatform.git
cd CodeAlpha_SocialMediaPlatform
```

### 2. Install dependencies
```bash
npm install
```

### 3. Environment configuration
Copy `.env.example` to `.env` and provide your credentials:
```bash
cp .env.example .env
```
Fill in `.env`:
```ini
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@ep-host.region.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=your_development_session_secret_min_32_characters
```

### 4. Run database migrations
```bash
npm run migrate
```

### 5. Seed realistic community demo content (Optional)
```bash
npm run seed:demo
```
This seeds 8 distinct creator profiles, 10 high-resolution photo posts, 4 discussion posts, 18 comments, 61 likes, and 24 follow relationships.

### 6. Verify database objects
```bash
npm run verify:db
```

### 7. Run test suites
```bash
# Run unit & live integration tests
npm test

# Run full API E2E user journey verification (68 assertions)
npm run verify:e2e
```

### 8. Start development server
```bash
npm run dev
# Or production server
npm start
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quality & Verification Summary

| Category | Target | Verified Status |
| :--- | :--- | :--- |
| **Jest Test Suite** | Unit & Integration | **60 / 60 PASS** (100%) |
| **API E2E User Journey** | Complete flow audit | **68 / 68 PASS** (100%) |
| **Database Schema** | Neon PostgreSQL | **7 tables, 55 constraints, 25 indexes, 3 triggers** |
| **Image & Media Posts** | Local & HTTPS URLs | Verified with responsive viewer & Lightbox |
| **Security Headers** | Helmet & CSP | Verified |
| **Authentication** | HttpOnly Cookies & Bcrypt | Verified |

---

## License

This project is licensed under the MIT License — created for the **CodeAlpha Full Stack Development Internship**.
