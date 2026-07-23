import { Injectable, Logger } from '@nestjs/common';
import { ASSET_LIMITS } from '@rajyarank/contracts';
import { S3Service } from '../s3/s3.service';

export interface ScanVerdict {
  verdict: 'CLEAN' | 'INFECTED';
  detail?: string;
}

/**
 * Checks the ACTUAL uploaded bytes' magic-number signature against the
 * client-declared MIME type — catches the common case (a renamed
 * executable/script masquerading as an image/PDF/video), which the
 * MIME-allow-list check alone never would since that only inspects the
 * client-supplied Content-Type header, never the real bytes. Not a
 * substitute for a real AV/content scanner (no exploit/malware-signature
 * detection here), just closes the cheapest bypass of the declared-type
 * check.
 */
function sniffMatchesMime(head: Buffer, mimeType: string): boolean {
  const startsWith = (...bytes: number[]) => bytes.every((b, i) => head[i] === b);
  switch (mimeType) {
    case 'image/png':
      return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
    case 'image/jpeg':
      return startsWith(0xff, 0xd8, 0xff);
    case 'image/webp':
      return startsWith(0x52, 0x49, 0x46, 0x46) && head.subarray(8, 12).toString('ascii') === 'WEBP';
    case 'application/pdf':
      return startsWith(0x25, 0x50, 0x44, 0x46); // %PDF
    case 'video/mp4':
    case 'audio/mp4':
      return head.subarray(4, 8).toString('ascii') === 'ftyp'; // ISO base media file format box
    case 'video/webm':
      return startsWith(0x1a, 0x45, 0xdf, 0xa3); // EBML header
    case 'audio/mpeg':
      // ID3v2 tag, or a raw MPEG frame sync (11 set bits: 0xFF + top 3 bits of the next byte).
      return startsWith(0x49, 0x44, 0x33) || (head[0] === 0xff && ((head[1] ?? 0) & 0xe0) === 0xe0);
    default:
      return true; // no signature known for this type — nothing to check against
  }
}

/**
 * Upload validity / malware scan hook (§25). The `basic` provider runs
 * structural checks (MIME allow-list + size ceiling + magic-byte sniff)
 * inline. Real AV engines (ClamAV, a cloud scan API) plug in behind
 * ASSET_SCAN_PROVIDER: they would fetch the object from S3 and stream its
 * bytes to the scanner, then return the verdict here. Assets that fail are
 * flipped to QUARANTINED by the caller.
 */
@Injectable()
export class AssetScanService {
  private readonly logger = new Logger('AssetScan');
  private readonly provider = process.env.ASSET_SCAN_PROVIDER ?? 'basic';

  constructor(private readonly s3: S3Service) {}

  async scan(input: { assetType: string; mimeType: string; sizeBytes: number | null; storageKey: string }): Promise<ScanVerdict> {
    const limit = ASSET_LIMITS[input.assetType as keyof typeof ASSET_LIMITS];
    if (limit) {
      if (!(limit.mime as readonly string[]).includes(input.mimeType)) {
        return { verdict: 'INFECTED', detail: `Disallowed MIME type: ${input.mimeType}` };
      }
      if (input.sizeBytes != null && input.sizeBytes > limit.maxBytes) {
        return { verdict: 'INFECTED', detail: 'Exceeds the allowed size ceiling' };
      }
    }

    const head = await this.s3.getObjectHeadBytes(input.storageKey, 16);
    if (!sniffMatchesMime(head, input.mimeType)) {
      return { verdict: 'INFECTED', detail: `Uploaded content does not match declared type ${input.mimeType}` };
    }

    if (this.provider === 'basic') return { verdict: 'CLEAN' };

    // Extension point for a real engine (ASSET_SCAN_PROVIDER=clamav|external).
    this.logger.warn(
      `ASSET_SCAN_PROVIDER="${this.provider}" is not wired to a real scanner; treating as CLEAN. Integrate an AV engine before launch.`,
    );
    return { verdict: 'CLEAN' };
  }
}
