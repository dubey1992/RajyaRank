import { Injectable } from '@nestjs/common';

/**
 * Minimal in-process metrics (Prometheus exposition). For a single instance
 * this is enough for readiness; multi-instance production should scrape each
 * pod or push to a proper metrics backend.
 */
@Injectable()
export class MetricsService {
  private requests = new Map<string, number>(); // "2xx"|"4xx"|"5xx" → count
  private latencySumMs = 0;
  private latencyCount = 0;
  private denied = 0; // authz denials (security signal)

  recordRequest(statusCode: number, durationMs: number) {
    const bucket = `${Math.floor(statusCode / 100)}xx`;
    this.requests.set(bucket, (this.requests.get(bucket) ?? 0) + 1);
    this.latencySumMs += durationMs;
    this.latencyCount += 1;
    if (statusCode === 403) this.denied += 1;
  }

  render(): string {
    const lines: string[] = [];
    lines.push('# HELP rr_http_requests_total HTTP requests by status class');
    lines.push('# TYPE rr_http_requests_total counter');
    for (const [bucket, count] of this.requests) {
      lines.push(`rr_http_requests_total{class="${bucket}"} ${count}`);
    }
    lines.push('# HELP rr_http_request_duration_ms_avg Average request duration (ms)');
    lines.push('# TYPE rr_http_request_duration_ms_avg gauge');
    lines.push(`rr_http_request_duration_ms_avg ${this.latencyCount ? Math.round(this.latencySumMs / this.latencyCount) : 0}`);
    lines.push('# HELP rr_authz_denied_total Permission-denied (403) responses');
    lines.push('# TYPE rr_authz_denied_total counter');
    lines.push(`rr_authz_denied_total ${this.denied}`);
    return lines.join('\n') + '\n';
  }
}
