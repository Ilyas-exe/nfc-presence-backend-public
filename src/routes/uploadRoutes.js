// routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const multerUpload = require('../middlewares/multerConfig'); // Our configured multer instance

// @route   POST /api/uploads/etudiant/:etudiantId/photo
// @desc    Upload or update a student's photo
// @access  Private (Admin only)
router.post(
  '/etudiant/:etudiantId/photo',
  [
    authMiddleware,  // 1. Check if user is authenticated
    adminMiddleware, // 2. Check if authenticated user is an admin
    multerUpload.single('etudiantPhoto') // 3. Process the file upload using multer.
                                        // 'etudiantPhoto' is the field name expected in the form-data.
  ],
  uploadController.uploadEtudiantPhoto // 4. Finally, call the controller function to handle Cloudinary upload & DB update
);

// You could add more upload routes here later if needed, e.g., for professor photos

module.exports = router;