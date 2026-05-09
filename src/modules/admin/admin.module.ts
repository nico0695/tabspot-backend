import { Module } from '@nestjs/common';

import { AuthModule } from '@modules/auth/auth.module';
import { CatalogModule } from '@modules/catalog/catalog.module';
import { GenresModule } from '@modules/genres/genres.module';
import { TabsModule } from '@modules/tabs/tabs.module';

import { AdminArtistsController } from './controllers/admin-artists.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminGenresController } from './controllers/admin-genres.controller';
import { AdminSongsController } from './controllers/admin-songs.controller';
import { AdminTabsController } from './controllers/admin-tabs.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminCatalogService } from './services/admin-catalog.service';
import { AdminService } from './services/admin.service';

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
  providers: [AdminService, AdminCatalogService],
})
export class AdminModule {}
