// Biblioteca de materiais PBR dos personagens.
// Cada tipo de superfície (lã, jeans, cetim, couro, palha, feltro, pele, cabelo…) tem mapas próprios
// de relevo (normal), rugosidade e variação de cor, gerados uma única vez e reutilizados por todos
// os personagens. Os materiais são guardados em cache por tipo + cor e nunca são recriados por quadro.
import * as THREE from 'three';
import { quality } from '../core/settings.js';

// ---------- ruídos repetíveis (tileable) ----------
function rng(seed) { let s = (seed * 2654435761) >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 4294967296; }; }

function vnoise(N, cells, seed) {
  const r = rng(seed), g = new Float32Array(cells * cells);
  for (let i = 0; i < g.length; i++) g[i] = r();
  const out = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const fx = x / N * cells, fy = y / N * cells, x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const G = (i, j) => g[((j % cells) * cells) + (i % cells)];
    const a = G(x0, y0), b = G(x0 + 1, y0), c = G(x0, y0 + 1), d = G(x0 + 1, y0 + 1);
    out[y * N + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  return out;
}
function fbm(N, seed, oct = 4, base = 4) {
  const out = new Float32Array(N * N); let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) { const n = vnoise(N, base << o, seed + o * 31); for (let i = 0; i < out.length; i++) out[i] += n[i] * amp; tot += amp; amp *= 0.5; }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
// Ruído celular (Worley) repetível: distância ao ponto mais próximo e id da célula.
function worley(N, cells, seed) {
  const r = rng(seed), pts = new Float32Array(cells * cells * 2);
  for (let i = 0; i < cells * cells; i++) { pts[i * 2] = r(); pts[i * 2 + 1] = r(); }
  const f1 = new Float32Array(N * N), id = new Float32Array(N * N);
  const cs = N / cells;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const cx = Math.floor(x / cs), cy = Math.floor(y / cs);
    let best = 1e9, bid = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = (cx + i + cells) % cells, gy = (cy + j + cells) % cells, k = gy * cells + gx;
      const px = (cx + i + pts[k * 2]) * cs, py = (cy + j + pts[k * 2 + 1]) * cs;
      const d = Math.hypot(px - x, py - y);
      if (d < best) { best = d; bid = k; }
    }
    f1[y * N + x] = best / cs; id[y * N + x] = bid;
  }
  return { f1, id };
}
function line1D(N, seed, cells = 32) {
  const r = rng(seed), g = new Float32Array(cells); for (let i = 0; i < cells; i++) g[i] = r();
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) { const f = i / N * cells, i0 = Math.floor(f), t = f - i0, s = t * t * (3 - 2 * t); out[i] = g[i0 % cells] * (1 - s) + g[(i0 + 1) % cells] * s; }
  return out;
}

const TAU = Math.PI * 2;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

