// controllers/moduleController.js
const Module = require('../models/Module');
const Filiere = require('../models/Filiere'); // To validate filiere_ids
const Seance = require('../models/Seance'); // To check if module is used in seances before delete
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');


// @desc    Create a new module
// @route   POST /api/modules
// @access  Private (Admin only)
exports.createModule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { titre, filieres_ids } = req.body;

  try {
    // Optional: Validate that all filiere_ids provided actually exist
    if (filieres_ids && filieres_ids.length > 0) {
      for (const filiereId of filieres_ids) {
        if (!mongoose.Types.ObjectId.isValid(filiereId)) {
          return res.status(400).json({ errors: [{ msg: `L'ID de filière '${filiereId}' n'est pas valide.` }] });
        }
        const filiereExists = await Filiere.findById(filiereId);
        if (!filiereExists) {
          return res.status(400).json({ errors: [{ msg: `La filière avec l'ID ${filiereId} n'existe pas.` }] });
        }
      }
    }

    const newModule = new Module({
      titre,
      filieres_ids: filieres_ids || [],
    });

    await newModule.save();
    res.status(201).json({
      message: 'Module créé avec succès',
      data: newModule,
    });

  } catch (err) {
    console.error("Erreur lors de la création du module:", err.message);
    // A more specific check for duplicate titles might be needed if you add a unique index on 'titre'
    // For example, if 'titre' should be unique PER filiere, the logic would be more complex.
    // For now, we assume titles can be repeated, and uniqueness is by _id.
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get all modules
// @route   GET /api/modules
// @access  Private (Authenticated users - Admin/Professeur)
exports.getAllModules = async (req, res) => {
  try {
    const modules = await Module.find().populate('filieres_ids', 'nom').sort({ titre: 1 });
    // .populate('filieres_ids', 'nom') will replace filiere_ids with the actual filiere documents (only showing their 'nom')
    res.json(modules);
  } catch (err) {
    console.error("Erreur lors de la récupération des modules:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Get a single module by ID
// @route   GET /api/modules/:id
// @access  Private (Authenticated users - Admin/Professeur)
exports.getModuleById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ msg: 'ID de module invalide' });
    }
    const module = await Module.findById(req.params.id).populate('filieres_ids', 'nom');

    if (!module) {
      return res.status(404).json({ msg: 'Module non trouvé' });
    }
    res.json(module);
  } catch (err) {
    console.error("Erreur lors de la récupération du module:", err.message);
    // The ObjectId check above handles most malformed ID errors for findById
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Update a module by ID
// @route   PUT /api/modules/:id
// @access  Private (Admin only)
exports.updateModule = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { titre, filieres_ids } = req.body;
  const moduleId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
        return res.status(400).json({ msg: 'ID de module invalide' });
    }
    let module = await Module.findById(moduleId);

    if (!module) {
      return res.status(404).json({ msg: 'Module non trouvé' });
    }

    // Optional: Validate that all filiere_ids provided actually exist
    if (filieres_ids) { // only validate if it's part of the request
      if (filieres_ids.length > 0) {
        for (const filiereId of filieres_ids) {
          if (!mongoose.Types.ObjectId.isValid(filiereId)) {
            return res.status(400).json({ errors: [{ msg: `L'ID de filière '${filiereId}' n'est pas valide.` }] });
          }
          const filiereExists = await Filiere.findById(filiereId);
          if (!filiereExists) {
            return res.status(400).json({ errors: [{ msg: `La filière avec l'ID ${filiereId} n'existe pas.` }] });
          }
        }
      }
      module.filieres_ids = filieres_ids;
    }


    if (titre) {
      module.titre = titre;
    }
    // Note: If titre needs to be unique, add similar checks as in createModule or Filiere's update.

    await module.save();
    const populatedModule = await Module.findById(module._id).populate('filieres_ids', 'nom');
    res.json({ message: 'Module mis à jour avec succès', data: populatedModule });

  } catch (err) {
    console.error("Erreur lors de la mise à jour du module:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};

// @desc    Delete a module by ID
// @route   DELETE /api/modules/:id
// @access  Private (Admin only)
exports.deleteModule = async (req, res) => {
  const moduleId = req.params.id;
  try {
    if (!mongoose.Types.ObjectId.isValid(moduleId)) {
        return res.status(400).json({ msg: 'ID de module invalide' });
    }
    const module = await Module.findById(moduleId);

    if (!module) {
      return res.status(404).json({ msg: 'Module non trouvé' });
    }

    // Advanced: Check if the module is used in any Seances
    const seancesUsingModule = await Seance.find({ module_id: moduleId });
    if (seancesUsingModule.length > 0) {
      return res.status(400).json({ 
        msg: 'Impossible de supprimer ce module car il est utilisé dans une ou plusieurs séances. Veuillez d\'abord dissocier le module de ces séances.' 
      });
    }

    await Module.findByIdAndDelete(moduleId);
    res.json({ message: 'Module supprimé avec succès' });

  } catch (err) {
    console.error("Erreur lors de la suppression du module:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};