import { Global, Module } from '@nestjs/common';
import { loadApiEnv, type ApiEnv } from '@rajyarank/config/env';

export const ENV = 'RR_ENV';

@Global()
@Module({
  providers: [{ provide: ENV, useFactory: (): ApiEnv => loadApiEnv() }],
  exports: [ENV],
})
export class ConfigModule {}
