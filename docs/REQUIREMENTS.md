# CodeAlpha Task 2 — Social Media Platform

## Requirements Document

### Assignment Requirements (Original)
1. ✅ User profiles — unique handle, display name, bio, follower/following counts
2. ✅ Posts and comments — create, display, delete; comments on posts
3. ✅ Like and follow system — toggle likes, follow/unfollow users
4. ✅ Frontend — HTML5, CSS3, Vanilla JavaScript
5. ✅ Backend — Express.js (Node.js)
6. ✅ Database — PostgreSQL; stores users, posts, comments, followers, likes, sessions

### Extended MVP Requirements (Phase 0–1)
See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full tech breakdown.

### Out of Scope
- Direct messaging
- Real-time features (WebSockets)
- File/image uploads
- Video/audio content
- Admin dashboard
- Payment or premium features
- Recommendation algorithms
- Stories / reels

### Assumptions
- Text-only posts (max 500 chars)
- Text-only comments (max 300 chars)
- Avatar = initials with auto-generated colour (no upload)
- Deployment target: Vercel (serverless Node)
- Database: Neon (serverless PostgreSQL, SSL required)
- Sessions stored as HMAC-SHA256 token hashes; raw tokens never persisted
