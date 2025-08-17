// routes/moduleRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const moduleController = require('../controllers/moduleController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// @route   POST api/modules
// @desc    Create a new module
// @access  Private (Admin only)
router.post(
  '/',
  [
    authMiddleware,
    adminMiddleware,
    body('titre', 'Le titre du module est requis.').not().isEmpty().trim().escape(),
    // filieres_ids is an array of ObjectIds, more complex validation can be added if needed
    // e.g., body('filieres_ids').optional().isArray(),
    // body('filieres_ids.*').optional().isMongoId().withMessage('Chaque ID de filière doit être un ID MongoDB valide.')
  ],
  moduleController.createModule
);

// @route   GET api/modules
// @desc    Get all modules
// @access  Private (Authenticated users)
router.get(
  '/',
  authMiddleware,
  moduleController.getAllModules
);

// @route   GET api/modules/:id
// @desc    Get a single module by ID
// @access  Private (Authenticated users)
router.get(
  '/:id',
  authMiddleware,
  moduleController.getModuleById
);

// @route   PUT api/modules/:id
// @desc    Update a module by ID
// @access  Private (Admin only)
router.put(
  '/:id',
  [
    authMiddleware,
    adminMiddleware,
    body('titre', 'Le titre du module ne peut pas être vide si fourni.').optional().not().isEmpty().trim().escape(),
    // body('filieres_ids').optional().isArray(),
    // body('filieres_ids.*').optional().isMongoId().withMessage('Chaque ID de filière doit être un ID MongoDB valide.')
  ],
  moduleController.updateModule
);

// @route   DELETE api/modules/:id
// @desc    Delete a module by ID
// @access  Private (Admin only)
router.delete(
  '/:id',
  [
    authMiddleware,
    adminMiddleware
  ],
  moduleController.deleteModule
);

module.exports = router;