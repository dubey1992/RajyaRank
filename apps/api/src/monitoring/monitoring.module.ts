import { Controller, Get, Global, Header, Module } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { MetricsService } from './metrics.service';

@Controller()
class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  // Restrict to the internal network / scraper at the ingress in production.
  @Public()
  @Get('metrics')
  @Header('content-type', 'text/plain; version=0.0.4')
  scrape(): string {
    return this.metrics.render();
  }
}

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MonitoringModule {}
