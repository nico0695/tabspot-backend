import { Injectable } from '@nestjs/common';

import { PrismaService } from '@src/prisma/prisma.service';

@Injectable()
export class SongGenreRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForSong(songId: string, genreIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.songGenre.deleteMany({ where: { songId } }),
      this.prisma.songGenre.createMany({
        data: genreIds.map((genreId) => ({ songId, genreId })),
      }),
    ]);
  }
}
