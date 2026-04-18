import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ZodValidationException } from 'nestjs-zod';
import type { Request, Response } from 'express';
import { z } from 'zod';

interface ErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Array<{ field: string; message: string }>;
  };
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof ZodValidationException) {
      const flattened = z.flattenError(exception.getZodError() as z.ZodError);
      const fields = Object.entries(flattened.fieldErrors).flatMap(([field, msgs]) =>
        ((msgs as string[] | undefined) ?? []).map((message) => ({ field, message })),
      );
      const body: ErrorBody = {
        error: { code: 'VALIDATION_FAILED', message: 'Validation failed', fields },
      };
      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json(body);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const code =
        typeof payload === 'object' && payload !== null && 'code' in payload
          ? String((payload as { code: unknown }).code)
          : statusToCode(status);
      const message =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? String((payload as { message: unknown }).message)
          : exception.message;
      response.status(status).json({ error: { code, message } });
      return;
    }

    this.logger.error(
      { req: { id: (request as Request & { id?: string }).id } },
      exception instanceof Error ? exception.stack : String(exception),
    );
    const isProd = process.env.NODE_ENV === 'production';
    const message = isProd
      ? 'Internal server error'
      : exception instanceof Error
        ? exception.message
        : 'Internal server error';
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { code: 'INTERNAL_ERROR', message },
    });
  }
}

function statusToCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    409: 'CONFLICT',
    422: 'VALIDATION_FAILED',
    500: 'INTERNAL_ERROR',
  };
  return map[status] ?? `HTTP_${status}`;
}
