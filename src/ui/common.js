// Utilidades de interface: telas, avisos e confirmação.
import { audio } from '../core/audio.js';

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];

export function show(id, on = true) {
  const el = typeof id === 'string' ? document.getElementById(id) : id;
  if (!el) return;
  el.classList.toggle('show', on);
}
export function isShown(id) { return document.getElementById(id)?.classList.contains('show'); }

export function toast(msg, kind = '', ms = 3200) {
  const box = document.getElementById('toasts');
  const t = document.createElement('div');
  t.className = 'toast ' + kind; t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 450); }, ms);
}

export function confirmDialog(title, text, yes = 'Confirmar') {
  return new Promise(resolve => {
    $('#cfTitle').textContent = title; $('#cfText').textContent = text; $('#cfYes').textContent = yes;
    show('confirm');
    const done = v => { show('confirm', false); $('#cfYes').onclick = $('#cfNo').onclick = null; audio.click(); resolve(v); };
    $('#cfYes').onclick = () => done(true);
    $('#cfNo').onclick = () => done(false);
  });
}

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) e.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return e;
}

export async function toggleFullscreen() {
  const d = document;
  try {
    if (d.fullscreenElement || d.webkitFullscreenElement) { await (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
    const root = d.documentElement;
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (!req) throw new Error('sem suporte');
    await req.call(root, { navigationUI: 'hide' });
    try { await screen.orientation?.lock?.('landscape'); } catch { /* opcional */ }
  } catch {
    toast('Seu navegador não permite tela cheia aqui. No iPhone, use "Adicionar à Tela de Início".');
  }
}
