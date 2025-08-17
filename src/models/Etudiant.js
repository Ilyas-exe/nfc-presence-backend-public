// models/Etudiant.js
const mongoose = require('mongoose');

const EtudiantSchema = new mongoose.Schema({
  matricule: { type: String, required: true, unique: true, trim: true },
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, required: true, trim: true },
  nfc_id: { type: String, required: true, unique: true, trim: true },
  photo: { type: String }, // URL to the photo
  filiere_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Filiere', required: true },
}, { timestamps: true });

module.exports = mongoose.model('Etudiant', EtudiantSchema);