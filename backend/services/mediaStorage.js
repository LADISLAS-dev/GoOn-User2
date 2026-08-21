const fs = require('fs');
const path = require('path');

let cloudinaryClient = null;

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );
}

function getCloudinaryClient() {
  if (!isCloudinaryConfigured()) return null;
  if (cloudinaryClient) return cloudinaryClient;

  const { v2: cloudinary } = require('cloudinary');
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  cloudinaryClient = cloudinary;
  return cloudinaryClient;
}

async function removeLocalFile(filePath) {
  if (!filePath) return;
  try {
    await fs.promises.unlink(filePath);
  } catch (_) {
    // best effort cleanup
  }
}

async function storeUploadedFile(file, options = {}) {
  if (!file?.path) return '';

  const folder = options.folder || 'goon';
  const localPrefix = options.localPrefix || '/uploads/';
  const fallbackUrl = `${localPrefix}${path.basename(file.path)}`;

  const cloudinary = getCloudinaryClient();
  if (!cloudinary) return fallbackUrl;

  try {
    const result = await cloudinary.uploader.upload(file.path, {
      folder,
      resource_type: 'auto',
      use_filename: true,
      unique_filename: true,
    });

    await removeLocalFile(file.path);
    return result?.secure_url || result?.url || fallbackUrl;
  } catch (err) {
    console.warn('Cloudinary upload failed, fallback to local file:', err?.message || err);
    return fallbackUrl;
  }
}

module.exports = {
  isCloudinaryConfigured,
  storeUploadedFile,
};