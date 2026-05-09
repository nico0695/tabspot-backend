import { Inject, Injectable } from '@nestjs/common';

import type { Tab } from '@src/generated/prisma/client';

import type { CreateTabData, ITabRepository } from '../ports/tab-repository.port';
import { TAB_REPOSITORY } from '../ports/tab-repository.port';

export interface CreateTabInput {
  songId: string;
  authorUserId: string;
  content: string;
  tabType: string;
  instrument: string;
  difficulty: string;
  titleOverride?: string | null;
}

@Injectable()
export class CreateTabUseCase {
  constructor(@Inject(TAB_REPOSITORY) private readonly tabRepository: ITabRepository) {}

  async execute(input: CreateTabInput): Promise<Tab> {
    const data: CreateTabData = {
      songId: input.songId,
      authorUserId: input.authorUserId,
      content: input.content,
      tabType: input.tabType,
      instrument: input.instrument,
      difficulty: input.difficulty,
      titleOverride: input.titleOverride,
    };

    return this.tabRepository.create(data);
  }
}
