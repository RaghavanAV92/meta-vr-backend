import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "your-key",
  authDomain: "meta-dashboard-vr1.firebaseapp.com",
  projectId: "meta-dashboard-vr1",
  storageBucket: "meta-dashboard-vr1.appspot.com",
  messagingSenderId: "your-id",
  appId: "726501138435"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, getDocs };
