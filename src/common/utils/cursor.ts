import { BadRequestException } from '@nestjs/common';

export interface CursorPayload {
  id: string;
  sortBy?: string;
  sortValue?: string | null;
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

export function decodeCursor(raw: string): CursorPayload {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('malformed');
    }

    const obj = parsed as Record<string, unknown>;

    if (typeof obj['id'] !== 'string') {
      throw new Error('malformed');
    }

    const result: CursorPayload = { id: obj['id'] };

    if (typeof obj['sortBy'] === 'string') {
      result.sortBy = obj['sortBy'];
    }

    if (obj['sortValue'] === null) {
      result.sortValue = null;
    } else if (typeof obj['sortValue'] === 'string') {
      result.sortValue = obj['sortValue'];
    }

    return result;
  } catch (err) {
    if (err instanceof BadRequestException) {
      throw err;
    }
    throw new BadRequestException({ code: 'INVALID_CURSOR', message: 'Invalid cursor' });
  }
}
