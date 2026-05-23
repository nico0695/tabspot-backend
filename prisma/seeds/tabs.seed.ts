import { createHash } from 'node:crypto';

import type { PrismaClient, User } from '../../src/generated/prisma/client';
import {
  Difficulty,
  Instrument,
  TabStatus,
  TabType,
  UserRole,
  UserStatus,
} from '../../src/generated/prisma/client';

import type { ChordProFixture } from './fixtures';

export interface TabsSeedResult {
  count: number;
  slugs: string[];
}

interface SeedUserInput {
  supabaseAuthId: string;
  email: string;
  displayName: string;
  role: UserRole;
}

const BASE_CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

function stableUuid(seed: string): string {
  const hex = createHash('sha256').update(seed).digest('hex');
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(18, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function inferTabType(content: string): TabType {
  const hasTabBlock = /\{start_of_tab\}/i.test(content);
  const hasChordMarks = /\[[^\]\n]{1,20}\]/.test(content);

  if (hasTabBlock && hasChordMarks) {
    return TabType.MIXED;
  }

  if (hasTabBlock) {
    return TabType.TAB;
  }

  return TabType.CHORDS;
}

function inferInstrument(content: string): Instrument {
  const hasBassTab =
    /(^|\n)\s*G\s*\|/i.test(content) &&
    /(^|\n)\s*D\s*\|/i.test(content) &&
    /(^|\n)\s*A\s*\|/i.test(content) &&
    /(^|\n)\s*E\s*\|/i.test(content) &&
    !/(^|\n)\s*B\s*\|/i.test(content);

  return hasBassTab ? Instrument.BASS : Instrument.GUITAR;
}

function inferDifficulty(tabType: TabType): Difficulty {
  return tabType === TabType.CHORDS ? Difficulty.BEGINNER : Difficulty.INTERMEDIATE;
}

async function upsertSeedUser(prisma: PrismaClient, input: SeedUserInput): Promise<User> {
  return prisma.user.upsert({
    where: { supabaseAuthId: input.supabaseAuthId },
    update: {
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      status: UserStatus.ACTIVE,
      blockedAt: null,
    },
    create: {
      supabaseAuthId: input.supabaseAuthId,
      email: input.email,
      displayName: input.displayName,
      role: input.role,
      status: UserStatus.ACTIVE,
      blockedAt: null,
    },
  });
}

export async function seedTabs(
  prisma: PrismaClient,
  fixtures: readonly ChordProFixture[],
): Promise<TabsSeedResult> {
  const author = await upsertSeedUser(prisma, {
    supabaseAuthId: stableUuid('tabspot-seed-author'),
    email: 'seed.author@tabspot.dev',
    displayName: 'Seed Author',
    role: UserRole.USER,
  });
  const moderator = await upsertSeedUser(prisma, {
    supabaseAuthId: stableUuid('tabspot-seed-admin'),
    email: 'seed.admin@tabspot.dev',
    displayName: 'Seed Admin',
    role: UserRole.ADMIN,
  });

  for (const [index, entry] of fixtures.entries()) {
    const artist = await prisma.artist.findUniqueOrThrow({ where: { slug: entry.artistSlug } });
    const song = await prisma.song.findUniqueOrThrow({
      where: { artistId_slug: { artistId: artist.id, slug: entry.songSlug } },
    });
    const tabType = inferTabType(entry.content);
    const createdAt = addDays(BASE_CREATED_AT, index);
    const submittedAt = addDays(createdAt, 1);
    const publishedAt = addDays(createdAt, 2);

    await prisma.tab.upsert({
      where: { id: stableUuid(`tab:${entry.artistSlug}/${entry.songSlug}`) },
      update: {
        songId: song.id,
        authorUserId: author.id,
        titleOverride: null,
        content: entry.content,
        tabType,
        instrument: inferInstrument(entry.content),
        difficulty: inferDifficulty(tabType),
        status: TabStatus.PUBLISHED,
        submittedAt,
        publishedAt,
        moderatedByUserId: moderator.id,
        moderationNotes: null,
        versionNumber: 1,
        createdAt,
        deletedAt: null,
      },
      create: {
        id: stableUuid(`tab:${entry.artistSlug}/${entry.songSlug}`),
        songId: song.id,
        authorUserId: author.id,
        titleOverride: null,
        content: entry.content,
        tabType,
        instrument: inferInstrument(entry.content),
        difficulty: inferDifficulty(tabType),
        status: TabStatus.PUBLISHED,
        submittedAt,
        publishedAt,
        moderatedByUserId: moderator.id,
        moderationNotes: null,
        versionNumber: 1,
        createdAt,
        deletedAt: null,
      },
    });
  }

  return {
    count: fixtures.length,
    slugs: fixtures.map((entry) => `${entry.artistSlug}/${entry.songSlug}`),
  };
}
