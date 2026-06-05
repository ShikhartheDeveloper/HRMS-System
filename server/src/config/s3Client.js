import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from './env.js';

// Initialize S3 client
export const s3Client = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId: env.aws.accessKeyId,
    secretAccessKey: env.aws.secretAccessKey
  }
});

export const bucketName = env.aws.s3Bucket;

/**
 * Generate a pre-signed URL for downloading/viewing an S3 object.
 * @param {string} key - The S3 object key
 * @param {number} expiresIn - URL expiry in seconds (default 1 hour)
 * @returns {Promise<string>} Pre-signed URL
 */
export const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });
  return awsGetSignedUrl(s3Client, command, { expiresIn });
};
