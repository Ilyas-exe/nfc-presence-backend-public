// controllers/uploadController.js
const Etudiant = require('../models/Etudiant');
const cloudinary = require('../config/cloudinaryConfig'); // Our configured Cloudinary instance
const mongoose = require('mongoose');
const streamifier = require('streamifier'); // To help stream buffer to Cloudinary

// @desc    Upload or update a student's photo
// @route   POST /api/uploads/etudiant/:etudiantId/photo
// @access  Private (Admin only for now)
exports.uploadEtudiantPhoto = async (req, res) => {
  const { etudiantId } = req.params;

  if (!req.file) {
    return res.status(400).json({ errors: [{ msg: 'Aucun fichier image n\'a été téléversé.' }] });
  }

  if (!mongoose.Types.ObjectId.isValid(etudiantId)) {
    return res.status(400).json({ errors: [{ msg: 'ID d\'étudiant invalide.' }] });
  }

  try {
    const etudiant = await Etudiant.findById(etudiantId);
    if (!etudiant) {
      return res.status(404).json({ errors: [{ msg: 'Étudiant non trouvé.' }] });
    }

    // If the student already has a photo, we might want to delete the old one from Cloudinary
    // For simplicity now, we'll just upload the new one.
    // To delete old one: if (etudiant.photo_public_id) { await cloudinary.uploader.destroy(etudiant.photo_public_id); }
    // You would need to store etudiant.photo_public_id in your Etudiant model if you want to do this.

    // Upload image to Cloudinary
    // We use a stream to upload from the buffer req.file.buffer
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `nfc_presence_system/etudiant_photos`, // Optional: organize in a folder
        public_id: `${etudiant.matricule}_${Date.now()}`, // Use matricule and timestamp for a unique public_id
        overwrite: true, // Overwrite if an image with the same public_id exists (useful if not using timestamp)
        // resource_type: "image" // auto-detected usually
      },
      async (error, result) => {
        if (error) {
          console.error('Cloudinary Upload Error:', error);
          return res.status(500).json({ errors: [{ msg: 'Erreur lors du téléversement de l\'image vers Cloudinary.' }] });
        }

        // Update student's photo URL
        etudiant.photo = result.secure_url;
        // Optionally store public_id if you want to delete old images later
        // etudiant.photo_public_id = result.public_id; 
        await etudiant.save();
        
        const updatedEtudiant = await Etudiant.findById(etudiant._id).populate('filiere_id', 'nom');

        res.json({
          message: 'Photo de l\'étudiant téléversée et mise à jour avec succès.',
          data: updatedEtudiant,
        });
      }
    );

    // Pipe the buffer into the upload stream
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);

  } catch (err) {
    console.error("Erreur interne du serveur lors du téléversement de la photo:", err.message);
    res.status(500).send('Erreur Serveur');
  }
};