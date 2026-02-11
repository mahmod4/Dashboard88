// Firebase Configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-storage.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/12.9.0/firebase-analytics.js';

// إعدادات Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAWkruoIMbTxD-5DHCpspPY8p2TtZLLmLM",
    authDomain: "dashboard-27bc8.firebaseapp.com",
    projectId: "dashboard-27bc8",
    storageBucket: "dashboard-27bc8.firebasestorage.app",
    messagingSenderId: "707339591256",
    appId: "1:707339591256:web:dcc2649182e97249a2742d",
    measurementId: "G-K8FNNYH4S1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics (optional - only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
    try {
        analytics = getAnalytics(app);
    } catch (error) {
        console.log('Analytics initialization skipped:', error);
    }
}
export { analytics };