// ---------- definição dos tipos de superfície ----------
// gen(N) -> { h: altura 0..1, a: multiplicador de cor (~1), r: rugosidade 0..1 }
// tile: tamanho físico de uma repetição da textura, em metros.
const KINDS = {
  wool: { tile: 0.035, normal: 0.9, metal: 0, gen(N) {
    const n = fbm(N, 11, 4, 8), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    const p = N / 22;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, tw = 0.5 + 0.5 * Math.sin(TAU * (x + y) / p);
      h[i] = tw * 0.65 + n[i] * 0.35; a[i] = 0.94 + (n[i] - 0.5) * 0.14 + tw * 0.05; r[i] = 0.8 + (n[i] - 0.5) * 0.12;
    }
    return { h, a, r };
  } },
  poplin: { tile: 0.02, normal: 0.45, metal: 0, gen(N) {
    const n = fbm(N, 13, 3, 8), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    const p = N / 32;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, wv = 0.5 + 0.25 * (Math.sin(TAU * x / p) * Math.sign(Math.sin(TAU * y / (p * 2))) + Math.sin(TAU * y / p));
      h[i] = wv * 0.8 + n[i] * 0.2; a[i] = 0.97 + (n[i] - 0.5) * 0.05; r[i] = 0.62 + (n[i] - 0.5) * 0.08;
    }
    return { h, a, r };
  } },
  jersey: { tile: 0.025, normal: 0.7, metal: 0, gen(N) {
    const n = fbm(N, 17, 3, 8), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    const p = N / 26;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, col = Math.floor(x / p), lx = (x % p) / p;
      const v = Math.abs(Math.sin(Math.PI * lx)) * (0.55 + 0.45 * Math.sin(TAU * y / (p * 0.75) + (col % 2) * Math.PI + lx * 2));
      h[i] = v * 0.75 + n[i] * 0.25; a[i] = 0.95 + v * 0.05 + (n[i] - 0.5) * 0.06; r[i] = 0.86 + (n[i] - 0.5) * 0.08;
    }
    return { h, a, r };
  } },
  denim: { tile: 0.04, normal: 1.3, metal: 0, gen(N) {
    const n = fbm(N, 19, 4, 8), row = line1D(N, 23, 64), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    const p = N / 20;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, t = ((x + y * 3) / p) % 1, tw = Math.pow(Math.sin(Math.PI * t), 0.6);
      h[i] = tw * 0.7 + n[i] * 0.3;
      a[i] = 0.72 + tw * 0.28 + (row[y] - 0.5) * 0.22 + (n[i] - 0.5) * 0.12; r[i] = 0.9 + (n[i] - 0.5) * 0.08;
    }
    return { h, a, r };
  } },
  linen: { tile: 0.045, normal: 0.9, metal: 0, gen(N) {
    const n = fbm(N, 29, 3, 8), rows = line1D(N, 31, 80), cols = line1D(N, 37, 80), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    const p = N / 36;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, wv = 0.5 + 0.22 * (Math.sin(TAU * x / p) + Math.sin(TAU * y / p));
      const slub = Math.max(rows[y], cols[x]);
      h[i] = wv * 0.6 + slub * 0.3 + n[i] * 0.1; a[i] = 0.9 + slub * 0.14 + (n[i] - 0.5) * 0.08; r[i] = 0.88;
    }
    return { h, a, r };
  } },
  satin: { tile: 0.12, normal: 0.35, metal: 0.05, gen(N) {
    const n = fbm(N, 41, 3, 2), col = line1D(N, 43, 128), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x;
      h[i] = n[i] * 0.6 + col[x] * 0.4; a[i] = 0.97 + (n[i] - 0.5) * 0.06; r[i] = 0.26 + col[x] * 0.12 + (n[i] - 0.5) * 0.08;
    }
    return { h, a, r };
  } },
  velvet: { tile: 0.06, normal: 0.6, metal: 0, gen(N) {
    const n = fbm(N, 47, 5, 4), m = fbm(N, 53, 3, 2), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) { h[i] = n[i]; a[i] = 0.82 + m[i] * 0.3; r[i] = 0.9 + (n[i] - 0.5) * 0.08; }
    return { h, a, r };
  } },
  sequin: { tile: 0.03, normal: 1.6, metal: 0.8, gen(N) {
    const h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    const rows = 10, cs = N / rows, rr = rng(59), tilt = [];
    for (let k = 0; k < rows * rows; k++) tilt.push([rr() - 0.5, rr() - 0.5, 0.75 + rr() * 0.45, 0.12 + rr() * 0.22]);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let best = 1e9, bk = 0, bdx = 0, bdy = 0;
      const ry = Math.floor(y / cs);
      for (let j = -1; j <= 1; j++) {
        const rowI = (ry + j + rows) % rows, off = (rowI % 2) * cs / 2;
        const cx0 = Math.floor((x - off) / cs);
        for (let i = -1; i <= 1; i++) {
          const ci = ((cx0 + i) % rows + rows) % rows;
          const px = (cx0 + i + 0.5) * cs + off, py = (ry + j + 0.5) * cs;
          const d = Math.hypot(x - px, y - py);
          if (d < best) { best = d; bk = rowI * rows + ci; bdx = x - px; bdy = y - py; }
        }
      }
      const i = y * N + x, R = cs * 0.52, t = tilt[bk];
      const inside = best < R ? 1 : 0;
      h[i] = inside ? 0.6 + (bdx * t[0] + bdy * t[1]) / cs * 0.8 + (1 - best / R) * 0.1 : 0.1;
      a[i] = inside ? t[2] : 0.45; r[i] = inside ? t[3] : 0.6;
    }
    return { h, a, r };
  } },
  lame: { tile: 0.08, normal: 0.9, metal: 0.9, gen(N) {
    const n = fbm(N, 61, 5, 4), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) { const c = 1 - Math.abs(n[i] - 0.5) * 2; h[i] = c; a[i] = 0.85 + c * 0.25; r[i] = 0.16 + (1 - c) * 0.16; }
    return { h, a, r };
  } },
  leather: { tile: 0.018, normal: 0.55, metal: 0, gen(N) {
    const w = worley(N, 26, 67), n = fbm(N, 71, 4, 4), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) {
      const pebble = 1 - clamp(w.f1[i] * 1.4);
      const crease = Math.pow(1 - Math.abs(n[i] - 0.5) * 2, 8);
      h[i] = pebble * 0.75 - crease * 0.3 + 0.2; a[i] = 0.9 + pebble * 0.1 - crease * 0.08; r[i] = 0.42 + (1 - pebble) * 0.16 + crease * 0.1;
    }
    return { h, a, r };
  } },
  patent: { tile: 0.1, normal: 0.25, metal: 0, gen(N) {
    const n = fbm(N, 73, 3, 2), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) { h[i] = n[i]; a[i] = 1; r[i] = 0.1 + n[i] * 0.06; }
    return { h, a, r };
  } },
  felt: { tile: 0.05, normal: 0.55, metal: 0, gen(N) {
    const n = fbm(N, 79, 6, 4), m = fbm(N, 83, 2, 2), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) { h[i] = n[i]; a[i] = 0.9 + (m[i] - 0.5) * 0.16 + (n[i] - 0.5) * 0.08; r[i] = 0.95; }
    return { h, a, r };
  } },
  straw: { tile: 0.045, normal: 1.6, metal: 0, gen(N) {
    // trama de cestaria: blocos alternando fios horizontais e verticais
    const n = fbm(N, 89, 3, 8), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    const blocks = 8, bs = N / blocks, strands = 4, ss = bs / strands, rr = rng(97), tone = [];
    for (let k = 0; k < blocks * blocks * strands; k++) tone.push(0.78 + rr() * 0.36);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const bx = Math.floor(x / bs), by = Math.floor(y / bs), horiz = (bx + by) % 2 === 0;
      const along = horiz ? x : y, across = horiz ? y : x;
      const si = Math.floor((across % bs) / ss), lt = (across % ss) / ss;
      const prof = Math.sin(Math.PI * lt);
      const fiber = 0.5 + 0.5 * Math.sin(along * 0.9 + si * 7.1 + (horiz ? 0 : 3));
      const edge = Math.min((along % bs) / bs, 1 - (along % bs) / bs);
      const i = y * N + x;
      h[i] = prof * (0.7 + 0.3 * Math.min(1, edge * 6)) * (0.9 + fiber * 0.1) + n[i] * 0.1;
      a[i] = (prof > 0.15 ? tone[(by * blocks + bx) * strands + si] : 0.5) * (0.92 + fiber * 0.08);
      r[i] = 0.72 + (1 - prof) * 0.2;
    }
    return { h, a, r };
  } },
  knit: { tile: 0.05, normal: 1.2, metal: 0, gen(N) {
    const n = fbm(N, 101, 4, 8), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    const p = N / 12;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, lx = (x % p) / p - 0.5, ly = (y % (p * 0.8)) / (p * 0.8);
      const v = Math.max(0, 1 - Math.abs(Math.abs(lx) * 2 - (1 - ly) * 0.9) * 3) ;
      h[i] = v * 0.8 + n[i] * 0.2; a[i] = 0.86 + v * 0.16 + (n[i] - 0.5) * 0.06; r[i] = 0.92;
    }
    return { h, a, r };
  } },
  grosgrain: { tile: 0.012, normal: 0.9, metal: 0, gen(N) {
    const n = fbm(N, 103, 3, 8), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    const p = N / 10;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, v = 0.5 + 0.5 * Math.sin(TAU * y / p); h[i] = v * 0.85 + n[i] * 0.15; a[i] = 0.9 + v * 0.1; r[i] = 0.5 + (1 - v) * 0.15; }
    return { h, a, r };
  } },
  canvas: { tile: 0.03, normal: 0.9, metal: 0, gen(N) {
    const n = fbm(N, 107, 3, 8), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    const p = N / 20;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, wv = 0.5 + 0.25 * (Math.sin(TAU * x / p) + Math.sin(TAU * y / p)); h[i] = wv * 0.8 + n[i] * 0.2; a[i] = 0.95 + (n[i] - 0.5) * 0.08; r[i] = 0.82; }
    return { h, a, r };
  } },
  rubber: { tile: 0.03, normal: 0.6, metal: 0, gen(N) {
    const n = fbm(N, 109, 4, 8), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) { h[i] = n[i]; a[i] = 0.95 + (n[i] - 0.5) * 0.08; r[i] = 0.86; }
    return { h, a, r };
  } },
  skin: { tile: 0.03, normal: 0.35, metal: 0, gen(N) {
    const w = worley(N, 40, 113), n = fbm(N, 127, 4, 4), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) { const pore = clamp(w.f1[i] * 2.2); h[i] = pore * 0.6 + n[i] * 0.4; a[i] = 0.98 + (n[i] - 0.5) * 0.06; r[i] = 0.64 + (n[i] - 0.5) * 0.14 + (1 - pore) * 0.06; }
    return { h, a, r };
  } },
  hair: { tile: 0.02, normal: 1.1, metal: 0, gen(N) {
    const c1 = line1D(N, 131, 96), c2 = line1D(N, 137, 31), n = fbm(N, 139, 3, 4), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, s = c1[x] * 0.7 + c2[x] * 0.3;
      h[i] = s * 0.85 + n[i] * 0.15; a[i] = 0.78 + s * 0.34; r[i] = 0.42 + (1 - s) * 0.18;
    }
    return { h, a, r };
  } },
  brushed: { tile: 0.02, normal: 0.25, metal: 1, gen(N) {
    const row = line1D(N, 149, 128), n = fbm(N, 151, 3, 4), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x; h[i] = row[y] * 0.7 + n[i] * 0.3; a[i] = 0.96 + row[y] * 0.06; r[i] = 0.22 + row[y] * 0.1; }
    return { h, a, r };
  } },
  polished: { tile: 0.05, normal: 0.1, metal: 1, gen(N) {
    const n = fbm(N, 157, 3, 2), h = new Float32Array(N * N), a = new Float32Array(N * N), r = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) { h[i] = n[i]; a[i] = 1; r[i] = 0.1 + n[i] * 0.08; }
    return { h, a, r };
  } },
};

