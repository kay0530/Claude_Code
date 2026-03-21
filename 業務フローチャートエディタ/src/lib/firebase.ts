import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCKbXjcfa1R0jg3ymZ35QJVrxDpv_kwWPs",
  authDomain: "swimlane-flowchart-editor.firebaseapp.com",
  projectId: "swimlane-flowchart-editor",
  storageBucket: "swimlane-flowchart-editor.firebasestorage.app",
  messagingSenderId: "372304357949",
  appId: "1:372304357949:web:9c58ebddbe26af057a1854",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
