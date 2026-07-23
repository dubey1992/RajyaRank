import { Inject, Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ENV } from '../config/config.module';
import type { ApiEnv } from '@rajyarank/config/env';

/**
 * Private S3-compatible storage access. Uploads and reads always go through
 * short-lived presigned URLs — the platform never exposes permanent public
 * URLs for protected content.
 */
@Injectable()
export class S3Service {
  private readonly client: S3Client;
  readonly bucket: string;

  constructor(@Inject(ENV) private readonly env: ApiEnv) {
    this.bucket = env.S3_BUCKET_PRIVATE;
    // S3_ACCESS_KEY is only ever set for local dev against MinIO, which needs
    // an explicit endpoint, path-style requests, and a static credential pair.
    // On real AWS (staging/production) these are left unset — omitting
    // `credentials`/`endpoint` here lets the AWS SDK fall back to its default
    // credential chain, which on ECS resolves to the task's IAM role. No
    // long-lived access key ever exists for the deployed app.
    const isLocalDev = Boolean(env.S3_ACCESS_KEY);
    this.client = new S3Client({
      region: env.S3_REGION,
      ...(isLocalDev
        ? {
            endpoint: env.S3_ENDPOINT,
            forcePathStyle: true,
            credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
          }
        : {}),
    });
  }

  presignPut(key: string, contentType: string, expiresIn = 900): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }),
      { expiresIn },
    );
  }

  presignGet(key: string, expiresIn = 300): Promise<string> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn,
    });
  }

  /** Fetches just the first `byteCount` bytes of an object — used to sniff
   *  real file content (magic bytes) without downloading the whole file. */
  async getObjectHeadBytes(key: string, byteCount: number): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=0-${byteCount - 1}` }),
    );
    const chunks: Buffer[] = [];
    for await (const chunk of res.Body as AsyncIterable<Buffer>) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
