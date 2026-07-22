import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

/** Records status class + latency for every request (success and error). */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const res = context.switchToHttp().getResponse<Response>();
    const record = (statusOverride?: number) =>
      this.metrics.recordRequest(statusOverride ?? res.statusCode, Date.now() - start);
    return next.handle().pipe(
      tap({
        next: () => record(),
        error: (err: { status?: number }) => record(err?.status ?? 500),
      }),
    );
  }
}
