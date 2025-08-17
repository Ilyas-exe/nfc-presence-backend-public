// models/Seance.js
const mongoose = require('mongoose');

const SeanceSchema = new mongoose.Schema({
  module_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Module', required: true },
  professeur_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Professeur', required: true },
  filieres_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Filiere', required: true }],
  salle_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Salle', required: true },
  date_seance: { type: Date, required: true },
  heure_debut: { type: String, required: true }, // e.g., "09:00"
  heure_fin: { type: String, required: true },   // e.g., "12:00"
  statut: {
    type: String,
    enum: ['Planifiée', 'Confirmée', 'Terminée', 'Annulée'], // French enum values
    default: 'Planifiée',
    required: true
  },
}, { timestamps: true });

// Index to prevent exact duplicate sessions and speed up lookups
SeanceSchema.index({ module_id: 1, date_seance: 1, heure_debut: 1, salle_id: 1 }, { unique: true });

module.exports = mongoose.model('Seance', SeanceSchema);