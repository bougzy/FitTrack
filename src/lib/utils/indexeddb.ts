'use client';

import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'fittrack-db';
const DB_VERSION = 1;

interface FitTrackDB {
  auth: {
    key: string;
    value: {
      token: string;
      user: Record<string, unknown>;
      timestamp: number;
    };
  };
  sessions: {
    key: string;
    value: Record<string, unknown>;
    indexes: { byDate: string; byUserId: string };
  };
  notifications: {
    key: string;
    value: Record<string, unknown>;
  };
  pendingSync: {
    key: string;
    value: {
      id: string;
      type: string;
      data: Record<string, unknown>;
      timestamp: number;
    };
  };
  userPreferences: {
    key: string;
    value: Record<string, unknown>;
  };
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (typeof window === 'undefined') return null;

  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Auth store
        if (!db.objectStoreNames.contains('auth')) {
          db.createObjectStore('auth');
        }

        // Sessions store
        if (!db.objectStoreNames.contains('sessions')) {
          const store = db.createObjectStore('sessions', { keyPath: '_id' });
          store.createIndex('byDate', 'date');
          store.createIndex('byUserId', 'userId');
        }

        // Notifications store
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications', { keyPath: '_id' });
        }

        // Pending sync store
        if (!db.objectStoreNames.contains('pendingSync')) {
          db.createObjectStore('pendingSync', { keyPath: 'id' });
        }

        // User preferences store
        if (!db.objectStoreNames.contains('userPreferences')) {
          db.createObjectStore('userPreferences');
        }
      },
    });
  }

  return dbPromise;
}

// ============ AUTH STORAGE ============
export async function saveAuthToIDB(token: string, user: Record<string, unknown>) {
  const db = await getDB();
  if (!db) return;
  await db.put('auth', { token, user, timestamp: Date.now() }, 'credentials');
}

export async function getAuthFromIDB() {
  const db = await getDB();
  if (!db) return null;
  try {
    return await db.get('auth', 'credentials');
  } catch {
    return null;
  }
}

export async function clearAuthFromIDB() {
  const db = await getDB();
  if (!db) return;
  await db.delete('auth', 'credentials');
}

// ============ SESSIONS STORAGE ============
export async function saveSessionToIDB(session: Record<string, unknown>) {
  const db = await getDB();
  if (!db) return;
  await db.put('sessions', session);
}

export async function getSessionsFromIDB(): Promise<Record<string, unknown>[]> {
  const db = await getDB();
  if (!db) return [];
  return db.getAll('sessions');
}

export async function getRecentSessionsFromIDB(limit = 10): Promise<Record<string, unknown>[]> {
  const sessions = await getSessionsFromIDB();
  return sessions
    .sort((a, b) => new Date(b.date as string).getTime() - new Date(a.date as string).getTime())
    .slice(0, limit);
}

// ============ PENDING SYNC ============
export async function addToPendingSync(
  type: string,
  data: Record<string, unknown>
) {
  const db = await getDB();
  if (!db) return;
  const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await db.put('pendingSync', { id, type, data, timestamp: Date.now() });
}

export async function getPendingSync() {
  const db = await getDB();
  if (!db) return [];
  return db.getAll('pendingSync');
}

export async function removePendingSync(id: string) {
  const db = await getDB();
  if (!db) return;
  await db.delete('pendingSync', id);
}

// ============ PREFERENCES ============
export async function savePreferencesToIDB(prefs: Record<string, unknown>) {
  const db = await getDB();
  if (!db) return;
  await db.put('userPreferences', prefs, 'prefs');
}

export async function getPreferencesFromIDB() {
  const db = await getDB();
  if (!db) return null;
  try {
    return await db.get('userPreferences', 'prefs');
  } catch {
    return null;
  }
}
