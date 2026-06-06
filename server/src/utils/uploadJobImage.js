import crypto from 'crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, bucketName, getSignedDownloadUrl } from '../config/s3Client.js';
import { env } from '../config/env.js';

export const uploadJobImage = async (file, tenantId) => {
  // If AWS S3 credentials are configured, upload to S3
  if (env.aws.accessKeyId && env.aws.secretAccessKey) {
    const ext = file.originalname.split('.').pop();
    const uniqueName = `${crypto.randomUUID()}.${ext}`;
    const s3Key = `${tenantId}/jobs/${uniqueName}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype
    }));
    return s3Key;
  }

  // Fallback: store image as base64 data URI in MongoDB
  // This works reliably on platforms with ephemeral filesystems (e.g. Render)
  const base64 = file.buffer.toString('base64');
  return `data:${file.mimetype};base64,${base64}`;
};

export const resolveJobImageUrl = async (imageUrl) => {
  if (!imageUrl) return null;

  // Data URIs are already resolved — return as-is
  if (imageUrl.startsWith('data:')) {
    return imageUrl;
  }

  // Legacy local file paths (won't survive Render restarts, but handle gracefully)
  if (imageUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.SERVER_BASE_URL || `http://localhost:${env.port}`;
    return `${baseUrl}${imageUrl}`;
  }

  // S3 key — generate a pre-signed download URL
  return getSignedDownloadUrl(imageUrl);
};
