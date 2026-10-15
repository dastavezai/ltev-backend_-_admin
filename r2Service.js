import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

// Load Cloudflare R2 configuration from environment variables
const accountId = (process.env.CLOUDFLARE_R2_ACCOUNT_ID || '6be0396e42855f3862c4e1a8cea9baa3').trim();
const accessKeyId = (process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '943ee0ed6a941ec25e966241496c63c6').trim();
const secretAccessKey = (process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '676ebc768e59e490adfda8ab086b65fdf2611fbf8b7c05ed6353a119e6cafe33').trim();
const bucketName = (process.env.CLOUDFLARE_R2_BUCKET_NAME || 'inko-dekho-media').trim();
const publicUrl = (process.env.CLOUDFLARE_R2_PUBLIC_URL || 'https://pub-3bf09afa0787401bb90aea9bbfa4788f.r2.dev').trim().replace(/\/$/, '');

let s3Client = null;

try {
  s3Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
  console.log(`[Cloudflare R2] Initialized client for bucket: ${bucketName} (endpoint: ${accountId}.r2.cloudflarestorage.com)`);
} catch (err) {
  console.error('[Cloudflare R2] Failed to initialize S3 client:', err);
}

// Map extensions to content types
const MIME_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

/**
 * Upload a file to Cloudflare R2 storage
 * @param {Buffer|string|object} file - Buffer, local file path, or Multer file object
 * @param {string} customFilename - Custom filename or original file name
 * @param {string} folder - Destination subfolder (e.g. 'kyc', 'issues', 'payments', 'qr')
 * @returns {Promise<string>} Public URL of the uploaded file on Cloudflare R2
 */
export async function uploadToR2(file, customFilename, folder = 'uploads') {
  if (!file) return null;

  // Determine file buffer, filename, and mime type
  let bodyBuffer;
  let filename = customFilename;
  let ext = '.jpg';

  if (typeof file === 'string') {
    // If it's already an http / R2 URL, return as-is
    if (file.startsWith('http://') || file.startsWith('https://')) {
      return file;
    }
    // Check if it's a local file path
    if (fs.existsSync(file)) {
      bodyBuffer = fs.readFileSync(file);
      filename = filename || path.basename(file);
      ext = path.extname(filename).toLowerCase();
    } else {
      return file;
    }
  } else if (Buffer.isBuffer(file)) {
    bodyBuffer = file;
    filename = filename || `file-${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    ext = path.extname(filename).toLowerCase();
  } else if (file && typeof file === 'object') {
    // Multer file object (has path or buffer)
    if (file.buffer) {
      bodyBuffer = file.buffer;
    } else if (file.path && fs.existsSync(file.path)) {
      bodyBuffer = fs.readFileSync(file.path);
    }
    filename = customFilename || file.filename || file.originalname || `file-${Date.now()}.jpg`;
    ext = path.extname(filename).toLowerCase() || (file.mimetype ? `.${file.mimetype.split('/')[1]}` : '.jpg');
  }

  if (!bodyBuffer) {
    throw new Error('Unable to read file content for R2 upload');
  }

  const cleanFilename = path.basename(filename);
  const cleanFolder = (folder || 'uploads').replace(/^\/+|\/+$/g, '');
  const r2Key = `${cleanFolder}/${cleanFilename}`;
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  if (!s3Client) {
    console.warn('[Cloudflare R2] Client not available, falling back to local path');
    return `/uploads/${cleanFolder}/${cleanFilename}`;
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: r2Key,
      Body: bodyBuffer,
      ContentType: contentType,
    });

    await s3Client.send(command);
    const r2PublicUrl = `${publicUrl}/${r2Key}`;
    console.log(`[Cloudflare R2] Successfully uploaded: ${r2PublicUrl}`);
    return r2PublicUrl;
  } catch (error) {
    console.error(`[Cloudflare R2] Upload failed for ${r2Key}:`, error);
    // Fallback to local uploads path if available
    return `/uploads/${cleanFolder}/${cleanFilename}`;
  }
}

/**
 * Helper to ensure an image URL is properly formatted for browser display.
 * If relative (/uploads/...), prepends the backend URL unless on the backend itself.
 */
export function formatImageUrl(url, baseUrl = '') {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('data:')) return url;
  const cleanBase = baseUrl.replace(/\/$/, '');
  return `${cleanBase}${url.startsWith('/') ? '' : '/'}${url}`;
}

export default {
  uploadToR2,
  formatImageUrl,
  s3Client,
  bucketName,
  publicUrl
};
