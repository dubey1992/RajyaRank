import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { ErrorCode, ErrorEnvelope } from '@rajyarank/contracts';
import { AppError } from '../errors/app-error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { correlationId?: string }>();
    const requestId = req.correlationId ?? 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = 'INTERNAL_ERROR';
    let message = 'Something went wrong.';
    let fieldErrors: { path: string; message: string }[] | undefined;

    if (exception instanceof AppError) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      fieldErrors = exception.fieldErrors;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'object' && body && 'code' in body) {
        code = (body as { code: ErrorCode }).code;
        message = (body as { message?: string }).message ?? message;
      } else {
        code = status === HttpStatus.FORBIDDEN ? 'PERMISSION_DENIED' : 'INTERNAL_ERROR';
        message = typeof body === 'string' ? body : (body as { message?: string }).message ?? message;
      }
    }

    if (status >= 500) {
      this.logger.error({ err: exception, requestId }, 'Unhandled error');
    }

    const envelope: ErrorEnvelope = { error: { code, message, fieldErrors }, requestId };
    res.status(status).json(envelope);
  }
}
