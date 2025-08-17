// models/Module.js
const mongoose = require('mongoose');

const ModuleSchema = new mongoose.Schema({
  titre: { type: String, required: true, trim: true }, // e.g., "Java part 1", "Traitement d'image avancé"
  filieres_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Filiere' }] // Module can be part of multiple filieres
}, { timestamps: true });

module.exports = mongoose.model('Module', ModuleSchema);