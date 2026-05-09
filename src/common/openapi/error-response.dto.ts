import { createZodDto } from 'nestjs-zod';

import { ErrorResponseSchema, ValidationErrorResponseSchema } from './error-response.schema';

export class ErrorResponseDto extends createZodDto(ErrorResponseSchema) {}

export class ValidationErrorResponseDto extends createZodDto(ValidationErrorResponseSchema) {}
