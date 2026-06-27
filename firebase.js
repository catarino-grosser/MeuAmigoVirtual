import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOUvciwEznBdQ9UBJ58ZioTmS3DH0dNVw",
  authDomain: "meuamigovirtual-cws.firebaseapp.com",
  projectId: "meuamigovirtual-cws",
  storageBucket: "meuamigovirtual-cws.firebasestorage.app",
  messagingSenderId: "582271107119",
  appId: "1:582271107119:web:5b94484ca5823e525606da"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export {
  signInAnonymously,
  onAuthStateChanged,
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc
};