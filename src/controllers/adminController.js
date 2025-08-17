// controllers/adminController.js
const Admin = require('../models/Admin');
const Professeur = require('../models/Professeur'); // To check email conflict with professeurs
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// @desc    Create a new admin (by an existing Admin)
// @route   POST /api/admins
// @access  Private (Admin only)
exports.createAdmin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nom, prenom, email, password } = req.body;

  try {
    // Check if user with the same email already exists in Admin or Professeur collections
    let existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ errors: [{ msg: 'Un administrateur avec cet email existe déjà.' }] });
    }
    let existingProfesseur = await Professeur.findOne({ email });
    if (existingProfesseur) {
      return res.status(400).json({ errors: [{ msg: 'Un professeur avec cet email existe déjà.' }] });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({
      nom,
      prenom,
      email,
      password: hashedPassword,
      // 'role' is implicitly 'admin' by using the Admin model
    });

    await newAdmin.save();

    // Don't send back the password, even hashed
    const adminToReturn = { ...newAdmin._doc };
    delete adminToReturn.password;

    res.status(201).json({
      message: 'Administrateur créé avec succès',
      data: adminToReturn,
    });

  } catch (err) {
    console.error("Erreur lors de la création de l'administrateur:", err.message);
    if (err.code === 11000) { // Mongoose duplicate key error (if unique index on email fails for some reason)
        return res.status(400).json({ errors: [{ msg: 'Cet email est déjà utilisé (erreur base de données).'}] });
    }
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get all admins (by an existing Admin)
// @route   GET /api/admins
// @access  Private (Admin only)
exports.getAllAdmins = async (req, res) => {
  try {
    // Exclude password from the result
    const admins = await Admin.find().select('-password').sort({ nom: 1, prenom: 1 });
    res.json(admins);
  } catch (err) {
    console.error("Erreur lors de la récupération des administrateurs:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get a single admin by ID (by an existing Admin)
// @route   GET /api/admins/:id
// @access  Private (Admin only)
exports.getAdminById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'ID d\'administrateur invalide' });
    }
    // Exclude password from the result
    const admin = await Admin.findById(req.params.id).select('-password');

    if (!admin) {
      return res.status(404).json({ msg: 'Administrateur non trouvé' });
    }
    res.json(admin);
  } catch (err) {
    console.error("Erreur lors de la récupération de l'administrateur:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Update an admin by ID (by an existing Admin)
// @route   PUT /api/admins/:id
// @access  Private (Admin only)
exports.updateAdmin = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { nom, prenom, email, password } = req.body; // password is optional for update
  const adminIdToUpdate = req.params.id;
  const currentAdminId = req.user.id; // ID of the admin making the request

  try {
    if (!mongoose.Types.ObjectId.isValid(adminIdToUpdate)) {
      return res.status(400).json({ msg: 'ID d\'administrateur invalide' });
    }
    let admin = await Admin.findById(adminIdToUpdate);

    if (!admin) {
      return res.status(404).json({ msg: 'Administrateur non trouvé' });
    }

    // Check for email conflict if email is being changed
    if (email && email !== admin.email) {
      let existingAdmin = await Admin.findOne({ email });
      if (existingAdmin && existingAdmin._id.toString() !== adminIdToUpdate) {
        return res.status(400).json({ errors: [{ msg: 'Un autre administrateur avec cet email existe déjà.' }] });
      }
      let existingProfesseur = await Professeur.findOne({ email });
      if (existingProfesseur) {
        return res.status(400).json({ errors: [{ msg: 'Un professeur avec cet email existe déjà.' }] });
      }
      admin.email = email;
    }

    if (nom) admin.nom = nom;
    if (prenom !== undefined) admin.prenom = prenom; // Allow empty string for prenom

    // If password is provided, hash and update it
    if (password) {
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }

    await admin.save();

    const adminToReturn = { ...admin._doc };
    delete adminToReturn.password;

    res.json({ message: 'Administrateur mis à jour avec succès', data: adminToReturn });

  } catch (err) {
    console.error("Erreur lors de la mise à jour de l'administrateur:", err.message);
     if (err.code === 11000) { // Mongoose duplicate key error (if unique index on email fails for some reason)
        return res.status(400).json({ errors: [{ msg: 'Cet email est déjà utilisé (erreur base de données).'}] });
    }
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Delete an admin by ID (by an existing Admin)
// @route   DELETE /api/admins/:id
// @access  Private (Admin only)
exports.deleteAdmin = async (req, res) => {
  const adminIdToDelete = req.params.id;
  const currentAdminId = req.user.id; // ID of the admin making the request

  try {
    if (!mongoose.Types.ObjectId.isValid(adminIdToDelete)) {
      return res.status(400).json({ msg: 'ID d\'administrateur invalide' });
    }

    // Prevent an admin from deleting themselves
    if (adminIdToDelete === currentAdminId) {
      return res.status(400).json({ msg: 'Vous не pouvez pas supprimer votre propre compte administrateur.' }); // "You cannot delete your own admin account."
    }

    const admin = await Admin.findById(adminIdToDelete);
    if (!admin) {
      return res.status(404).json({ msg: 'Administrateur non trouvé' });
    }

    // Optional: Add a check to ensure at least one admin remains in the system.
    const adminCount = await Admin.countDocuments();
    if (adminCount <= 1) {
      return res.status(400).json({ msg: 'Impossible de supprimer le dernier administrateur du système.' });
    }

    await Admin.findByIdAndDelete(adminIdToDelete);
    res.json({ message: 'Administrateur supprimé avec succès' });

  } catch (err) {
    console.error("Erreur lors de la suppression de l'administrateur:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};