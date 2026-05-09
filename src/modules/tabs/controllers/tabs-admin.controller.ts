import { Controller, UseGuards } from '@nestjs/common';

import { Roles } from '@common/decorators/roles.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { UserRole } from '@src/generated/prisma/client';

@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/tabs', version: '1' })
export class TabsAdminController {}
