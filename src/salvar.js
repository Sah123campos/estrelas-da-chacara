// Salvamento local: localStorage para dados pequenos, IndexedDB para a foto.
// Nada é enviado para servidores.
const CHAVE = "chacara.save.v2";
const CHAVE_V1 = "chacara.save.v1";
const CHAVE_CONFIG = "chacara.config.v2";
const DB_NOME = "chacara-rpg";
const DB_LOJA = "blobs";

function ler(k) { try { return localStorage.getItem(k); } catch { return null; } }
function gravar(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } }
function apagar(k) { try { localStorage.removeItem(k); } catch { /* ok */ } }

export function carregarJogo() {
  const raw = ler(CHAVE);
  if (raw) { try { return JSON.parse(raw); } catch { /* corrompido */ } }
  // Migra o progresso da versão 3D (pistas e nome).
  const v1 = ler(CHAVE_V1);
  if (v1) {
    try {
      const o = JSON.parse(v1);
      return { migrado: true, flags: o.dialogue?.flags || o.flags || [], visitas: o.dialogue?.visits || {}, nome: o.app?.name || o.appearance?.name || "" };
    } catch { /* ignora */ }
  }
  return null;
}
export function salvarJogo(dados) { return gravar(CHAVE, JSON.stringify({ ...dados, salvoEm: Date.now(), versao: 2 })); }
export function carregarConfig() { try { return JSON.parse(ler(CHAVE_CONFIG)) || null; } catch { return null; } }
export function salvarConfig(c) { return gravar(CHAVE_CONFIG, JSON.stringify(c)); }

let dbp = null;
function abrir() {
  if (dbp) return dbp;
  dbp = new Promise((ok, erro) => {
    if (!("indexedDB" in window)) return erro(new Error("sem IndexedDB"));
    let r;
    try { r = indexedDB.open(DB_NOME, 1); } catch (e) { return erro(e); }
    r.onupgradeneeded = () => r.result.createObjectStore(DB_LOJA);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => erro(r.error);
  });
  dbp.catch(() => { dbp = null; });
  return dbp;
}
async function idb(modo, fn) {
  const db = await abrir();
  return new Promise((ok, erro) => {
    const tx = db.transaction(DB_LOJA, modo);
    const req = fn(tx.objectStore(DB_LOJA));
    tx.oncomplete = () => ok(req && req.result);
    tx.onerror = () => erro(tx.error);
    tx.onabort = () => erro(tx.error);
  });
}
export async function salvarFoto(blob) { try { await idb("readwrite", (s) => s.put(blob, "facePhoto")); return true; } catch { return false; } }
export async function carregarFoto() { try { return (await idb("readonly", (s) => s.get("facePhoto"))) || null; } catch { return null; } }
export async function apagarFoto() { try { await idb("readwrite", (s) => s.delete("facePhoto")); } catch { /* ok */ } }
export async function apagarTudo() { apagar(CHAVE); apagar(CHAVE_V1); apagar(CHAVE_CONFIG); try { localStorage.removeItem("chacara.settings.v1"); } catch { /* ok */ } await apagarFoto(); }
