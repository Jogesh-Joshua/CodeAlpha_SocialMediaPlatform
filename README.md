# Nexus — Social Media Platform

A modern, fast, full-stack mini social media platform built for the **CodeAlpha Full Stack Development Internship — Task 2**.

Nexus connects users through posts, comments, likes, and follows, featuring a clean editorial UI built with Vanilla HTML5, CSS3, and JavaScript on top of a robust Node.js / Express.js 5 REST backend backed by a serverless PostgreSQL database on Neon.

---

## Features

- **User Authentication:** Registration, login, session persistence via signed `HttpOnly` cookies, duplicate email & username prevention, and salted bcrypt password hashing.
- **User Profiles:** Unique handle/username, custom display name, bio, account creation date, followers count, following count, profile post list, and profile editing.
- **Posts & Feed:** Create text posts (up to 500 characters), global chronological feed (newest first) with pagination, author attribution, relative timestamps, and owner-only post deletion.
- **Following Feed:** Authenticated view filtering posts exclusively from authors you follow.
- **Comments:** Threaded comments on posts (up to 300 characters), author timestamps, and owner-only comment deletion.
- **Like System:** Instant like/unlike interactions with real-time counter updates, duplicate-like prevention enforced via composite primary key constraints.
- **Follow System:** Follow/unfollow other users, self-follow prevention, duplicate follow protection via database constraints, and dynamic follower/following counters.
- **Responsive Interface:** Modern, polished editorial interface designed from scratch (no bloated UI frameworks), adapting smoothly from desktop (3 columns) to tablet (2 columns) and mobile devices.

---

## Technology Stack

### Frontend
- **HTML5:** Semantic document structure and accessible forms.
- **CSS3:** Custom design system, CSS custom properties (variables), Flexbox, CSS Grid, and responsive media queries.
- **Vanilla JavaScript:** Single-Page Application (SPA) architecture with modular client-side routing, state observers, dynamic DOM rendering, and the Fetch API.

### Backend
- **Node.js (>=20.x):** Server execution environment.
- **Express.js 5:** RESTful API architecture and middleware pipeline.
- **Security:** `bcryptjs` password hashing, `helmet` security headers with Content Security Policy (CSP), `cookie-parser` for HttpOnly session management, `express-rate-limit` against brute-force attacks, and CORS configuration.

### Database
- **PostgreSQL on Neon:** Serverless relational database with pooled SSL connections.
- **Integrity & Constraints:** Relational foreign keys with `ON DELETE CASCADE`, composite uniqueness (`likes_pk`, `follows_pk`), check constraints (username regex, content length, `follows_no_self`), automated `updated_at` triggers, and composite query indexes.
- **Migration Ledger:** Dedicated `schema_migrations` tracking table for automated, idempotent schema migrations.

---

## Project Structure

```
CodeAlpha_SocialMediaPlatform/
├── api/
│   └── index.js              # Vercel serverless function entrypoint
├── db/
│   └── migrations/           # SQL migration scripts
│       └── 001_initial_schema.sql
├── docs/                     # Project documentation & test reports
│   ├── ACCEPTANCE.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── REQUIREMENTS.md
│   ├── PHASE_2_REPORT.md
│   └── PHASE_3_REPORT.md
├── public/                   # Static frontend assets
│   ├── css/
│   │   └── main.css          # Design system & responsive styles
│   ├── js/
│   │   ├── api.js            # Fetch wrapper for API calls
│   │   ├── app.js            # Client router and initialization
│   │   ├── auth.js           # Authentication state manager
│   │   ├── components.js     # UI components (PostCard, Avatar, Composer, etc.)
│   │   └── pages.js          # Route page renderers
│   └── index.html            # SPA application shell
├── scripts/
│   ├── migrate.js            # Idempotent migration runner
│   └── verify_db.js          # Database schema verification utility
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
│   │   ├── posts.js          # /api/posts routes
│   │   └── users.js          # /api/users routes
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
- Node.js (v20+ recommended)
- npm (v10+)
- A PostgreSQL database (e.g., [Neon](https://neon.tech))

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Jogesh-Joshua/CodeAlpha_SocialMediaPlatform.git
cd CodeAlpha_SocialMediaPlatform
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Edit `.env` and fill in your connection details:
```ini
NODE_ENV=development
PORT=3000

# PostgreSQL Connection String (Neon)
DATABASE_URL=postgresql://user:password@host.neon.tech/neondb?sslmode=require

# Strong random string (32+ characters)
SESSION_SECRET=your_long_session_secret_here

BCRYPT_ROUNDS=12
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=100
CORS_ORIGIN=http://localhost:3000
```

### 3. Run Database Migrations
Execute the automated migration runner to create tables, constraints, indexes, and triggers:
```bash
npm run migrate
```

Verify database objects anytime:
```bash
node scripts/verify_db.js
```

### 4. Start the Application
Start the development server with auto-reload:
```bash
npm run dev
```

Or start the production server:
```bash
npm start
```
Visit `http://localhost:3000` in your browser.

---

## Running Tests

### Unit Tests (Isolated Mock Database)
```bash
npm test tests/health.test.js
```

### Full Integration Tests (Live Database)
```bash
npm test
```
Runs all 60 tests across authentication, posts, comments, likes, follows, and profiles.

### Full End-to-End User Journey Audit
```bash
npm run test:e2e
```
Runs 68 automated browser user lifecycle checks against the live server.

---

## API Overview

### Health
- `GET /api/health` — Service health status and live database ping.

### Authentication
- `POST /api/auth/register` — Create a new account (`username`, `display_name`, `email`, `password`).
- `POST /api/auth/login` — Sign in (`login`, `password`).
- `POST /api/auth/logout` — Invalidate current session and clear cookie.
- `GET /api/auth/me` — Retrieve currently authenticated user.

### Posts
- `GET /api/posts?page=1` — Retrieve paginated global feed.
- `GET /api/posts/following?page=1` — Retrieve feed of posts by followed users.
- `POST /api/posts` — Create a new post (`content`).
- `GET /api/posts/:id` — Retrieve post by ID with comments.
- `DELETE /api/posts/:id` — Delete own post.
- `POST /api/posts/:id/like` — Like a post.
- `DELETE /api/posts/:id/like` — Unlike a post.
- `GET /api/posts/:id/comments` — Retrieve comments for a post.
- `POST /api/posts/:id/comments` — Add a comment (`content`).
- `DELETE /api/posts/:id/comments/:cid` — Delete own comment.

### Users & Profiles
- `GET /api/users/:username` — Retrieve public profile with follower/following counts.
- `PUT /api/users/me/profile` — Update own profile (`display_name`, `bio`).
- `GET /api/users/:username/posts` — Retrieve posts authored by user.
- `POST /api/users/:username/follow` — Follow user.
- `DELETE /api/users/:username/follow` — Unfollow user.
- `GET /api/users/:username/followers` — Retrieve follower list.
- `GET /api/users/:username/following` — Retrieve following list.

---

## Deployment

The application is configured for deployment on **Vercel**:
- Static frontend files in `public/` are served with caching headers.
- Backend API is served via `api/index.js` using `@vercel/node`.
- Client-side routes rewrite to `/index.html`.

Required Production Environment Variables on Vercel:
- `NODE_ENV=production`
- `DATABASE_URL` (Neon PostgreSQL connection string with SSL)
- `SESSION_SECRET` (Production session secret)
