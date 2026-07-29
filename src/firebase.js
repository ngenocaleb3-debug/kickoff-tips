import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

// Fill these in from Firebase Console → Project Settings → General → Your apps
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// ---------------------------------------------------------------------------
// Tips feed
// ---------------------------------------------------------------------------

// Live-updates callback whenever any tip is added, edited, or deleted.
// Returns an unsubscribe function — call it on unmount.
export function subscribeTips(callback) {
  const q = query(collection(db, "tips"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error("subscribeTips error:", err)
  );
}

export function publishTip(tip) {
  return addDoc(collection(db, "tips"), { ...tip, createdAt: Date.now() });
}

export function settleTip(id, result) {
  return updateDoc(doc(db, "tips", id), { result });
}

export function deleteTip(id) {
  return deleteDoc(doc(db, "tips", id));
}

// ---------------------------------------------------------------------------
// Admin auth — replaces the hardcoded PIN entirely
// ---------------------------------------------------------------------------

export function adminLogin(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export function adminLogout() {
  return signOut(auth);
}

// Fires immediately with the current user (or null), then on every change.
// Returns an unsubscribe function.
export function watchAdminAuth(callback) {
  return onAuthStateChanged(auth, callback);
}
