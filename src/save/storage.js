// Salvamento local: localStorage para dados pequenos, IndexedDB para a foto.
// Nada é enviado para servidores.

const SAVE_KEY = 'chacara.save.v1';
const SETTINGS_KEY = 'chacara.settings.v1';
const DB_NAME = 'chacara-rpg';
const DB_STORE = 'blobs';

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value); return true; } catch (e) { console.warn('localStorage indisponível', e); return false; }
}
function safeRemove(key) {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

export function loadSave() {
  const raw = safeGet(SAVE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function writeSave(data) {
  return safeSet(SAVE_KEY, JSON.stringify({ ...data, savedAt: Date.now(), version: 1 }));
}

export function loadSettings() {
  const raw = safeGet(SETTINGS_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function writeSettings(s) { return safeSet(SETTINGS_KEY, JSON.stringify(s)); }

// ---------- IndexedDB ----------
let dbPromise = null;
function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB indisponível')); return; }
    let req;
    try { req = indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
    req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

async function idb(mode, fn) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, mode);
    const store = tx.objectStore(DB_STORE);
    const req = fn(store);
    tx.oncomplete = () => resolve(req && req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function savePhoto(blob) {
  try { await idb('readwrite', s => s.put(blob, 'facePhoto')); return true; }
  catch (e) { console.warn('Falha ao salvar foto', e); return false; }
}
export async function loadPhoto() {
  try { return (await idb('readonly', s => s.get('facePhoto'))) || null; }
  catch { return null; }
}
export async function deletePhoto() {
  try { await idb('readwrite', s => s.delete('facePhoto')); } catch { /* ignore */ }
}

export async function deleteAll() {
  safeRemove(SAVE_KEY);
  safeRemove(SETTINGS_KEY);
  await deletePhoto();
}
