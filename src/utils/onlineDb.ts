/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  limit,
  onSnapshot,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase';

const LOBBIES_COLLECTION = 'uno_tetris_lobbies';

// Simple helper to generate unique random 4-digit code for custom lobbies
async function generateUniqueLobbyCode(): Promise<string> {
  let attempts = 0;
  while (attempts < 20) {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const docRef = doc(db, LOBBIES_COLLECTION, code);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists() || docSnap.data()?.status === 'ended') {
      return code;
    }
    attempts++;
  }
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

/**
 * Creates a new multiplayer lobby in Firestore.
 */
export async function createLobby(
  userId: string,
  userName: string,
  type: 'quick' | 'custom'
): Promise<string> {
  const lobbyId = type === 'custom' 
    ? await generateUniqueLobbyCode() 
    : 'qp_' + Math.random().toString(36).substring(2, 11);

  const lobbyDoc = doc(db, LOBBIES_COLLECTION, lobbyId);

  await setDoc(lobbyDoc, {
    id: lobbyId,
    type,
    status: 'waiting', // waiting, ready, playing, ended
    createdAt: Date.now(),
    hostId: userId,
    p1: { id: userId, name: userName },
    p2: null,
    p1Ready: false,
    p2Ready: false,
    p1State: null,
    p2State: null,
    p1PendingSpells: [],
    p2PendingSpells: [],
    winnerId: null,
    lastUpdate: Date.now()
  });

  return lobbyId;
}

/**
 * Finds an open, waiting Quick Match lobby, or returns null.
 */
export async function findQuickMatch(userId: string, userName: string): Promise<string | null> {
  const q = query(
    collection(db, LOBBIES_COLLECTION),
    where('type', '==', 'quick'),
    where('status', '==', 'waiting'),
    limit(5)
  );

  const querySnapshot = await getDocs(q);
  for (const d of querySnapshot.docs) {
    const data = d.data();
    if (data.p1.id !== userId && !data.p2) {
      // Found matchmaking spot, join it
      const lobbyDoc = doc(db, LOBBIES_COLLECTION, d.id);
      await updateDoc(lobbyDoc, {
        p2: { id: userId, name: userName },
        status: 'ready',
        lastUpdate: Date.now()
      });
      return d.id;
    }
  }
  return null;
}

/**
 * Joins a specific custom room lobby using its 4-digit code.
 */
export async function joinLobby(
  lobbyId: string,
  userId: string,
  userName: string
): Promise<{ role: 'p1' | 'p2'; error?: string }> {
  const lobbyDoc = doc(db, LOBBIES_COLLECTION, lobbyId);
  const docSnap = await getDoc(lobbyDoc);

  if (!docSnap.exists()) {
    return { role: 'p2', error: 'Room not found. Check the code and try again.' };
  }

  const data = docSnap.data();

  if (data.status === 'ended') {
    return { role: 'p2', error: 'This match has already ended.' };
  }

  // If already in lobby, return appropriate role
  if (data.p1.id === userId) {
    return { role: 'p1' };
  }
  if (data.p2 && data.p2.id === userId) {
    return { role: 'p2' };
  }

  // If lobby is full
  if (data.p2) {
    return { role: 'p2', error: 'Room is already full.' };
  }

  // Join as P2
  await updateDoc(lobbyDoc, {
    p2: { id: userId, name: userName },
    status: 'ready',
    lastUpdate: Date.now()
  });

  return { role: 'p2' };
}

/**
 * Listens to a lobby's live Firestore stream.
 */
export function listenToLobby(lobbyId: string, callback: (data: any) => void) {
  const lobbyDoc = doc(db, LOBBIES_COLLECTION, lobbyId);
  return onSnapshot(lobbyDoc, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data());
    }
  });
}

/**
 * Updates the current player's ready status.
 */
export async function setPlayerReady(
  lobbyId: string,
  role: 'p1' | 'p2',
  ready: boolean
): Promise<void> {
  const lobbyDoc = doc(db, LOBBIES_COLLECTION, lobbyId);
  await updateDoc(lobbyDoc, {
    [`${role}Ready`]: ready,
    lastUpdate: Date.now()
  });
}

