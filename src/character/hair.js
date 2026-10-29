// Cabelos com mechas: cada penteado é montado com mechas individuais (fitas afuniladas com
// espessura), cachos em espiral e coques enrolados, sobre uma base fina que evita falhas.
// Tudo é unido numa única malha por personagem (uma chamada de desenho).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/BufferGeometryUtils.js';
import { HEAD, headPoint, hairCap, metricUV } from './geo.js';
import { settings } from '../core/settings.js';

const PI = Math.PI;
function rng(seed) { let s = seed >>> 0 || 7; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }
const lerp = (a, b, t) => a + (b - a) * t;

function detail() { return { baixa: 0.5, media: 0.75, alta: 1 }[settings.quality] ?? 0.75; }

// Linha do cabelo (theta máximo por ângulo phi; phi = 0 na frente).
const hairline = (f, b, side = 0, exp = 1) => phi => {
  const w = Math.pow((1 - Math.cos(phi)) / 2, exp);
  return (f + (b - f) * w + side * Math.pow(Math.sin(phi), 2)) * PI;
};

class HairBuilder {
  constructor(seed) {
    this.pos = []; this.uv = []; this.col = []; this.idx = []; this.r = rng(seed); this.base = 0;
    this.extra = [];
  }
  // Mecha: pontos de controle -> fita afunilada com seção elíptica.
  lock(ctrl, { w0 = 0.02, w1 = 0.004, t0 = 0.006, t1 = 0.002, seg = 10, sides = 6, tone = 1, center = null, tipLight = 0.12 } = {}) {
    if (ctrl.length < 2) return;
    const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal');
    const pts = curve.getSpacedPoints(seg);
    const len = curve.getLength();
    const T = new THREE.Vector3(), O = new THREE.Vector3(), B = new THREE.Vector3(), N = new THREE.Vector3();
    const start = this.pos.length / 3;
    const uOff = this.r() * 4;
    let prevB = null;
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, p = pts[i];
      curve.getTangentAt(Math.min(0.999, t), T);
      if (center) O.copy(p).sub(center); else O.set(p.x, Math.max(p.y, -0.02) * 0.6, p.z);
      if (O.lengthSq() < 1e-8) O.set(0, 1, 0);
      O.normalize();
      B.crossVectors(T, O); if (B.lengthSq() < 1e-8) B.copy(prevB || new THREE.Vector3(1, 0, 0)); B.normalize();
      if (prevB && B.dot(prevB) < 0) B.negate();
      prevB = B.clone();
      N.crossVectors(B, T).normalize();
      const w = lerp(w0, w1, Math.pow(t, 0.8)) * (i === seg ? 0.3 : 1);
      const th = lerp(t0, t1, t) * (i === seg ? 0.3 : 1);
      const c = tone * (1 + tipLight * t);
      for (let s = 0; s <= sides; s++) {
        const a = (s / sides) * PI * 2;
        const ox = Math.cos(a) * w, oy = Math.sin(a) * th;
        this.pos.push(p.x + B.x * ox + N.x * oy, p.y + B.y * ox + N.y * oy, p.z + B.z * ox + N.z * oy);
        this.uv.push(uOff + (s / sides) * w * 2.2, t * len);
        // fio de dentro um pouco mais escuro (dá profundidade às camadas)
        const shade = c * (0.86 + 0.14 * Math.max(0, Math.sin(a)));
        this.col.push(shade, shade, shade);
      }
    }
    const ring = sides + 1;
    for (let i = 0; i < seg; i++) for (let s = 0; s < sides; s++) {
      const a = start + i * ring + s, b = a + 1, c2 = a + ring, d = c2 + 1;
      this.idx.push(a, c2, b, b, c2, d);
    }
  }
  // Cacho em espiral em torno de um eixo.
  coil(base, axis, { len = 0.035, R = 0.008, turns = 2.2, w = 0.0045, tone = 1, seg = 16 } = {}) {
    axis = axis.clone().normalize();
    const u = new THREE.Vector3().crossVectors(axis, Math.abs(axis.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize();
    const v = new THREE.Vector3().crossVectors(axis, u).normalize();
    const ph = this.r() * PI * 2, ctrl = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, a = ph + t * turns * PI * 2, rr = R * (1 - 0.35 * t);
      ctrl.push(base.clone().addScaledVector(axis, t * len).addScaledVector(u, Math.cos(a) * rr).addScaledVector(v, Math.sin(a) * rr));
    }
    this.lock(ctrl, { w0: w, w1: w * 0.7, t0: w, t1: w * 0.7, seg: seg * 2, sides: 5, tone, center: base.clone().addScaledVector(axis, -0.05), tipLight: 0.05 });
  }
  // Coque: espiral achatada de cabelo enrolado.
  bun(center, normal, { R = 0.05, loops = 3, thick = 0.02, tone = 1 } = {}) {
    const n = normal.clone().normalize();
    const u = new THREE.Vector3().crossVectors(n, new THREE.Vector3(1, 0, 0)).normalize();
    if (u.lengthSq() < 0.1) u.set(0, 0, 1);
    const v = new THREE.Vector3().crossVectors(n, u).normalize();
    const ctrl = [], steps = Math.round(loops * 14);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, a = t * loops * PI * 2, rr = R * (1 - t * 0.8), h = Math.sin(t * PI) * thick * 0.8 + t * thick * 0.6;
      ctrl.push(center.clone().addScaledVector(u, Math.cos(a) * rr).addScaledVector(v, Math.sin(a) * rr).addScaledVector(n, h));
    }
    this.lock(ctrl, { w0: thick, w1: thick * 0.55, t0: thick * 0.75, t1: thick * 0.4, seg: steps * 2, sides: 7, tone, center: center.clone().addScaledVector(n, -0.03), tipLight: 0 });
  }
  addGeometry(g, tone = 0.78) {
    const n = g.attributes.position.count, c = new Float32Array(n * 3).fill(tone);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    this.extra.push(g);
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeVertexNormals();
    const parts = [g, ...this.extra].map(p => { if (!p.attributes.normal) p.computeVertexNormals(); return p; });
    for (const p of parts) for (const k of Object.keys(p.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) p.deleteAttribute(k);
    const merged = parts.length > 1 ? mergeGeometries(parts.map(p => p.index ? p : p), false) : g;
    if (merged !== g) { g.dispose(); this.extra.forEach(e => e.dispose()); }
    return merged;
  }
}

