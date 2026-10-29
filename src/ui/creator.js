// Tela de criação de personagem e guarda-roupa (prova em tempo real).
import { $, $$, el, show, toast } from './common.js';
import { audio } from '../core/audio.js';
import {
  SKIN_TONES, HAIR_COLORS, EYE_COLORS, HAIR_STYLES, BEARDS, LOOKS, SLOTS, WARDROBE_CATEGORIES,
  ACCESSORY_CATEGORIES, itemsForCategory, defaultAppearance, findItem,
} from '../character/wardrobe.js';
import { FACE_VARIANTS, DEFAULT_ADJUST } from '../character/face.js';
import { fabricTexture } from '../character/garments.js';
import { fileToCanvas, detectLandmarks, startCamera, stopCamera, captureFrame } from '../character/photo.js';

const TABS = [
  { id: 'corpo', name: 'Corpo' },
  { id: 'rosto', name: 'Rosto e foto' },
  { id: 'cabelo', name: 'Cabelo' },
  { id: 'roupas', name: 'Guarda-roupa' },
  { id: 'acessorios', name: 'Acessórios' },
  { id: 'nome', name: 'Nome' },
];
const SLOT_LABEL = { top: 'Parte de cima', outer: 'Casaco', bottom: 'Parte de baixo', dress: 'Vestido', neck: 'Pescoço', shoes: 'Calçado', glasses: 'Óculos', hat: 'Chapéu', jewelry: 'Joia' };
const TOGGLE_SLOTS = new Set(['outer', 'dress', 'neck', 'glasses', 'hat', 'jewelry']);
const FUN_NAMES = ['Leo Di Chácara', 'Meryl Fogueira', 'Brad Pitanga', 'Angelina Jolinha', 'Will Smithão', 'Keanu Rifas', 'Emma Pedra', 'Zendaia do Lago', 'Tom Cruzeiro', 'Anne Rathaway'];

const thumbCache = new Map();
function thumbStyle(item) {
  if (!item || !item.color) return {};
  const key = item.id + (item.pattern || '');
  if (!thumbCache.has(key)) {
    const t = fabricTexture(item);
    let bg = item.color;
    if (t && t.image && t.image.toDataURL) bg = `url(${t.image.toDataURL('image/jpeg', 0.7)}) center/80px`;
    else if (item.pattern === 'satin' || item.pattern === 'metallic' || item.pattern === 'leather' || item.gloss) bg = `linear-gradient(135deg, ${item.color} 0%, #ffffff55 45%, ${item.color} 60%)`;
    thumbCache.set(key, bg);
  }
  return { background: thumbCache.get(key) };
}

export class Creator {
  constructor(game) {
    this.game = game;
    this.tab = 'corpo';
    this.category = 'looks';
    this.mode = 'new';
    this._rebuildQueued = false;
    $('#crBack').onclick = () => { audio.click(); this.onBack?.(); };
    $('#crDone').onclick = () => { audio.click(); this._finish(); };
    $('#viewBody').onclick = () => { this.game.studio.targetZoom = 0; this._chips(); };
    $('#viewFace').onclick = () => { this.game.studio.targetZoom = 1; this._chips(); };
    $('#viewSpin').onclick = () => { this.game.studio.spin = !this.game.studio.spin; this._chips(); };
    $('#fileInput').addEventListener('change', e => this._onFile(e.target.files[0], 'galeria'));
    $('#fileCapture').addEventListener('change', e => this._onFile(e.target.files[0], 'câmera'));
    $('#camAllow').onclick = () => this._camStart();
    $('#camNative').onclick = () => { this._camClose(); $('#fileCapture').click(); };
    $('#camShoot').onclick = () => this._camShoot();
    $('#camCancel').onclick = () => this._camClose();
    $$('#camModal [data-close]').forEach(b => b.onclick = () => this._camClose());
  }

  get app() { return this.game.app; }

  open(mode, { onDone, onBack } = {}) {
    this.mode = mode; this.onDone = onDone; this.onBack = onBack;
    $('#crTitle').textContent = mode === 'wardrobe' ? 'Guarda-roupa' : (mode === 'new' ? 'Crie seu personagem' : 'Personalizar personagem');
    $('#crDone').textContent = mode === 'wardrobe' ? 'Salvar visual' : 'Salvar e jogar';
    this.tab = mode === 'wardrobe' ? 'roupas' : 'corpo';
    show('creator');
    this._renderTabs(); this._renderBody(); this._chips();
  }
  close() { show('creator', false); this._camClose(); }

