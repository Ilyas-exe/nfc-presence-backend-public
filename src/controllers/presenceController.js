// controllers/presenceController.js
const Presence = require('../models/Presence');
const Etudiant = require('../models/Etudiant');
const Seance = require('../models/Seance');
const Professeur = require('../models/Professeur'); // Needed for approval
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Mark presence by NFC scan (for tablet/mobile app)
// @route   POST /api/presences/scan
// @access  Private (Requires authentication, e.g., a generic scanner user or professor)
exports.markPresenceByNFC = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nfc_id, seance_id } = req.body;

  try {
    // 1. Validate Seance
    if (!mongoose.Types.ObjectId.isValid(seance_id)) {
      return res.status(400).json({ errors: [{ msg: 'ID de séance invalide.' }] });
    }
    const seance = await Seance.findById(seance_id).populate('filieres_ids'); // Populate filieres for student check
    if (!seance) {
      return res.status(404).json({ errors: [{ msg: 'Séance non trouvée.' }] });
    }
    if (seance.statut === 'Terminée' || seance.statut === 'Annulée') {
      return res.status(400).json({ errors: [{ msg: `Impossible de marquer la présence pour une séance qui est '${seance.statut}'.` }] });
    }

    // 2. Find Etudiant by NFC ID
    const etudiant = await Etudiant.findOne({ nfc_id });
    if (!etudiant) {
      return res.status(404).json({ errors: [{ msg: 'Aucun étudiant trouvé avec cet ID NFC.' }] });
    }

    // 3. Optional: Check if student belongs to one of the seance's filieres
    const studentFiliereId = etudiant.filiere_id.toString();
    const seanceFiliereIds = seance.filieres_ids.map(f => f._id.toString());
    if (!seanceFiliereIds.includes(studentFiliereId)) {
        return res.status(400).json({ 
            errors: [{ msg: `L'étudiant(e) ${etudiant.prenom} ${etudiant.nom} n'appartient pas à l'une des filières de cette séance.` }] 
        });
    }

    // 4. Check for existing presence record for this student in this seance
    let existingPresence = await Presence.findOne({ etudiant_id: etudiant._id, seance_id: seance._id });

    if (existingPresence) {
      if (existingPresence.statut_approbation === 'Approuvé') {
        return res.status(400).json({ 
            message: 'Présence déjà marquée et approuvée pour cet étudiant dans cette séance.',
            data: { etudiant, seance, presence: existingPresence }
        });
      } else if (existingPresence.statut_approbation === 'En attente') {
         return res.status(200).json({ // Or 400 if you don't want to allow re-scan for pending
            message: 'Présence déjà en attente d\'approbation pour cet étudiant dans cette séance.',
            data: { etudiant, seance, presence: existingPresence }
        });
      }
      // If 'Rejeté', we might allow a new 'En attente' record or update the existing one.
      // For simplicity, let's assume a new scan for a rejected presence creates a new 'En attente' or updates.
      // Here, we'll update the existing 'Rejeté' to 'En attente' and reset approval fields.
      if (existingPresence.statut_approbation === 'Rejeté') {
        existingPresence.statut_approbation = 'En attente';
        existingPresence.approved_by_id = null;
        existingPresence.horodatage_approbation = null;
        existingPresence.horodatage_scan = Date.now(); // Update scan time
        await existingPresence.save();
        return res.status(200).json({
            message: 'Présence précédemment rejetée, maintenant marquée comme "En attente".',
            data: { etudiant, seance, presence: existingPresence }
        });
      }
    } else {
        // 5. Create new Presence record
        existingPresence = new Presence({
          etudiant_id: etudiant._id,
          seance_id: seance._id,
          // horodatage_scan is defaulted
          statut_approbation: 'En attente',
        });
        await existingPresence.save();
    }
    
    const presenceToReturn = await Presence.findById(existingPresence._id)
        .populate({ path: 'etudiant_id', select: 'nom prenom matricule photo' })
        .populate({ path: 'seance_id', select: 'date_seance heure_debut module_id', populate: { path: 'module_id', select: 'titre'} });


    // ================== REAL-TIME UPDATE ==================
    // Emit an event to the specific seance room.
    // The frontend dashboard for this seance will be listening in this "room".
    req.io.to(seance_id).emit('new_pending_presence', presenceToReturn);
    // ======================================================

    res.status(201).json({
      message: 'Présence marquée, en attente d\'approbation.',
      data: presenceToReturn
    });

  } catch (err) {
    console.error("Erreur lors du marquage de la présence par NFC:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get all presence records for a specific seance (Admin or Professeur of the seance)
// @route   GET /api/presences/seance/:seanceId
// @access  Private
exports.getPresencesForSeance = async (req, res) => {
  try {
    const seanceId = req.params.seanceId;
    if (!mongoose.Types.ObjectId.isValid(seanceId)) {
      return res.status(400).json({ msg: 'ID de séance invalide.' });
    }

    const seance = await Seance.findById(seanceId);
    if (!seance) {
      return res.status(404).json({ msg: 'Séance non trouvée.' });
    }

    // Authorization: Allow Admin or the Professeur assigned to this seance
    if (req.user.type !== 'admin' && seance.professeur_id.toString() !== req.user.id) {
        return res.status(403).json({ msg: 'Accès non autorisé à ces enregistrements de présence.' });
    }

    const presences = await Presence.find({ seance_id: seanceId })
      .populate({ path: 'etudiant_id', select: 'nom prenom matricule photo filiere_id', populate: { path: 'filiere_id', select: 'nom'} })
      .populate({ path: 'approved_by_id', select: 'nom prenom employeeId' })
      .sort({ horodatage_scan: 1 });

    // Additionally, get all students of the filiere(s) for this seance to show absents
    const etudiantsInSeanceFilieres = await Etudiant.find({ filiere_id: { $in: seance.filieres_ids } })
        .select('nom prenom matricule photo')
        .sort({ nom: 1, prenom: 1 });

    const presentEtudiantIds = presences
        .filter(p => p.statut_approbation === 'Approuvé') // Consider only approved students as present
        .map(p => p.etudiant_id._id.toString());

    const absents = etudiantsInSeanceFilieres.filter(etu => !presentEtudiantIds.includes(etu._id.toString()));

    res.json({
        seance_details: seance, // Consider populating this too if needed by frontend
        presences_enregistrees: presences,
        etudiants_absents: absents, // List of students from seance's filieres who are not marked 'Approuvé'
        total_inscrits_filieres: etudiantsInSeanceFilieres.length,
        total_presences_approuvees: presentEtudiantIds.length
    });

  } catch (err) {
    console.error("Erreur lors de la récupération des présences pour la séance:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};


// @desc    Professor approves or rejects a pending presence
// @route   PUT /api/presences/:presenceId/approve
// @access  Private (Professeur only, for their seances)
exports.approveOrRejectPresence = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const presenceId = req.params.presenceId;
  const { statut_approbation } = req.body; // Should be 'Approuvé' or 'Rejeté'
  const professeurId = req.user.id; // From authMiddleware

  try {
    if (!mongoose.Types.ObjectId.isValid(presenceId)) {
      return res.status(400).json({ msg: 'ID de présence invalide.' });
    }
    const presence = await Presence.findById(presenceId).populate('seance_id');
    if (!presence) {
      return res.status(404).json({ msg: 'Enregistrement de présence non trouvé.' });
    }

    if (!presence.seance_id) {
        return res.status(404).json({ msg: 'Séance associée à cette présence non trouvée.' });
    }
    
    // Authorization: Ensure the logged-in professor is the one teaching this seance
    if (presence.seance_id.professeur_id.toString() !== professeurId) {
      return res.status(403).json({ msg: 'Accès non autorisé. Vous n\'êtes pas le professeur de cette séance.' });
    }

    if (presence.statut_approbation !== 'En attente') {
        return res.status(400).json({ msg: `Cette présence est déjà '${presence.statut_approbation}' et ne peut plus être modifiée par cette action.` });
    }

    presence.statut_approbation = statut_approbation;
    presence.approved_by_id = professeurId;
    presence.horodatage_approbation = Date.now();

    await presence.save();
    
    const updatedPresence = await Presence.findById(presence._id)
        .populate({ path: 'etudiant_id', select: 'nom prenom matricule' })
        .populate({ path: 'seance_id', select: 'date_seance module_id', populate: { path: 'module_id', select: 'titre'} })
        .populate({ path: 'approved_by_id', select: 'nom prenom' });


    // ================== REAL-TIME UPDATE ==================
    // Emit an event to the seance room to notify of the status update.
    req.io.to(presence.seance_id._id.toString()).emit('presence_updated', updatedPresence);
    // ======================================================

    res.json({
      message: `Présence mise à jour à '${statut_approbation}'.`,
      data: updatedPresence,
    });

  } catch (err) {
    console.error("Erreur lors de l'approbation/rejet de la présence:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get pending presences for the logged-in professor's active/upcoming seances
// @route   GET /api/presences/professeur/pending
// @access  Private (Professeur only)
exports.getPendingPresencesForProfesseur = async (req, res) => {
    const professeurId = req.user.id; // from authMiddleware

    try {
        // Find seances for this professor that are not 'Terminée' or 'Annulée'
        const activeSeances = await Seance.find({ 
            professeur_id: professeurId,
            statut: { $in: ['Planifiée', 'Confirmée'] } // Or 'En cours' if you have that status
        }).select('_id'); // We only need the IDs

        if (activeSeances.length === 0) {
            return res.json({ message: 'Aucune séance active ou à venir trouvée pour ce professeur.', data: [] });
        }

        const activeSeanceIds = activeSeances.map(s => s._id);

        const pendingPresences = await Presence.find({
            seance_id: { $in: activeSeanceIds },
            statut_approbation: 'En attente'
        })
        .populate({ path: 'etudiant_id', select: 'nom prenom matricule photo' })
        .populate({ 
            path: 'seance_id', 
            select: 'date_seance heure_debut module_id salle_id', 
            populate: [
                { path: 'module_id', select: 'titre'},
                { path: 'salle_id', select: 'nom'}
            ]
        })
        .sort({ horodatage_scan: 1 });

        res.json(pendingPresences);

    } catch (err) {
        console.error("Erreur lors de la récupération des présences en attente pour le professeur:", err.message);
        res.status(500).send('Erreur Serveur');
    }
};