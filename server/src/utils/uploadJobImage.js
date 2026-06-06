import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, bucketName, getSignedDownloadUrl } from '../config/s3Client.js';
import { env } from '../config/env.js';

export const uploadJobImage = async (file, tenantId) => {
  const ext = file.originalname.split('.').pop();
  const uniqueName = `${crypto.randomUUID()}.${ext}`;

  if (env.aws.accessKeyId && env.aws.secretAccessKey) {
    const s3Key = `${tenantId}/jobs/${uniqueName}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype
    }));
    return s3Key;
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'jobs', tenantId.toString());
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.writeFileSync(path.join(uploadsDir, uniqueName), file.buffer);
  return `/uploads/jobs/${tenantId}/${uniqueName}`;
};

export const resolveJobImageUrl = async (imageUrl) => {
  if (!imageUrl) return null;

  if (imageUrl.startsWith('/uploads/')) {
    const baseUrl = process.env.SERVER_BASE_URL || `http://localhost:${env.port}`;
    return `${baseUrl}${imageUrl}`;
  }

  return getSignedDownloadUrl(imageUrl);
};
