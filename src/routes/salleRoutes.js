// routes/salleRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const salleController = require('../controllers/salleController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// @route   POST api/salles
// @desc    Create a new salle
// @access  Private (Admin only)
router.post(
  '/',
  [
    authMiddleware,
    adminMiddleware,
    body('nom', 'Le nom de la salle est requis et ne peut pas être vide.').not().isEmpty().trim().escape(),
  ],
  salleController.createSalle
);

// @route   GET api/salles
// @desc    Get all salles
// @access  Private (Admin only - adjust if professors also need to list all salles)
router.get(
  '/',
  [authMiddleware, adminMiddleware], // Or just authMiddleware if all authenticated users can see
  salleController.getAllSalles
);

// @route   GET api/salles/:id
// @desc    Get a single salle by ID
// @access  Private (Admin only - adjust if professors also need to see)
router.get(
  '/:id',
  [authMiddleware, adminMiddleware], // Or just authMiddleware
  salleController.getSalleById
);

// @route   PUT api/salles/:id
// @desc    Update a salle by ID
// @access  Private (Admin only)
router.put(
  '/:id',
  [
    authMiddleware,
    adminMiddleware,
    body('nom', 'Le nom de la salle est requis et ne peut pas être vide.').not().isEmpty().trim().escape(),
  ],
  salleController.updateSalle
);

// @route   DELETE api/salles/:id
// @desc    Delete a salle by ID
// @access  Private (Admin only)
router.delete(
  '/:id',
  [authMiddleware, adminMiddleware],
  salleController.deleteSalle
);

module.exports = router;