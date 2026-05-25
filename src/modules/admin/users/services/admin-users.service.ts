import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import type { User } from '@src/generated/prisma/client';
import { UserStatus } from '@src/generated/prisma/client';

import type { ListUsersParams } from '@modules/auth/repositories/user.repository';
import { UserRepository } from '@modules/auth/repositories/user.repository';

@Injectable()
export class AdminUsersService {
  constructor(private readonly userRepository: UserRepository) {}

  async listUsers(params: ListUsersParams): Promise<{ items: User[]; totalCount: number }> {
    return this.userRepository.listPaginated(params);
  }

  async changeUserRole(
    targetUserId: string,
    role: User['role'],
    currentUserId: string,
  ): Promise<User> {
    if (targetUserId === currentUserId) {
      throw new ForbiddenException({
        code: 'SELF_ROLE_CHANGE',
        message: 'Cannot change your own role',
      });
    }

    const user = await this.userRepository.findById(targetUserId);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    return this.userRepository.updateRole(targetUserId, role);
  }

  async changeUserStatus(
    targetUserId: string,
    status: UserStatus,
    currentUserId: string,
  ): Promise<User> {
    if (targetUserId === currentUserId) {
      throw new ForbiddenException({
        code: 'SELF_STATUS_CHANGE',
        message: 'Cannot change your own status',
      });
    }

    const user = await this.userRepository.findById(targetUserId);
    if (!user) {
      throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    const blockedAt = status === UserStatus.BLOCKED ? new Date() : null;

    return this.userRepository.updateStatus(targetUserId, status, blockedAt);
  }
}