  _chips() {
    const s = this.game.studio;
    $('#viewBody').classList.toggle('on', s.targetZoom < 0.5);
    $('#viewFace').classList.toggle('on', s.targetZoom >= 0.5);
    $('#viewSpin').classList.toggle('on', s.spin);
  }

  // Aplica mudanças e reconstrói o personagem (agrupado por quadro).
  set(changes, { rebuild = true } = {}) {
    Object.assign(this.app, changes);
    if (!rebuild) return;
    if (this._rebuildQueued) return;
    this._rebuildQueued = true;
    requestAnimationFrame(() => { this._rebuildQueued = false; this.game.rebuildPlayer(); });
  }

  _renderTabs() {
    const nav = $('#crTabs'); nav.innerHTML = '';
    for (const t of TABS) {
      const b = el('button', { class: 'tab' + (t.id === this.tab ? ' on' : ''), role: 'tab' }, t.name);
      b.onclick = () => { audio.click(); this.tab = t.id; this._renderTabs(); this._renderBody(); if (t.id === 'rosto') { this.game.studio.targetZoom = 1; this._chips(); } };
      nav.append(b);
    }
  }

  _renderBody() {
    const body = $('#crBody'); body.innerHTML = ''; body.scrollTop = 0;
    const fn = { corpo: this._tabBody, rosto: this._tabFace, cabelo: this._tabHair, roupas: this._tabClothes, acessorios: this._tabAccessories, nome: this._tabName }[this.tab];
    fn.call(this, body);
    body.classList.add('fade-in'); setTimeout(() => body.classList.remove('fade-in'), 400);
  }

  _swatches(colors, current, onPick, custom = true) {
    const box = el('div', { class: 'swatches' });
    for (const c of colors) {
      const s = el('button', { class: 'sw' + (c.toLowerCase() === (current || '').toLowerCase() ? ' on' : ''), style: { background: c }, 'aria-label': c });
      s.onclick = () => { audio.click(); onPick(c); [...box.children].forEach(x => x.classList.remove('on')); s.classList.add('on'); };
      box.append(s);
    }
    if (custom) {
      const inp = el('input', { type: 'color', value: current || '#888888', 'aria-label': 'Cor personalizada' });
      inp.oninput = () => onPick(inp.value);
      box.append(el('label', { class: 'sw sw-custom', title: 'Cor personalizada' }, inp));
    }
    return box;
  }

  _grid(items, isOn, onPick) {
    const g = el('div', { class: 'grid' });
    for (const it of items) {
      const b = el('button', { class: 'item' + (isOn(it) ? ' on' : '') },
        el('div', { class: 'thumb', style: it.thumb || {} }, it.icon || ''),
        it.slot ? el('div', { class: 'slot' }, it.slot) : null,
        el('div', { class: 'nm' }, it.name));
      b.onclick = () => { audio.click(); onPick(it, b); };
      g.append(b);
    }
    return g;
  }

  // ---------- abas ----------
  _tabBody(body) {
    body.append(el('div', { class: 'section-title' }, 'Tipo de personagem'));
    const gp = el('div', { class: 'gender-pick' });
    for (const [g, label, icon] of [['m', 'Masculino', '♂'], ['f', 'Feminino', '♀']]) {
      const b = el('button', { class: this.app.gender === g ? 'on' : '' }, el('span', {}, icon), label);
      b.onclick = () => {
        if (this.app.gender === g) return;
        audio.click();
        const keep = { name: this.app.name, skin: this.app.skin, faceMode: this.app.faceMode, faceAdjust: this.app.faceAdjust, eyeColor: this.app.eyeColor };
        Object.assign(this.app, defaultAppearance(g), keep);
        this.set({});
        this._renderBody();
      };
      gp.append(b);
    }
    body.append(gp);
    body.append(el('p', { class: 'note' }, 'O tipo define o corpo, o rosto-base e as sugestões de cabelo e roupa. ', el('b', {}, 'Todas as roupas continuam disponíveis para os dois tipos.')));
    body.append(el('div', { class: 'section-title' }, 'Tom de pele'));
    body.append(this._swatches(SKIN_TONES, this.app.skin, c => this.set({ skin: c })));
    if (this.app.faceMode === 'photo') body.append(el('p', { class: 'note' }, 'Com foto, o tom de pele é ajustado automaticamente a partir dela. Você pode trocar aqui se preferir.'));
  }

