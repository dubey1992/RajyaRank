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
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: true, // required for MinIO
      credentials: { accessKeyId: env.S3_ACCESS_KEY, secretAccessKey: env.S3_SECRET_KEY },
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
}
