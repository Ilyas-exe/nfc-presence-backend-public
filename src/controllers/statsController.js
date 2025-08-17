// controllers/statsController.js
const mongoose = require('mongoose');
const Professeur = require('../models/Professeur');
const Seance = require('../models/Seance');
const Etudiant = require('../models/Etudiant');
const Presence = require('../models/Presence');
const Module = require('../models/Module');
const Filiere = require('../models/Filiere');
const Salle = require('../models/Salle');

// @desc    Get attendance summary for a specific professor
// @route   GET /api/stats/professeur/:professeurId/attendance-summary
// @access  Private (Admin, or Professeur for their own stats)
exports.getProfesseurAttendanceSummary = async (req, res) => {
  const { professeurId } = req.params;
  const requestingUserId = req.user.id;
  const requestingUserType = req.user.type;

  try {
    // Validate professeurId
    if (!mongoose.Types.ObjectId.isValid(professeurId)) {
      return res.status(400).json({ msg: 'ID de professeur invalide.' });
    }

    // Authorization: Admin can see any summary. Professor can only see their own.
    if (requestingUserType === 'professeur' && professeurId !== requestingUserId) {
      return res.status(403).json({ msg: 'Accès non autorisé. Vous ne pouvez consulter que vos propres statistiques.' });
    }

    const professeur = await Professeur.findById(professeurId);
    if (!professeur) {
      return res.status(404).json({ msg: 'Professeur non trouvé.' });
    }

    // Find all seances taught by this professor (consider only 'Terminée' for past attendance)
    const seancesDuProfesseur = await Seance.find({ 
        professeur_id: professeurId,
        statut: 'Terminée' // Focusing on completed seances for attendance rate
    })
    .populate('module_id', 'titre')
    .populate('filieres_ids', 'nom'); // We'll need filiere_ids to count expected students

    if (seancesDuProfesseur.length === 0) {
      return res.json({
        message: 'Aucune séance terminée trouvée pour ce professeur pour calculer les statistiques.',
        professeur: { _id: professeur._id, nom: professeur.nom, prenom: professeur.prenom },
        summaryByModule: {},
        overallAttendanceRate: 0,
        totalSeancesConsidered: 0,
      });
    }

    const summaryByModule = {};
    let totalExpectedOverall = 0;
    let totalApprovedOverall = 0;

    for (const seance of seancesDuProfesseur) {
      if (!seance.module_id) continue; // Should not happen with good data

      const moduleId = seance.module_id._id.toString();
      const moduleTitre = seance.module_id.titre;

      if (!summaryByModule[moduleId]) {
        summaryByModule[moduleId] = {
          moduleTitre,
          totalSeances: 0,
          totalExpectedStudents: 0,
          totalApprovedPresences: 0,
          seancesDetails: []
        };
      }

      summaryByModule[moduleId].totalSeances++;

      // Calculate expected students for this seance based on its filieres
      // This assumes all students in the filiere(s) of the seance are expected.
      // A more precise count might involve checking student enrollment for that specific module/filiere.
      let expectedStudentsForSeance = 0;
      if (seance.filieres_ids && seance.filieres_ids.length > 0) {
        const filiereObjectIds = seance.filieres_ids.map(f => f._id);
        expectedStudentsForSeance = await Etudiant.countDocuments({ filiere_id: { $in: filiereObjectIds } });
      }
      
      summaryByModule[moduleId].totalExpectedStudents += expectedStudentsForSeance;
      totalExpectedOverall += expectedStudentsForSeance;

      // Count approved presences for this seance
      const approvedPresencesForSeance = await Presence.countDocuments({
        seance_id: seance._id,
        statut_approbation: 'Approuvé',
      });
      
      summaryByModule[moduleId].totalApprovedPresences += approvedPresencesForSeance;
      totalApprovedOverall += approvedPresencesForSeance;
      
      summaryByModule[moduleId].seancesDetails.push({
          seanceId: seance._id,
          date: seance.date_seance,
          heure_debut: seance.heure_debut,
          expected: expectedStudentsForSeance,
          approved: approvedPresencesForSeance,
          attendanceRate: expectedStudentsForSeance > 0 ? (approvedPresencesForSeance / expectedStudentsForSeance) * 100 : 0
      });
    }

    // Calculate attendance rates for each module
    for (const modId in summaryByModule) {
      const modData = summaryByModule[modId];
      modData.attendanceRate = modData.totalExpectedStudents > 0 
          ? parseFloat(((modData.totalApprovedPresences / modData.totalExpectedStudents) * 100).toFixed(2))
          : 0;
    }
    
    const overallAttendanceRate = totalExpectedOverall > 0
        ? parseFloat(((totalApprovedOverall / totalExpectedOverall) * 100).toFixed(2))
        : 0;


    res.json({
      professeur: { _id: professeur._id, nom: professeur.nom, prenom: professeur.prenom, employeeId: professeur.employeeId },
      summaryByModule,
      overallAttendanceRate,
      totalSeancesConsidered: seancesDuProfesseur.length,
      totalExpectedOverall,
      totalApprovedOverall
    });

  } catch (err) {
    console.error("Erreur lors de la récupération du résumé de présence du professeur:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get attendance summary for a specific module
// @route   GET /api/stats/module/:moduleId/attendance-summary
// @access  Private (Authenticated users - Admin/Professeur)
exports.getModuleAttendanceSummary = async (req, res) => {
  const { moduleId } = req.params;
  // const requestingUserId = req.user.id; // Not strictly needed for authorization here if any auth user can view
  // const requestingUserType = req.user.type; // Could be used for more granular access if needed

  try {
    // Validate moduleId
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
      return res.status(400).json({ msg: 'ID de module invalide.' });
    }

    const module = await Module.findById(moduleId).populate('filieres_ids', 'nom');
    if (!module) {
      return res.status(404).json({ msg: 'Module non trouvé.' });
    }

    // Find all 'Terminée' seances for this module
    const seancesDuModule = await Seance.find({
      module_id: moduleId,
      statut: 'Terminée',
    })
    .populate('professeur_id', 'nom prenom employeeId')
    .populate('filieres_ids', 'nom') // For context
    .populate('salle_id', 'nom');   // For context

    if (seancesDuModule.length === 0) {
      return res.json({
        message: 'Aucune séance terminée trouvée pour ce module pour calculer les statistiques.',
        module: { _id: module._id, titre: module.titre, filieres: module.filieres_ids },
        overallAttendanceRate: 0,
        totalSeancesConsidered: 0,
        totalExpectedOverall: 0,
        totalApprovedOverall: 0,
        seancesDetails: []
      });
    }

    let totalExpectedOverall = 0;
    let totalApprovedOverall = 0;
    const seancesDetails = [];

    for (const seance of seancesDuModule) {
      let expectedStudentsForSeance = 0;
      if (seance.filieres_ids && seance.filieres_ids.length > 0) {
        const filiereObjectIds = seance.filieres_ids.map(f => f._id);
        expectedStudentsForSeance = await Etudiant.countDocuments({ filiere_id: { $in: filiereObjectIds } });
      }
      totalExpectedOverall += expectedStudentsForSeance;

      const approvedPresencesForSeance = await Presence.countDocuments({
        seance_id: seance._id,
        statut_approbation: 'Approuvé',
      });
      totalApprovedOverall += approvedPresencesForSeance;

      seancesDetails.push({
        seanceId: seance._id,
        date: seance.date_seance,
        heure_debut: seance.heure_debut,
        professeur: seance.professeur_id ? `${seance.professeur_id.prenom || ''} ${seance.professeur_id.nom}`.trim() : 'N/A',
        salle: seance.salle_id ? seance.salle_id.nom : 'N/A',
        filieres: seance.filieres_ids.map(f => f.nom).join(', '),
        expected: expectedStudentsForSeance,
        approved: approvedPresencesForSeance,
        attendanceRate: expectedStudentsForSeance > 0 
            ? parseFloat(((approvedPresencesForSeance / expectedStudentsForSeance) * 100).toFixed(2)) 
            : 0,
      });
    }
    
    const overallAttendanceRate = totalExpectedOverall > 0
        ? parseFloat(((totalApprovedOverall / totalExpectedOverall) * 100).toFixed(2))
        : 0;

    res.json({
      module: { 
        _id: module._id, 
        titre: module.titre, 
        filieresAssociees: module.filieres_ids // Filieres this module is generally associated with
      },
      overallAttendanceRate,
      totalSeancesConsidered: seancesDuModule.length,
      totalExpectedOverall,
      totalApprovedOverall,
      seancesDetails, // Detailed breakdown per seance
    });

  } catch (err) {
    console.error("Erreur lors de la récupération du résumé de présence du module:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};


// @desc    Get attendance summary for a specific etudiant
// @route   GET /api/stats/etudiant/:etudiantId/attendance-summary
// @access  Private (Admin, or Professeur for students in their filieres, or Etudiant for self if implemented)
exports.getEtudiantAttendanceSummary = async (req, res) => {
  const { etudiantId } = req.params;
  const requestingUser = req.user; // { id, type }

  try {
    // Validate etudiantId
    if (!mongoose.Types.ObjectId.isValid(etudiantId)) {
      return res.status(400).json({ msg: 'ID d\'étudiant invalide.' });
    }

    const etudiant = await Etudiant.findById(etudiantId).populate('filiere_id', 'nom');
    if (!etudiant) {
      return res.status(404).json({ msg: 'Étudiant non trouvé.' });
    }

    // Authorization:
    // - Admin can see any student's summary.
    // - Professor can see summary for students in filieres they teach or are generally associated with.
    //   (More complex logic might be needed for precise professor authorization based on their modules/seances)
    // - If student login was implemented, student could see their own.
    // For now, let's allow Admin and any Professor to view (can be refined).
    if (requestingUser.type !== 'admin' && requestingUser.type !== 'professeur') {
         return res.status(403).json({ msg: 'Accès non autorisé à ces statistiques.' });
    }


    // Find all 'Terminée' seances where this student's filiere was expected
    const seancesExpected = await Seance.find({
      filieres_ids: etudiant.filiere_id._id, // Student's filiere must be one of the seance's filieres
      statut: 'Terminée'
    })
    .populate('module_id', 'titre')
    .populate('professeur_id', 'nom prenom')
    .sort({ date_seance: 1, heure_debut: 1 });

    const presenceRecords = await Presence.find({ etudiant_id: etudiantId })
        .populate({
            path: 'seance_id',
            select: 'date_seance heure_debut module_id statut',
            populate: { path: 'module_id', select: 'titre' }
        });

    let approvedCount = 0;
    let rejectedCount = 0;
    let pendingCount = 0;
    let attendedSeanceIds = [];

    const detailedPresence = presenceRecords.map(p => {
        if (p.statut_approbation === 'Approuvé') approvedCount++;
        else if (p.statut_approbation === 'Rejeté') rejectedCount++;
        else if (p.statut_approbation === 'En attente') pendingCount++;
        
        if(p.seance_id) { // Ensure seance_id is populated and exists
            attendedSeanceIds.push(p.seance_id._id.toString());
            return {
                seance_id: p.seance_id._id,
                module_titre: p.seance_id.module_id ? p.seance_id.module_id.titre : 'N/A',
                date_seance: p.seance_id.date_seance,
                heure_debut: p.seance_id.heure_debut,
                statut_scan: p.statut_approbation,
                horodatage_scan: p.horodatage_scan,
                statut_seance: p.seance_id.statut
            };
        }
        return null; // Should ideally not happen if data is clean
    }).filter(p => p !== null);


    const missedSeances = seancesExpected.filter(seance => !attendedSeanceIds.includes(seance._id.toString()))
        .map(s => ({
            seance_id: s._id,
            module_titre: s.module_id.titre,
            date_seance: s.date_seance,
            heure_debut: s.heure_debut,
            professeur: s.professeur_id ? `${s.professeur_id.prenom || ''} ${s.professeur_id.nom}`.trim() : 'N/A',
        }));

    const totalExpectedSeances = seancesExpected.length;
    const attendanceRate = totalExpectedSeances > 0 
        ? parseFloat(((approvedCount / totalExpectedSeances) * 100).toFixed(2)) 
        : 0;

    res.json({
      etudiant: {
        _id: etudiant._id,
        matricule: etudiant.matricule,
        nom: etudiant.nom,
        prenom: etudiant.prenom,
        filiere: etudiant.filiere_id.nom,
        photo: etudiant.photo
      },
      attendanceRate,
      totalSeancesExpected: totalExpectedSeances,
      seancesAttendedAndApproved: approvedCount,
      seancesAttendedAndRejected: rejectedCount,
      seancesAttendedPending: pendingCount,
      seancesMissed: missedSeances.length,
      detailedPresenceRecords: detailedPresence,
      detailedMissedSeances: missedSeances
    });

  } catch (err) {
    console.error("Erreur lors de la récupération du résumé de présence de l'étudiant:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get a system overview for an Admin
// @route   GET /api/stats/admin/overview
// @access  Private (Admin only)
exports.getAdminSystemOverview = async (req, res) => {
  // Authorization is handled by adminMiddleware in the route

  try {
    const totalFilieres = await Filiere.countDocuments();
    const totalModules = await Module.countDocuments();
    const totalProfesseurs = await Professeur.countDocuments();
    const totalEtudiants = await Etudiant.countDocuments();
    const totalSalles = await Salle.countDocuments();
    
    const totalSeances = await Seance.countDocuments();
    const totalSeancesTerminees = await Seance.countDocuments({ statut: 'Terminée' });
    const totalSeancesPlanifiees = await Seance.countDocuments({ statut: 'Planifiée' }); // Includes 'Confirmée' if you use that too
    const totalSeancesAnnulees = await Seance.countDocuments({ statut: 'Annulée' });

    const totalPresenceRecords = await Presence.countDocuments();
    const totalApprovedPresences = await Presence.countDocuments({ statut_approbation: 'Approuvé' });
    const totalPendingPresences = await Presence.countDocuments({ statut_approbation: 'En attente' });
    const totalRejectedPresences = await Presence.countDocuments({ statut_approbation: 'Rejeté' });

    // Calculate overall system attendance rate based on 'Terminée' seances
    // This is a more complex calculation as it needs total expected spots vs total approved.
    // For simplicity here, we'll provide raw counts.
    // A true overall attendance rate would iterate through terminée seances like in other summaries.
    // Let's calculate it based on total 'Approuvé' vs 'Approuvé' + 'Rejeté' for simplicity in this overview.
    // Or, more accurately, based on 'Approuvé' for 'Terminée' seances vs expected students for those seances.
    
    // Simplified overall attendance based on approved vs (approved + rejected + pending for Terminee seances)
    // This is not a perfect metric without iterating all seances again like in previous functions.
    // Let's calculate an approximate value or focus on raw counts for this overview.
    
    // For a more accurate overall attendance rate, we'd need to sum up expected students for all 'Terminée' seances
    // and sum up 'Approuvé' presences for those same seances.
    // Let's do a slightly simplified version for this overview:
    let overallExpectedInTerminatedSeances = 0;
    const termineeSeances = await Seance.find({ statut: 'Terminée' }).populate('filieres_ids');
    
    for (const seance of termineeSeances) {
        if (seance.filieres_ids && seance.filieres_ids.length > 0) {
            const filiereObjectIds = seance.filieres_ids.map(f => f._id);
            const expected = await Etudiant.countDocuments({ filiere_id: { $in: filiereObjectIds } });
            overallExpectedInTerminatedSeances += expected;
        }
    }
    
    const overallAttendanceRate = (overallExpectedInTerminatedSeances > 0 && totalApprovedPresences > 0)
        ? parseFloat(((totalApprovedPresences / overallExpectedInTerminatedSeances) * 100).toFixed(2))
        : 0;


    res.json({
      counts: {
        filieres: totalFilieres,
        modules: totalModules,
        professeurs: totalProfesseurs,
        etudiants: totalEtudiants,
        salles: totalSalles,
      },
      seances: {
        total: totalSeances,
        terminees: totalSeancesTerminees,
        planifiees_confirmees: totalSeancesPlanifiees, // Name implies it could include confirmed ones
        annulees: totalSeancesAnnulees,
      },
      presences: {
        total_enregistrees: totalPresenceRecords,
        approuvees: totalApprovedPresences,
        en_attente: totalPendingPresences,
        rejetees: totalRejectedPresences,
      },
      approximatedOverallAttendanceRate: overallAttendanceRate, // Based on Terminee seances
      notes: "Le taux de présence global approximatif est basé sur les séances terminées et le nombre total d'étudiants approuvés par rapport au nombre total d'étudiants attendus dans les filières de ces séances."
    });

  } catch (err) {
    console.error("Erreur lors de la récupération de l'aperçu du système:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};