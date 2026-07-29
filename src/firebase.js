// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDqLcYw50m52gK6PFZ1LVIy7VuNUUKmFT8",
  authDomain: "kickoff-tips.firebaseapp.com",
  projectId: "kickoff-tips",
  storageBucket: "kickoff-tips.firebasestorage.app",
  messagingSenderId: "263942240393",
  appId: "1:263942240393:web:6553fa35da24d53af4ee58",
  measurementId: "G-CTJBK8LD5Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
