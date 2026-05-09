import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const AdminDashboardResponseSchema = z.object({
  totalUsers: z.number().int(),
  publishedTabs: z.number().int(),
  pendingTabs: z.number().int(),
  newTabsThisWeek: z.number().int(),
});

export type AdminDashboardResponse = z.infer<typeof AdminDashboardResponseSchema>;

export class AdminDashboardResponseDto extends createZodDto(AdminDashboardResponseSchema) {}
