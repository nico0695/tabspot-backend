import { applyDecorators } from '@nestjs/common';
import {
  ApiForbiddenResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';

import { ErrorResponseDto, ValidationErrorResponseDto } from './error-response.dto';

export function ApiAdminErrors(): MethodDecorator {
  return applyDecorators(
    ApiUnauthorizedResponse({ description: 'Missing or invalid JWT', type: ErrorResponseDto }),
    ApiForbiddenResponse({ description: 'Requires ADMIN role', type: ErrorResponseDto }),
    ApiUnprocessableEntityResponse({
      description: 'Validation failed',
      type: ValidationErrorResponseDto,
    }),
  );
}

export function ApiAuthErrors(): MethodDecorator {
  return applyDecorators(
    ApiUnauthorizedResponse({ description: 'Missing or invalid JWT', type: ErrorResponseDto }),
    ApiUnprocessableEntityResponse({
      description: 'Validation failed',
      type: ValidationErrorResponseDto,
    }),
  );
}
