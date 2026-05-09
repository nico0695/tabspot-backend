import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { ApiAuthErrors } from '@common/openapi/api-error-responses.decorator';
import type { User } from '@src/generated/prisma/client';

import { AuthService } from '../auth.service';
import { MeResponseDto } from '../dto/me-response.dto';
import type { MeResponse } from '../dto/me-response.schema';
import { UpdateMeDto } from '../dto/update-me.dto';

function toMeResponse(user: User): MeResponse {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
  };
}

@ApiTags('auth')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: 'me', version: '1' })
export class MeController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @ApiOkResponse({ description: 'Current authenticated user profile', type: MeResponseDto })
  @ApiAuthErrors()
  me(@CurrentUser() user: User): MeResponse {
    return toMeResponse(user);
  }

  @Patch()
  @ApiOkResponse({ description: 'Profile updated', type: MeResponseDto })
  @ApiAuthErrors()
  async update(@CurrentUser() user: User, @Body() body: UpdateMeDto): Promise<MeResponse> {
    const updated = await this.authService.updateProfile(user.id, body);
    return toMeResponse(updated);
  }
}
