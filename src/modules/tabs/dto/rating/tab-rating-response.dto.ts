import { createZodDto } from 'nestjs-zod';

import { TabRatingResponseSchema } from './tab-rating-response.schema';

export class TabRatingResponseDto extends createZodDto(TabRatingResponseSchema) {}
