import type { Tab } from '@src/generated/prisma/client';
import { TabStatus } from '@src/generated/prisma/client';

import type { UpdateStatusMeta } from '../ports/tab-repository.port';

export interface NormalizedAdminStatus {
  status: TabStatus;
  meta: UpdateStatusMeta;
}

/**
 * Pure domain function: given a target admin status, derives the status metadata
 * (submittedAt/publishedAt/moderatedByUserId/moderationNotes) to persist.
 *
 * Extracted verbatim from TabsService.normalizeAdminStatus (behavior-preserving).
 */
export function normalizeAdminStatus(
  status: TabStatus | undefined,
  adminUserId: string,
  moderationNotes?: string | null,
  existingTab?: Pick<Tab, 'submittedAt' | 'publishedAt'>,
): NormalizedAdminStatus {
  const targetStatus = status ?? TabStatus.DRAFT;
  const now = new Date();
  const submittedAt = existingTab?.submittedAt ?? now;
  const publishedAt = existingTab?.publishedAt ?? now;

  switch (targetStatus) {
    case TabStatus.DRAFT:
      return {
        status: targetStatus,
        meta: {
          submittedAt: null,
          publishedAt: null,
          moderatedByUserId: null,
          moderationNotes: null,
        },
      };
    case TabStatus.PENDING:
      return {
        status: targetStatus,
        meta: {
          submittedAt,
          publishedAt: null,
          moderatedByUserId: null,
          moderationNotes: null,
        },
      };
    case TabStatus.PUBLISHED:
      return {
        status: targetStatus,
        meta: {
          submittedAt,
          publishedAt,
          moderatedByUserId: adminUserId,
          moderationNotes: null,
        },
      };
    case TabStatus.REJECTED:
      return {
        status: targetStatus,
        meta: {
          submittedAt,
          publishedAt: null,
          moderatedByUserId: adminUserId,
          moderationNotes: moderationNotes ?? null,
        },
      };
  }
}
