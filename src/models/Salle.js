// models/Salle.js
const mongoose = require('mongoose');

const SalleSchema = new mongoose.Schema({
  nom: { type: String, required: true, unique: true, trim: true }, // e.g., "Amphi 1", "Salle B203"
}, { timestamps: true });

module.exports = mongoose.model('Salle', SalleSchema);