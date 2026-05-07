import { Injectable } from '@nestjs/common';

import type { User } from '@src/generated/prisma/client';
import { PrismaService } from '@src/prisma/prisma.service';

export interface CreateUserInput {
  supabaseAuthId: string;
  email: string;
  displayName: string | null;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}
