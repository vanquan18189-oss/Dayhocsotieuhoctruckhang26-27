export {
  db,
  auth,
  DEFAULT_FIREBASE_CONFIG,
  firebaseConfig,
  reconnectFirebase,
  getMissingFirebaseEnvVars,
  hasMissingFirebaseEnvVars,
  isFirestoreQuotaExceeded,
  markFirestoreQuotaExceeded,
  resetFirestoreQuotaAndEnableNetwork
} from '../firebaseConfig';