  _tabFace(body) {
    const photo = this.app.faceMode === 'photo' && this.game.photoCanvas;
    body.append(el('div', { class: 'section-title' }, 'Seu rosto no personagem'));
    const acts = el('div', { class: 'photo-actions' });
    const mk = (icon, label, on, fn) => { const b = el('button', { class: on ? 'on' : '' }, el('span', {}, icon), label); b.onclick = () => { audio.click(); fn(); }; return b; };
    acts.append(
      mk('🖼️', 'Galeria', false, () => $('#fileInput').click()),
      mk('📷', 'Câmera', false, () => this._camOpen()),
      mk('🙂', 'Sem foto', !photo, () => { this.set({ faceMode: 'default' }); this._renderBody(); }),
    );
    body.append(acts);
    body.append(el('p', { class: 'note' }, '🔒 ', el('b', {}, 'Privacidade: '), 'a foto é usada só para o seu personagem, fica salva apenas neste aparelho e nunca é enviada para a internet. Você pode trocar ou remover quando quiser.'));

    if (photo) this._faceEditor(body);
    else {
      body.append(el('div', { class: 'section-title' }, 'Rosto padrão'));
      body.append(this._grid(FACE_VARIANTS.map((v, i) => ({ ...v, i, icon: ['🙂', '😄', '😏', '🥰'][i] })), v => v.i === this.app.faceVariant, v => { this.set({ faceVariant: v.i }); this._renderBody(); }));
      body.append(el('div', { class: 'section-title' }, 'Cor dos olhos'));
      body.append(this._swatches(EYE_COLORS, this.app.eyeColor, c => this.set({ eyeColor: c })));
    }
  }

