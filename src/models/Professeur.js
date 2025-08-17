// models/Professeur.js
const mongoose = require('mongoose');

const ProfesseurSchema = new mongoose.Schema({
  employeeId: { type: String, required: true, unique: true, trim: true },
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, trim: true }, // Optional first name
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true }, // This will be hashed before saving
  // Role is implicitly 'professeur' by being in this collection.
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

module.exports = mongoose.model('Professeur', ProfesseurSchema);