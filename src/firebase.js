import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy 
} from "firebase/firestore";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDqLcYw50m52gK6PFZ1LVIy7VuNUUKmFT8",
  authDomain: "kickoff-tips.firebaseapp.com",
  projectId: "kickoff-tips",
  storageBucket: "kickoff-tips.firebasestorage.app",
  messagingSenderId: "263942240393",
  appId: "1:263942240393:web:21b4a9c4c88d93aaf4ee58",
  measurementId: "G-LWFB90RLDZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// --- Auth Functions ---
export const adminLogin = (email, password) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const adminLogout = () => {
  return signOut(auth);
};

export const watchAdminAuth = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// --- Tip Management Functions ---
export const publishTip = (tipData) => {
  return addDoc(collection(db, "tips"), {
    ...tipData,
    createdAt: new Date().toISOString()
  });
};

export const deleteTip = (tipId) => {
  return deleteDoc(doc(db, "tips", tipId));
};

export const settleTip = (tipId, status) => {
  return updateDoc(doc(db, "tips", tipId), { status });
};

export const subscribeTips = (callback) => {
  const q = query(collection(db, "tips"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snapshot) => {
    const tips = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(tips);
  });
};