// Ponto na superfície do cabelo (cabeça + espessura).
const S = (th, ph, off) => headPoint(Math.max(0.001, th), ph, off);

// Mecha "penteada" sobre o couro cabeludo, de (th0, ph0) até (th1, ph1).
// Direção unitária <-> ângulos (theta a partir do topo, phi a partir da frente).
const dirOf = (th, ph) => new THREE.Vector3(Math.sin(th) * Math.sin(ph), Math.cos(th), Math.sin(th) * Math.cos(ph));
function slerpAngles(th0, ph0, th1, ph1, t) {
  const a = dirOf(th0, ph0), b = dirOf(th1, ph1);
  const d = Math.min(1, Math.max(-1, a.dot(b))), w = Math.acos(d);
  if (w < 1e-4) return [th0, ph0];
  const s = Math.sin(w), v = a.multiplyScalar(Math.sin((1 - t) * w) / s).add(b.multiplyScalar(Math.sin(t * w) / s)).normalize();
  return [Math.acos(Math.min(1, Math.max(-1, v.y))), Math.atan2(v.x, v.z)];
}

function combLock(H, th0, ph0, th1, ph1, base, lift, o = {}) {
  const ctrl = [];
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    // arco de círculo máximo: sem torções ao passar pelo topo da cabeça
    const [th, ph] = slerpAngles(th0, ph0, th1, ph1, t);
    const off = base + lift * Math.sin(PI * Math.min(1, t * 1.1)) * (1 - t * 0.35) + (o.tipOut || 0) * t * t;
    ctrl.push(S(th, ph, off));
  }
  H.lock(ctrl, o);
}

