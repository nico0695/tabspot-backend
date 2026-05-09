import { Injectable } from '@nestjs/common';

import type { User, UserRole, UserStatus } from '@src/generated/prisma/client';
import type { UserWhereInput } from '@src/generated/prisma/models';
import { PrismaService } from '@src/prisma/prisma.service';

export interface CreateUserInput {
  supabaseAuthId: string;
  email: string;
  displayName: string | null;
}

export interface ListUsersParams {
  page: number;
  pageSize: number;
  role?: UserRole;
  status?: UserStatus;
}

export interface ListUsersResult {
  items: User[];
  totalCount: number;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findBySupabaseAuthId(supabaseAuthId: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { supabaseAuthId } });
  }

  async create(input: CreateUserInput): Promise<User> {
    return this.prisma.user.create({
      data: {
        supabaseAuthId: input.supabaseAuthId,
        email: input.email,
        displayName: input.displayName,
      },
    });
  }

  async listPaginated(params: ListUsersParams): Promise<ListUsersResult> {
    const where: UserWhereInput = {};

    if (params.role !== undefined) {
      where.role = params.role;
    }
    if (params.status !== undefined) {
      where.status = params.status;
    }

    const [items, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items, totalCount };
  }

  async updateRole(id: string, role: UserRole): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  async countAll(): Promise<number> {
    return this.prisma.user.count();
  }
}
