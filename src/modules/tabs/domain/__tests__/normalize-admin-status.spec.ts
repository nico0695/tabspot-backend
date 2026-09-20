jest.mock(
  '@prisma/client/runtime/query_compiler_fast_bg.postgresql.mjs',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
    return require('@prisma/client/runtime/query_compiler_fast_bg.postgresql.js');
  },
  { virtual: true },
);
jest.mock(
  '@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.mjs',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-return
    return require('@prisma/client/runtime/query_compiler_fast_bg.postgresql.wasm-base64.js');
  },
  { virtual: true },
);

import { TabStatus } from '@src/generated/prisma/client';

import { normalizeAdminStatus } from '../normalize-admin-status';

const ADMIN_ID = 'admin-1';

describe('normalizeAdminStatus', () => {
  describe('DRAFT', () => {
    it('clears all status metadata', (): void => {
      const result = normalizeAdminStatus(TabStatus.DRAFT, ADMIN_ID);

      expect(result.status).toBe(TabStatus.DRAFT);
      expect(result.meta).toEqual({
        submittedAt: null,
        publishedAt: null,
        moderatedByUserId: null,
        moderationNotes: null,
      });
    });

    it('defaults to DRAFT when status is undefined', (): void => {
      const result = normalizeAdminStatus(undefined, ADMIN_ID);

      expect(result.status).toBe(TabStatus.DRAFT);
      expect(result.meta).toEqual({
        submittedAt: null,
        publishedAt: null,
        moderatedByUserId: null,
        moderationNotes: null,
      });
    });

    it('ignores moderationNotes and existing timestamps', (): void => {
      const existing = { submittedAt: new Date('2026-01-01'), publishedAt: new Date('2026-01-02') };

      const result = normalizeAdminStatus(TabStatus.DRAFT, ADMIN_ID, 'notes', existing);

      expect(result.meta.submittedAt).toBeNull();
      expect(result.meta.publishedAt).toBeNull();
      expect(result.meta.moderationNotes).toBeNull();
    });
  });

  describe('PENDING', () => {
    it('sets submittedAt to now when no existing tab is provided', (): void => {
      const before = Date.now();
      const result = normalizeAdminStatus(TabStatus.PENDING, ADMIN_ID);
      const after = Date.now();

      expect(result.status).toBe(TabStatus.PENDING);
      expect(result.meta.submittedAt).toBeInstanceOf(Date);
      const submittedAt = (result.meta.submittedAt as Date).getTime();
      expect(submittedAt).toBeGreaterThanOrEqual(before);
      expect(submittedAt).toBeLessThanOrEqual(after);
      expect(result.meta.publishedAt).toBeNull();
      expect(result.meta.moderatedByUserId).toBeNull();
      expect(result.meta.moderationNotes).toBeNull();
    });

    it('preserves the existing submittedAt', (): void => {
      const submittedAt = new Date('2026-01-01T10:00:00Z');

      const result = normalizeAdminStatus(TabStatus.PENDING, ADMIN_ID, null, {
        submittedAt,
        publishedAt: null,
      });

      expect(result.meta.submittedAt).toBe(submittedAt);
      expect(result.meta.publishedAt).toBeNull();
    });
  });

  describe('PUBLISHED', () => {
    it('sets submittedAt, publishedAt, and moderatedByUserId', (): void => {
      const result = normalizeAdminStatus(TabStatus.PUBLISHED, ADMIN_ID);

      expect(result.status).toBe(TabStatus.PUBLISHED);
      expect(result.meta.submittedAt).toBeInstanceOf(Date);
      expect(result.meta.publishedAt).toBeInstanceOf(Date);
      expect(result.meta.moderatedByUserId).toBe(ADMIN_ID);
      expect(result.meta.moderationNotes).toBeNull();
    });

    it('preserves existing submittedAt and publishedAt', (): void => {
      const submittedAt = new Date('2026-01-01T10:00:00Z');
      const publishedAt = new Date('2026-01-02T10:00:00Z');

      const result = normalizeAdminStatus(TabStatus.PUBLISHED, ADMIN_ID, null, {
        submittedAt,
        publishedAt,
      });

      expect(result.meta.submittedAt).toBe(submittedAt);
      expect(result.meta.publishedAt).toBe(publishedAt);
    });

    it('clears moderationNotes even when provided', (): void => {
      const result = normalizeAdminStatus(TabStatus.PUBLISHED, ADMIN_ID, 'should be dropped');

      expect(result.meta.moderationNotes).toBeNull();
    });
  });

  describe('REJECTED', () => {
    it('sets submittedAt, moderatedByUserId, and moderationNotes; clears publishedAt', (): void => {
      const result = normalizeAdminStatus(TabStatus.REJECTED, ADMIN_ID, 'needs work');

      expect(result.status).toBe(TabStatus.REJECTED);
      expect(result.meta.submittedAt).toBeInstanceOf(Date);
      expect(result.meta.publishedAt).toBeNull();
      expect(result.meta.moderatedByUserId).toBe(ADMIN_ID);
      expect(result.meta.moderationNotes).toBe('needs work');
    });

    it('defaults moderationNotes to null when undefined or null', (): void => {
      expect(normalizeAdminStatus(TabStatus.REJECTED, ADMIN_ID).meta.moderationNotes).toBeNull();
      expect(
        normalizeAdminStatus(TabStatus.REJECTED, ADMIN_ID, null).meta.moderationNotes,
      ).toBeNull();
    });

    it('preserves existing submittedAt but always clears publishedAt', (): void => {
      const submittedAt = new Date('2026-01-01T10:00:00Z');
      const publishedAt = new Date('2026-01-02T10:00:00Z');

      const result = normalizeAdminStatus(TabStatus.REJECTED, ADMIN_ID, 'notes', {
        submittedAt,
        publishedAt,
      });

      expect(result.meta.submittedAt).toBe(submittedAt);
      expect(result.meta.publishedAt).toBeNull();
    });
  });
});
