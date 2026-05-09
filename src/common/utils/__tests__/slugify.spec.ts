import { slugify } from '../slugify';

describe('slugify', () => {
  it.each([
    ['Paco de Lucía', 'paco-de-lucia'],
    ['  R&B  Rock!! ', 'rb-rock'],
    ['The Beatles', 'the-beatles'],
    ['AC/DC', 'acdc'],
    ['', ''],
    ['---hello---', 'hello'],
    ['Ñoño', 'nono'],
    ['  multiple   spaces  ', 'multiple-spaces'],
    ['Motörhead', 'motorhead'],
    ['café délice', 'cafe-delice'],
  ])('slugify(%j) => %j', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});
