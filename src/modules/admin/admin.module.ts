import { Module } from '@nestjs/common';

import { AuthModule } from '@modules/auth/auth.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { GenresModule } from '@modules/genres/genres.module';
import { TabsModule } from '@modules/tabs/tabs.module';

import { AdminArtistsController } from './catalog-management/artists/controllers/admin-artists.controller';
import { AdminArtistsService } from './catalog-management/artists/services/admin-artists.service';
import { AdminGenresController } from './catalog-management/genres/controllers/admin-genres.controller';
import { AdminGenresService } from './catalog-management/genres/services/admin-genres.service';
import { AdminSongsController } from './catalog-management/songs/controllers/admin-songs.controller';
import { AdminDashboardController } from './dashboard/controllers/admin-dashboard.controller';
import { AdminSongsService } from './catalog-management/songs/services/admin-songs.service';
import { AdminDashboardService } from './dashboard/services/admin-dashboard.service';
import { AdminTabsService } from './tabs/services/admin-tabs.service';
import { AdminTabsController } from './tabs/controllers/admin-tabs.controller';
import { AdminUsersController } from './users/controllers/admin-users.controller';
import { AdminUsersService } from './users/services/admin-users.service';

@Module({
  imports: [AuthModule, TabsModule, CatalogModule, GenresModule],
  controllers: [
    AdminTabsController,
    AdminUsersController,
    AdminDashboardController,
    AdminArtistsController,
    AdminGenresController,
    AdminSongsController,
  ],
  providers: [
    AdminTabsService,
    AdminUsersService,
    AdminDashboardService,
    AdminArtistsService,
    AdminGenresService,
    AdminSongsService,
  ],
})
export class AdminModule {}
