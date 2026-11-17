# Database Schema — Nexus Social Media Platform

## Entity Relationship Diagram

```
users ──┬── posts ──── comments
        │        └─── likes (user_id FK)
        └── sessions
        └── follows (follower_id, following_id FK to users)
```

## Tables

### users
| Column        | Type         | Constraints                                       |
|---------------|--------------|---------------------------------------------------|
| id            | UUID PK      | DEFAULT gen_random_uuid()                         |
| username      | VARCHAR(32)  | UNIQUE NOT NULL; regex ^[a-zA-Z0-9_]{3,32}$      |
| display_name  | VARCHAR(64)  | NOT NULL                                          |
| email         | VARCHAR(254) | UNIQUE NOT NULL; non-empty                        |
| password_hash | TEXT         | NOT NULL (bcrypt)                                 |
| bio           | VARCHAR(300) | NOT NULL DEFAULT ''                               |
| created_at    | TIMESTAMPTZ  | NOT NULL DEFAULT NOW()                            |
| updated_at    | TIMESTAMPTZ  | NOT NULL DEFAULT NOW() (auto via trigger)         |

Indexes: username, email

### sessions
| Column     | Type        | Constraints                                |
|------------|-------------|--------------------------------------------|
| id         | UUID PK     | DEFAULT gen_random_uuid()                  |
| user_id    | UUID FK     | → users(id) ON DELETE CASCADE              |
| token_hash | TEXT        | UNIQUE NOT NULL (HMAC-SHA256 of raw token) |
| expires_at | TIMESTAMPTZ | NOT NULL                                   |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT NOW()                     |

Indexes: user_id, token_hash, expires_at

### posts
| Column    | Type         | Constraints                                   |
|-----------|--------------|-----------------------------------------------|
| id        | UUID PK      | DEFAULT gen_random_uuid()                     |
| author_id | UUID FK      | → users(id) ON DELETE CASCADE                 |
| content   | VARCHAR(500) | NOT NULL; TRIM(content) <> ''                 |
| created_at| TIMESTAMPTZ  | NOT NULL DEFAULT NOW()                        |
| updated_at| TIMESTAMPTZ  | NOT NULL DEFAULT NOW() (auto via trigger)     |

Indexes: author_id, created_at DESC

### comments
| Column    | Type         | Constraints                                   |
|-----------|--------------|-----------------------------------------------|
| id        | UUID PK      | DEFAULT gen_random_uuid()                     |
| post_id   | UUID FK      | → posts(id) ON DELETE CASCADE                 |
| author_id | UUID FK      | → users(id) ON DELETE CASCADE                 |
| content   | VARCHAR(300) | NOT NULL; TRIM(content) <> ''                 |
| created_at| TIMESTAMPTZ  | NOT NULL DEFAULT NOW()                        |
| updated_at| TIMESTAMPTZ  | NOT NULL DEFAULT NOW() (auto via trigger)     |

Indexes: post_id, author_id, created_at

### likes
| Column    | Type        | Constraints                                   |
|-----------|-------------|-----------------------------------------------|
| post_id   | UUID FK     | → posts(id) ON DELETE CASCADE                 |
| user_id   | UUID FK     | → users(id) ON DELETE CASCADE                 |
| created_at| TIMESTAMPTZ | NOT NULL DEFAULT NOW()                        |

Composite UNIQUE(post_id, user_id) prevents duplicate likes.

### follows
| Column      | Type        | Constraints                                 |
|-------------|-------------|---------------------------------------------|
| follower_id | UUID FK     | → users(id) ON DELETE CASCADE               |
| following_id| UUID FK     | → users(id) ON DELETE CASCADE               |
| created_at  | TIMESTAMPTZ | NOT NULL DEFAULT NOW()                      |

Composite UNIQUE(follower_id, following_id) prevents duplicate follows.
CHECK(follower_id <> following_id) prevents self-following.

## Migration Status
Migration 001 (`001_initial_schema.sql`) is ready.
Run `node scripts/migrate.js` after configuring DATABASE_URL in `.env`.
