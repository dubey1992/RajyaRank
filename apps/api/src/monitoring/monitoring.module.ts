import { Controller, Get, Global, Header, Module } from '@nestjs/common';
import { RequirePermission } from '../authz/decorators';
import { MetricsService } from './metrics.service';

@Controller()
class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  // Was @Public() on the assumption the ALB/ingress restricted this path —
  // confirmed via `aws elbv2 describe-rules` that no such restriction
  // actually exists (default-forward on every listener, no path-based
  // rules), so it was genuinely open to the internet. Gated on an existing
  // staff permission instead of inventing a new scrape-token mechanism —
  // Super Admin already holds audit.view for the same "operational
  // visibility" reason. Revisit if a real external scraper (Prometheus)
  // needs this later; it would need its own service-token auth path.
  @RequirePermission('audit.view')
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
