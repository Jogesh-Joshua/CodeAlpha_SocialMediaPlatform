# Architecture — Nexus Social Media Platform

## Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Runtime    | Node.js 22.x                            |
| Framework  | Express.js 5                            |
| Database   | PostgreSQL (Neon hosted)                |
| Auth       | Custom session tokens (HMAC-SHA256)     |
| Security   | bcryptjs, helmet, rate-limit, CORS      |
| Frontend   | HTML5 / CSS3 / Vanilla JS (SPA pattern) |
| Deployment | Vercel                                  |

## Directory Layout

```
CodeAlpha_SocialMediaPlatform/
├── public/                   Static frontend
│   ├── index.html            SPA shell
│   ├── css/main.css          Design system + components
│   └── js/
│       ├── api.js            Fetch API wrapper
│       ├── auth.js           Auth state management
│       ├── components.js     Reusable UI components
│       ├── pages.js          Page renderers
│       └── app.js            Client router + bootstrap
├── src/
│   ├── app.js                Express app (middleware, routes)
│   ├── server.js             HTTP server entry point
│   ├── routes/
│   │   ├── auth.js           POST /api/auth/*
│   │   ├── posts.js          GET|POST|DELETE /api/posts/*
│   │   ├── users.js          GET|PUT /api/users/*
│   │   └── health.js         GET /api/health
│   ├── middleware/
│   │   ├── auth.js           Session cookie validation
│   │   ├── validate.js       Input validation helpers
│   │   └── errors.js         Global error handler
│   └── db/
│       ├── pool.js           pg Pool + helpers
│       └── queries.js        All parameterised SQL queries
├── db/migrations/
│   └── 001_initial_schema.sql
├── scripts/
│   └── migrate.js            Migration runner
├── tests/
│   ├── setup.js              Jest env setup
│   └── health.test.js        API tests (mocked DB)
├── docs/                     Project documentation
├── .env.example              Environment variable template
├── vercel.json               Vercel deployment config
└── jest.config.js            Test configuration
```

## API Endpoints

### Auth
| Method | Path                | Auth    | Description          |
|--------|---------------------|---------|----------------------|
| POST   | /api/auth/register  | No      | Create account       |
| POST   | /api/auth/login     | No      | Log in               |
| POST   | /api/auth/logout    | Yes     | Log out              |
| GET    | /api/auth/me        | Yes     | Current user         |

### Posts
| Method | Path                              | Auth | Description          |
|--------|-----------------------------------|------|----------------------|
| GET    | /api/posts                        | No   | Global feed (paged)  |
| GET    | /api/posts/following              | Yes  | Following feed       |
| POST   | /api/posts                        | Yes  | Create post          |
| GET    | /api/posts/:id                    | No   | Post + comments      |
| DELETE | /api/posts/:id                    | Yes  | Delete own post      |
| POST   | /api/posts/:id/like               | Yes  | Like post            |
| DELETE | /api/posts/:id/like               | Yes  | Unlike post          |
| GET    | /api/posts/:id/comments           | No   | Get comments         |
| POST   | /api/posts/:id/comments           | Yes  | Add comment          |
| DELETE | /api/posts/:id/comments/:cid      | Yes  | Delete own comment   |

### Users
| Method | Path                              | Auth | Description          |
|--------|-----------------------------------|------|----------------------|
| GET    | /api/users/:username              | No   | Public profile       |
| PUT    | /api/users/me/profile             | Yes  | Edit own profile     |
| GET    | /api/users/:username/posts        | No   | User's posts         |
| POST   | /api/users/:username/follow       | Yes  | Follow user          |
| DELETE | /api/users/:username/follow       | Yes  | Unfollow user        |
| GET    | /api/users/:username/followers    | No   | Follower list        |
| GET    | /api/users/:username/following    | No   | Following list       |

## Security

- Passwords hashed with bcryptjs (12 rounds)
- Session token stored in HttpOnly cookie; only HMAC-SHA256 hash in DB
- Rate limiting on auth endpoints (10 req / 15 min)
- Helmet CSP headers
- Parameterized SQL queries throughout — no string interpolation
- Authorization checks before every write (owner verification)
- Self-follow and duplicate-like/follow prevented at DB constraint level
