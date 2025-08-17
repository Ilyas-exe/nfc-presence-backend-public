// routes/auth.js
const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');


//CREATE a rate limiter configuration
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per 'window' (15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    message: 'Trop de tentatives de connexion depuis cette adresse IP, veuillez réessayer après 15 minutes.'
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user (Admin or Professeur) & get token
// @access  Public
router.post(
  '/login',
  //loginLimiter,
  [
    // Validate input
    body('email', 'Veuillez inclure un email valide').isEmail(),
    body('password', 'Le mot de passe est requis').exists(),
  ],
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
  login // Call the login function from authController
);

module.exports = router;