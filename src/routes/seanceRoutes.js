// routes/seanceRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const seanceController = require('../controllers/seanceController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');

// ALL routes below are Admin-only for now

// @route   POST api/seances
// @desc    Create a new seance
// @access  Private (Admin only)
router.post(
  '/',
  [
    authMiddleware,
    adminMiddleware,
    body('module_id', 'ID du module est requis et doit être un ID MongoDB valide.').isMongoId(),
    body('professeur_id', 'ID du professeur est requis et doit être un ID MongoDB valide.').isMongoId(),
    body('filieres_ids', 'Au moins un ID de filière est requis.').isArray({ min: 1 }),
    body('filieres_ids.*', 'Chaque ID de filière doit être un ID MongoDB valide.').isMongoId(),
    body('salle_id', 'ID de la salle est requis et doit être un ID MongoDB valide.').isMongoId(),
    body('date_seance', 'La date de la séance est requise et doit être une date valide.').isISO8601().toDate(),
    body('heure_debut', 'L\'heure de début est requise (format HH:MM).').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('heure_fin', 'L\'heure de fin est requise (format HH:MM).').matches(/^([01]\d|2[0-3]):([0-5]\d)$/),
    body('statut').optional().isIn(['Planifiée', 'Confirmée', 'Terminée', 'Annulée'])
        .withMessage("Statut non valide. Valeurs autorisées: Planifiée, Confirmée, Terminée, Annulée."),
  ],
  seanceController.createSeance
);

// @route   GET api/seances
// @desc    Get all seances
// @access  Private (Admin only - or Authenticated)
router.get(
  '/',
  [authMiddleware], // Or just authMiddleware if profs can view all
  seanceController.getAllSeances
);

// @route   GET api/seances/:id
// @desc    Get a single seance by ID
// @access  Private (Admin only - or Authenticated)
router.get(
  '/:id',
  [authMiddleware, adminMiddleware], // Or just authMiddleware
  seanceController.getSeanceById
);

// @route   PUT api/seances/:id
// @desc    Update a seance by ID
// @access  Private (Admin only)
router.put(
  '/:id',
  [
    authMiddleware,
    adminMiddleware,
    // Make all fields optional for update, but validate if present
    body('module_id').optional().isMongoId().withMessage('ID du module doit être un ID MongoDB valide si fourni.'),
    body('professeur_id').optional().isMongoId().withMessage('ID du professeur doit être un ID MongoDB valide si fourni.'),
    body('filieres_ids').optional().isArray({ min: 1 }).withMessage('Filieres_ids doit être un tableau avec au moins un élément si fourni.'),
    body('filieres_ids.*').optional().isMongoId().withMessage('Chaque ID de filière doit être un ID MongoDB valide si fourni.'),
    body('salle_id').optional().isMongoId().withMessage('ID de la salle doit être un ID MongoDB valide si fourni.'),
    body('date_seance').optional().isISO8601().toDate().withMessage('La date de la séance doit être une date valide si fournie.'),
    body('heure_debut').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage("L'heure de début doit être au format HH:MM si fournie."),
    body('heure_fin').optional().matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage("L'heure de fin doit être au format HH:MM si fournie."),
    body('statut').optional().isIn(['Planifiée', 'Confirmée', 'Terminée', 'Annulée'])
        .withMessage("Statut non valide si fourni. Valeurs autorisées: Planifiée, Confirmée, Terminée, Annulée."),
  ],
  seanceController.updateSeance
);

// @route   DELETE api/seances/:id
// @desc    Delete (or cancel) a seance by ID
// @access  Private (Admin only)
router.delete(
  '/:id',
  [authMiddleware, adminMiddleware],
  seanceController.deleteSeance
);

module.exports = router;