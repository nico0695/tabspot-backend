import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { Roles } from '@common/decorators/roles.decorator';
import { ApiAdminErrors } from '@common/openapi/api-error-responses.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import type { User } from '@src/generated/prisma/client';
import { UserRole } from '@src/generated/prisma/client';

import { BulkImportRequestDto } from '../dto/requests/bulk-import-request.dto';
import type { BulkImportResponse } from '../dto/responses/bulk-import-response.schema';
import { BulkImportResponseDto } from '../dto/responses/bulk-import-response.schema';
import { BulkImportService } from '../services/bulk-import.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin/tabs', version: '1' })
export class AdminBulkImportController {
  constructor(private readonly bulkImportService: BulkImportService) {}

  @Post('bulk-import')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    description: 'Batch processed — per-song results and errors (200 even when songs fail)',
    type: BulkImportResponseDto,
  })
  @ApiAdminErrors()
  async bulkImport(
    @CurrentUser() user: User,
    @Body() body: BulkImportRequestDto,
  ): Promise<BulkImportResponse> {
    return this.bulkImportService.bulkImport(body, user.id);
  }
}
