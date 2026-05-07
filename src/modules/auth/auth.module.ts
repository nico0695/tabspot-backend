import { Module } from '@nestjs/common';

import { AuthGuard } from '@common/guards/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';

import { SupabaseIdentityAdapter } from './adapters/supabase-identity.adapter';
import { AuthService } from './auth.service';
import { IDENTITY_PROVIDER } from './ports/identity-provider.port';
import { UserRepository } from './repositories/user.repository';

@Module({
  providers: [
    AuthService,
    UserRepository,
    AuthGuard,
    RolesGuard,
    { provide: IDENTITY_PROVIDER, useClass: SupabaseIdentityAdapter },
  ],
  exports: [AuthService, AuthGuard, RolesGuard, IDENTITY_PROVIDER],
})
export class AuthModule {}
