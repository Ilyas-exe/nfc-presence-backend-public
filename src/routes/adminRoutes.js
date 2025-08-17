// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// @route   POST api/admins
// @desc    Create a new admin (by an existing Admin)
// @access  Private (Admin only)
router.post(
  '/',
  [
    authMiddleware,
    adminMiddleware,
    body('nom', 'Le nom est requis.').not().isEmpty().trim().escape(),
    body('email', 'Veuillez inclure un email valide.').isEmail().normalizeEmail(),
    body('password', 'Veuillez entrer un mot de passe avec 6 caractères ou plus.').isLength({ min: 6 }),
  ],
  adminController.createAdmin
);

// @route   GET api/admins
// @desc    Get all admins
// @access  Private (Admin only)
router.get(
  '/',
  [authMiddleware, adminMiddleware],
  adminController.getAllAdmins
);

// @route   GET api/admins/:id
// @desc    Get a single admin by ID
// @access  Private (Admin only)
router.get(
  '/:id',
  [authMiddleware, adminMiddleware],
  adminController.getAdminById
);

// @route   PUT api/admins/:id
// @desc    Update an admin by ID
// @access  Private (Admin only)
router.put(
  '/:id',
  [
    authMiddleware,
    adminMiddleware,
    // Fields are optional on update
    body('nom').optional().not().isEmpty().withMessage('Le nom ne peut pas être vide si fourni.').trim().escape(),
    body('email').optional().isEmail().withMessage('Email invalide si fourni.').normalizeEmail(),
    body('password').optional().isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères si fourni.')
  ],
  adminController.updateAdmin
);

// @route   DELETE api/admins/:id
// @desc    Delete an admin by ID
// @access  Private (Admin only)
router.delete(
  '/:id',
  [authMiddleware, adminMiddleware],
  adminController.deleteAdmin
);

module.exports = router;