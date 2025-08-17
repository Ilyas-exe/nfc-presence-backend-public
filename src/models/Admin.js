// models/Admin.js
const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  nom: { type: String, required: true, trim: true },
  prenom: { type: String, trim: true }, // Optional first name
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true }, // This will be hashed before saving
  // Role is implicitly 'admin' by being in this collection.
  // No need for an explicit role field if this model is only for admins.
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

module.exports = mongoose.model('Admin', AdminSchema);