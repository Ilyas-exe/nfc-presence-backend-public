// routes/presenceRoutes.js
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const presenceController = require('../controllers/presenceController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware'); // For admin-specific views if any

// Middleware to check if user is a Professeur
const professeurMiddleware = (req, res, next) => {
    if (req.user.type !== 'professeur') {
        return res.status(403).json({ msg: 'Accès refusé. Seuls les professeurs peuvent effectuer cette action.' });
    }
    next();
};


// @route   POST api/presences/scan
// @desc    Mark presence by NFC scan
// @access  Private (Authenticated, e.g., tablet app logs in as a specific prof or generic scanner user)
router.post(
  '/scan',
  [
    authMiddleware, // The scanning device/app must be authenticated
    body('nfc_id', 'ID NFC est requis.').not().isEmpty().trim(),
    body('seance_id', 'ID de la séance est requis et doit être un ID MongoDB valide.').isMongoId(),
  ],
  presenceController.markPresenceByNFC
);

// @route   GET api/presences/seance/:seanceId
// @desc    Get all presence records for a specific seance
// @access  Private (Admin or Professeur of the seance)
router.get(
  '/seance/:seanceId',
  authMiddleware, // Both admin and prof need to be authenticated
  presenceController.getPresencesForSeance
);

// @route   GET api/presences/professeur/pending
// @desc    Get pending presences for the logged-in professor
// @access  Private (Professeur only)
router.get(
    '/professeur/pending',
    [authMiddleware, professeurMiddleware],
    presenceController.getPendingPresencesForProfesseur
);


// @route   PUT api/presences/:presenceId/approve
// @desc    Professor approves or rejects a pending presence
// @access  Private (Professeur only)
router.put(
  '/:presenceId/approve',
  [
    authMiddleware,
    professeurMiddleware, // Ensure it's a professor
    body('statut_approbation', 'Le statut d\'approbation est requis (Approuvé ou Rejeté).')
        .isIn(['Approuvé', 'Rejeté']),
  ],
  presenceController.approveOrRejectPresence
);


// TODO: Add routes for Admin to view/manage all presences if needed, or delete a presence record (carefully)

module.exports = router;