/**
 * Starts the active game play. Called by host when lobby is 'ready'.
 */
export async function startMultiplayerGame(lobbyId: string): Promise<void> {
  const lobbyDoc = doc(db, LOBBIES_COLLECTION, lobbyId);
  await updateDoc(lobbyDoc, {
    status: 'playing',
    lastUpdate: Date.now()
  });
}

/**
 * Updates the player's current falling block, score, grid and hand state.
 */
export async function updatePlayerStateInLobby(
  lobbyId: string,
  role: 'p1' | 'p2',
  playerState: any
): Promise<void> {
  const lobbyDoc = doc(db, LOBBIES_COLLECTION, lobbyId);
  await updateDoc(lobbyDoc, {
    [`${role}State`]: playerState,
    lastUpdate: Date.now()
  });
}

/**
 * Casts a spell (plays an Action Card) onto the opponent.
 * This appends the spell to the opponent's pending spells array.
 */
export async function queueSpellOnOpponent(
  lobbyId: string,
  opponentRole: 'p1' | 'p2',
  spell: { id: string; type: string; title: string; color: string }
): Promise<void> {
  const lobbyDoc = doc(db, LOBBIES_COLLECTION, lobbyId);
  await updateDoc(lobbyDoc, {
    [`${opponentRole}PendingSpells`]: arrayUnion(spell),
    lastUpdate: Date.now()
  });
}

/**
 * Clears specific processed spells from the local pending spell array.
 */
export async function clearPendingSpells(
  lobbyId: string,
  myRole: 'p1' | 'p2',
  spellsToClear: any[]
): Promise<void> {
  const lobbyDoc = doc(db, LOBBIES_COLLECTION, lobbyId);
  
  // To avoid race conditions, we can remove them using arrayRemove
  for (const spell of spellsToClear) {
    await updateDoc(lobbyDoc, {
      [`${myRole}PendingSpells`]: arrayRemove(spell)
    });
  }
}

/**
 * Sets game over status. If both players are game over, decides the final winner.
 */
export async function setGameOverInLobby(
  lobbyId: string,
  myRole: 'p1' | 'p2',
  myScore: number
): Promise<void> {
  const lobbyDoc = doc(db, LOBBIES_COLLECTION, lobbyId);
  const docSnap = await getDoc(lobbyDoc);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  const opponentRole = myRole === 'p1' ? 'p2' : 'p1';
  
  const updates: any = {
    [`${myRole}State.isGameOver`]: true,
    lastUpdate: Date.now()
  };

  const opponentState = data[`${opponentRole}State`];
  const isOpponentAlreadyGameOver = opponentState?.isGameOver || false;

  // If the opponent is already game over (or didn't even start / is not active), we can evaluate winner
  if (isOpponentAlreadyGameOver || !data.p2) {
    updates.status = 'ended';
    const oppScore = opponentState?.score || 0;
    if (myScore > oppScore) {
      updates.winnerId = data[myRole].id;
    } else if (oppScore > myScore) {
      updates.winnerId = data[opponentRole].id;
    } else {
      updates.winnerId = 'draw';
    }
  }

  await updateDoc(lobbyDoc, updates);
}

/**
 * Leaves or cancels the current lobby.
 */
export async function leaveLobby(lobbyId: string, role: 'p1' | 'p2'): Promise<void> {
  const lobbyDoc = doc(db, LOBBIES_COLLECTION, lobbyId);
  const docSnap = await getDoc(lobbyDoc);
  if (!docSnap.exists()) return;

  const data = docSnap.data();
  
  if (role === 'p1') {
    // If Host leaves, we can end the lobby
    await updateDoc(lobbyDoc, {
      status: 'ended',
      lastUpdate: Date.now()
    });
  } else {
    // If Challenger leaves, make slot open again
    await updateDoc(lobbyDoc, {
      p2: null,
      p2Ready: false,
      p2State: null,
      status: 'waiting',
      lastUpdate: Date.now()
    });
  }
}
