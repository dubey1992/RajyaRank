import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Principal } from '@rajyarank/auth';

/** Injects the authenticated Principal attached by the access guard. */
export const CurrentPrincipal = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal | undefined => {
    const req = ctx.switchToHttp().getRequest<{ principal?: Principal }>();
    return req.principal;
  },
);
