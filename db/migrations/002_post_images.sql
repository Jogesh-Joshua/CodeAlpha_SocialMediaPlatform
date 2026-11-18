-- ============================================================
-- Migration 002 — Add image_url to posts
-- CodeAlpha Social Media Platform
-- ============================================================

ALTER TABLE posts
ADD COLUMN IF NOT EXISTS image_url VARCHAR(2048) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_image_url ON posts (image_url) WHERE image_url IS NOT NULL;
