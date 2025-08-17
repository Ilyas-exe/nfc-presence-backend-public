// routes/filiereRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator'); // For input validation
const filiereController = require('../controllers/filiereController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// @route   POST api/filieres
// @desc    Create a new filiere
// @access  Private (Admin only)
router.post(
  '/',
  [
    authMiddleware, // First, ensure user is authenticated
    adminMiddleware,  // Then, ensure user is an admin
    // Validate the request body
    body('nom', 'Le nom de la filière est requis et ne peut pas être vide.').not().isEmpty().trim().escape(),
  ],
  filiereController.createFiliere // Finally, call the controller function
);

// @route   GET api/filieres
// @desc    Get all filieres
// @access  Private (Authenticated users - Admin/Professeur)
router.get(
  '/',
  authMiddleware, // Ensure user is authenticated
  filiereController.getAllFilieres
);

// @route   GET api/filieres/:id
// @desc    Get a single filiere by ID
// @access  Private (Authenticated users - Admin/Professeur)
router.get(
  '/:id',
  authMiddleware, // Ensure user is authenticated
  filiereController.getFiliereById
);

// @route   PUT api/filieres/:id
// @desc    Update a filiere by ID
// @access  Private (Admin only)
router.put(
  '/:id',
  [
    authMiddleware,
    adminMiddleware,
    body('nom', 'Le nom de la filière est requis et ne peut pas être vide.').not().isEmpty().trim().escape(),
  ],
  filiereController.updateFiliere
);

// @route   DELETE api/filieres/:id
// @desc    Delete a filiere by ID
// @access  Private (Admin only)
router.delete(
  '/:id',
  [
    authMiddleware,
    adminMiddleware
  ],
  filiereController.deleteFiliere
);


module.exports = router;