import { Injectable, Logger } from '@nestjs/common';
import { ASSET_LIMITS } from '@rajyarank/contracts';

export interface ScanVerdict {
  verdict: 'CLEAN' | 'INFECTED';
  detail?: string;
}

/**
 * Upload validity / malware scan hook (§25). The `basic` provider runs
 * structural checks (MIME allow-list + size ceiling) inline. Real AV engines
 * (ClamAV, a cloud scan API) plug in behind ASSET_SCAN_PROVIDER: they would
 * fetch the object from S3 and stream its bytes to the scanner, then return the
 * verdict here. Assets that fail are flipped to QUARANTINED by the caller.
 */
@Injectable()
export class AssetScanService {
  private readonly logger = new Logger('AssetScan');
  private readonly provider = process.env.ASSET_SCAN_PROVIDER ?? 'basic';

  async scan(input: { assetType: string; mimeType: string; sizeBytes: number | null }): Promise<ScanVerdict> {
    const limit = ASSET_LIMITS[input.assetType as keyof typeof ASSET_LIMITS];
    if (limit) {
      if (!(limit.mime as readonly string[]).includes(input.mimeType)) {
        return { verdict: 'INFECTED', detail: `Disallowed MIME type: ${input.mimeType}` };
      }
      if (input.sizeBytes != null && input.sizeBytes > limit.maxBytes) {
        return { verdict: 'INFECTED', detail: 'Exceeds the allowed size ceiling' };
      }
    }

    if (this.provider === 'basic') return { verdict: 'CLEAN' };

    // Extension point for a real engine (ASSET_SCAN_PROVIDER=clamav|external).
    this.logger.warn(
      `ASSET_SCAN_PROVIDER="${this.provider}" is not wired to a real scanner; treating as CLEAN. Integrate an AV engine before launch.`,
    );
    return { verdict: 'CLEAN' };
  }
}
