import { TabStatus } from '@src/generated/prisma/client';

export const TAB_STATUS_TRANSITIONS: Record<TabStatus, TabStatus[]> = {
  [TabStatus.DRAFT]: [TabStatus.PENDING],
  [TabStatus.PENDING]: [TabStatus.PUBLISHED, TabStatus.REJECTED],
  [TabStatus.PUBLISHED]: [],
  [TabStatus.REJECTED]: [TabStatus.PENDING],
};

export function canTransition(from: TabStatus, to: TabStatus): boolean {
  return TAB_STATUS_TRANSITIONS[from].includes(to);
}
