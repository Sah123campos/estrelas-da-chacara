// Motor de áudio: tudo é sintetizado no navegador (Web Audio), sem arquivos.
// Instrumentos: corda dedilhada (Karplus-Strong), flauta ney, pad, sino,
// baixo e percussão. Músicas em musicas.js, efeitos em efeitos.js.
import { MUSICAS } from "./musicas.js";
import { EFEITOS, VOZES } from "./efeitos.js";

const NOMES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

export function freq(nota) {
  if (typeof nota === "number") return nota;
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(nota);
  if (!m) return 440;
  let n = NOMES[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + n;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export class MotorAudio {
  constructor() {
    this.ctx = null;
    this.ligado = true;
    this.musica = null;
    this.saindo = [];
    this.cacheCorda = new Map();
    this.tensaoAtual = 0;
  }

  iniciar() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = new AC({ latencyHint: "interactive" });
    this.ctx = c;

    this.mestre = c.createGain();
    this.mestre.gain.value = this.ligado ? 0.9 : 0;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;
    this.mestre.connect(comp).connect(c.destination);

    this.reverb = c.createConvolver();
    this.reverb.buffer = this.criarIR(3.2);
    const volta = c.createGain();
    volta.gain.value = 0.55;
    this.reverb.connect(volta).connect(this.mestre);

    const bus = (vol, envio) => {
      const g = c.createGain();
      g.gain.value = vol;
      g.connect(this.mestre);
      const e = c.createGain();
      e.gain.value = envio;
      g.connect(e).connect(this.reverb);
      return g;
    };
    this.busMusica = bus(0.5, 0.5);
    this.busSfx = bus(0.85, 0.22);
    this.busAmb = bus(0.45, 0.35);

    // Eco (para as gotas e cordas da música misteriosa)
    this.eco = c.createDelay(1);
    this.eco.delayTime.value = 0.42;
    const fb = c.createGain();
    fb.gain.value = 0.36;
    const filtroEco = c.createBiquadFilter();
    filtroEco.type = "lowpass";
    filtroEco.frequency.value = 2200;
    this.eco.connect(filtroEco).connect(fb).connect(this.eco);
    filtroEco.connect(this.busMusica);

    this.ruido = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = this.ruido.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    this.intervalo = setInterval(() => this.agendar(), 25);
    document.addEventListener("visibilitychange", () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else if (this.ligado) this.ctx.resume();
    });
    // Música pedida antes do primeiro toque (o navegador só libera o som depois dele).
    if (this.pendente) {
      const nome = this.pendente;
      this.pendente = null;
      this.tocar(nome);
    }
  }

  criarIR(seg) {
    const c = this.ctx;
    const n = Math.floor(c.sampleRate * seg);
    const buf = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.6) * (i < c.sampleRate * 0.012 ? i / (c.sampleRate * 0.012) : 1);
      }
    }
    return buf;
  }

  get agora() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  definirLigado(lig) {
    this.ligado = lig;
    if (!this.ctx) return;
    const g = this.mestre.gain;
    g.cancelScheduledValues(this.agora);
    g.setTargetAtTime(lig ? 0.9 : 0, this.agora, 0.08);
    if (lig && this.ctx.state === "suspended") this.ctx.resume();
  }

  // ---------- Música ----------
  tocar(nome, fade = 1.6) {
    if (!this.ctx) {
      this.pendente = nome;
      return;
    }
    if (this.musica?.nome === nome) return;
    this.parar(fade);
    const def = MUSICAS[nome];
    if (!def) return;
    const c = this.ctx;
    const saida = c.createGain();
    saida.gain.setValueAtTime(0.0001, this.agora);
    saida.gain.exponentialRampToValueAtTime(def.volume ?? 1, this.agora + fade);
    saida.connect(this.busMusica);
    const base = c.createGain();
    base.connect(saida);
    const tensao = c.createGain();
    tensao.gain.value = this.tensaoAtual;
    tensao.connect(saida);
    this.musica = { nome, def, saida, base, tensao, passo: 0, proximo: this.agora + 0.08, estado: {} };
    def.iniciar?.(this, this.musica);
  }

  parar(fade = 1.2) {
    const m = this.musica;
    if (!m) return;
    this.musica = null;
    const g = m.saida.gain;
    g.cancelScheduledValues(this.agora);
    g.setValueAtTime(Math.max(0.0001, g.value), this.agora);
    g.exponentialRampToValueAtTime(0.0001, this.agora + fade);
    m.fimEm = this.agora + fade;
    this.saindo.push(m);
    setTimeout(() => {
      m.def.parar?.(this, m);
      m.saida.disconnect();
    }, fade * 1000 + 200);
  }

  // 0 = calmo, 1 = suspense máximo.
  tensao(v) {
    v = Math.max(0, Math.min(1, v));
    if (Math.abs(v - this.tensaoAtual) < 0.01) return;
    this.tensaoAtual = v;
    const m = this.musica;
    if (!m) return;
    m.tensao.gain.setTargetAtTime(v, this.agora, 0.8);
    m.base.gain.setTargetAtTime(1 - v * 0.45, this.agora, 0.8);
  }

  agendar() {
    if (!this.ctx || this.ctx.state !== "running") return;
    const limite = this.agora + 0.14;
    for (const m of [this.musica, ...this.saindo]) {
      if (!m) continue;
      const dur = 60 / m.def.bpm / 4;
      while (m.proximo < limite) {
        if (m.fimEm && m.proximo > m.fimEm) break;
        m.def.passo(this, m, m.passo % m.def.passos, m.proximo, m.passo);
        m.passo++;
        m.proximo += dur;
      }
    }
    this.saindo = this.saindo.filter((m) => this.agora < m.fimEm);
  }

  // ---------- Efeitos ----------
  sfx(nome, opcoes = {}) {
    if (!this.ctx || !this.ligado) return;
    const f = EFEITOS[nome];
    if (f) f(this, this.agora + 0.005, opcoes);
  }

  passo(terreno) {
    this.sfx("passo", { terreno });
  }

  blip(quem) {
    if (!this.ctx || !this.ligado) return;
    const v = VOZES[quem] ?? VOZES.padrao;
    const t = this.agora;
    const o = this.ctx.createOscillator();
    o.type = v.onda;
    o.frequency.setValueAtTime(v.f * (0.94 + Math.random() * 0.12), t);
    const g = this.env(t, 0.004, 0.05, v.vol ?? 0.05);
    o.connect(g).connect(this.busSfx);
    o.start(t);
    o.stop(t + 0.07);
  }

  // ---------- Instrumentos ----------
  env(t, ataque, dur, pico, destino) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, pico), t + ataque);
    g.gain.exponentialRampToValueAtTime(0.0001, t + ataque + dur);
    if (destino) g.connect(destino);
    return g;
  }

  fonteRuido(t, dur) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.ruido;
    s.loop = true;
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.05);
    return s;
  }

  // Corda dedilhada (alaúde/oud, harpa) por Karplus-Strong pré-calculado.
  bufferCorda(f) {
    const chave = Math.round(f * 10);
    if (this.cacheCorda.has(chave)) return this.cacheCorda.get(chave);
    const sr = this.ctx.sampleRate;
    const n = Math.floor(sr * 2.2);
    const buf = this.ctx.createBuffer(1, n, sr);
    const d = buf.getChannelData(0);
    const N = Math.max(2, Math.round(sr / f));
    const linha = new Float32Array(N);
    for (let i = 0; i < N; i++) linha[i] = Math.random() * 2 - 1;
    let ant = 0;
    const decai = 0.996 - Math.min(0.006, f / 200000);
    for (let i = 0; i < n; i++) {
      const k = i % N;
      const v = linha[k];
      d[i] = v;
      linha[k] = (v + ant) * 0.5 * decai;
      ant = v;
    }
    this.cacheCorda.set(chave, buf);
    return buf;
  }

  corda(nota, t, destino, { vol = 0.35, brilho = 2600, dur = 2, eco = false } = {}) {
    const f = freq(nota);
    const s = this.ctx.createBufferSource();
    s.buffer = this.bufferCorda(f);
    const filtro = this.ctx.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.value = brilho;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.setTargetAtTime(0.0001, t + dur * 0.6, dur * 0.25);
    s.connect(filtro).connect(g).connect(destino);
    if (eco) g.connect(this.eco);
    s.start(t);
    s.stop(t + dur + 0.2);
  }

  flauta(nota, t, dur, destino, { vol = 0.12, vibrato = 5.2 } = {}) {
    const c = this.ctx;
    const f = freq(nota);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f * 0.985, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.09);
    const o2 = c.createOscillator();
    o2.type = "triangle";
    o2.frequency.value = f * 2;
    const lfo = c.createOscillator();
    lfo.frequency.value = vibrato;
    const prof = c.createGain();
    prof.gain.setValueAtTime(0, t);
    prof.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.5, dur * 0.5));
    lfo.connect(prof).connect(o.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.08);
    g.gain.setValueAtTime(vol, t + Math.max(0.09, dur - 0.15));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    const g2 = c.createGain();
    g2.gain.value = 0.12;
    o.connect(g);
    o2.connect(g2).connect(g);
    // sopro
    const r = this.fonteRuido(t, dur + 0.3);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = f * 1.5;
    bp.Q.value = 2.5;
    const gr = c.createGain();
    gr.gain.value = 0.18;
    r.connect(bp).connect(gr).connect(g);
    g.connect(destino);
    for (const x of [o, o2, lfo]) {
      x.start(t);
      x.stop(t + dur + 0.35);
    }
  }

  pad(notas, t, dur, destino, { vol = 0.06, brilho = 1100, ataque = 1.2, onda = "sawtooth" } = {}) {
    const c = this.ctx;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + ataque);
    g.gain.setValueAtTime(vol, t + Math.max(ataque, dur - 0.6));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.6);
    const filtro = c.createBiquadFilter();
    filtro.type = "lowpass";
    filtro.frequency.setValueAtTime(brilho * 0.6, t);
    filtro.frequency.linearRampToValueAtTime(brilho, t + dur * 0.6);
    filtro.Q.value = 0.7;
    filtro.connect(g).connect(destino);
    for (const n of notas) {
      for (const det of [-7, 6]) {
        const o = c.createOscillator();
        o.type = onda;
        o.frequency.value = freq(n);
        o.detune.value = det;
        o.connect(filtro);
        o.start(t);
        o.stop(t + dur + 1.8);
      }
    }
  }

  sino(nota, t, destino, { vol = 0.08, dur = 2.6 } = {}) {
    const c = this.ctx;
    const f = freq(nota);
    for (const [razao, amp] of [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]]) {
      const o = c.createOscillator();
      o.type = "sine";
      o.frequency.value = f * razao;
      const g = this.env(t, 0.004, dur / razao ** 0.4, vol * amp, destino);
      o.connect(g);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  baixo(nota, t, dur, destino, { vol = 0.16 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq(nota);
    const g = this.env(t, 0.01, dur, vol, destino);
    o.connect(g);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // Percussão (darbuka / riq)
  doum(t, destino, vol = 0.32) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.18);
    o.connect(this.env(t, 0.003, 0.32, vol, destino));
    o.start(t);
    o.stop(t + 0.4);
  }

  tek(t, destino, vol = 0.12) {
    const c = this.ctx;
    const r = this.fonteRuido(t, 0.06);
    const bp = c.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3200;
    bp.Q.value = 1.4;
    r.connect(bp).connect(this.env(t, 0.001, 0.05, vol, destino));
    const o = c.createOscillator();
    o.type = "triangle";
    o.frequency.value = 520;
    o.connect(this.env(t, 0.001, 0.04, vol * 0.5, destino));
    o.start(t);
    o.stop(t + 0.06);
  }

  riq(t, destino, vol = 0.05) {
    const c = this.ctx;
    for (let k = 0; k < 3; k++) {
      const tt = t + k * 0.012;
      const r = this.fonteRuido(tt, 0.09);
      const hp = c.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7200;
      r.connect(hp).connect(this.env(tt, 0.001, 0.08, vol * (1 - k * 0.25), destino));
    }
  }

  ruidoFiltrado(t, dur, destino, { tipo = "bandpass", f = 1000, f2, q = 1, vol = 0.1, ataque = 0.01 } = {}) {
    const c = this.ctx;
    const r = this.fonteRuido(t, dur);
    const filtro = c.createBiquadFilter();
    filtro.type = tipo;
    filtro.frequency.setValueAtTime(f, t);
    if (f2) filtro.frequency.exponentialRampToValueAtTime(f2, t + dur);
    filtro.Q.value = q;
    r.connect(filtro).connect(this.env(t, ataque, dur, vol, destino));
  }

  tom(nota, t, dur, destino, { onda = "sine", vol = 0.1, f2, ataque = 0.005 } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = onda;
    o.frequency.setValueAtTime(freq(nota), t);
    if (f2) o.frequency.exponentialRampToValueAtTime(freq(f2), t + dur);
    o.connect(this.env(t, ataque, dur, vol, destino));
    o.start(t);
    o.stop(t + dur + ataque + 0.05);
  }
}
