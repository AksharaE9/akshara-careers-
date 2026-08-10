/**
 * lib/storage/r2.ts
 *
 * Cloudflare R2 Client (S3 compatible) configuration.
 * Used for candidate resume uploads (§4.3).
 */

import { S3Client } from '@aws-sdk/client-s3'

let r2Client: S3Client | null = null

export function getR2Client(): S3Client {
  if (r2Client) return r2Client

  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT

  if (!accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error('Missing Cloudflare R2 credentials (ACCESS_KEY_ID, SECRET_ACCESS_KEY, or ENDPOINT)')
  }

  r2Client = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    // Force path style is required for R2 on some endpoints
    forcePathStyle: true,
  })

  return r2Client
}

export function getR2BucketName(): string {
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  if (!bucketName) {
    throw new Error('Missing CLOUDFLARE_R2_BUCKET_NAME environment variable')
  }
  return bucketName
}