// Continua uma mecha caindo abaixo da cabeça, sem atravessar pescoço e ombros (proporções na escala da cabeça).
function fallLock(H, startTh, ph, base, endY, o = {}) {
  const ctrl = [];
  const top = S(startTh * 0.45, ph * 0.6 + (o.partPh || 0) * 0.4, base);
  ctrl.push(top);
  const p0 = S(startTh, ph, base + 0.004);
  ctrl.push(p0);
  const steps = 6;
  const front = Math.abs(ph) < 1.45 && o.frontDrape;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const y = lerp(p0.y, endY, t);
    let x = p0.x * (1 + 0.25 * t), z = p0.z * (1 + 0.2 * t);
    // pescoço
    const nx = 0.085, nz = 0.08;
    let d = Math.hypot(x / nx, z / nz);
    if (y < -0.12 && d < 1.08) { x *= 1.08 / d; z *= 1.08 / d; }
    // ombros: as mechas de trás ficam atrás das costas; as de frente caem sobre o peito
    if (y < -0.2) {
      if (front) { z = Math.max(z, 0.13 + 0.02 * t); x = Math.sign(x || 1) * Math.min(Math.abs(x), 0.14); }
      else { z = Math.min(z, -0.115 - 0.02 * t); x *= 0.92; }
    }
    if (o.wave) { const k = Math.sin(y * 34 + o.wave) * 0.012 * t; x += k * Math.sign(x || 1); z += k * 0.4; }
    if (o.curlIn && t > 0.75) { const k = (t - 0.75) / 0.25; x *= 1 - 0.18 * k; z *= 1 - 0.18 * k; }
    ctrl.push(new THREE.Vector3(x, y, z));
  }
  H.lock(ctrl, { seg: 16, ...o });
}

