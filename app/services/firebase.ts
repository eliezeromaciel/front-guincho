import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDNz9KNyFdygj8t6vdQO-Z5sVpSxikuPN8",
  authDomain: "guincho-e0a6e.firebaseapp.com",
  projectId: "guincho-e0a6e",
  storageBucket: "guincho-e0a6e.firebasestorage.app",
  messagingSenderId: "174374749035",
  appId: "1:174374749035:web:832da9e9e3292e1009022e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

