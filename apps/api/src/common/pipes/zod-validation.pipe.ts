import { PipeTransform, HttpStatus } from '@nestjs/common';
import type { ZodSchema } from 'zod';
import { AppError } from '../errors/app-error';

/** Validates a payload against a zod schema, emitting field-level errors. */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const fieldErrors = result.error.issues.map((i) => ({
        path: i.path.join('.'),
        message: i.message,
      }));
      throw new AppError('VALIDATION_FAILED', HttpStatus.UNPROCESSABLE_ENTITY, 'Validation failed.', fieldErrors);
    }
    return result.data;
  }
}