// Texturas estilizadas: a trama fica ~1,8x maior que a real para continuar visível na tela.
export const TILE_SCALE = 1.8;
export function kindTile(kind) { return (KINDS[kind] || KINDS.wool).tile * TILE_SCALE; }

const mapCache = new Map();
function texSize() { return quality().physical ? 512 : 256; }

function makeTex(data, N, srgb) {
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.anisotropy = 8;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.needsUpdate = true;
  return t;
}

// Converte altura em mapa normal (Sobel, convenção OpenGL do three.js).
export function heightToNormal(h, N, strength = 2) {
  const out = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const xm = (x - 1 + N) % N, xp = (x + 1) % N, ym = (y - 1 + N) % N, yp = (y + 1) % N;
    const dx = (h[y * N + xp] - h[y * N + xm]) * strength;
    const dy = (h[yp * N + x] - h[ym * N + x]) * strength;
    let nx = -dx, ny = dy, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * N + x) * 4;
    out[i] = (nx * 0.5 + 0.5) * 255; out[i + 1] = (ny * 0.5 + 0.5) * 255; out[i + 2] = (nz * 0.5 + 0.5) * 255; out[i + 3] = 255;
  }
  return out;
}

// Mapas base de um tipo (normal, rugosidade, variação de cor em escala de cinza).
export function kindMaps(kind) {
  const N = texSize();
  const key = kind + N;
  if (mapCache.has(key)) return mapCache.get(key);
  const K = KINDS[kind] || KINDS.wool;
  const { h, a, r } = K.gen(N);
  const nrm = makeTex(heightToNormal(h, N, 6), N, false);
  const rough = new Uint8Array(N * N * 4), alb = new Float32Array(N * N);
  for (let i = 0; i < N * N; i++) { const v = clamp(r[i]) * 255; rough[i * 4] = rough[i * 4 + 1] = rough[i * 4 + 2] = v; rough[i * 4 + 3] = 255; alb[i] = a[i]; }
  const maps = { N, h, alb, normal: nrm, rough: makeTex(rough, N, false), kind, def: K };
  mapCache.set(key, maps);
  return maps;
}

