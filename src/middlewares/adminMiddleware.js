// middlewares/adminMiddleware.js

module.exports = function(req, res, next) {
  // This middleware assumes that authMiddleware has already run
  // and populated req.user with { id: '...', type: '...' }

  if (!req.user) {
    // This case should ideally be caught by authMiddleware if no token is provided,
    // but it's a good safeguard.
    return res.status(401).json({ message: 'Accès non autorisé. Utilisateur non authentifié.' });
  }

  if (req.user.type !== 'admin') {
    return res.status(403).json({ message: 'Accès refusé. Seuls les administrateurs peuvent accéder à cette ressource.' });
  }

  // If we reach here, the user is authenticated and is an admin
  next(); // Proceed to the route handler
};