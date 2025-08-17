// middlewares/multerConfig.js
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage(); // Stores file in RAM as a Buffer

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true); // Accept file
  } else {
    cb(new Error('Type de fichier non pris en charge. Seules les images sont autorisées.'), false); // Reject file
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB file size limit
  },
});

module.exports = upload;