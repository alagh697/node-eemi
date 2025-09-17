const jwt = require('jsonwebtoken');

module.exports = function auth(required = true) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      if (!required) return next(); // accès public (token optionnel)
      return res.status(401).json({ message: 'Token manquant' });
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: payload.sub, role: payload.role || 'user' };
      next();
    } catch {
      return res.status(401).json({ message: 'Token invalide' });
    }
  };
};