  _faceEditor(body) {
    const app = this.app;
    const adj = app.faceAdjust = { ...DEFAULT_ADJUST, ...(app.faceAdjust || {}) };
    const photo = this.game.photoCanvas;
    body.append(el('div', { class: 'section-title' }, 'Encaixe a foto no rosto 3D'));
    body.append(el('p', { class: 'note', style: { marginTop: 0 } }, 'Arraste os círculos ', el('b', {}, 'verdes até os olhos'), ' e o ', el('b', {}, 'rosa até o meio da boca'), '. O personagem atualiza na hora.'));
    const S = 360;
    const wrap = el('div', { class: 'marker-wrap' });
    const cv = el('canvas', { width: S, height: S });
    wrap.append(cv);
    const k = Math.min(S / photo.width, S / photo.height);
    const ox = (S - photo.width * k) / 2, oy = (S - photo.height * k) / 2;
    const draw = () => {
      const x = cv.getContext('2d');
      x.fillStyle = '#000'; x.fillRect(0, 0, S, S);
      x.drawImage(photo, ox, oy, photo.width * k, photo.height * k);
      const P = p => [ox + p.x * photo.width * k, oy + p.y * photo.height * k];
      x.strokeStyle = 'rgba(255,255,255,.7)'; x.setLineDash([5, 5]); x.lineWidth = 1.5;
      const [a, b, m] = [P(adj.eyeL), P(adj.eyeR), P(adj.mouth)];
      x.beginPath(); x.moveTo(...a); x.lineTo(...b); x.moveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2); x.lineTo(...m); x.stroke();
      // contorno estimado do rosto
      const ex = Math.hypot(b[0] - a[0], b[1] - a[1]);
      x.strokeStyle = 'rgba(233,196,106,.8)';
      x.beginPath(); x.ellipse((a[0] + b[0]) / 2, (a[1] + m[1]) / 2 + ex * 0.15, ex * 1.12 * adj.maskW / adj.scale, ex * 1.55 * adj.maskH / adj.scale, Math.atan2(b[1] - a[1], b[0] - a[0]), 0, Math.PI * 2); x.stroke();
      x.setLineDash([]);
    };
    const markers = {};
    for (const [key, cls, label] of [['eyeL', 'eye', 'O'], ['eyeR', 'eye', 'O'], ['mouth', 'mouth', 'B']]) {
      const m = el('div', { class: 'marker ' + cls, 'aria-label': key }, label);
      wrap.append(m); markers[key] = m;
      const place = () => { m.style.left = ((ox + adj[key].x * photo.width * k) / S * 100) + '%'; m.style.top = ((oy + adj[key].y * photo.height * k) / S * 100) + '%'; };
      place(); m._place = place;
      m.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation(); m.setPointerCapture(e.pointerId);
        const move = ev => {
          const r = wrap.getBoundingClientRect();
          const px = (ev.clientX - r.left) / r.width * S, py = (ev.clientY - r.top) / r.height * S;
          adj[key] = { x: Math.min(1, Math.max(0, (px - ox) / (photo.width * k))), y: Math.min(1, Math.max(0, (py - oy) / (photo.height * k))) };
          place(); draw(); this.game.player.refreshFace();
        };
        const up = () => { m.removeEventListener('pointermove', move); m.removeEventListener('pointerup', up); m.removeEventListener('pointercancel', up); this._afterAdjust(); };
        m.addEventListener('pointermove', move); m.addEventListener('pointerup', up); m.addEventListener('pointercancel', up);
      });
    }
    draw();
    body.append(wrap);
    const slider = (label, key, min, max, step) => {
      const i = el('input', { type: 'range', min, max, step, value: adj[key] });
      i.oninput = () => { adj[key] = parseFloat(i.value); draw(); this.game.player.refreshFace(); };
      i.onchange = () => this._afterAdjust();
      return el('div', { class: 'slider' }, el('span', {}, label), i);
    };
    body.append(el('div', { class: 'section-title' }, 'Ajuste fino'));
    body.append(
      slider('Zoom', 'scale', 0.7, 1.4, 0.01), slider('Mover ↔', 'offsetX', -0.15, 0.15, 0.005), slider('Mover ↕', 'offsetY', -0.15, 0.15, 0.005),
      slider('Girar', 'rotation', -25, 25, 0.5), slider('Largura', 'maskW', 0.7, 1.2, 0.01), slider('Altura', 'maskH', 0.7, 1.15, 0.01),
      slider('Borda suave', 'feather', 0, 1, 0.01), slider('Brilho', 'brightness', 0.6, 1.5, 0.01), slider('Contraste', 'contrast', 0.6, 1.5, 0.01),
      slider('Temperatura', 'warmth', -1, 1, 0.02),
    );
    const row = el('div', { class: 'row-end' });
    const b1 = el('button', { class: 'btn small' }, 'Detectar rosto de novo');
    b1.onclick = async () => { const lm = await detectLandmarks(photo); Object.assign(adj, { eyeL: lm.eyeL, eyeR: lm.eyeR, mouth: lm.mouth }); Object.values(markers).forEach(m => m._place()); draw(); this.game.player.refreshFace(); this._afterAdjust(); toast(lm.method === 'detector' ? 'Rosto detectado.' : 'Posição estimada — confira os marcadores.'); };
    const b2 = el('button', { class: 'btn small' }, 'Igualar pele à foto');
    b2.onclick = () => { const s = this.game.player.face.sampledSkin; if (s) { this.set({ skin: '#' + s.getHexString() }); toast('Tom de pele ajustado à foto.', 'ok'); } };
    const b3 = el('button', { class: 'btn danger small' }, 'Remover foto');
    b3.onclick = async () => { await this.game.removePhoto(); this._renderBody(); toast('Foto removida deste aparelho.'); };
    row.append(b1, b2, b3);
    body.append(row);
    body.append(el('p', { class: 'note' }, el('b', {}, 'Limitação: '), 'a foto é projetada na frente da cabeça 3D e alinhada pelos olhos e pela boca. Não é uma reconstrução 3D do rosto: de perfil, o efeito é de máscara. Fotos de frente, bem iluminadas e sem óculos dão o melhor resultado.'));
  }

  _afterAdjust() {
    // reamostra o tom de pele (opcional) sem reconstruir a cada movimento
    if (this.app.faceAdjust?.autoSkin && this.game.player.face.sampledSkin) {
      const hex = '#' + this.game.player.face.sampledSkin.getHexString();
      if (hex !== this.app.skin) this.set({ skin: hex });
    }
  }

  _tabHair(body) {
    const g = this.app.gender;
    const sorted = [...HAIR_STYLES].sort((a, b) => (b.g === g || b.g === 'u') - (a.g === g || a.g === 'u'));
    body.append(el('div', { class: 'section-title' }, 'Estilo'));
    body.append(this._grid(sorted.map(h => ({ ...h, icon: '💇', slot: h.g === g || h.g === 'u' ? 'sugerido' : '' })), h => h.id === this.app.hair, (h, b) => { this.set({ hair: h.id }); $$('.item', b.parentNode).forEach(x => x.classList.remove('on')); b.classList.add('on'); }));
    body.append(el('div', { class: 'section-title' }, 'Cor do cabelo'));
    body.append(this._swatches(HAIR_COLORS, this.app.hairColor, c => this.set({ hairColor: c })));
    body.append(el('div', { class: 'section-title' }, 'Barba'));
    body.append(this._grid(BEARDS.map(b => ({ ...b, icon: '🧔' })), b => b.id === this.app.beard, (b, btn) => { this.set({ beard: b.id }); $$('.item', btn.parentNode).forEach(x => x.classList.remove('on')); btn.classList.add('on'); }));
  }

  _isWorn(slot, id) {
    if (slot === 'top' || slot === 'bottom') return this.app[slot] === id && (!this.app.dress || this.app.dress === 'nenhum');
    if (slot === 'top' && this.app.outer && this.app.outer !== 'nenhum') return this.app.top === id;
    return this.app[slot] === id;
  }

  _wear(slot, id) {
    const ch = {};
    if (TOGGLE_SLOTS.has(slot) && this.app[slot] === id) ch[slot] = 'nenhum';
    else ch[slot] = id;
    if (slot === 'top' || slot === 'bottom') ch.dress = 'nenhum';
    this.set(ch);
  }

  _tabClothes(body) {
    const row = el('div', { class: 'cat-row' });
    for (const c of WARDROBE_CATEGORIES) {
      const b = el('button', { class: 'chip' + (c.id === this.category ? ' on' : '') }, `${c.icon} ${c.name}`);
      b.onclick = () => { audio.click(); this.category = c.id; this._renderBody(); };
      row.append(b);
    }
    body.append(row);
    const cat = WARDROBE_CATEGORIES.find(c => c.id === this.category);
    const g = this.app.gender;
    if (cat.id === 'looks') {
      const looks = [...LOOKS].sort((a, b) => (b.g === g || b.g === 'u') - (a.g === g || a.g === 'u'));
      body.append(el('p', { class: 'note' }, 'Toque para experimentar — não precisa confirmar. Combine peças nas outras categorias.'));
      body.append(this._grid(looks.map(l => {
        const main = [findItem('dress', l.set.dress), findItem('outer', l.set.outer), findItem('top', l.set.top)].find(i => i && i.color);
        return { ...l, thumb: thumbStyle(main && main.color ? main : null), slot: l.g === g || l.g === 'u' ? 'sugerido' : 'look' };
      }), l => Object.entries(l.set).every(([k, v]) => this.app[k] === v), (l, b) => { this.set({ ...l.set }); $$('.item', b.parentNode).forEach(x => x.classList.remove('on')); b.classList.add('on'); }));
      return;
    }
    const list = itemsForCategory(cat).sort((a, b) => ((b.item.g === g || b.item.g === 'u' || !b.item.g) - (a.item.g === g || a.item.g === 'u' || !a.item.g)));
    body.append(el('p', { class: 'note' }, 'Toque para vestir. Toque de novo em casaco, vestido ou acessório para tirar.'));
    const grid = this._grid(list.map(({ slot, item }) => ({ ...item, slotKey: slot, slot: SLOT_LABEL[slot], thumb: thumbStyle(item) })),
      it => this._isWorn(it.slotKey, it.id),
      (it) => { this._wear(it.slotKey, it.id); requestAnimationFrame(() => this._refreshGridState(grid, list)); });
    body.append(grid);
  }

  _refreshGridState(grid, list) {
    [...grid.children].forEach((b, i) => b.classList.toggle('on', this._isWorn(list[i].slot, list[i].item.id)));
  }

  _tabAccessories(body) {
    for (const c of ACCESSORY_CATEGORIES) {
      body.append(el('div', { class: 'section-title' }, c.name));
      const items = SLOTS[c.slot];
      const grid = this._grid(items.map(it => ({ ...it, thumb: it.color || it.frame ? { background: it.frame || it.color } : {}, icon: it.id === 'nenhum' ? '✕' : '' })),
        it => this.app[c.slot] === it.id,
        it => { this.set({ [c.slot]: it.id }); [...grid.children].forEach((b, i) => b.classList.toggle('on', items[i].id === it.id)); });
      body.append(grid);
    }
  }

  _tabName(body) {
    body.append(el('div', { class: 'section-title' }, 'Nome do personagem'));
    const inp = el('input', { class: 'text-input', maxlength: 22, placeholder: 'Como você quer ser chamado?', value: this.app.name || '' });
    inp.oninput = () => this.set({ name: inp.value.trim() }, { rebuild: false });
    inp.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') this._finish(); };
    body.append(inp);
    body.append(el('div', { class: 'section-title' }, 'Sugestões de estrela'));
    const row = el('div', { class: 'swatches' });
    for (const n of FUN_NAMES) { const b = el('button', { class: 'chip' }, n); b.onclick = () => { inp.value = n; this.set({ name: n }, { rebuild: false }); }; row.append(b); }
    body.append(row);
    const r = el('div', { class: 'row-end' });
    const done = el('button', { class: 'btn primary' }, this.mode === 'wardrobe' ? 'Salvar visual' : 'Salvar e entrar na chácara');
    done.onclick = () => this._finish();
    r.append(done); body.append(r);
  }

  _finish() {
    if (!this.app.name) { this.app.name = 'Estrela'; toast('Sem nome? Vamos te chamar de "Estrela" — dá para mudar depois.'); }
    this.onDone?.();
  }

  // ---------- foto ----------
  async _onFile(file, origin) {
    if (!file) return;
    try {
      const canvas = await fileToCanvas(file);
      await this.game.setPhoto(canvas, true);
      toast(`Foto da ${origin} aplicada! Ajuste os marcadores se precisar.`, 'ok');
      this.tab = 'rosto'; this._renderTabs(); this._renderBody();
      this.game.studio.targetZoom = 1; this._chips();
    } catch (e) {
      console.error(e); toast('Não foi possível abrir essa imagem. Tente outra foto (JPG ou PNG).', 'err');
    } finally { $('#fileInput').value = ''; $('#fileCapture').value = ''; }
  }

  _camOpen() {
    if (!navigator.mediaDevices?.getUserMedia) { $('#fileCapture').click(); return; }
    $('#camConsent').hidden = false; $('#camLive').hidden = true;
    $('#camFallbackMsg').hidden = true; $('#camAllow').hidden = false;
    show('camModal');
  }
  async _camStart() {
    audio.click();
    try {
      $('#camConsent').hidden = true; $('#camLive').hidden = false;
      await startCamera($('#camVideo'));
    } catch (e) {
      console.warn(e);
      stopCamera($('#camVideo'));
      // mantém o modal aberto e oferece a câmera nativa do aparelho (gesto do usuário)
      $('#camConsent').hidden = false; $('#camLive').hidden = true;
      $('#camFallbackMsg').hidden = false; $('#camAllow').hidden = true;
      if (e.name === 'NotAllowedError') $('#camFallbackMsg').textContent = 'A permissão da câmera foi negada. Use a câmera do aparelho ou uma foto da galeria.';
    }
  }
  async _camShoot() {
    const v = $('#camVideo');
    if (!v.videoWidth) return;
    audio.shutter();
    const c = captureFrame(v);
    this._camClose();
    await this.game.setPhoto(c, true);
    toast('Foto tirada e aplicada ao personagem!', 'ok');
    this.tab = 'rosto'; this._renderTabs(); this._renderBody();
    this.game.studio.targetZoom = 1; this._chips();
  }
  _camClose() { stopCamera($('#camVideo')); show('camModal', false); }
}
