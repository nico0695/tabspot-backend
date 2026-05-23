export interface GenreSeedData {
  name: string;
  slug: string;
}

export interface ArtistSeedData {
  name: string;
  slug: string;
  genreSlugs: readonly string[];
}

export const GENRES: readonly GenreSeedData[] = [
  { name: 'Rock', slug: 'rock' },
  { name: 'Metal', slug: 'metal' },
  { name: 'Punk', slug: 'punk' },
  { name: 'Reggae', slug: 'reggae' },
  { name: 'Ska', slug: 'ska' },
  { name: 'Latin', slug: 'latin' },
] as const;

export const ARTISTS: readonly ArtistSeedData[] = [
  { name: 'Almafuerte', slug: 'almafuerte', genreSlugs: ['rock', 'metal'] },
  { name: 'Intoxicados', slug: 'intoxicados', genreSlugs: ['rock'] },
  { name: 'La Renga', slug: 'la-renga', genreSlugs: ['rock'] },
  {
    name: 'Los Fabulosos Cadillacs',
    slug: 'los-fabulosos-cadillacs',
    genreSlugs: ['ska', 'reggae', 'latin'],
  },
  { name: 'Los Pericos', slug: 'los-pericos', genreSlugs: ['reggae', 'ska'] },
  { name: 'Los Violadores', slug: 'los-violadores', genreSlugs: ['punk', 'rock'] },
  { name: 'Riff', slug: 'riff', genreSlugs: ['rock', 'metal'] },
] as const;

export function getArtistSeedData(artistSlug: string): ArtistSeedData {
  const artist = ARTISTS.find((entry) => entry.slug === artistSlug);

  if (artist === undefined) {
    throw new Error(`Missing seed metadata for artist folder "${artistSlug}"`);
  }

  return artist;
}

export function getGenreSeedData(genreSlug: string): GenreSeedData {
  const genre = GENRES.find((entry) => entry.slug === genreSlug);

  if (genre === undefined) {
    throw new Error(`Missing seed metadata for genre "${genreSlug}"`);
  }

  return genre;
}
