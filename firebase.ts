// @ts-ignore
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAfbHhSxXazdJmgraHWm4BtujUGoWcEUQU",
  authDomain: "saadqu-92cfc.firebaseapp.com",
  projectId: "saadqu-92cfc",
  storageBucket: "saadqu-92cfc.firebasestorage.app",
  messagingSenderId: "143670086980",
  appId: "1:143670086980:web:81b09b0103966856269b11",
  measurementId: "G-B1NH1DGEE3"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
