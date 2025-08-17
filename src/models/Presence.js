// models/Presence.js
const mongoose = require('mongoose');

const PresenceSchema = new mongoose.Schema({
  etudiant_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Etudiant', required: true },
  seance_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Seance', required: true },
  horodatage_scan: { type: Date, default: Date.now },
  statut_approbation: {
    type: String,
    enum: ['En attente', 'Approuvé', 'Rejeté'], // French enum values
    default: 'En attente'
  },
  approved_by_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Professeur' }, // Professor who approved/rejected
  horodatage_approbation: { type: Date }, // Timestamp of approval action
}, { timestamps: true });

// A student can only have one presence record (pending or approved/rejected) per session
PresenceSchema.index({ etudiant_id: 1, seance_id: 1 }, { unique: true });

module.exports = mongoose.model('Presence', PresenceSchema);