import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'rr:isPublic';
/** Marks a route as not requiring authentication. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