// Textura de cor = cor da peça × variação da fibra (cacheada por tipo + cor).
const colorCache = new Map();
function tintedColorMap(kind, color) {
  const N = texSize(), key = kind + color + N;
  if (colorCache.has(key)) return colorCache.get(key);
  const m = kindMaps(kind);
  // trabalha em sRGB para a variação ficar perceptualmente uniforme
  const srgb = {}; new THREE.Color(color).getRGB(srgb, THREE.SRGBColorSpace);
  const data = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    const k = m.alb[i];
    data[i * 4] = clamp(srgb.r * k) * 255; data[i * 4 + 1] = clamp(srgb.g * k) * 255; data[i * 4 + 2] = clamp(srgb.b * k) * 255; data[i * 4 + 3] = 255;
  }
  const t = makeTex(data, N, true);
  colorCache.set(key, t);
  return t;
}

function withRepeat(tex, rep) {
  const key = '__rep' + rep.toFixed(3);
  tex.userData[key] ||= (() => { const c = tex.clone(); c.repeat.set(rep, rep); c.needsUpdate = true; return c; })();
  return tex.userData[key];
}

// Converte um padrão de tecido (pinstripe, xadrez…) para repetir em metros.
const PATTERN_TILE = { pinstripe: 0.1, plaid: 0.16, floral: 0.22, houndstooth: 0.05, stripes: 0.14, leopard: 0.25 };

