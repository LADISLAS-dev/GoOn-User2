const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createInvitationCredentials,
  getVerifiedInvitationEmail,
  hashInvitationToken,
  normalizeInvitationEmail,
} = require('../services/teamInvitationService');

test('invitation credentials return a one-time token and a different stored hash', () => {
  const first = createInvitationCredentials();
  const second = createInvitationCredentials();

  assert.match(first.token, /^[A-Za-z0-9_-]{40,64}$/);
  assert.match(first.tokenHash, /^[a-f0-9]{64}$/);
  assert.notEqual(first.token, first.tokenHash);
  assert.notEqual(first.token, second.token);
  assert.equal(hashInvitationToken(first.token), first.tokenHash);
});

test('invitation email is normalized and validated', () => {
  assert.equal(normalizeInvitationEmail(' Team@Example.com '), 'team@example.com');
  assert.throws(() => normalizeInvitationEmail('invalid'));
});

test('acceptance requires the verified Firebase email claim', () => {
  assert.equal(getVerifiedInvitationEmail({ email: 'TEAM@example.com', email_verified: true }), 'team@example.com');
  assert.throws(() => getVerifiedInvitationEmail({ email: 'team@example.com', email_verified: false }));
  assert.throws(() => getVerifiedInvitationEmail({ email: 'invalid', email_verified: true }));
});

test('invitation hashing rejects malformed codes', () => {
  assert.throws(() => hashInvitationToken('short'));
  assert.throws(() => hashInvitationToken('token with spaces that is too long to be valid'));
});