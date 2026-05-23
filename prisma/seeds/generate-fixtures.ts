import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, parse, resolve } from 'node:path';

const TABS_DIR = resolve('data-for-seeder');
const OUTPUT_FILE = resolve('prisma/seeds/fixtures.ts');

function capitalizeFirst(value: string): string {
  if (value.length === 0) {
    return value;
  }

  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function songTitleFromSlug(slug: string): string {
  return capitalizeFirst(slug.replace(/-/g, ' ').trim());
}

function escapeTemplateLiteral(content: string): string {
  return content.replace(/\$\{/g, '\\${');
}

async function main(): Promise<void> {
  const artistDirs = (await readdir(TABS_DIR, { withFileTypes: true }))
    .filter((dirent) => dirent.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));

  const fixtures: Array<{
    artistSlug: string;
    songSlug: string;
    songTitle: string;
    content: string;
  }> = [];

  for (const artistDir of artistDirs) {
    const artistSlug = artistDir.name;
    const artistPath = join(TABS_DIR, artistSlug);
    const songFiles = (await readdir(artistPath, { withFileTypes: true }))
      .filter((dirent) => dirent.isFile() && dirent.name.endsWith('.cho'))
      .sort((left, right) => left.name.localeCompare(right.name));

    for (const songFile of songFiles) {
      const songSlug = parse(songFile.name).name;
      const filePath = join(artistPath, songFile.name);
      const content = await readFile(filePath, 'utf8');

      fixtures.push({
        artistSlug,
        songSlug,
        songTitle: songTitleFromSlug(songSlug),
        content,
      });
    }
  }

  if (fixtures.length === 0) {
    throw new Error(`No .cho files found in "${TABS_DIR}"`);
  }

  const fixtureEntries = fixtures
    .map((fixture) => {
      const escapedContent = escapeTemplateLiteral(fixture.content);

      return `  {
    artistSlug: '${fixture.artistSlug}',
    songSlug: '${fixture.songSlug}',
    songTitle: '${fixture.songTitle}',
    content: \`${escapedContent}\`,
  }`;
    })
    .join(',\n');

  const output = `export interface ChordProFixture {
  artistSlug: string;
  songSlug: string;
  songTitle: string;
  content: string;
}

export const FIXTURES: readonly ChordProFixture[] = [
${fixtureEntries},
];

export function getFixtures(): readonly ChordProFixture[] {
  return FIXTURES;
}
`;

  await writeFile(OUTPUT_FILE, output, 'utf8');

  console.log(`Generated ${fixtures.length} fixtures → prisma/seeds/fixtures.ts`);
}

void main();
