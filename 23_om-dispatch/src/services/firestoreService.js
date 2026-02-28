import {
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

const COLLECTION = 'om-dispatch';

/**
 * Check if Firestore is properly configured (has a valid projectId)
 */
export function isFirestoreEnabled() {
  try {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    return !!projectId && projectId !== 'om-dispatch-demo';
  } catch {
    return false;
  }
}

/**
 * Save a data document to Firestore
 * @param {string} docId - Document ID (e.g., 'appState', 'calendarEvents')
 * @param {object} data - Data to save
 */
export async function saveDoc(docId, data) {
  if (!isFirestoreEnabled()) return;
  try {
    await setDoc(doc(db, COLLECTION, docId), {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error(`[Firestore] Failed to save ${docId}:`, e);
  }
}

/**
 * Load a data document from Firestore
 * @param {string} docId - Document ID
 * @returns {object|null} Document data or null
 */
export async function loadDoc(docId) {
  if (!isFirestoreEnabled()) return null;
  try {
    const snap = await getDoc(doc(db, COLLECTION, docId));
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error(`[Firestore] Failed to load ${docId}:`, e);
    return null;
  }
}

/**
 * Subscribe to real-time updates on a document
 * @param {string} docId - Document ID
 * @param {function} callback - Called with document data on each update
 * @returns {function} Unsubscribe function
 */
export function subscribeDoc(docId, callback) {
  if (!isFirestoreEnabled()) return () => {};
  try {
    return onSnapshot(doc(db, COLLECTION, docId), (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      }
    }, (error) => {
      console.error(`[Firestore] Subscription error for ${docId}:`, error);
    });
  } catch (e) {
    console.error(`[Firestore] Failed to subscribe ${docId}:`, e);
    return () => {};
  }
}
