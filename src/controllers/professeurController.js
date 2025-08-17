// controllers/professeurController.js
const Professeur = require('../models/Professeur');
const Admin = require('../models/Admin'); // For checking email conflicts if admins and profs can't share emails
const Seance = require('../models/Seance'); // To check if professeur is assigned to seances
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Create a new professeur (by Admin)
// @route   POST /api/professeurs
// @access  Private (Admin only)
exports.createProfesseur = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { employeeId, nom, prenom, email, password } = req.body;

  try {
    // Check if user with the same email already exists in Professeur or Admin collections
    let existingProfesseur = await Professeur.findOne({ email });
    if (existingProfesseur) {
      return res.status(400).json({ errors: [{ msg: 'Un professeur avec cet email existe déjà.' }] });
    }
    let existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ errors: [{ msg: 'Un administrateur avec cet email existe déjà.' }] });
    }
    
    // Check for existing employeeId
    existingProfesseur = await Professeur.findOne({ employeeId });
    if (existingProfesseur) {
        return res.status(400).json({ errors: [{ msg: 'Un professeur avec cet ID employé existe déjà.' }] });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newProfesseur = new Professeur({
      employeeId,
      nom,
      prenom,
      email,
      password: hashedPassword,
    });

    await newProfesseur.save();

    const professeurToReturn = { ...newProfesseur._doc };
    delete professeurToReturn.password; // Never return password

    res.status(201).json({
      message: 'Professeur créé avec succès',
      data: professeurToReturn,
    });

  } catch (err) {
    console.error("Erreur lors de la création du professeur:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get all professeurs (by Admin)
// @route   GET /api/professeurs
// @access  Private (Admin only)
exports.getAllProfesseurs = async (req, res) => {
  try {
    const professeurs = await Professeur.find().select('-password').sort({ nom: 1 }); // Exclude password
    res.json(professeurs);
  } catch (err) {
    console.error("Erreur lors de la récupération des professeurs:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get a single professeur by ID (by Admin)
// @route   GET /api/professeurs/:id
// @access  Private (Admin only)
exports.getProfesseurById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'ID de professeur invalide' });
    }
    const professeur = await Professeur.findById(req.params.id).select('-password'); // Exclude password

    if (!professeur) {
      return res.status(404).json({ msg: 'Professeur non trouvé' });
    }
    res.json(professeur);
  } catch (err) {
    console.error("Erreur lors de la récupération du professeur:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Update a professeur by ID (by Admin)
// @route   PUT /api/professeurs/:id
// @access  Private (Admin only)
exports.updateProfesseur = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { employeeId, nom, prenom, email, password } = req.body; // Password is optional here
  const professeurId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(professeurId)) {
        return res.status(400).json({ msg: 'ID de professeur invalide' });
    }
    let professeur = await Professeur.findById(professeurId);

    if (!professeur) {
      return res.status(404).json({ msg: 'Professeur non trouvé' });
    }

    // Check for email conflict if email is being changed
    if (email && email !== professeur.email) {
      let existingProfesseur = await Professeur.findOne({ email });
      if (existingProfesseur && existingProfesseur._id.toString() !== professeurId) {
        return res.status(400).json({ errors: [{ msg: 'Un autre professeur avec cet email existe déjà.' }] });
      }
      let existingAdmin = await Admin.findOne({ email });
      if (existingAdmin) {
          return res.status(400).json({ errors: [{ msg: 'Un administrateur avec cet email existe déjà.' }] });
      }
      professeur.email = email;
    }

    // Check for employeeId conflict if employeeId is being changed
    if (employeeId && employeeId !== professeur.employeeId) {
      let existingProfesseur = await Professeur.findOne({ employeeId });
      if (existingProfesseur && existingProfesseur._id.toString() !== professeurId) {
        return res.status(400).json({ errors: [{ msg: 'Un autre professeur avec cet ID employé existe déjà.' }] });
      }
      professeur.employeeId = employeeId;
    }
    
    if (nom) professeur.nom = nom;
    if (prenom) professeur.prenom = prenom;

    // If password is provided, hash and update it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      professeur.password = await bcrypt.hash(password, salt);
    }

    await professeur.save();

    const professeurToReturn = { ...professeur._doc };
    delete professeurToReturn.password;

    res.json({ message: 'Professeur mis à jour avec succès', data: professeurToReturn });

  } catch (err) {
    console.error("Erreur lors de la mise à jour du professeur:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Delete a professeur by ID (by Admin)
// @route   DELETE /api/professeurs/:id
// @access  Private (Admin only)
exports.deleteProfesseur = async (req, res) => {
  const professeurId = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(professeurId)) {
        return res.status(400).json({ msg: 'ID de professeur invalide' });
    }
    const professeur = await Professeur.findById(professeurId);

    if (!professeur) {
      return res.status(404).json({ msg: 'Professeur non trouvé' });
    }

    // Advanced: Check if the professeur is assigned to any Seances
    const seancesWithProfesseur = await Seance.find({ professeur_id: professeurId });
    if (seancesWithProfesseur.length > 0) {
      return res.status(400).json({ 
        msg: 'Impossible de supprimer ce professeur car il est assigné à une ou plusieurs séances. Veuillez d\'abord réassigner ces séances.' 
      });
    }

    await Professeur.findByIdAndDelete(professeurId);
    res.json({ message: 'Professeur supprimé avec succès' });

  } catch (err) {
    console.error("Erreur lors de la suppression du professeur:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};