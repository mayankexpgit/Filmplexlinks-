import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "filmplexlinks",
  appId: "1:589312784703:web:00067a5f32851503e93b8a",
  storageBucket: "filmplexlinks.firebasestorage.app",
  apiKey: "AIzaSyB_z7tHZHzzpBwwAG1YRMuprfQQeNhuBfQ",
  authDomain: "filmplexlinks.firebaseapp.com",
  messagingSenderId: "589312784703",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
