/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration retrieved from firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyBz19i645GloypJjJzh2-ZaioyvgQy_YqM",
  authDomain: "gen-lang-client-0158132711.firebaseapp.com",
  projectId: "gen-lang-client-0158132711",
  storageBucket: "gen-lang-client-0158132711.firebasestorage.app",
  messagingSenderId: "641458946630",
  appId: "1:641458946630:web:ca77eea513a6456d358047"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-tetriswithunocar-363887c9-0005-441a-a7fb-61a505cb5e27");
