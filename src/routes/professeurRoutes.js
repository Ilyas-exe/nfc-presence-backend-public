// routes/professeurRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const professeurController = require('../controllers/professeurController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// ALL routes here are Admin-only

// @route   POST api/professeurs
// @desc    Create a new professeur
// @access  Private (Admin only)
router.post(
  '/',
  [
    authMiddleware,
    adminMiddleware,
    body('employeeId', 'L\'ID employé est requis.').not().isEmpty().trim().escape(),
    body('nom', 'Le nom est requis.').not().isEmpty().trim().escape(),
    body('email', 'Veuillez inclure un email valide.').isEmail().normalizeEmail(),
    body('password', 'Veuillez entrer un mot de passe avec 6 caractères ou plus.').isLength({ min: 6 })
  ],
  professeurController.createProfesseur
);

// @route   GET api/professeurs
// @desc    Get all professeurs
// @access  Private (Admin only)
router.get(
  '/',
  [authMiddleware, adminMiddleware],
  professeurController.getAllProfesseurs
);

// @route   GET api/professeurs/:id
// @desc    Get a single professeur by ID
// @access  Private (Admin only)
router.get(
  '/:id',
  [authMiddleware, adminMiddleware],
  professeurController.getProfesseurById
);

// @route   PUT api/professeurs/:id
// @desc    Update a professeur by ID
// @access  Private (Admin only)
router.put(
  '/:id',
  [
    authMiddleware,
    adminMiddleware,
    // Optional fields for update, so use .optional()
    body('employeeId', 'L\'ID employé ne peut pas être vide si fourni.').optional().not().isEmpty().trim().escape(),
    body('nom', 'Le nom ne peut pas être vide si fourni.').optional().not().isEmpty().trim().escape(),
    body('email', 'Email invalide si fourni.').optional().isEmail().normalizeEmail(),
    body('password', 'Le mot de passe doit contenir au moins 6 caractères si fourni.').optional().isLength({ min: 6 })
  ],
  professeurController.updateProfesseur
);

// @route   DELETE api/professeurs/:id
// @desc    Delete a professeur by ID
// @access  Private (Admin only)
router.delete(
  '/:id',
  [authMiddleware, adminMiddleware],
  professeurController.deleteProfesseur
);

module.exports = router;