const matCache = new Map();
/**
 * Material compartilhado para uma superfície.
 * opts: { color, kind, pattern (Texture de cor opcional), patternTile, side, sheen, clearcoat,
 *         transparent, opacity, alphaMap, vertexColors, metalness, roughness, envIntensity, tag }
 * As geometrias que usam estes materiais têm UV em METROS (ver geo.js: metricUV).
 */
export function surfaceMaterial(opts) {
  const kind = opts.kind || 'wool';
  const K = KINDS[kind] || KINDS.wool;
  const hi = quality().physical;
  const tileM = K.tile * TILE_SCALE;
  const key = [kind, opts.color, opts.pattern ? opts.pattern.uuid : '', opts.side || 0, opts.transparent ? opts.opacity : '', opts.vertexColors ? 'vc' : '', opts.tag || '', hi ? 'H' : 'L'].join('|');
  if (matCache.has(key)) return matCache.get(key);
  const maps = kindMaps(kind);
  const rep = 1 / tileM;
  const usePhysical = hi && (opts.sheen || opts.clearcoat || opts.iridescence);
  const M = usePhysical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  let map;
  if (opts.pattern) { map = opts.pattern.clone(); const pt = 1 / (opts.patternTile || 0.12); map.repeat.set(pt, pt); map.anisotropy = 8; map.needsUpdate = true; }
  else map = withRepeat(tintedColorMap(kind, opts.color || '#888888'), rep);
  const m = new M({
    color: opts.vertexColors ? (opts.color || '#ffffff') : 0xffffff,
    map,
    normalMap: withRepeat(maps.normal, rep), normalScale: new THREE.Vector2(K.normal, K.normal).multiplyScalar(opts.normalBoost || 1),
    roughnessMap: withRepeat(maps.rough, rep), roughness: opts.roughness ?? 1,
    metalness: opts.metalness ?? K.metal,
    side: opts.side || THREE.FrontSide,
    transparent: !!opts.transparent, opacity: opts.opacity ?? 1,
    alphaMap: opts.alphaMap || null, alphaTest: opts.alphaTest || 0,
    vertexColors: !!opts.vertexColors,
    envMapIntensity: opts.envIntensity ?? 1,
  });
  if (opts.vertexColors) m.map = withRepeat(tintedColorMap(kind, '#ffffff'), rep);
  if (usePhysical) {
    if (opts.sheen) { m.sheen = opts.sheen; m.sheenRoughness = opts.sheenRoughness ?? 0.5; m.sheenColor = new THREE.Color(opts.sheenColor || opts.color || '#ffffff').lerp(new THREE.Color('#ffffff'), opts.sheenTint ?? 0.12); }
    if (opts.clearcoat) { m.clearcoat = opts.clearcoat; m.clearcoatRoughness = opts.clearcoatRoughness ?? 0.25; }
    if (opts.iridescence) { m.iridescence = opts.iridescence; m.iridescenceIOR = 1.6; }
  }
  if (opts.transparent) m.depthWrite = false;
  m.userData.shared = true;
  m.name = 'pbr:' + kind;
  matCache.set(key, m);
  return m;
}

