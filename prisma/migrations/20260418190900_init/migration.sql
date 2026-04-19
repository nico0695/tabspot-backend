-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enums
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BLOCKED');

CREATE TYPE "TabType" AS ENUM ('CHORDS', 'TAB', 'MIXED');

CREATE TYPE "Instrument" AS ENUM ('GUITAR', 'BASS', 'UKULELE', 'PIANO');

CREATE TYPE "Difficulty" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

CREATE TYPE "TabStatus" AS ENUM ('DRAFT', 'PENDING', 'PUBLISHED', 'REJECTED');

-- Tables
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "supabase_auth_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "blocked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "artists" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sort_name" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "artists_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "genres" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "songs" (
    "id" UUID NOT NULL,
    "artist_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subtitle" TEXT,
    "release_year" SMALLINT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "songs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "song_genres" (
    "song_id" UUID NOT NULL,
    "genre_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "song_genres_pkey" PRIMARY KEY ("song_id","genre_id")
);

CREATE TABLE "tabs" (
    "id" UUID NOT NULL,
    "song_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "title_override" TEXT,
    "content" TEXT NOT NULL,
    "tab_type" "TabType" NOT NULL,
    "instrument" "Instrument" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "status" "TabStatus" NOT NULL DEFAULT 'DRAFT',
    "submitted_at" TIMESTAMPTZ,
    "published_at" TIMESTAMPTZ,
    "moderated_by_user_id" UUID,
    "moderation_notes" TEXT,
    "version_number" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "tabs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tab_ratings" (
    "id" UUID NOT NULL,
    "tab_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "rating" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tab_ratings_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "users_supabase_auth_id_key" ON "users"("supabase_auth_id");
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_idx" ON "users"("role");
CREATE INDEX "users_status_idx" ON "users"("status");

CREATE UNIQUE INDEX "artists_slug_key" ON "artists"("slug");
CREATE INDEX "artists_deleted_at_idx" ON "artists"("deleted_at");
CREATE INDEX "artists_name_gin_idx" ON "artists" USING gin (name gin_trgm_ops);

CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");
CREATE INDEX "genres_deleted_at_idx" ON "genres"("deleted_at");

CREATE INDEX "songs_artist_id_idx" ON "songs"("artist_id");
CREATE INDEX "songs_deleted_at_idx" ON "songs"("deleted_at");
CREATE INDEX "songs_title_gin_idx" ON "songs" USING gin (title gin_trgm_ops);
CREATE UNIQUE INDEX "songs_artist_id_slug_key" ON "songs"("artist_id", "slug");

CREATE INDEX "song_genres_genre_id_song_id_idx" ON "song_genres"("genre_id", "song_id");

CREATE INDEX "tabs_song_id_idx" ON "tabs"("song_id");
CREATE INDEX "tabs_author_user_id_idx" ON "tabs"("author_user_id");
CREATE INDEX "tabs_tab_type_idx" ON "tabs"("tab_type");
CREATE INDEX "tabs_instrument_idx" ON "tabs"("instrument");
CREATE INDEX "tabs_difficulty_idx" ON "tabs"("difficulty");
CREATE INDEX "tabs_deleted_at_idx" ON "tabs"("deleted_at");
CREATE INDEX "tabs_status_deleted_at_created_at_idx" ON "tabs"("status", "deleted_at", "created_at");
CREATE INDEX "tabs_song_id_status_idx" ON "tabs"("song_id", "status");

CREATE INDEX "tab_ratings_user_id_idx" ON "tab_ratings"("user_id");
CREATE INDEX "tab_ratings_tab_id_idx" ON "tab_ratings"("tab_id");
CREATE UNIQUE INDEX "tab_ratings_tab_id_user_id_key" ON "tab_ratings"("tab_id", "user_id");

-- Foreign Keys
ALTER TABLE "songs" ADD CONSTRAINT "songs_artist_id_fkey" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "song_genres" ADD CONSTRAINT "song_genres_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "song_genres" ADD CONSTRAINT "song_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tabs" ADD CONSTRAINT "tabs_song_id_fkey" FOREIGN KEY ("song_id") REFERENCES "songs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tabs" ADD CONSTRAINT "tabs_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "tabs" ADD CONSTRAINT "tabs_moderated_by_user_id_fkey" FOREIGN KEY ("moderated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "tab_ratings" ADD CONSTRAINT "tab_ratings_tab_id_fkey" FOREIGN KEY ("tab_id") REFERENCES "tabs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tab_ratings" ADD CONSTRAINT "tab_ratings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Check Constraints
ALTER TABLE "tab_ratings" ADD CONSTRAINT "tab_ratings_rating_check"
  CHECK (rating BETWEEN 1 AND 5);

ALTER TABLE "tabs" ADD CONSTRAINT "tabs_version_number_check"
  CHECK (version_number >= 1);

ALTER TABLE "tabs" ADD CONSTRAINT "tabs_published_at_check"
  CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL);
