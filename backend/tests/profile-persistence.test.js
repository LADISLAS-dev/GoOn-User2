const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeAvatarValue,
  buildBootstrapPatch,
} = require('../utils/profilePersistence');

test('normalizeAvatarValue keeps relative uploads path from absolute url', () => {
  const value = 'https://api.example.com/uploads/avatar-1.png';
  assert.equal(normalizeAvatarValue(value), '/uploads/avatar-1.png');
});

test('bootstrap patch does not overwrite existing filled profile fields', () => {
  const existing = {
    name: 'Alice',
    email: 'alice@mail.com',
    bio: 'Senior barber',
    avatar: '/uploads/a.png',
  };

  const patch = buildBootstrapPatch(existing, {
    cleanName: 'Old Name',
    cleanEmail: 'old@mail.com',
    cleanBio: 'old bio',
    avatar: '/uploads/old.png',
    normalizedPushToken: null,
  });

  // Avatar updates are allowed when explicitly provided, core fields must be preserved.
  assert.equal(patch.name, undefined);
  assert.equal(patch.email, undefined);
  assert.equal(patch.bio, undefined);
  assert.equal(patch.avatar, '/uploads/old.png');
});

test('bootstrap patch fills only missing fields', () => {
  const existing = {
    name: '',
    email: '',
    bio: '',
    avatar: '',
  };

  const patch = buildBootstrapPatch(existing, {
    cleanName: 'New Name',
    cleanEmail: 'new@mail.com',
    cleanBio: 'new bio',
    avatar: 'https://api.example.com/uploads/new.png',
    normalizedPushToken: 'ExponentPushToken[x]'
  });

  assert.equal(patch.name, 'New Name');
  assert.equal(patch.email, 'new@mail.com');
  assert.equal(patch.bio, 'new bio');
  assert.equal(patch.avatar, '/uploads/new.png');
  assert.equal(patch.expoPushToken, 'ExponentPushToken[x]');
});

test('uploaded avatar takes precedence over avatar body value', () => {
  const existing = {
    name: 'Alice',
    email: 'alice@mail.com',
    bio: 'bio',
    avatar: '/uploads/old.png',
  };

  const patch = buildBootstrapPatch(existing, {
    avatar: '/uploads/body.png',
    uploadedAvatarUrl: '/uploads/file.png',
  });

  assert.equal(patch.avatar, '/uploads/file.png');
});

test('save then refresh scenario keeps latest profile values', () => {
  const existing = {
    name: 'Alice',
    email: 'alice@mail.com',
    bio: 'old bio',
    avatar: '/uploads/old.png',
  };

  // Save profile step (PATCH /users/profile semantics)
  const saved = {
    ...existing,
    name: 'Alice Pro',
    bio: 'new bio',
    avatar: '/uploads/new.png',
  };

  // Later bootstrap POST with stale auth defaults should not revert name/email/bio.
  const patch = buildBootstrapPatch(saved, {
    cleanName: 'Alice',
    cleanEmail: 'alice@mail.com',
    cleanBio: 'old bio',
  });

  const refreshed = { ...saved, ...patch };

  assert.equal(refreshed.name, 'Alice Pro');
  assert.equal(refreshed.email, 'alice@mail.com');
  assert.equal(refreshed.bio, 'new bio');
  assert.equal(refreshed.avatar, '/uploads/new.png');
});