// ---------- tecido a partir da ficha do guarda-roupa ----------
// Decide o tipo de tecido de uma peça (pode ser forçado com `fabric` no wardrobe.js).
export function fabricKind(spec, slot = '') {
  if (!spec) return 'wool';
  if (spec.fabric) return spec.fabric;
  switch (spec.pattern) {
    case 'satin': return 'satin';
    case 'velvet': return 'velvet';
    case 'sequin': return 'sequin';
    case 'metallic': return 'lame';
    case 'leather': return 'leather';
    case 'denim': return 'denim';
    case 'knit': return 'knit';
    case 'plaid': return 'wool';
    case 'floral': case 'stripes': case 'leopard': return slot === 'top' && spec.neck === 'collar' ? 'poplin' : 'jersey';
    case 'pinstripe': case 'houndstooth': return 'wool';
  }
  if (/linho|bege|bermuda/i.test(spec.name || '')) return 'linen';
  if (slot === 'top') return spec.neck === 'collar' ? 'poplin' : (spec.neck === 'crew' || spec.neck === 'scoop' ? 'jersey' : 'satin');
  if (slot === 'dress' && spec.id === 'rosa_tule') return 'satin';
  return 'wool';
}

export function fabricProps(kind) {
  switch (kind) {
    case 'satin': return { sheen: 0.6, sheenRoughness: 0.3, clearcoat: 0.12 };
    case 'velvet': return { sheen: 0.9, sheenRoughness: 0.45, sheenTint: 0.25 };
    case 'sequin': return { clearcoat: 0.4 };
    case 'lame': return { clearcoat: 0.3 };
    case 'leather': return { clearcoat: 0.25, clearcoatRoughness: 0.5 };
    case 'patent': return { clearcoat: 1.0, clearcoatRoughness: 0.08 };
    case 'wool': case 'felt': case 'jersey': case 'knit': return { sheen: 0.18, sheenRoughness: 0.8, sheenTint: 0.05 };
    default: return {};
  }
}

// Material de tecido compartilhado para uma peça do guarda-roupa.
export function clothMaterial(spec, slot, opts = {}) {
  const kind = opts.kind || fabricKind(spec, slot);
  let pattern = null, patternTile;
  if (spec && PATTERN_TILE[spec.pattern] && opts.patternTexture) { pattern = opts.patternTexture; patternTile = PATTERN_TILE[spec.pattern]; }
  return surfaceMaterial({ kind, color: (spec && spec.color) || '#888888', pattern, patternTile, side: opts.side, ...fabricProps(kind), tag: opts.tag });
}

export function hasPatternTile(pattern) { return !!PATTERN_TILE[pattern]; }

