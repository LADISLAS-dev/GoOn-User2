const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '../uploads');
const TEMP_UPLOAD_DIR = path.join(__dirname, '../uploads-temp');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const tempStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype || !file.mimetype.startsWith('image/')) {
    return cb(new Error('Only images allowed'), false);
  }
  cb(null, true);
};

const mediaFileFilter = (req, file, cb) => {
  const mimetype = file?.mimetype || '';
  if (mimetype.startsWith('image/') || mimetype.startsWith('video/')) {
    return cb(null, true);
  }

  return cb(new Error('Only images and videos allowed'), false);
};

const SAFE_MESSAGE_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
]);

const messageFileFilter = (req, file, cb) => {
  const mimetype = file?.mimetype;
  if (!mimetype) {
    return cb(new Error('Invalid file type'), false);
  }

  if (mimetype.startsWith('image/') || SAFE_MESSAGE_MIMES.has(mimetype)) {
    return cb(null, true);
  }

  return cb(new Error('Unsupported file type'), false);
};

const validateImageFiles = async (req, res, next) => {
  const files = req.files || (req.file ? [req.file] : []);
  if (!files.length) {
    return next();
  }

  try {
    const { fileTypeFromBuffer } = await import('file-type');

    for (const file of files) {
      const buffer = await fs.promises.readFile(file.path);
      const type = await fileTypeFromBuffer(buffer);
      if (!type || !type.mime.startsWith('image/')) {
        await Promise.all(
          files.map((f) => fs.promises.unlink(f.path).catch(() => {})),
        );
        return res.status(400).json({ error: 'Only images are allowed' });
      }
    }

    next();
  } catch (err) {
    await Promise.all(
      (req.files || (req.file ? [req.file] : [])).map((f) =>
        fs.promises.unlink(f.path).catch(() => {}),
      ),
    );
    next(err);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

const tempUpload = multer({
  storage: tempStorage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

const mediaUpload = multer({
  storage,
  fileFilter: mediaFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

module.exports = upload;
module.exports.tempUpload = tempUpload;
module.exports.mediaUpload = mediaUpload;
module.exports.validate = validateImageFiles;
module.exports.messageFileFilter = messageFileFilter;