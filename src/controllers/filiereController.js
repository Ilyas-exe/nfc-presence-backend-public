// controllers/filiereController.js
const Filiere = require('../models/Filiere');
const { validationResult } = require('express-validator'); // We'll add validation in the route

// @desc    Create a new filiere
// @route   POST /api/filieres
// @access  Private (Admin only)
exports.createFiliere = async (req, res) => {
  // Check for validation errors (we'll define these in the route)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nom } = req.body;

  try {
    // Check if filiere with the same name already exists
    let filiere = await Filiere.findOne({ nom });
    if (filiere) {
      return res.status(400).json({ errors: [{ msg: 'Une filière avec ce nom existe déjà.' }] });
    }

    // Create new filiere instance
    filiere = new Filiere({
      nom,
    });

    // Save to database
    await filiere.save();

    res.status(201).json({
      message: 'Filière créée avec succès',
      data: filiere,
    });

  } catch (err) {
    console.error("Erreur lors de la création de la filière:", err.message);
    // Check for duplicate key error specifically if `unique: true` in schema isn't caught by findOne
    if (err.code === 11000) {
        return res.status(400).json({ errors: [{ msg: 'Une filière avec ce nom existe déjà (erreur de base de données).' }] });
    }
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get all filieres
// @route   GET /api/filieres
// @access  Private (Authenticated users - Admin/Professeur)
exports.getAllFilieres = async (req, res) => {
  try {
    const filieres = await Filiere.find().sort({ nom: 1 }); // Sort by name
    res.json(filieres);
  } catch (err) {
    console.error("Erreur lors de la récupération des filières:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get a single filiere by ID
// @route   GET /api/filieres/:id
// @access  Private (Authenticated users - Admin/Professeur)
exports.getFiliereById = async (req, res) => {
  try {
    const filiere = await Filiere.findById(req.params.id);

    if (!filiere) {
      return res.status(404).json({ msg: 'Filière non trouvée' });
    }
    res.json(filiere);
  } catch (err) {
    console.error("Erreur lors de la récupération de la filière:", err.message);
    if (err.kind === 'ObjectId') { // If the ID format is invalid
        return res.status(400).json({ msg: 'ID de filière invalide' });
    }
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Update a filiere by ID
// @route   PUT /api/filieres/:id
// @access  Private (Admin only)
exports.updateFiliere = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nom } = req.body;
  const filiereId = req.params.id;

  try {
    let filiere = await Filiere.findById(filiereId);

    if (!filiere) {
      return res.status(404).json({ msg: 'Filière non trouvée' });
    }

    // Check if the new name already exists for another filiere
    if (nom && nom !== filiere.nom) {
      const existingFiliere = await Filiere.findOne({ nom });
      if (existingFiliere && existingFiliere._id.toString() !== filiereId) {
        return res.status(400).json({ errors: [{ msg: 'Une autre filière avec ce nom existe déjà.' }] });
      }
      filiere.nom = nom;
    }

    await filiere.save();
    res.json({ message: 'Filière mise à jour avec succès', data: filiere });

  } catch (err) {
    console.error("Erreur lors de la mise à jour de la filière:", err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ msg: 'ID de filière invalide' });
    }
    if (err.code === 11000) { // Duplicate key error from DB (unique index on nom)
        return res.status(400).json({ errors: [{ msg: 'Une autre filière avec ce nom existe déjà (erreur de base de données).' }] });
    }
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Delete a filiere by ID
// @route   DELETE /api/filieres/:id
// @access  Private (Admin only)
exports.deleteFiliere = async (req, res) => {
  const filiereId = req.params.id;
  try {
    const filiere = await Filiere.findById(filiereId);

    if (!filiere) {
      return res.status(404).json({ msg: 'Filière non trouvée' });
    }

    // TODO: Consider implications before deleting a filiere.
    // For example, what happens to Etudiants, Modules, or Seances linked to this filiere?
    // For now, we'll do a direct delete. More complex logic might be needed later
    // (e.g., check if any other documents reference this filiere).

    await Filiere.findByIdAndDelete(filiereId); // Or filiere.remove() if you have Mongoose middleware on remove

    res.json({ message: 'Filière supprimée avec succès' });

  } catch (err) {
    console.error("Erreur lors de la suppression de la filière:", err.message);
    if (err.kind === 'ObjectId') {
      return res.status(400).json({ msg: 'ID de filière invalide' });
    }
    res.status(500).send('Erreur Serveur');
  }
};