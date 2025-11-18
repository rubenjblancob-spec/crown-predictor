// src/firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';


const firebaseConfig = {
  apiKey: "AIzaSyBabU7q5_VLdkk4ZrOMa5oH3LBiub3CQTg",
  authDomain: "crownpredictor-1b891.firebaseapp.com",
  projectId: "crownpredictor-1b891",
  storageBucket: "crownpredictor-1b891.firebasestorage.app",
  messagingSenderId: "231561879805",
  appId: "1:231561879805:web:dfc4221df8ba37a0bf1e94"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };