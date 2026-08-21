const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const rawServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 'firebase-service.json';
const serviceAccountCandidates = [
  path.resolve(rawServiceAccountPath),
  path.join(__dirname, '..', rawServiceAccountPath),
  path.join(__dirname, '..', 'firebase-service.json'),
];

const serviceAccountPath = serviceAccountCandidates.find((candidate) => fs.existsSync(candidate));

function initializeFirebaseAdmin() {
  if (serviceAccountPath) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log(`FIREBASE ADMIN: initialized with local service account (${serviceAccountPath})`);
    return;
  }

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
  if (FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
    const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    console.log('FIREBASE ADMIN: initialized with service account from environment variables');
    return;
  }

  const firebaseJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (firebaseJson) {
    try {
      const serviceAccount = JSON.parse(firebaseJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('FIREBASE ADMIN: initialized with service account from FIREBASE_SERVICE_ACCOUNT_JSON');
      return;
    } catch (err) {
      throw new Error(`Invalid FIREBASE_SERVICE_ACCOUNT_JSON: ${err.message}`);
    }
  }

  const fallbackProjectId = process.env.FIREBASE_PROJECT_ID || 'goone6-549f8';
  try {
    admin.initializeApp({
      projectId: fallbackProjectId,
    });
    console.warn(
      `FIREBASE ADMIN: using projectId-only initialization for ${fallbackProjectId}; set FIREBASE_PROJECT_ID or a service account for stricter config.`
    );
    return;
  } catch (err) {
    throw new Error([
      'Failed to initialize Firebase Admin.',
      'Provide one of these:',
      '- FIREBASE_SERVICE_ACCOUNT_PATH (existing JSON file path)',
      '- FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY (+ FIREBASE_PROJECT_ID)',
      '- FIREBASE_SERVICE_ACCOUNT_JSON',
      `Checked file paths: ${serviceAccountCandidates.join(' | ')}`,
      `Original error: ${err.message}`,
    ].join(' '));
  }
}

initializeFirebaseAdmin();

module.exports = admin;