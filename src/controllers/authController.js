// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Professeur = require('../models/Professeur');
const dotenv = require('dotenv');

dotenv.config(); // To access JWT_SECRET from .env file

// Login user (Admin or Professeur)
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Veuillez fournir un email et un mot de passe' });
  }

  try {
    let user = null;
    let userType = null;

    // 1. Check if the user is an Admin
    const admin = await Admin.findOne({ email });
    if (admin) {
      const isMatch = await bcrypt.compare(password, admin.password);
      if (isMatch) {
        user = admin;
        userType = 'admin';
      }
    }

    // 2. If not an Admin or password didn't match, check if the user is a Professeur
    if (!user) {
      const professeur = await Professeur.findOne({ email });
      if (professeur) {
        const isMatch = await bcrypt.compare(password, professeur.password);
        if (isMatch) {
          user = professeur;
          userType = 'professeur';
        }
      }
    }

    // 3. If user not found in either collection or password mismatch
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // 4. User found and password matched, create JWT
    const payload = {
      user: {
        id: user.id, // or user._id, Mongoose usually provides .id as a virtual getter for ._id
        type: userType,
        // You can add more non-sensitive info if needed, e.g., user.nom
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '5h' }, // Token expires in 5 hours (adjust as needed)
      (err, token) => {
        if (err) throw err;
        res.json({
          message: 'Connexion réussie',
          token,
          user: { // Send back some user info (optional, but often useful)
            id: user.id,
            nom: user.nom,
            prenom: user.prenom,
            email: user.email,
            type: userType,
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).send('Erreur serveur');
  }
};

// Note: Functions for creating Admins and Professors will be in their respective controllers
// (e.g., adminController.js, professeurController.js) and will be protected routes accessible only by an Admin.