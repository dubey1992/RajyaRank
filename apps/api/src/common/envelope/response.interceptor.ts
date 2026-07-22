import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { Request } from 'express';

/** Wraps successful responses in { data, meta, requestId }. */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { correlationId?: string }>();
    const requestId = req.correlationId ?? 'unknown';
    return next.handle().pipe(
      map((data) => {
        if (data && typeof data === 'object' && 'data' in (data as object) && 'requestId' in (data as object)) {
          return data; // already an envelope
        }
        return { data, requestId };
      }),
    );
  }
}
