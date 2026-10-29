// HUD: nome da área, indicador de interação, minimapa e FPS.
import { $ } from './common.js';
import { MAP } from '../world/mapData.js';

export class HUD {
  constructor() {
    this.zoneEl = $('#zoneName'); this.prompt = $('#prompt'); this.promptText = $('#promptText');
    this.mm = $('#minimap'); this.mctx = this.mm.getContext('2d');
    this.fpsEl = $('#fps');
    this.zone = null; this._zoneTimer = 0;
    this._frames = 0; this._fpsT = 0;
    this.onPromptClick = null;
    this.prompt.addEventListener('click', () => this.onPromptClick?.());
    setTimeout(() => { const h = $('#helpDesktop'); if (h) h.style.opacity = '0'; }, 14000);
  }

  setPrompt(text) {
    if (!text) { this.prompt.classList.remove('show'); return; }
    if (this.promptText.textContent !== text) this.promptText.textContent = text;
    this.prompt.classList.add('show');
  }

  update(dt, pos, rotY, camYaw, npcs, showFps) {
    // área atual
    let z = null, best = 1e9;
    for (const zn of MAP.zones) { const d = Math.hypot(pos.x - zn.x, pos.z - zn.z); if (d < zn.r && d < best) { best = d; z = zn; } }
    if (z && z !== this.zone) {
      this.zone = z;
      this.zoneEl.innerHTML = `<small>${z.fonte === 'provisorio' ? 'Área provisória' : 'Chácara'}</small>`;
      this.zoneEl.append(z.name.replace(' (provisório)', '').replace(' (provisória)', ''));
      this.zoneEl.classList.add('show'); this._zoneTimer = 3.5;
    }
    if (this._zoneTimer > 0) { this._zoneTimer -= dt; if (this._zoneTimer <= 0) this.zoneEl.classList.remove('show'); }
    if (!z) this.zone = null;

    this._drawMinimap(pos, rotY, camYaw, npcs);

    this._frames++; this._fpsT += dt;
    if (this._fpsT > 0.5) { this.fpsEl.textContent = showFps ? `${Math.round(this._frames / this._fpsT)} FPS` : ''; this._frames = 0; this._fpsT = 0; }
  }

  _drawMinimap(pos, rotY, camYaw, npcs) {
    const c = this.mctx, W = this.mm.width, scale = 1.6; // px por metro
    c.save();
    c.clearRect(0, 0, W, W);
    c.beginPath(); c.arc(W / 2, W / 2, W / 2, 0, Math.PI * 2); c.clip();
    c.fillStyle = '#3e5f32'; c.fillRect(0, 0, W, W);
    c.translate(W / 2, W / 2);
    c.rotate(camYaw);   // mapa gira com a câmera: "para cima" = para onde a câmera olha
    c.translate(-pos.x * scale, -pos.z * scale);
    // lago
    const L = MAP.lake;
    c.fillStyle = '#3c6f86'; c.beginPath(); c.ellipse(L.x * scale, L.z * scale, L.rx * scale, L.rz * scale, 0, 0, Math.PI * 2); c.fill();
    // caminhos
    c.strokeStyle = '#b48a5a'; c.lineCap = 'round';
    for (const p of MAP.paths) { c.lineWidth = p.width * scale; c.beginPath(); p.pts.forEach(([x, z], i) => i ? c.lineTo(x * scale, z * scale) : c.moveTo(x * scale, z * scale)); c.stroke(); }
    // estruturas
    for (const s of MAP.structures) {
      const w = (s.w || 4) * scale, d = (s.d || 4) * scale;
      c.fillStyle = s.type === 'poolTerrace' ? '#cfc6b2' : s.type === 'court' ? '#4d83a6' : s.type === 'bluePlatform' ? '#3f78c4' : '#e6dccb';
      c.globalAlpha = s.fonte === 'provisorio' ? 0.6 : 1;
      c.fillRect(s.x * scale - w / 2, s.z * scale - d / 2, w, d);
      if (s.pool) { c.fillStyle = '#38c4d8'; c.fillRect((s.x + s.pool.dx) * scale - s.pool.w * scale / 2, (s.z + s.pool.dz) * scale - s.pool.d * scale / 2, s.pool.w * scale, s.pool.d * scale); }
    }
    c.globalAlpha = 1;
    // NPCs
    for (const n of npcs) { c.fillStyle = '#e9c46a'; c.beginPath(); c.arc(n.ch.root.position.x * scale, n.ch.root.position.z * scale, 5, 0, Math.PI * 2); c.fill(); }
    c.restore();
    // jogador (sempre no centro)
    c.save(); c.translate(W / 2, W / 2); c.rotate(-(rotY - camYaw) + Math.PI);
    c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, -14); c.lineTo(10, 10); c.lineTo(0, 5); c.lineTo(-10, 10); c.closePath(); c.fill(); c.stroke();
    c.restore();
  }
}