// ---------- outros materiais compartilhados ----------
export const shared = {
  skin: color => surfaceMaterial({ kind: 'skin', color, sheen: 0.08, sheenRoughness: 0.7, sheenColor: color, sheenTint: 0, envIntensity: 0.2, tag: 'skin' }),
  hair: color => surfaceMaterial({ kind: 'hair', color, vertexColors: true, side: THREE.DoubleSide, sheen: 0.35, sheenRoughness: 0.35, sheenColor: color, sheenTint: 0.3, envIntensity: 0.5, tag: 'hair' }),
  leather: (color, finish = 'matte') => surfaceMaterial(finish === 'patent' ? { kind: 'patent', color, ...fabricProps('patent') } : { kind: 'leather', color, ...fabricProps('leather') }),
  rubber: color => surfaceMaterial({ kind: 'rubber', color }),
  canvasCloth: color => surfaceMaterial({ kind: 'canvas', color }),
  felt: (color, side) => surfaceMaterial({ kind: 'felt', color, side, sheen: 0.4, sheenRoughness: 0.7, sheenTint: 0.15 }),
  straw: (color, side) => surfaceMaterial({ kind: 'straw', color, side }),
  grosgrain: color => surfaceMaterial({ kind: 'grosgrain', color, sheen: 0.4, sheenRoughness: 0.4 }),
  satin: (color, side) => surfaceMaterial({ kind: 'satin', color, side, ...fabricProps('satin') }),
  metal: (color, finish = 'polished') => surfaceMaterial({ kind: finish === 'brushed' ? 'brushed' : 'polished', color, envIntensity: 1.3, clearcoat: finish === 'polished' ? 0.6 : 0 }),
  gem: color => {
    const key = 'gem' + color + quality().physical;
    if (matCache.has(key)) return matCache.get(key);
    const m = quality().physical
      ? new THREE.MeshPhysicalMaterial({ color, roughness: 0.02, metalness: 0, transmission: 0, clearcoat: 1, iridescence: 0.4, envMapIntensity: 2.5, specularIntensity: 1, ior: 2.4, flatShading: true })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.05, metalness: 0.4, envMapIntensity: 2, flatShading: true });
    m.userData.shared = true; matCache.set(key, m); return m;
  },
  pearl: () => {
    const key = 'pearl' + quality().physical;
    if (matCache.has(key)) return matCache.get(key);
    const m = quality().physical
      ? new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12, iridescence: 0.7, iridescenceIOR: 1.5, sheen: 0.5, sheenColor: '#ffe9f2', envMapIntensity: 1.4 })
      : new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25, metalness: 0.05, envMapIntensity: 1.4 });
    m.userData.shared = true; matCache.set(key, m); return m;
  },
  lens: (color, opacity) => {
    const key = 'lens' + color + opacity;
    if (matCache.has(key)) return matCache.get(key);
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.04, metalness: 0.5, transparent: true, opacity, envMapIntensity: 2, depthWrite: false, side: THREE.DoubleSide });
    m.userData.shared = true; matCache.set(key, m); return m;
  },
  acetate: color => {
    const key = 'acetate' + color + quality().physical;
    if (matCache.has(key)) return matCache.get(key);
    const M = quality().physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
    const m = new M({ color, roughness: 0.22, metalness: 0.02 });
    if (quality().physical) { m.clearcoat = 1; m.clearcoatRoughness = 0.1; }
    m.userData.shared = true; matCache.set(key, m); return m;
  },
  sheer: (color, fishnet = false) => {
    const key = 'sheer' + color + fishnet;
    if (matCache.has(key)) return matCache.get(key);
    let alphaMap = null;
    if (fishnet) {
      const N = 128, d = new Uint8Array(N * N * 4);
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const u = (x + y) % 32, v = (x - y + 128) % 32, on = (u < 4 || v < 4) ? 255 : 0, i = (y * N + x) * 4;
        d[i] = d[i + 1] = d[i + 2] = on; d[i + 3] = 255;
      }
      alphaMap = makeTex(d, N, false); alphaMap.repeat.set(1 / 0.03, 1 / 0.03);
    }
    const m = new THREE.MeshStandardMaterial({
      color, roughness: 0.6, metalness: 0, transparent: !fishnet, opacity: fishnet ? 1 : 0.55, alphaMap, alphaTest: fishnet ? 0.5 : 0,
      normalMap: withRepeat(kindMaps('jersey').normal, 1 / 0.012), normalScale: new THREE.Vector2(0.4, 0.4), depthWrite: fishnet, side: THREE.FrontSide,
    });
    m.userData.shared = true; matCache.set(key, m); return m;
  },
  dark: () => surfaceMaterial({ kind: 'rubber', color: '#141414', tag: 'dark' }),
};

// Limpa todos os materiais compartilhados (usado quando a qualidade gráfica muda).
export function clearMaterialCache() {
  for (const m of matCache.values()) m.dispose();
  matCache.clear();
}
