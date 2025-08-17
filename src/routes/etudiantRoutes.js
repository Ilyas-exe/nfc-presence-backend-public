// routes/etudiantRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const etudiantController = require('../controllers/etudiantController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// ALL routes here are Admin-only

// @route   POST api/etudiants
// @desc    Create a new etudiant
// @access  Private (Admin only)
router.post(
  '/',
  [
    authMiddleware,
    adminMiddleware,
    body('matricule', 'Le matricule est requis.').not().isEmpty().trim().escape(),
    body('nom', 'Le nom est requis.').not().isEmpty().trim().escape(),
    body('prenom', 'Le prénom est requis.').not().isEmpty().trim().escape(),
    body('nfc_id', 'L\'ID NFC est requis.').not().isEmpty().trim().escape(),
    body('filiere_id', 'L\'ID de la filière est requis et doit être un ID MongoDB valide.').isMongoId(),
    body('photo').optional().isURL().withMessage('Le lien de la photo doit être une URL valide.'),
  ],
  etudiantController.createEtudiant
);

// @route   GET api/etudiants
// @desc    Get all etudiants
// @access  Private (Admin only)
router.get(
  '/',
  [authMiddleware, adminMiddleware],
  etudiantController.getAllEtudiants
);

// @route   GET api/etudiants/:id
// @desc    Get a single etudiant by ID
// @access  Private (Admin only)
router.get(
  '/:id',
  [authMiddleware, adminMiddleware],
  etudiantController.getEtudiantById
);

// @route   PUT api/etudiants/:id
// @desc    Update an etudiant by ID
// @access  Private (Admin only)
router.put(
  '/:id',
  [
    authMiddleware,
    adminMiddleware,
    // Fields are optional on update
    body('matricule').optional().not().isEmpty().withMessage('Le matricule ne peut pas être vide si fourni.').trim().escape(),
    body('nom').optional().not().isEmpty().withMessage('Le nom ne peut pas être vide si fourni.').trim().escape(),
    body('prenom').optional().not().isEmpty().withMessage('Le prénom ne peut pas être vide si fourni.').trim().escape(),
    body('nfc_id').optional().not().isEmpty().withMessage('L\'ID NFC ne peut pas être vide si fourni.').trim().escape(),
    body('filiere_id').optional().isMongoId().withMessage('L\'ID de la filière doit être un ID MongoDB valide si fourni.'),
    body('photo').optional({ checkFalsy: true }).isURL().withMessage('Le lien de la photo doit être une URL valide si fourni.'), // checkFalsy allows empty string to be valid if optional
  ],
  etudiantController.updateEtudiant
);

// @route   DELETE api/etudiants/:id
// @desc    Delete an etudiant by ID
// @access  Private (Admin only)
router.delete(
  '/:id',
  [authMiddleware, adminMiddleware],
  etudiantController.deleteEtudiant
);

module.exports = router;