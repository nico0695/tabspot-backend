import { Module } from '@nestjs/common';

import { AuthModule } from '@modules/auth/auth.module';

import { TabsPublicController } from './controllers/tabs-public.controller';
import { TabsRatingPublicController } from './controllers/tabs-rating-public.controller';
import { TabsRatingUserController } from './controllers/tabs-rating-user.controller';
import { TabsUserController } from './controllers/tabs-user.controller';
import { TAB_REPOSITORY } from './ports/tab-repository.port';
import { PrismaTabRepository } from './repositories/prisma-tab.repository';
import { TabRatingRepository } from './repositories/tab-rating.repository';
import { TabRatingService } from './services/tab-rating.service';
import { TabsService } from './tabs.service';
import { CreateTabUseCase } from './use-cases/create-tab.use-case';
import { PublishTabUseCase } from './use-cases/publish-tab.use-case';
import { RejectTabUseCase } from './use-cases/reject-tab.use-case';
import { SubmitTabUseCase } from './use-cases/submit-tab.use-case';

@Module({
  imports: [AuthModule],
  controllers: [
    TabsPublicController,
    TabsRatingPublicController,
    TabsUserController,
    TabsRatingUserController,
  ],
  providers: [
    { provide: TAB_REPOSITORY, useClass: PrismaTabRepository },
    CreateTabUseCase,
    SubmitTabUseCase,
    PublishTabUseCase,
    RejectTabUseCase,
    TabsService,
    TabRatingRepository,
    TabRatingService,
  ],
  exports: [TabsService, TAB_REPOSITORY],
})
export class TabsModule {}
