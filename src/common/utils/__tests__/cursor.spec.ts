import { BadRequestException } from '@nestjs/common';

import { decodeCursor, encodeCursor } from '../cursor';

describe('cursor utility', () => {
  it('round-trips an id-only payload', () => {
    const encoded = encodeCursor({ id: 'abc' });
    expect(typeof encoded).toBe('string');
    expect(decodeCursor(encoded)).toEqual({ id: 'abc' });
  });

  it('round-trips a payload with sortBy and sortValue', () => {
    const payload = { id: 'abc', sortBy: 'createdAt', sortValue: '2024-01-01T00:00:00.000Z' };
    const encoded = encodeCursor(payload);
    expect(decodeCursor(encoded)).toEqual(payload);
  });

  it('round-trips a payload with null sortValue', () => {
    const payload = { id: 'abc', sortBy: 'name', sortValue: null };
    const encoded = encodeCursor(payload);
    expect(decodeCursor(encoded)).toEqual(payload);
  });

  it('decodes legacy format (id-only object) without sortBy/sortValue', () => {
    const legacy = Buffer.from(JSON.stringify({ id: 'abc' })).toString('base64url');
    expect(decodeCursor(legacy)).toEqual({ id: 'abc' });
  });

  it('throws BadRequestException for invalid base64', () => {
    expect(() => decodeCursor('%%%not-base64%%%')).toThrow(BadRequestException);
  });

  it('throws BadRequestException when JSON has no id field', () => {
    const noId = Buffer.from(JSON.stringify({ foo: 'bar' })).toString('base64url');
    expect(() => decodeCursor(noId)).toThrow(BadRequestException);
  });

  it('throws BadRequestException when id is not a string', () => {
    const numericId = Buffer.from(JSON.stringify({ id: 123 })).toString('base64url');
    expect(() => decodeCursor(numericId)).toThrow(BadRequestException);
  });
});
