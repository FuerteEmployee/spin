import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import config from '../config/index.js';

let auth;

// Verifying ID tokens only needs the project id (Google's public keys are fetched
// automatically), so no service-account file is required.
export function firebaseAuth() {
  if (!auth) {
    const app = getApps()[0] || initializeApp({ projectId: config.firebaseProjectId });
    auth = getAuth(app);
  }
  return auth;
}
