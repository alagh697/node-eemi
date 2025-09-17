// Gestion centralisée des erreurs
module.exports = (err, _req, res, _next) => {
  console.error(err);
  // Duplicate key (email unique)
  if (err?.code === 11000) {
    return res.status(409).json({ message: 'Conflit: ressource déjà existante', details: err.keyValue });
  }
  // Validation Mongoose
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ message: 'Validation error', details: err.errors });
  }
  res.status(err.status || 500).json({ message: err.message || 'Erreur serveur' });
};
