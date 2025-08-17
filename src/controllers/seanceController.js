// controllers/seanceController.js
const Seance = require('../models/Seance');
const Module = require('../models/Module');
const Professeur = require('../models/Professeur');
const Filiere = require('../models/Filiere');
const Salle = require('../models/Salle');
const Presence = require('../models/Presence'); // To check for presence records before deleting a seance
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Create a new seance (by Admin)
// @route   POST /api/seances
// @access  Private (Admin only)
exports.createSeance = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { module_id, professeur_id, filieres_ids, salle_id, date_seance, heure_debut, heure_fin, statut } = req.body;

  try {
    // Validate existence of related documents
    if (!mongoose.Types.ObjectId.isValid(module_id) || !(await Module.findById(module_id))) {
      return res.status(400).json({ errors: [{ msg: 'Module non valide ou non trouvé.' }] });
    }
    if (!mongoose.Types.ObjectId.isValid(professeur_id) || !(await Professeur.findById(professeur_id))) {
      return res.status(400).json({ errors: [{ msg: 'Professeur non valide ou non trouvé.' }] });
    }
    if (!mongoose.Types.ObjectId.isValid(salle_id) || !(await Salle.findById(salle_id))) {
      return res.status(400).json({ errors: [{ msg: 'Salle non valide ou non trouvée.' }] });
    }

    if (filieres_ids && filieres_ids.length > 0) {
      for (const filiereId of filieres_ids) {
        if (!mongoose.Types.ObjectId.isValid(filiereId) || !(await Filiere.findById(filiereId))) {
          return res.status(400).json({ errors: [{ msg: `L'ID de filière '${filiereId}' n'est pas valide ou la filière n'existe pas.` }] });
        }
      }
    } else {
        return res.status(400).json({ errors: [{ msg: 'Au moins une filière doit être spécifiée.'}] });
    }

    // Basic check for professor availability (can be expanded)
    // This checks if this professor is already scheduled for another seance at the exact same date and overlapping time.
    // More complex logic would check for any overlap.
    const existingSeanceForProf = await Seance.findOne({
      professeur_id,
      date_seance,
      _id: { $ne: null }, // In case we adapt this for update, to exclude the seance itself
      statut: { $ne: 'Annulée' },
      $and: [ // Both conditions must be true for an overlap
        { heure_debut: { $lt: heure_fin } }, // Existing session starts before new one ends
        { heure_fin: { $gt: heure_debut } }  // Existing session ends after new one starts
      ]
    });

    if (existingSeanceForProf) {
      return res.status(400).json({ errors: [{ msg: `Ce professeur est déjà assigné à une autre séance (${existingSeanceForProf.heure_debut}-${existingSeanceForProf.heure_fin}) qui chevauche cette période.` }] });
    }

    // Check for salle availability (Advanced Overlap Check)
    const existingSeanceInSalle = await Seance.findOne({
      salle_id,
      date_seance,
      _id: { $ne: null }, // In case we adapt this for update
      statut: { $ne: 'Annulée' },
      $and: [
        { heure_debut: { $lt: heure_fin } },
        { heure_fin: { $gt: heure_debut } }
      ]
    });

    if (existingSeanceInSalle) {
      return res.status(400).json({ errors: [{ msg: `Cette salle est déjà réservée pour une autre séance (${existingSeanceInSalle.heure_debut}-${existingSeanceInSalle.heure_fin}) qui chevauche cette période.` }] });
    }


    const newSeance = new Seance({
      module_id,
      professeur_id,
      filieres_ids,
      salle_id,
      date_seance,
      heure_debut,
      heure_fin,
      statut: statut || 'Planifiée',
    });

    await newSeance.save();
    // Populate after saving to return rich data
    const seanceToReturn = await Seance.findById(newSeance._id)
        .populate('module_id', 'titre')
        .populate('professeur_id', 'nom prenom employeeId')
        .populate('filieres_ids', 'nom')
        .populate('salle_id', 'nom');

    res.status(201).json({
      message: 'Séance créée avec succès',
      data: seanceToReturn,
    });

  } catch (err) {
    console.error("Erreur lors de la création de la séance:", err.message);
    if (err.code === 11000) { // From the unique index in Seance model
        return res.status(400).json({ errors: [{ msg: 'Une séance identique (module, date, heure, salle) existe déjà.' }] });
    }
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get all seances (by Admin) - Can be enhanced with filters
// @route   GET /api/seances
// @access  Private (Admin only - or Authenticated if needed)
exports.getAllSeances = async (req, res) => {
  try {
    // TODO: Add filtering (by date, professor, module, filiere, etc.) and pagination
    const seances = await Seance.find()
      .populate('module_id', 'titre')
      .populate('professeur_id', 'nom prenom employeeId')
      .populate('filieres_ids', 'nom')
      .populate('salle_id', 'nom')
      .sort({ date_seance: 1, heure_debut: 1 }); // Sort by date then by start time
    res.json(seances);
  } catch (err) {
    console.error("Erreur lors de la récupération des séances:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get a single seance by ID (by Admin)
// @route   GET /api/seances/:id
// @access  Private (Admin only - or Authenticated)
exports.getSeanceById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'ID de séance invalide' });
    }
    const seance = await Seance.findById(req.params.id)
      .populate('module_id', 'titre')
      .populate('professeur_id', 'nom prenom employeeId')
      .populate('filieres_ids', 'nom')
      .populate('salle_id', 'nom');

    if (!seance) {
      return res.status(404).json({ msg: 'Séance non trouvée' });
    }
    res.json(seance);
  } catch (err) {
    console.error("Erreur lors de la récupération de la séance:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Update a seance by ID (by Admin)
// @route   PUT /api/seances/:id
// @access  Private (Admin only)
exports.updateSeance = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const seanceId = req.params.id;
  const updates = req.body; // Contains fields to be updated

  try {
    if (!mongoose.Types.ObjectId.isValid(seanceId)) {
        return res.status(400).json({ msg: 'ID de séance invalide' });
    }
    let seance = await Seance.findById(seanceId);
    if (!seance) {
      return res.status(404).json({ msg: 'Séance non trouvée' });
    }

    // Prevent updates if seance is 'Terminée' or 'Annulée', unless just changing status to 'Annulée' or 'Terminée'
    if ((seance.statut === 'Terminée' || seance.statut === 'Annulée') && 
        updates.statut && 
        updates.statut !== 'Annulée' && 
        updates.statut !== 'Terminée' &&
        Object.keys(updates).length > 1 // More than just status is being updated
        ) {
      return res.status(400).json({ msg: `Impossible de modifier une séance qui est '${seance.statut}' au-delà de son statut.` });
    }
    
    // Determine the values to use for clash detection (existing or new if provided)
    const check_professeur_id = updates.professeur_id || seance.professeur_id.toString();
    const check_salle_id = updates.salle_id || seance.salle_id.toString();
    const check_date_seance = updates.date_seance || seance.date_seance;
    const check_heure_debut = updates.heure_debut || seance.heure_debut;
    const check_heure_fin = updates.heure_fin || seance.heure_fin;

    // Perform clash detection only if relevant fields are being updated or exist
    // Relevant fields: professeur_id, salle_id, date_seance, heure_debut, heure_fin
    let performingClashCheck = false;
    if (updates.professeur_id || updates.salle_id || updates.date_seance || updates.heure_debut || updates.heure_fin) {
        performingClashCheck = true;
    }


    if (performingClashCheck) {
        // Check for professor availability (Advanced Overlap Check)
        const existingSeanceForProf = await Seance.findOne({
          professeur_id: check_professeur_id,
          date_seance: check_date_seance,
          _id: { $ne: seanceId }, // Exclude the current seance being updated
          statut: { $ne: 'Annulée' },
          $and: [
            { heure_debut: { $lt: check_heure_fin } },
            { heure_fin: { $gt: check_heure_debut } }
          ]
        });

        if (existingSeanceForProf) {
          return res.status(400).json({ errors: [{ msg: `Ce professeur est déjà assigné à une autre séance (${existingSeanceForProf.heure_debut}-${existingSeanceForProf.heure_fin}) qui chevauche cette période.` }] });
        }

        // Check for salle availability (Advanced Overlap Check)
        const existingSeanceInSalle = await Seance.findOne({
          salle_id: check_salle_id,
          date_seance: check_date_seance,
          _id: { $ne: seanceId }, // Exclude the current seance being updated
          statut: { $ne: 'Annulée' },
          $and: [
            { heure_debut: { $lt: check_heure_fin } },
            { heure_fin: { $gt: check_heure_debut } }
          ]
        });

        if (existingSeanceInSalle) {
          return res.status(400).json({ errors: [{ msg: `Cette salle est déjà réservée pour une autre séance (${existingSeanceInSalle.heure_debut}-${existingSeanceInSalle.heure_fin}) qui chevauche cette période.` }] });
        }
    }


    // Validate existence of related documents if they are being changed
    if (updates.module_id && updates.module_id !== seance.module_id.toString()) {
      if (!mongoose.Types.ObjectId.isValid(updates.module_id) || !(await Module.findById(updates.module_id))) {
        return res.status(400).json({ errors: [{ msg: 'Nouveau module non valide ou non trouvé.' }] });
      }
      seance.module_id = updates.module_id;
    }
    if (updates.professeur_id && updates.professeur_id !== seance.professeur_id.toString()) {
      if (!mongoose.Types.ObjectId.isValid(updates.professeur_id) || !(await Professeur.findById(updates.professeur_id))) {
        return res.status(400).json({ errors: [{ msg: 'Nouveau professeur non valide ou non trouvé.' }] });
      }
      seance.professeur_id = updates.professeur_id;
    }
    if (updates.salle_id && updates.salle_id !== seance.salle_id.toString()) {
      if (!mongoose.Types.ObjectId.isValid(updates.salle_id) || !(await Salle.findById(updates.salle_id))) {
        return res.status(400).json({ errors: [{ msg: 'Nouvelle salle non valide ou non trouvée.' }] });
      }
      seance.salle_id = updates.salle_id;
    }
    if (updates.filieres_ids) {
      if (updates.filieres_ids.length === 0) {
        return res.status(400).json({ errors: [{ msg: 'Au moins une filière doit être spécifiée.'}] });
      }
      for (const filiereId of updates.filieres_ids) {
        if (!mongoose.Types.ObjectId.isValid(filiereId) || !(await Filiere.findById(filiereId))) {
          return res.status(400).json({ errors: [{ msg: `L'ID de filière '${filiereId}' (dans la nouvelle liste) n'est pas valide ou la filière n'existe pas.` }] });
        }
      }
      seance.filieres_ids = updates.filieres_ids;
    }
    
    // Update other fields
    if (updates.date_seance) seance.date_seance = updates.date_seance;
    if (updates.heure_debut) seance.heure_debut = updates.heure_debut;
    if (updates.heure_fin) seance.heure_fin = updates.heure_fin;
    if (updates.statut) seance.statut = updates.statut;

    await seance.save();
    const seanceToReturn = await Seance.findById(seance._id) // Re-fetch to ensure all updates are captured and populated
        .populate('module_id', 'titre')
        .populate('professeur_id', 'nom prenom employeeId')
        .populate('filieres_ids', 'nom')
        .populate('salle_id', 'nom');

    res.json({ message: 'Séance mise à jour avec succès', data: seanceToReturn });

  } catch (err) {
    console.error("Erreur lors de la mise à jour de la séance:", err.message);
    if (err.code === 11000) {
        return res.status(400).json({ errors: [{ msg: 'Conflit: Une séance identique (module, date, heure, salle) existe déjà ou une autre contrainte unique a été violée.' }] });
    }
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Delete a seance by ID (by Admin) - or rather, cancel it
// @route   DELETE /api/seances/:id
// @access  Private (Admin only)
exports.deleteSeance = async (req, res) => {
  const seanceId = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(seanceId)) {
        return res.status(400).json({ msg: 'ID de séance invalide' });
    }
    const seance = await Seance.findById(seanceId);

    if (!seance) {
      return res.status(404).json({ msg: 'Séance non trouvée' });
    }

    // Check if there are any presence records. If so, better to "cancel" than delete.
    const presenceRecords = await Presence.find({ seance_id: seanceId });
    if (presenceRecords.length > 0) {
      // Option 1: Prevent deletion
      // return res.status(400).json({ msg: 'Impossible de supprimer cette séance car des enregistrements de présence existent. Veuillez l\'annuler à la place.' });
      
      // Option 2: Change status to 'Annulée' instead of deleting
      if (seance.statut !== 'Annulée') {
        seance.statut = 'Annulée';
        await seance.save();
        const seanceToReturn = await Seance.findById(seance._id)
            .populate('module_id', 'titre')
            .populate('professeur_id', 'nom prenom employeeId')
            .populate('filieres_ids', 'nom')
            .populate('salle_id', 'nom');
        return res.json({ message: 'Séance annulée car des enregistrements de présence existent.', data: seanceToReturn });
      } else {
        return res.json({ message: 'La séance est déjà annulée.', data: seance });
      }
    }

    // If no presence records, proceed with deletion
    await Seance.findByIdAndDelete(seanceId);
    res.json({ message: 'Séance supprimée avec succès (aucune présence enregistrée).' });

  } catch (err) {
    console.error("Erreur lors de la suppression/annulation de la séance:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};