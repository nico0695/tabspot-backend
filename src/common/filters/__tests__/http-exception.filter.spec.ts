import { ArgumentsHost, HttpException, Logger, NotFoundException } from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import type { Request, Response } from 'express';
import { z } from 'zod';

import { HttpExceptionFilter } from '../http-exception.filter';

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

function makeHost(): { host: ArgumentsHost; response: MockResponse } {
  const response: MockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  const request = { id: 'req-test-id' };
  const host = {
    switchToHttp: (): { getResponse: () => Response; getRequest: () => Request } => ({
      getResponse: (): Response => response as unknown as Response,
      getRequest: (): Request => request as unknown as Request,
    }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

/**
 * Simulates the http-errors `PayloadTooLargeError` thrown by the Express body parser
 * when a request body exceeds the configured limit: an Error subclass carrying numeric
 * `status`/`statusCode`, `expose: true`, and `type: 'entity.too.large'` — but NOT a
 * Nest HttpException.
 */
function makeBodyParserPayloadTooLargeError(): Error {
  const error = new Error('request entity too large');
  error.name = 'PayloadTooLargeError';
  return Object.assign(error, {
    status: 413,
    statusCode: 413,
    expose: true,
    type: 'entity.too.large',
    length: 16 * 1024 * 1024,
    limit: 15 * 1024 * 1024,
  });
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    loggerErrorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('body-parser 413 (http-errors-shaped exceptions)', () => {
    it('maps a body-parser PayloadTooLargeError to 413 with the PAYLOAD_TOO_LARGE envelope', (): void => {
      const { host, response } = makeHost();

      filter.catch(makeBodyParserPayloadTooLargeError(), host);

      expect(response.status).toHaveBeenCalledWith(413);
      expect(response.json).toHaveBeenCalledWith({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'request entity too large' },
      });
    });

    it('does not log an http-errors client error as an internal error', (): void => {
      const { host } = makeHost();

      filter.catch(makeBodyParserPayloadTooLargeError(), host);

      expect(loggerErrorSpy).not.toHaveBeenCalled();
    });

    it('maps a Nest HttpException(413) to the same PAYLOAD_TOO_LARGE code', (): void => {
      const { host, response } = makeHost();

      filter.catch(new HttpException('Payload Too Large', 413), host);

      expect(response.status).toHaveBeenCalledWith(413);
      expect(response.json).toHaveBeenCalledWith({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'Payload Too Large' },
      });
    });

    it('ignores http-errors-shaped exceptions without expose: true (falls through to 500)', (): void => {
      const { host, response } = makeHost();
      const error = Object.assign(new Error('boom'), { status: 400, expose: false });

      filter.catch(error, host);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith({
        error: { code: 'INTERNAL_ERROR', message: 'boom' },
      });
    });
  });

  describe('pre-existing branches (regression)', () => {
    it('maps ZodValidationException to 422 VALIDATION_FAILED with field details', (): void => {
      const { host, response } = makeHost();
      const parsed = z.object({ title: z.string() }).safeParse({});
      if (parsed.success) {
        throw new Error('expected schema parse to fail');
      }

      filter.catch(new ZodValidationException(parsed.error), host);

      expect(response.status).toHaveBeenCalledWith(422);
      expect(response.json).toHaveBeenCalledWith({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Validation failed',
          fields: [{ field: 'title', message: expect.any(String) as unknown as string }],
        },
      });
    });

    it('passes HttpException status through and derives the code from the status map', (): void => {
      const { host, response } = makeHost();

      filter.catch(new NotFoundException('Tab not found'), host);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        error: { code: 'NOT_FOUND', message: 'Tab not found' },
      });
    });

    it('respects an explicit code in an HttpException payload', (): void => {
      const { host, response } = makeHost();

      filter.catch(
        new HttpException({ code: 'ARTIST_NOT_FOUND', message: 'Artist does not exist' }, 422),
        host,
      );

      expect(response.status).toHaveBeenCalledWith(422);
      expect(response.json).toHaveBeenCalledWith({
        error: { code: 'ARTIST_NOT_FOUND', message: 'Artist does not exist' },
      });
    });

    it('maps unknown exceptions to 500 INTERNAL_ERROR and logs them', (): void => {
      const { host, response } = makeHost();

      filter.catch(new Error('unexpected failure'), host);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith({
        error: { code: 'INTERNAL_ERROR', message: 'unexpected failure' },
      });
      expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
    });
  });
});
