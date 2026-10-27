const crypto = require('crypto');

function normalizeInvitationEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Une adresse e-mail valide est requise.');
  }
  return email;
}

function getVerifiedInvitationEmail(firebaseUser = {}) {
  if (firebaseUser.email_verified !== true) {
    throw new Error('Vérifiez votre adresse e-mail avant d’accepter une invitation.');
  }
  return normalizeInvitationEmail(firebaseUser.email);
}

function createInvitationCredentials() {
  const token = crypto.randomBytes(32).toString('base64url');
  const tokenHash = hashInvitationToken(token);
  return { token, tokenHash };
}

function hashInvitationToken(token) {
  const normalized = String(token || '').trim();
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(normalized)) {
    throw new Error('Code d’invitation invalide.');
  }
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

module.exports = {
  createInvitationCredentials,
  getVerifiedInvitationEmail,
  hashInvitationToken,
  normalizeInvitationEmail,
};