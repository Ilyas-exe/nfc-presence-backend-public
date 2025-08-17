// controllers/etudiantController.js
const Etudiant = require('../models/Etudiant');
const Filiere = require('../models/Filiere'); // To validate filiere_id
const Presence = require('../models/Presence'); // To check if student has presence records
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Create a new etudiant (by Admin)
// @route   POST /api/etudiants
// @access  Private (Admin only)
exports.createEtudiant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { matricule, nom, prenom, nfc_id, photo, filiere_id } = req.body;

  try {
    // Check for existing matricule or nfc_id
    let existingEtudiant = await Etudiant.findOne({ $or: [{ matricule }, { nfc_id }] });
    if (existingEtudiant) {
      if (existingEtudiant.matricule === matricule) {
        return res.status(400).json({ errors: [{ msg: 'Un étudiant avec ce matricule existe déjà.' }] });
      }
      if (existingEtudiant.nfc_id === nfc_id) {
        return res.status(400).json({ errors: [{ msg: 'Un étudiant avec cet ID NFC existe déjà.' }] });
      }
    }

    // Validate filiere_id
    if (!mongoose.Types.ObjectId.isValid(filiere_id)) {
        return res.status(400).json({ errors: [{ msg: `L'ID de filière '${filiere_id}' n'est pas valide.` }] });
    }
    const filiereExists = await Filiere.findById(filiere_id);
    if (!filiereExists) {
      return res.status(400).json({ errors: [{ msg: `La filière avec l'ID ${filiere_id} n'existe pas.` }] });
    }

    const newEtudiant = new Etudiant({
      matricule,
      nom,
      prenom,
      nfc_id,
      photo,
      filiere_id,
    });

    await newEtudiant.save();
    // Populate filiere_id before sending response
    const etudiantToReturn = await Etudiant.findById(newEtudiant._id).populate('filiere_id', 'nom');

    res.status(201).json({
      message: 'Étudiant créé avec succès',
      data: etudiantToReturn,
    });

  } catch (err) {
    console.error("Erreur lors de la création de l'étudiant:", err.message);
    // Handle other potential errors, e.g., unique index violations if not caught above
    if (err.code === 11000) {
        if (err.keyPattern && err.keyPattern.matricule) {
            return res.status(400).json({ errors: [{ msg: 'Un étudiant avec ce matricule existe déjà (erreur de base de données).' }] });
        }
        if (err.keyPattern && err.keyPattern.nfc_id) {
            return res.status(400).json({ errors: [{ msg: 'Un étudiant avec cet ID NFC existe déjà (erreur de base de données).' }] });
        }
    }
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get all etudiants (by Admin)
// @route   GET /api/etudiants
// @access  Private (Admin only)
exports.getAllEtudiants = async (req, res) => {
  try {
    const etudiants = await Etudiant.find()
      .populate('filiere_id', 'nom') // Populate with filiere name
      .sort({ nom: 1, prenom: 1 });
    res.json(etudiants);
  } catch (err) {
    console.error("Erreur lors de la récupération des étudiants:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get a single etudiant by ID (by Admin)
// @route   GET /api/etudiants/:id
// @access  Private (Admin only)
exports.getEtudiantById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'ID d\'étudiant invalide' });
    }
    const etudiant = await Etudiant.findById(req.params.id).populate('filiere_id', 'nom');

    if (!etudiant) {
      return res.status(404).json({ msg: 'Étudiant non trouvé' });
    }
    res.json(etudiant);
  } catch (err) {
    console.error("Erreur lors de la récupération de l'étudiant:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Update an etudiant by ID (by Admin)
// @route   PUT /api/etudiants/:id
// @access  Private (Admin only)
exports.updateEtudiant = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { matricule, nom, prenom, nfc_id, photo, filiere_id } = req.body;
  const etudiantId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(etudiantId)) {
        return res.status(400).json({ msg: 'ID d\'étudiant invalide' });
    }
    let etudiant = await Etudiant.findById(etudiantId);

    if (!etudiant) {
      return res.status(404).json({ msg: 'Étudiant non trouvé' });
    }

    // Check for matricule conflict if matricule is being changed
    if (matricule && matricule !== etudiant.matricule) {
      const existingEtudiant = await Etudiant.findOne({ matricule });
      if (existingEtudiant && existingEtudiant._id.toString() !== etudiantId) {
        return res.status(400).json({ errors: [{ msg: 'Un autre étudiant avec ce matricule existe déjà.' }] });
      }
      etudiant.matricule = matricule;
    }

    // Check for nfc_id conflict if nfc_id is being changed
    if (nfc_id && nfc_id !== etudiant.nfc_id) {
      const existingEtudiant = await Etudiant.findOne({ nfc_id });
      if (existingEtudiant && existingEtudiant._id.toString() !== etudiantId) {
        return res.status(400).json({ errors: [{ msg: 'Un autre étudiant avec cet ID NFC existe déjà.' }] });
      }
      etudiant.nfc_id = nfc_id;
    }

    // Validate and update filiere_id if provided
    if (filiere_id && filiere_id !== etudiant.filiere_id.toString()) {
        if (!mongoose.Types.ObjectId.isValid(filiere_id)) {
            return res.status(400).json({ errors: [{ msg: `L'ID de filière '${filiere_id}' n'est pas valide.` }] });
        }
      const filiereExists = await Filiere.findById(filiere_id);
      if (!filiereExists) {
        return res.status(400).json({ errors: [{ msg: `La filière avec l'ID ${filiere_id} n'existe pas.` }] });
      }
      etudiant.filiere_id = filiere_id;
    }

    if (nom) etudiant.nom = nom;
    if (prenom) etudiant.prenom = prenom;
    if (photo !== undefined) etudiant.photo = photo; // Allow setting photo to empty string or null

    await etudiant.save();
    const etudiantToReturn = await Etudiant.findById(etudiant._id).populate('filiere_id', 'nom');

    res.json({ message: 'Étudiant mis à jour avec succès', data: etudiantToReturn });

  } catch (err) {
    console.error("Erreur lors de la mise à jour de l'étudiant:", err.message);
     if (err.code === 11000) { // Duplicate key error
        if (err.keyPattern && err.keyPattern.matricule) {
            return res.status(400).json({ errors: [{ msg: 'Un autre étudiant avec ce matricule existe déjà (DB).' }] });
        }
        if (err.keyPattern && err.keyPattern.nfc_id) {
            return res.status(400).json({ errors: [{ msg: 'Un autre étudiant avec cet ID NFC existe déjà (DB).' }] });
        }
    }
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Delete an etudiant by ID (by Admin)
// @route   DELETE /api/etudiants/:id
// @access  Private (Admin only)
exports.deleteEtudiant = async (req, res) => {
  const etudiantId = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(etudiantId)) {
        return res.status(400).json({ msg: 'ID d\'étudiant invalide' });
    }
    const etudiant = await Etudiant.findById(etudiantId);

    if (!etudiant) {
      return res.status(404).json({ msg: 'Étudiant non trouvé' });
    }

    // Advanced: Check if the etudiant has any presence records
    const presenceRecords = await Presence.find({ etudiant_id: etudiantId });
    if (presenceRecords.length > 0) {
      return res.status(400).json({
        msg: 'Impossible de supprimer cet étudiant car il a des enregistrements de présence. Veuillez d\'abord supprimer ces enregistrements ou archiver l\'étudiant.'
      });
    }

    await Etudiant.findByIdAndDelete(etudiantId);
    res.json({ message: 'Étudiant supprimé avec succès' });

  } catch (err) {
    console.error("Erreur lors de la suppression de l'étudiant:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};