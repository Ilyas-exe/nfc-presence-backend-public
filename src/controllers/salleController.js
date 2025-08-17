// controllers/salleController.js
const Salle = require('../models/Salle');
const Seance = require('../models/Seance'); // To check if salle is used in seances
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Create a new salle
// @route   POST /api/salles
// @access  Private (Admin only)
exports.createSalle = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nom } = req.body;

  try {
    let salle = await Salle.findOne({ nom });
    if (salle) {
      return res.status(400).json({ errors: [{ msg: 'Une salle avec ce nom existe déjà.' }] });
    }

    salle = new Salle({
      nom,
    });

    await salle.save();
    res.status(201).json({
      message: 'Salle créée avec succès',
      data: salle,
    });

  } catch (err) {
    console.error("Erreur lors de la création de la salle:", err.message);
    if (err.code === 11000) {
        return res.status(400).json({ errors: [{ msg: 'Une salle avec ce nom existe déjà (erreur de base de données).' }] });
    }
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get all salles
// @route   GET /api/salles
// @access  Private (Admin only - or Authenticated if professors need to see them)
exports.getAllSalles = async (req, res) => {
  try {
    const salles = await Salle.find().sort({ nom: 1 });
    res.json(salles);
  } catch (err) {
    console.error("Erreur lors de la récupération des salles:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get a single salle by ID
// @route   GET /api/salles/:id
// @access  Private (Admin only - or Authenticated)
exports.getSalleById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'ID de salle invalide' });
    }
    const salle = await Salle.findById(req.params.id);

    if (!salle) {
      return res.status(404).json({ msg: 'Salle non trouvée' });
    }
    res.json(salle);
  } catch (err) {
    console.error("Erreur lors de la récupération de la salle:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Update a salle by ID
// @route   PUT /api/salles/:id
// @access  Private (Admin only)
exports.updateSalle = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nom } = req.body;
  const salleId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(salleId)) {
        return res.status(400).json({ msg: 'ID de salle invalide' });
    }
    let salle = await Salle.findById(salleId);

    if (!salle) {
      return res.status(404).json({ msg: 'Salle non trouvée' });
    }

    if (nom && nom !== salle.nom) {
      const existingSalle = await Salle.findOne({ nom });
      if (existingSalle && existingSalle._id.toString() !== salleId) {
        return res.status(400).json({ errors: [{ msg: 'Une autre salle avec ce nom existe déjà.' }] });
      }
      salle.nom = nom;
    } else if (nom === salle.nom) {
      // If the name is the same, no need to check for duplicates or update
      return res.json({ message: 'Aucune modification détectée pour le nom de la salle.', data: salle });
    }


    await salle.save();
    res.json({ message: 'Salle mise à jour avec succès', data: salle });

  } catch (err) {
    console.error("Erreur lors de la mise à jour de la salle:", err.message);
    if (err.code === 11000) {
        return res.status(400).json({ errors: [{ msg: 'Une autre salle avec ce nom existe déjà (erreur de base de données).' }] });
    }
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Delete a salle by ID
// @route   DELETE /api/salles/:id
// @access  Private (Admin only)
exports.deleteSalle = async (req, res) => {
  const salleId = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(salleId)) {
        return res.status(400).json({ msg: 'ID de salle invalide' });
    }
    const salle = await Salle.findById(salleId);

    if (!salle) {
      return res.status(404).json({ msg: 'Salle non trouvée' });
    }

    // Advanced: Check if the salle is used in any Seances
    const seancesInSalle = await Seance.find({ salle_id: salleId });
    if (seancesInSalle.length > 0) {
      return res.status(400).json({ 
        msg: 'Impossible de supprimer cette salle car elle est utilisée dans une ou plusieurs séances. Veuillez d\'abord déplacer ou annuler ces séances.' 
      });
    }

    await Salle.findByIdAndDelete(salleId);
    res.json({ message: 'Salle supprimée avec succès' });

  } catch (err) {
    console.error("Erreur lors de la suppression de la salle:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};