import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

/** Assigns/propagates an x-request-id correlation id on every request. */
@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request & { correlationId?: string }, res: Response, next: NextFunction) {
    const incoming = req.header('x-request-id');
    const id = incoming && incoming.length <= 128 ? incoming : randomUUID();
    req.correlationId = id;
    res.setHeader('x-request-id', id);
    next();
  }
}
