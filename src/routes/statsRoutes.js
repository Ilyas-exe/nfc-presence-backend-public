// routes/statsRoutes.js
const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
// We might need adminMiddleware for certain admin-only stats routes later

// @route   GET /api/stats/professeur/:professeurId/attendance-summary
// @desc    Get attendance summary for a specific professor
// @access  Private (Admin, or Professeur for their own stats - controller handles specific logic)
router.get(
  '/professeur/:professeurId/attendance-summary',
  authMiddleware, // Ensure user is authenticated
  statsController.getProfesseurAttendanceSummary
);

// @route   GET /api/stats/module/:moduleId/attendance-summary
// @desc    Get attendance summary for a specific module
// @access  Private (Authenticated users - Admin/Professeur)
router.get(
  '/module/:moduleId/attendance-summary',
  authMiddleware, // Ensure user is authenticated
  statsController.getModuleAttendanceSummary
);

// @route   GET /api/stats/etudiant/:etudiantId/attendance-summary
// @desc    Get attendance summary for a specific etudiant
// @access  Private (Authenticated users - Admin/Professeur)
router.get(
  '/etudiant/:etudiantId/attendance-summary',
  authMiddleware, // Ensure user is authenticated
  statsController.getEtudiantAttendanceSummary
);

// @route   GET /api/stats/admin/overview
// @desc    Get a system overview for an Admin
// @access  Private (Admin only)
router.get(
  '/admin/overview',
  [authMiddleware, adminMiddleware], // Ensure user is an authenticated Admin
  statsController.getAdminSystemOverview
);

module.exports = router;