export function buildHairGeometry(style, seed = 1) {
  const H = new HairBuilder(seed * 977 + style.length * 31);
  const r = H.r, D = detail();
  const capFor = (hl, puff) => {
    const cap = metricUV(hairCap(hl, puff, 40, 16), 0.8, 0.25);
    H.addGeometry(cap, 0.86);
  };
  const tone = () => 0.88 + r() * 0.24;
  // mechas penteadas em torno da cabeça, de cima para a linha do cabelo
  const combed = (hl, count, { lift = 0.005, liftFront = 0.008, base = 0.011, w0 = 0.03, flow = 0.2, frontFlow = 0.14, up = false } = {}) => {
    for (let k = 0; k < count; k++) {
      const ph0 = (r() * 2 - 1) * PI;
      const lim = hl(ph0);
      const th0 = (0.02 + r() * 0.55) * lim;
      const front = Math.abs(ph0) < 1.0;
      let th1 = Math.min(lim * 0.98, th0 + (front ? frontFlow : flow) * PI);
      let ph1 = ph0 + (front ? (r() - 0.5) * 0.25 : Math.sign(ph0) * 0.1);
      let lf = front ? liftFront : lift;
      if (up && front && th0 > 0.12 * PI) { th1 = Math.max(0.02, th0 - 0.2 * PI); lf = 0.04 + r() * 0.012; ph1 = ph0 * 0.8; }
      combLock(H, th0, ph0, th1, ph1, base + r() * 0.003, lf * (0.7 + r() * 0.6), { w0: w0 * (0.8 + r() * 0.4), w1: 0.012, t0: 0.007, t1: 0.003, tone: tone() });
    }
  };

  switch (style) {
    case 'curto': {
      const hl = hairline(0.33, 0.72, 0.05);
      capFor(hl, () => 0.005);
      combed(hl, Math.round(120 * D));
      break;
    }
    case 'topete': {
      const hl = hairline(0.33, 0.72, 0.05);
      capFor(hl, () => 0.005);
      combed(hl, Math.round(100 * D), { lift: 0.004 });
      // topete: mechas da frente sobem e voltam
      for (let k = 0; k < Math.round(26 * D); k++) {
        const ph = (r() - 0.5) * 1.3, th0 = (0.3 + r() * 0.03) * PI;
        combLock(H, th0, ph, (0.08 + r() * 0.06) * PI, ph * 0.6, 0.011, 0.045 + r() * 0.015, { w0: 0.026, w1: 0.006, t0: 0.008, t1: 0.003, tone: tone() });
      }
      break;
    }
    case 'lateral': {
      const hl = hairline(0.32, 0.72, 0.05);
      capFor(hl, () => 0.006);
      const part = 0.55;
      for (let k = 0; k < Math.round(85 * D); k++) {
        const th0 = (0.04 + r() * 0.26) * PI;
        const toRight = r() < 0.68;
        const ph0 = part + (r() - 0.5) * 0.08;
        const ph1 = toRight ? -(0.6 + r() * 1.6) : part + 0.4 + r() * 1.4;
        const th1 = Math.min(hl(ph1) * 0.97, th0 + (0.18 + r() * 0.2) * PI);
        combLock(H, th0, ph0, th1, ph1, 0.012, (toRight ? 0.018 : 0.01) * (0.7 + r() * 0.6), { w0: 0.03, w1: 0.012, t0: 0.006, t1: 0.002, tone: tone() });
      }
      combed(hl, Math.round(30 * D), { lift: 0.005 });
      break;
    }
    case 'raspado': {
      const hl = hairline(0.33, 0.7, 0.05);
      capFor(hl, () => 0.003);
      break;
    }
    case 'cacheado': {
      const hl = hairline(0.31, 0.74, 0.04);
      capFor(hl, () => 0.018);
      const n = Math.round(210 * D);
      for (let k = 0; k < n; k++) {
        const ph = (r() * 2 - 1) * PI, th = (0.02 + Math.sqrt(r()) * 0.94) * hl(ph);
        const p = S(th, ph, 0.012), out = S(th, ph, 0.05).sub(p).normalize();
        out.y -= 0.3 * (th / PI); // gravidade nos de baixo
        H.coil(p, out, { len: 0.016 + r() * 0.012, R: 0.0095 + r() * 0.003, turns: 2.4 + r(), w: 0.0068, tone: tone() });
      }
      break;
    }
    case 'black': {
      const hl = hairline(0.3, 0.78, 0.02);
      capFor(hl, (phi, v) => 0.05 + 0.018 * (1 - v));
      const n = Math.round(340 * D);
      for (let k = 0; k < n; k++) {
        const ph = (r() * 2 - 1) * PI, v = Math.sqrt(r()), th = (0.02 + v * 0.95) * hl(ph);
        const off = 0.05 + 0.018 * (1 - th / hl(ph));
        const p = S(th, ph, off - 0.01), out = S(th, ph, off + 0.04).sub(p).normalize();
        H.coil(p, out, { len: 0.014 + r() * 0.008, R: 0.0105 + r() * 0.003, turns: 2.4 + r(), w: 0.0075, tone: tone(), seg: 12 });
      }
      break;
    }
    case 'coque_m': {
      const hl = hairline(0.31, 0.72, 0.04);
      capFor(hl, () => 0.006);
      const bunAt = [0.38 * PI, PI];
      for (let k = 0; k < Math.round(70 * D); k++) {
        const ph0 = (r() * 2 - 1) * PI, th0 = hl(ph0) * (0.75 + r() * 0.2);
        combLock(H, th0, ph0, bunAt[0], ph0 > 0 ? PI - 0.15 : -PI + 0.15, 0.011, 0.006, { w0: 0.02, w1: 0.008, tone: tone() });
      }
      const c = S(bunAt[0], PI, 0.015), n = c.clone().normalize().add(new THREE.Vector3(0, 0.6, 0));
      H.bun(c, n, { R: 0.03, loops: 2.6, thick: 0.016, tone: 0.95 });
      break;
    }
    case 'coque': {
      const hl = hairline(0.32, 0.72, 0.03);
      capFor(hl, () => 0.005);
      for (let k = 0; k < Math.round(80 * D); k++) {
        const ph0 = (r() * 2 - 1) * PI, th0 = hl(ph0) * (0.8 + r() * 0.18);
        combLock(H, th0, ph0, 0.13 * PI, PI + (r() - 0.5) * 0.6, 0.01, 0.005, { w0: 0.02, w1: 0.008, tone: tone() });
      }
      const c = S(0.12 * PI, PI, 0.02), n = c.clone().normalize();
      H.bun(c, n, { R: 0.05, loops: 3.4, thick: 0.022, tone: 0.98 });
      H.addGeometry(new THREE.TorusGeometry(0.04, 0.007, 8, 24).rotateX(PI / 2).translate(c.x, c.y + 0.008, c.z), 0.45);
      break;
    }
    case 'rabo': {
      const hl = hairline(0.31, 0.72, 0.03);
      capFor(hl, () => 0.005);
      const tieTh = 0.5 * PI;
      for (let k = 0; k < Math.round(70 * D); k++) {
        const ph0 = (r() * 2 - 1) * PI, th0 = hl(ph0) * (0.7 + r() * 0.28);
        combLock(H, th0, ph0, tieTh, ph0 > 0 ? PI - 0.12 : -PI + 0.12, 0.01, 0.005, { w0: 0.02, w1: 0.008, tone: tone() });
      }
      const tie = S(tieTh, PI, 0.012);
      for (let k = 0; k < Math.round(16 * D) + 4; k++) {
        const a = r() * PI * 2, rr = r() * 0.012;
        const ox = Math.cos(a) * rr, oy = Math.sin(a) * rr;
        const sway = (r() - 0.5) * 0.04;
        H.lock([
          tie.clone().add(new THREE.Vector3(ox, oy, 0)),
          tie.clone().add(new THREE.Vector3(ox * 1.5, oy - 0.02, -0.05)),
          tie.clone().add(new THREE.Vector3(ox * 2 + sway, -0.1, -0.075)),
          tie.clone().add(new THREE.Vector3(ox * 2.4 + sway * 1.5, -0.2, -0.07)),
          tie.clone().add(new THREE.Vector3(ox * 2 + sway * 2, -0.29 - r() * 0.04, -0.06)),
        ], { w0: 0.022, w1: 0.004, t0: 0.008, t1: 0.002, seg: 14, tone: tone(), center: tie.clone().add(new THREE.Vector3(0, -0.1, 0.04)) });
      }
      H.addGeometry(new THREE.TorusGeometry(0.016, 0.006, 8, 16).translate(tie.x, tie.y, tie.z - 0.01), 0.35);
      break;
    }
    case 'chanel': {
      const hl = hairline(0.36, 0.8, 0.08, 0.6);
      capFor(hl, () => 0.007);
      // franja (termina acima das sobrancelhas)
      for (let k = 0; k < Math.round(22 * D); k++) {
        const ph = (r() - 0.5) * 1.5;
        combLock(H, 0.1 * PI, ph * 0.5, 0.375 * PI, ph, 0.012, 0.014, { w0: 0.024, w1: 0.008, t0: 0.006, t1: 0.003, tone: tone(), tipOut: 0.004 });
      }
      // laterais e nuca até o queixo, com pontas para dentro
      for (let k = 0; k < Math.round(60 * D); k++) {
        const ph = (r() < 0.5 ? -1 : 1) * (1.05 + r() * (PI - 1.05));
        fallLock(H, 0.5 * PI, ph, 0.014, -0.1 - r() * 0.02, { w0: 0.026, w1: 0.01, t0: 0.008, t1: 0.004, tone: tone(), curlIn: true });
      }
      break;
    }
    case 'longo': case 'ondas': {
      const waves = style === 'ondas';
      const hl = hairline(waves ? 0.31 : 0.33, 0.66, 0.06, 0.8);
      capFor(hl, () => 0.007);
      const part = waves ? 0.5 : 0;
      // topo: da risca para os lados
      for (let k = 0; k < Math.round(40 * D); k++) {
        const th0 = (0.04 + r() * 0.25) * PI;
        const side = r() < (waves ? 0.62 : 0.5) ? -1 : 1;
        const ph1 = side * (1.1 + r() * 1.9);
        combLock(H, th0, part, Math.min(hl(ph1), 0.55 * PI), ph1, 0.012, waves ? 0.02 : 0.012, { w0: 0.026, w1: 0.012, t0: 0.006, t1: 0.004, tone: tone() });
      }
      // comprimento: mechas caindo pelas costas e algumas sobre os ombros
      const n = Math.round(64 * D) + 10;
      for (let k = 0; k < n; k++) {
        const ph = (r() < 0.5 ? -1 : 1) * (1.08 + r() * (PI - 1.08));
        const front = Math.abs(ph) < 1.4 && r() < 0.6;
        fallLock(H, 0.6 * PI, ph, 0.013, -0.38 - r() * 0.08, {
          w0: 0.03, w1: 0.008, t0: 0.008, t1: 0.003, tone: tone(), frontDrape: front, partPh: part,
          wave: waves ? r() * 6 : 0,
        });
      }
      break;
    }
    default: {
      const hl = hairline(0.33, 0.72, 0.05);
      capFor(hl, () => 0.006);
      combed(hl, Math.round(60 * D));
    }
  }
  return H.build();
}

// Barba com fios (shell com material de cabelo, bordas suavizadas).
export function beardColorize(geo, tone = 0.8) {
  const n = geo.attributes.position.count, c = new Float32Array(n * 3);
  const rr = rng(n);
  for (let i = 0; i < n; i++) { const v = tone * (0.85 + rr() * 0.3); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return geo;
}
