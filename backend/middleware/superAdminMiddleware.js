const authMiddleware = require('./authMiddleware');

function parseSuperAdminUids(value = process.env.SUPER_ADMIN_UIDS || '') {
  return new Set(
    String(value)
      .split(',')
      .map((uid) => uid.trim())
      .filter(Boolean)
  );
}

function isSuperAdmin(user, allowedUids = parseSuperAdminUids()) {
  if (!user?.uid) return false;
  if (user.superAdmin === true) return true;

  const uidSet = allowedUids instanceof Set ? allowedUids : new Set(allowedUids || []);
  return uidSet.has(String(user.uid));
}

function requireSuperAdmin(req, res, next) {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ error: 'Accès réservé au Super Admin.' });
  }
  return next();
}

function superAdminMiddleware(req, res, next) {
  return authMiddleware(req, res, (error) => {
    if (error) return next(error);
    return requireSuperAdmin(req, res, next);
  });
}

superAdminMiddleware.isSuperAdmin = isSuperAdmin;
superAdminMiddleware.parseSuperAdminUids = parseSuperAdminUids;

module.exports = superAdminMiddleware;