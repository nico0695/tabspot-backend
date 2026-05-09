import { Module } from '@nestjs/common';

import { AuthModule } from '@modules/auth/auth.module';
import { TabsModule } from '@modules/tabs/tabs.module';

import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminTabsController } from './controllers/admin-tabs.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminService } from './services/admin.service';

@Module({
  imports: [AuthModule, TabsModule],
  controllers: [AdminTabsController, AdminUsersController, AdminDashboardController],
  providers: [AdminService],
})
export class AdminModule {}
