import { createZodDto } from 'nestjs-zod';

import { TabRatingAggregateSchema } from './tab-rating-aggregate.schema';

export class TabRatingAggregateDto extends createZodDto(TabRatingAggregateSchema) {}
