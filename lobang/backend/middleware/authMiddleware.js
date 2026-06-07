// middleware/auth.js (or wherever isLoggedIn lives)
exports.isLoggedIn = (req, res, next) => {
  if (req.session && req.session.user) return next();
  res.status(401).json({ error: 'Not authenticated' });
};
//add more ltr