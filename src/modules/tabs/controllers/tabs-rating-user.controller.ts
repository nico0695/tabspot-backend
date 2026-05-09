import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '@common/decorators/current-user.decorator';
import { AuthGuard } from '@common/guards/auth.guard';
import { ApiAuthErrors } from '@common/openapi/api-error-responses.decorator';
import { ErrorResponseDto } from '@common/openapi/error-response.dto';
import type { User } from '@src/generated/prisma/client';

import { RateTabDto } from '../dto/rating/rate-tab.dto';
import { TabRatingResponseDto } from '../dto/rating/tab-rating-response.dto';
import type { TabRatingResponse } from '../dto/rating/tab-rating-response.schema';
import { TabRatingService } from '../services/tab-rating.service';

function toTabRatingResponse(rating: {
  tabId: string;
  userId: string;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
}): TabRatingResponse {
  return {
    tabId: rating.tabId,
    userId: rating.userId,
    rating: rating.rating,
    createdAt: rating.createdAt.toISOString(),
    updatedAt: rating.updatedAt.toISOString(),
  };
}

@ApiTags('tabs')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ version: '1' })
export class TabsRatingUserController {
  constructor(private readonly tabRatingService: TabRatingService) {}

  @Post('tabs/:id/rate')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'Rating created or updated', type: TabRatingResponseDto })
  @ApiNotFoundResponse({ description: 'Tab not found', type: ErrorResponseDto })
  @ApiAuthErrors()
  async rate(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: RateTabDto,
  ): Promise<TabRatingResponse> {
    const rating = await this.tabRatingService.rateTab(id, user.id, body.rating);
    return toTabRatingResponse(rating);
  }

  @Get('me/tabs/:id/rating')
  @ApiOkResponse({ description: 'Current user rating for the tab', type: TabRatingResponseDto })
  @ApiNotFoundResponse({ description: 'Rating not found', type: ErrorResponseDto })
  @ApiAuthErrors()
  async getUserRating(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TabRatingResponse> {
    const rating = await this.tabRatingService.getUserRating(id, user.id);
    return toTabRatingResponse(rating);
  }
}
