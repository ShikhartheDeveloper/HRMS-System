import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, bucketName, getSignedDownloadUrl } from '../config/s3Client.js';
import { env } from '../config/env.js';

export const uploadToStorage = async (file, storagePath) => {
  const ext = file.originalname.split('.').pop();
  const uniqueName = `${crypto.randomUUID()}.${ext}`;

  if (env.aws.accessKeyId && env.aws.secretAccessKey) {
    const s3Key = `${storagePath}/${uniqueName}`;
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype
    }));
    return { storageKey: s3Key, storageType: 's3' };
  }

  const localDir = path.join(process.cwd(), 'public', 'uploads', storagePath);
  fs.mkdirSync(localDir, { recursive: true });
  fs.writeFileSync(path.join(localDir, uniqueName), file.buffer);
  return {
    storageKey: `/uploads/${storagePath}/${uniqueName}`,
    storageType: 'local'
  };
};

export const resolveStorageUrl = async (storageKey) => {
  if (!storageKey) return null;

  if (storageKey.startsWith('/uploads/')) {
    const baseUrl = process.env.SERVER_BASE_URL || `http://localhost:${env.port}`;
    return `${baseUrl}${storageKey}`;
  }

  return getSignedDownloadUrl(storageKey);
};
