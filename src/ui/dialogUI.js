// Caixa de diálogo com efeito de digitação, opções clicáveis e atalhos de teclado.
import { $, show } from './common.js';
import { audio } from '../core/audio.js';
import { Conversation } from '../npc/dialogue.js';

export class DialogUI {
  constructor() {
    this.conv = null; this.onClose = null; this.onAction = null;
    this._typing = null; this.sel = 0;
    $('#dlgClose').addEventListener('click', () => this.close());
    addEventListener('keydown', e => {
      if (!this.conv) return;
      const opts = [...$('#dlgOptions').children];
      if (e.code === 'Escape') { e.stopImmediatePropagation(); this.close(); return; }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= opts.length) { e.stopImmediatePropagation(); opts[n - 1].click(); return; }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { this.sel = (this.sel + 1) % opts.length; this._mark(); e.preventDefault(); }
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { this.sel = (this.sel - 1 + opts.length) % opts.length; this._mark(); e.preventDefault(); }
      if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') {
        e.preventDefault(); e.stopImmediatePropagation();
        if (this._typing) { this._finishTyping(); return; }
        opts[this.sel]?.click();
      }
    }, true);
  }
  get open() { return !!this.conv; }

  start(npcDef, state, playerApp, playerName) {
    this.conv = new Conversation(npcDef, state, playerApp);
    this.playerName = playerName;
    $('#dlgName').textContent = npcDef.name;
    show('dialog');
    audio.open();
    this._render();
  }

  // Mensagem simples (placas, objetos).
  message(title, text) {
    this.start({ id: '_msg', name: title, dialogue: { nodes: { start: { text, options: [{ label: 'OK', end: true }] } } } }, { flags: new Set(), visits: {} }, {}, '');
  }

  _render() {
    const text = this.conv.text(this.playerName);
    const box = $('#dlgText');
    const optsEl = $('#dlgOptions');
    optsEl.innerHTML = '';
    this.sel = 0;
    let i = 0;
    clearInterval(this._typing);
    box.textContent = '';
    this._full = text;
    this._typing = setInterval(() => {
      i += 2;
      box.textContent = text.slice(0, i);
      if (i % 6 === 0) audio.blip();
      if (i >= text.length) this._finishTyping();
    }, 18);
    this.conv.options().forEach((o, k) => {
      const b = document.createElement('button');
      b.innerHTML = `<i>${k + 1}</i><span></span>`;
      b.querySelector('span').textContent = o.label;
      b.addEventListener('click', () => this._choose(o));
      b.addEventListener('mouseenter', () => { this.sel = k; this._mark(); });
      optsEl.appendChild(b);
    });
    this._mark();
  }
  _finishTyping() { clearInterval(this._typing); this._typing = null; $('#dlgText').textContent = this._full; }
  _mark() { [...$('#dlgOptions').children].forEach((b, k) => b.classList.toggle('sel', k === this.sel)); }

  _choose(o) {
    audio.click();
    const r = this.conv.choose(o);
    if (r.action) this.onAction?.(r.action, this.conv.def);
    if (r.ended) this.close(); else this._render();
  }

  close() {
    if (!this.conv) return;
    clearInterval(this._typing); this._typing = null;
    const def = this.conv.def;
    this.conv = null;
    show('dialog', false);
    this.onClose?.(def);
  }
}
