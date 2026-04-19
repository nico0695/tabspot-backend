import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL'] });
const prisma = new PrismaClient({ adapter });

const GENRES = [
  { name: 'Rock', slug: 'rock' },
  { name: 'Pop', slug: 'pop' },
  { name: 'Metal', slug: 'metal' },
  { name: 'Folk', slug: 'folk' },
  { name: 'Jazz', slug: 'jazz' },
  { name: 'Blues', slug: 'blues' },
  { name: 'Country', slug: 'country' },
  { name: 'Reggae', slug: 'reggae' },
  { name: 'Punk', slug: 'punk' },
  { name: 'Alternative', slug: 'alternative' },
  { name: 'Electronic', slug: 'electronic' },
  { name: 'Hip-Hop', slug: 'hip-hop' },
  { name: 'R&B', slug: 'rnb' },
  { name: 'Classical', slug: 'classical' },
] as const;

async function main(): Promise<void> {
  for (const genre of GENRES) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: { name: genre.name },
      create: { name: genre.name, slug: genre.slug },
    });
  }
  console.log(`Seeded ${GENRES.length} genres.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
