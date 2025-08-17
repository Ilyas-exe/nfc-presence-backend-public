// models/Filiere.js
const mongoose = require('mongoose');

const FiliereSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true, trim: true }, // e.g., "Génie Informatique - 2GI"
}, { timestamps: true });

module.exports = mongoose.model('Filiere', FiliereSchema);