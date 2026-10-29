// Áudio procedural (Web Audio): ambiente da chácara, passos e sons de interface.
// Nenhum arquivo externo é necessário.
import { settings, onSettingsChange } from './settings.js';

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.amb = null;
    this._birdTimer = 0;
    this._stepTimer = 0;
  }

  // Precisa ser chamado após um gesto do usuário (política dos navegadores).
  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = settings.volume;
      this.master.connect(this.ctx.destination);
      this.amb = this.ctx.createGain();
      this.amb.gain.value = settings.ambience;
      this.amb.connect(this.master);
      this._startWind();
      onSettingsChange(() => {
        if (!this.ctx) return;
        this.master.gain.value = settings.volume;
        this.amb.gain.value = settings.ambience;
      });
    } catch (e) { console.warn('Áudio indisponível', e); this.ctx = null; }
  }

  _noiseBuffer(seconds = 2) {
    const len = Math.floor(this.ctx.sampleRate * seconds);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    return buf;
  }

  _startWind() {
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer(4); src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500;
    const g = this.ctx.createGain(); g.gain.value = 0.18;
    const lfo = this.ctx.createOscillator(); lfo.frequency.value = 0.08;
    const lfoG = this.ctx.createGain(); lfoG.gain.value = 0.08;
    lfo.connect(lfoG).connect(g.gain);
    src.connect(f).connect(g).connect(this.amb);
    src.start(); lfo.start();
  }

  _bird() {
    const t = this.ctx.currentTime;
    const notes = 2 + Math.floor(Math.random() * 4);
    const base = 2200 + Math.random() * 2200;
    const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.random() * 2 - 1; pan.connect(this.amb); }
    for (let i = 0; i < notes; i++) {
      const o = this.ctx.createOscillator(); o.type = 'sine';
      const g = this.ctx.createGain();
      const st = t + i * (0.09 + Math.random() * 0.06);
      o.frequency.setValueAtTime(base * (0.9 + Math.random() * 0.3), st);
      o.frequency.exponentialRampToValueAtTime(base * (1.1 + Math.random() * 0.5), st + 0.07);
      g.gain.setValueAtTime(0, st);
      g.gain.linearRampToValueAtTime(0.05, st + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, st + 0.09);
      o.connect(g).connect(pan || this.amb);
      o.start(st); o.stop(st + 0.12);
    }
  }

  update(dt) {
    if (!this.ctx) return;
    this._birdTimer -= dt;
    if (this._birdTimer <= 0) { this._bird(); this._birdTimer = 1.5 + Math.random() * 5; }
  }

  step(running) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource(); src.buffer = this._stepBuf || (this._stepBuf = this._noiseBuffer(0.2));
    const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600 + Math.random() * 400; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(running ? 0.35 : 0.22, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    src.connect(f).connect(g).connect(this.master);
    src.start(t); src.stop(t + 0.15);
  }

  tone(freq = 660, dur = 0.08, type = 'sine', vol = 0.12) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator(); o.type = type; o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  }
  click() { this.tone(880, 0.05, 'triangle', 0.08); }
  blip() { this.tone(520 + Math.random() * 120, 0.04, 'square', 0.03); }
  open() { this.tone(523, 0.08); setTimeout(() => this.tone(784, 0.12), 70); }
  bell() {
    if (!this.ctx) return;
    [523, 1046, 1568, 2093].forEach((f, i) => this.tone(f, 2.2 - i * 0.4, 'sine', 0.12 / (i + 1)));
  }
  shutter() { this.tone(1800, 0.03, 'square', 0.05); setTimeout(() => this.tone(900, 0.05, 'square', 0.04), 40); }
}

export const audio = new AudioSystem();
