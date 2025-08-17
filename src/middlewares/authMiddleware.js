// middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config(); // To access JWT_SECRET from .env file

module.exports = function(req, res, next) {
  // 1. Get token from header
  const authHeader = req.header('Authorization');

  // 2. Check if no token or malformed header
  if (!authHeader) {
    return res.status(401).json({ message: 'Accès refusé, aucun token fourni.' });
  }

  // Tokens are usually in the format "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Token mal formaté. Le format attendu est "Bearer <token>".' });
  }

  const token = parts[1];
  if (!token) {
    // This case is technically covered by the length check, but good for clarity
    return res.status(401).json({ message: 'Accès refusé, aucun token fourni après "Bearer ". Avez-vous oublié de l\'inclure ?' });
  }
  
  // 3. Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Add user from payload to request object
    // Based on our authController, the payload was { user: { id: ..., type: ... } }
    if (decoded.user) {
      req.user = decoded.user; // req.user will now have { id: '...', type: '...' }
      next(); // Move to the next middleware or route handler
    } else {
      // This case should not happen if tokens are generated correctly
      console.error("Token décodé mais ne contient pas la propriété 'user':", decoded);
      return res.status(403).json({ message: 'Token invalide (format interne incorrect).' });
    }

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expiré. Veuillez vous reconnecter.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Token invalide ou malformé.' });
    }
    // For other unexpected errors during verification
    console.error("Erreur de vérification du token:", err);
    res.status(403).json({ message: 'Token non valide.' });
  }
};