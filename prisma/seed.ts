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
  { name: 'Flamenco', slug: 'flamenco' },
] as const;

interface ArtistSeed {
  name: string;
  slug: string;
  sortName?: string;
}

const ARTISTS: ReadonlyArray<ArtistSeed> = [
  { name: 'The Beatles', slug: 'the-beatles', sortName: 'Beatles, The' },
  { name: 'Paco de Lucía', slug: 'paco-de-lucia', sortName: 'Lucía, Paco de' },
  { name: 'Radiohead', slug: 'radiohead' },
  { name: 'Metallica', slug: 'metallica' },
  { name: 'Bob Dylan', slug: 'bob-dylan', sortName: 'Dylan, Bob' },
  { name: 'Miles Davis', slug: 'miles-davis', sortName: 'Davis, Miles' },
  { name: 'Nirvana', slug: 'nirvana' },
  { name: 'Daft Punk', slug: 'daft-punk' },
  { name: 'Johnny Cash', slug: 'johnny-cash', sortName: 'Cash, Johnny' },
  { name: 'Bob Marley', slug: 'bob-marley', sortName: 'Marley, Bob' },
];

interface SongSeed {
  artistSlug: string;
  title: string;
  slug: string;
  subtitle?: string;
  releaseYear?: number;
  genreSlugs: string[];
}

const SONGS: ReadonlyArray<SongSeed> = [
  {
    artistSlug: 'the-beatles',
    title: 'Hey Jude',
    slug: 'hey-jude',
    releaseYear: 1968,
    genreSlugs: ['rock', 'pop'],
  },
  {
    artistSlug: 'the-beatles',
    title: 'Let It Be',
    slug: 'let-it-be',
    releaseYear: 1970,
    genreSlugs: ['rock', 'pop'],
  },
  {
    artistSlug: 'paco-de-lucia',
    title: 'Entre dos aguas',
    slug: 'entre-dos-aguas',
    releaseYear: 1973,
    genreSlugs: ['flamenco'],
  },
  {
    artistSlug: 'paco-de-lucia',
    title: 'La Barrosa',
    slug: 'la-barrosa',
    releaseYear: 1987,
    genreSlugs: ['flamenco'],
  },
  {
    artistSlug: 'radiohead',
    title: 'Creep',
    slug: 'creep',
    releaseYear: 1992,
    genreSlugs: ['rock', 'alternative'],
  },
  {
    artistSlug: 'radiohead',
    title: 'Karma Police',
    slug: 'karma-police',
    releaseYear: 1997,
    genreSlugs: ['alternative'],
  },
  {
    artistSlug: 'metallica',
    title: 'Enter Sandman',
    slug: 'enter-sandman',
    releaseYear: 1991,
    genreSlugs: ['metal', 'rock'],
  },
  {
    artistSlug: 'metallica',
    title: 'Nothing Else Matters',
    slug: 'nothing-else-matters',
    releaseYear: 1991,
    genreSlugs: ['metal'],
  },
  {
    artistSlug: 'bob-dylan',
    title: 'Blowin’ in the Wind',
    slug: 'blowin-in-the-wind',
    releaseYear: 1963,
    genreSlugs: ['folk'],
  },
  {
    artistSlug: 'bob-dylan',
    title: 'Like a Rolling Stone',
    slug: 'like-a-rolling-stone',
    releaseYear: 1965,
    genreSlugs: ['folk', 'rock'],
  },
  {
    artistSlug: 'miles-davis',
    title: 'So What',
    slug: 'so-what',
    releaseYear: 1959,
    genreSlugs: ['jazz'],
  },
  {
    artistSlug: 'miles-davis',
    title: 'Kind of Blue',
    slug: 'kind-of-blue',
    subtitle: 'Title Track',
    releaseYear: 1959,
    genreSlugs: ['jazz'],
  },
  {
    artistSlug: 'nirvana',
    title: 'Smells Like Teen Spirit',
    slug: 'smells-like-teen-spirit',
    releaseYear: 1991,
    genreSlugs: ['rock', 'alternative'],
  },
  {
    artistSlug: 'nirvana',
    title: 'Come as You Are',
    slug: 'come-as-you-are',
    releaseYear: 1991,
    genreSlugs: ['alternative', 'punk'],
  },
  {
    artistSlug: 'daft-punk',
    title: 'One More Time',
    slug: 'one-more-time',
    releaseYear: 2000,
    genreSlugs: ['electronic'],
  },
  {
    artistSlug: 'daft-punk',
    title: 'Get Lucky',
    slug: 'get-lucky',
    releaseYear: 2013,
    genreSlugs: ['electronic', 'pop'],
  },
  {
    artistSlug: 'johnny-cash',
    title: 'Ring of Fire',
    slug: 'ring-of-fire',
    releaseYear: 1963,
    genreSlugs: ['country'],
  },
  {
    artistSlug: 'johnny-cash',
    title: 'Hurt',
    slug: 'hurt',
    subtitle: 'American IV cover',
    releaseYear: 2002,
    genreSlugs: ['country', 'folk'],
  },
  {
    artistSlug: 'bob-marley',
    title: 'No Woman, No Cry',
    slug: 'no-woman-no-cry',
    releaseYear: 1974,
    genreSlugs: ['reggae'],
  },
  {
    artistSlug: 'bob-marley',
    title: 'Redemption Song',
    slug: 'redemption-song',
    releaseYear: 1980,
    genreSlugs: ['reggae', 'folk'],
  },
];

async function main(): Promise<void> {
  for (const genre of GENRES) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      update: { name: genre.name },
      create: { name: genre.name, slug: genre.slug },
    });
  }

  for (const artist of ARTISTS) {
    await prisma.artist.upsert({
      where: { slug: artist.slug },
      update: { name: artist.name, sortName: artist.sortName ?? null },
      create: { name: artist.name, slug: artist.slug, sortName: artist.sortName ?? null },
    });
  }

  let songGenreCount = 0;
  for (const song of SONGS) {
    const artist = await prisma.artist.findUniqueOrThrow({ where: { slug: song.artistSlug } });
    const upserted = await prisma.song.upsert({
      where: { artistId_slug: { artistId: artist.id, slug: song.slug } },
      update: {
        title: song.title,
        subtitle: song.subtitle ?? null,
        releaseYear: song.releaseYear ?? null,
      },
      create: {
        artistId: artist.id,
        title: song.title,
        slug: song.slug,
        subtitle: song.subtitle ?? null,
        releaseYear: song.releaseYear ?? null,
      },
    });

    for (const genreSlug of song.genreSlugs) {
      const genre = await prisma.genre.findUniqueOrThrow({ where: { slug: genreSlug } });
      await prisma.songGenre.upsert({
        where: { songId_genreId: { songId: upserted.id, genreId: genre.id } },
        update: {},
        create: { songId: upserted.id, genreId: genre.id },
      });
      songGenreCount++;
    }
  }

  console.log(
    `Seeded ${GENRES.length} genres, ${ARTISTS.length} artists, ${SONGS.length} songs, ${songGenreCount} song-genre links.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
