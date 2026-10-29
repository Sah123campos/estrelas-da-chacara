// Texturas procedurais (canvas). Geradas localmente: carregam rápido e nunca "falham".
import * as THREE from 'three';

const cache = new Map();
let maxAniso = 4;
export function setMaxAnisotropy(a) { maxAniso = a; }

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
}

function canvas(w, h = w) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: false })];
}

// Ruído de valor suave e repetível (tileable).
function valueNoise(size, cells, seed) {
  const r = rng(seed);
  const grid = Array.from({ length: cells * cells }, () => r());
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const gx = x / size * cells, gy = y / size * cells;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const g = (i, j) => grid[((j % cells) * cells) + (i % cells)];
    const a = g(x0, y0), b = g(x0 + 1, y0), c = g(x0, y0 + 1), d = g(x0 + 1, y0 + 1);
    out[y * size + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }
  return out;
}
function fbm(size, seed, octaves = 4, base = 4) {
  const out = new Float32Array(size * size);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = valueNoise(size, base << o, seed + o * 97);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    total += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function paintNoise(ctx, size, colA, colB, seed, octaves = 4, base = 4, contrast = 1) {
  const n = fbm(size, seed, octaves, base);
  const img = ctx.getImageData(0, 0, size, size);
  const a = new THREE.Color(colA), b = new THREE.Color(colB);
  for (let i = 0; i < n.length; i++) {
    const t = Math.min(1, Math.max(0, (n[i] - 0.5) * contrast + 0.5));
    img.data[i * 4] = (a.r + (b.r - a.r) * t) * 255;
    img.data[i * 4 + 1] = (a.g + (b.g - a.g) * t) * 255;
    img.data[i * 4 + 2] = (a.b + (b.b - a.b) * t) * 255;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function sprinkle(ctx, size, count, colors, minR, maxR, seed, alpha = 1) {
  const r = rng(seed);
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(r() * colors.length)];
    const x = r() * size, y = r() * size, rad = minR + r() * (maxR - minR);
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      if (x + ox < -rad || x + ox > size + rad || y + oy < -rad || y + oy > size + rad) continue;
      ctx.beginPath(); ctx.arc(x + ox, y + oy, rad, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

function toTex(c, repeat = [1, 1], color = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = maxAniso;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

// Retorna {map, bump?} ; repeat aplicado por quem usa (clonando).
const S = 512;
export const tex = {
  grass: () => cached('grass', () => {
    const [c, x] = canvas(S);
    paintNoise(x, S, '#6e9a3a', '#9cc152', 11, 5, 4, 1.2);
    sprinkle(x, S, 2600, ['#5f8a30', '#7fa843', '#a6c463', '#b5cf72'], 0.6, 1.8, 3, 0.5);
    sprinkle(x, S, 80, ['#8c7a4a', '#7a6a3c'], 2, 6, 5, 0.25);
    return { map: toTex(c) };
  }),
  dirt: () => cached('dirt', () => {
    const [c, x] = canvas(S);
    paintNoise(x, S, '#8a5a35', '#b9875a', 21, 5, 4, 1.4);
    sprinkle(x, S, 1800, ['#6f4526', '#c99a6a', '#a0714a', '#d7b08a'], 0.5, 2.2, 7, 0.6);
    return { map: toTex(c) };
  }),
  gravel: () => cached('gravel', () => {
    const [c, x] = canvas(S);
    paintNoise(x, S, '#9b8f80', '#c4b8a6', 31, 4, 8, 1.2);
    sprinkle(x, S, 3500, ['#7c7266', '#d8cfc0', '#a89a88', '#5f574e', '#e5ddd0'], 1, 3.2, 9, 0.9);
    return { map: toTex(c) };
  }),
  concrete: () => cached('concrete', () => {
    const [c, x] = canvas(S);
    paintNoise(x, S, '#a8a49c', '#cdc9c0', 41, 5, 4, 1.0);
    sprinkle(x, S, 1500, ['#8f8b84', '#d9d6cf'], 0.4, 1.2, 4, 0.5);
    x.strokeStyle = 'rgba(80,80,80,0.25)'; x.lineWidth = 2;
    x.strokeRect(0, 0, S, S);
    return { map: toTex(c) };
  }),
  plaster: (tint = '#f2ede2') => cached('plaster' + tint, () => {
    const [c, x] = canvas(S);
    const col = new THREE.Color(tint);
    const dark = col.clone().multiplyScalar(0.88);
    paintNoise(x, S, '#' + dark.getHexString(), tint, 51, 5, 4, 1.2);
    // sujeira na base da parede (barra suja típica de chácara)
    const g = x.createLinearGradient(0, S, 0, S * 0.78);
    g.addColorStop(0, 'rgba(120,80,50,0.35)'); g.addColorStop(1, 'rgba(120,80,50,0)');
    x.fillStyle = g; x.fillRect(0, S * 0.78, S, S * 0.22);
    return { map: toTex(c) };
  }),
  roofTiles: () => cached('roof', () => {
    const [c, x] = canvas(S);
    const [bc, bx] = canvas(S);
    x.fillStyle = '#9c4a2a'; x.fillRect(0, 0, S, S);
    bx.fillStyle = '#000'; bx.fillRect(0, 0, S, S);
    const rows = 8, cols = 8, r = rng(61);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const w = S / cols, h = S / rows, px = i * w, py = j * h;
      const shade = 0.82 + r() * 0.3;
      const base = new THREE.Color('#b65a33').multiplyScalar(shade);
      const grad = x.createLinearGradient(px, 0, px + w, 0);
      grad.addColorStop(0, '#' + base.clone().multiplyScalar(0.6).getHexString());
      grad.addColorStop(0.5, '#' + base.getHexString());
      grad.addColorStop(1, '#' + base.clone().multiplyScalar(0.55).getHexString());
      x.fillStyle = grad; x.fillRect(px + 1, py, w - 2, h - 2);
      const bg = bx.createLinearGradient(px, 0, px + w, 0);
      bg.addColorStop(0, '#222'); bg.addColorStop(0.5, '#fff'); bg.addColorStop(1, '#222');
      bx.fillStyle = bg; bx.fillRect(px + 1, py, w - 2, h - 2);
      x.fillStyle = 'rgba(40,15,5,0.45)'; x.fillRect(px, py + h - 4, w, 4);
    }
    sprinkle(x, S, 300, ['rgba(60,60,40,0.5)', 'rgba(30,30,20,0.4)'], 1, 3, 62, 0.4);
    return { map: toTex(c), bump: toTex(bc, [1, 1], false) };
  }),
  bricks: () => cached('bricks', () => {
    const [c, x] = canvas(S);
    const [bc, bx] = canvas(S);
    x.fillStyle = '#d8cbb5'; x.fillRect(0, 0, S, S);
    bx.fillStyle = '#000'; bx.fillRect(0, 0, S, S);
    const rows = 16, bw = S / 4, bh = S / rows, r = rng(71);
    for (let j = 0; j < rows; j++) for (let i = -1; i < 5; i++) {
      const off = (j % 2) * bw / 2;
      const col = new THREE.Color('#a8553a').offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.12);
      x.fillStyle = '#' + col.getHexString();
      x.fillRect(i * bw + off + 2, j * bh + 2, bw - 4, bh - 4);
      bx.fillStyle = '#fff'; bx.fillRect(i * bw + off + 2, j * bh + 2, bw - 4, bh - 4);
    }
    sprinkle(x, S, 900, ['rgba(0,0,0,0.15)', 'rgba(255,255,255,0.12)'], 0.5, 1.5, 72);
    return { map: toTex(c), bump: toTex(bc, [1, 1], false) };
  }),
  wood: (tone = '#8b5a2b') => cached('wood' + tone, () => {
    const [c, x] = canvas(S);
    const base = new THREE.Color(tone);
    x.fillStyle = tone; x.fillRect(0, 0, S, S);
    const r = rng(81);
    const planks = 6;
    for (let p = 0; p < planks; p++) {
      const pw = S / planks;
      const col = base.clone().offsetHSL(0, 0, (r() - 0.5) * 0.08);
      x.fillStyle = '#' + col.getHexString(); x.fillRect(p * pw, 0, pw, S);
      for (let k = 0; k < 40; k++) {
        x.strokeStyle = `rgba(40,20,5,${0.05 + r() * 0.12})`; x.lineWidth = 0.5 + r() * 1.5;
        const xx = p * pw + r() * pw;
        x.beginPath(); x.moveTo(xx, 0);
        x.bezierCurveTo(xx + (r() - 0.5) * 8, S * 0.33, xx + (r() - 0.5) * 8, S * 0.66, xx, S); x.stroke();
      }
      x.fillStyle = 'rgba(30,15,5,0.55)'; x.fillRect(p * pw, 0, 2, S);
    }
    return { map: toTex(c) };
  }),
  bark: () => cached('bark', () => {
    const [c, x] = canvas(256, 512);
    x.fillStyle = '#5b4632'; x.fillRect(0, 0, 256, 512);
    const r = rng(91);
    for (let i = 0; i < 160; i++) {
      x.strokeStyle = `rgba(${20 + r() * 40},${15 + r() * 30},${10 + r() * 20},${0.3 + r() * 0.5})`;
      x.lineWidth = 1 + r() * 4; const xx = r() * 256;
      x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx + (r() - 0.5) * 20, 512); x.stroke();
    }
    return { map: toTex(c) };
  }),
  courtPaint: () => cached('court', () => {
    const [c, x] = canvas(S);
    paintNoise(x, S, '#3d6f8f', '#4d83a6', 101, 4, 4, 0.8);
    return { map: toTex(c) };
  }),
  water: () => cached('water', () => {
    const [c, x] = canvas(256);
    const n = fbm(256, 111, 4, 4);
    const img = x.getImageData(0, 0, 256, 256);
    for (let i = 0; i < n.length; i++) { const v = n[i] * 255; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
    x.putImageData(img, 0, 0);
    return { bump: toTex(c, [1, 1], false) };
  }),
  poolTiles: () => cached('pooltiles', () => {
    const [c, x] = canvas(256);
    x.fillStyle = '#e8f4f6'; x.fillRect(0, 0, 256, 256);
    const r = rng(121);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      x.fillStyle = `hsl(190, ${55 + r() * 20}%, ${48 + r() * 12}%)`;
      x.fillRect(i * 32 + 1, j * 32 + 1, 30, 30);
    }
    return { map: toTex(c) };
  }),
  chainFence: () => cached('chain', () => {
    const [c, x] = canvas(128);
    x.clearRect(0, 0, 128, 128);
    x.strokeStyle = '#c9ccce'; x.lineWidth = 3;
    for (let i = -128; i < 256; i += 32) {
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 128, 128); x.stroke();
      x.beginPath(); x.moveTo(i + 128, 0); x.lineTo(i, 128); x.stroke();
    }
    const t = toTex(c); return { map: t };
  }),
  leaves: (hue = 0) => cached('leaves' + hue, () => {
    const [c, x] = canvas(256);
    paintNoise(x, 256, '#7aa05a', '#c4dc96', 131 + hue, 4, 4, 1.6);
    sprinkle(x, 256, 500, ['#5f8a45', '#d6e8a8', '#8fb06a'], 1, 3, 132 + hue, 0.6);
    return { map: toTex(c) };
  }),
  tablecloth: () => cached('cloth', () => {
    const [c, x] = canvas(256);
    x.fillStyle = '#f4f0e6'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = 'rgba(200,40,40,0.55)';
    for (let i = 0; i < 256; i += 32) { x.fillRect(i, 0, 16, 256); x.fillRect(0, i, 256, 16); }
    return { map: toTex(c) };
  }),
};

// Clona textura com repetição específica (compartilha a imagem).
export function rep(t, rx, ry) {
  if (!t) return null;
  const c = t.clone(); c.repeat.set(rx, ry); c.needsUpdate = true; return c;
}

// Placa com texto (letreiros, banners).
export function signTexture(lines, opts = {}) {
  const { w = 1024, h = 256, bg = '#5a3a1e', fg = '#f6e7c1', font = 'bold 110px Georgia, serif', border = '#2e1d0d' } = opts;
  const [c, x] = canvas(w, h);
  x.fillStyle = bg; x.fillRect(0, 0, w, h);
  const r = rng(lines.join('').length * 13);
  for (let i = 0; i < 60; i++) {
    x.strokeStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`; x.lineWidth = 1 + r() * 2;
    const y = r() * h; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y + (r() - 0.5) * 6); x.stroke();
  }
  x.strokeStyle = border; x.lineWidth = 14; x.strokeRect(7, 7, w - 14, h - 14);
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  const lh = h / (lines.length + 0.4);
  lines.forEach((ln, i) => {
    x.font = i === 0 ? font : font.replace(/\d+px/, m => Math.round(parseInt(m) * 0.55) + 'px');
    x.fillText(ln, w / 2, lh * (i + 0.7));
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso;
  return t;
}

// ---------- Tecidos (guarda-roupa) ----------
export const fabric = {
  solid: () => null,
  pinstripe: (base, line = '#cfcfcf') => cached('pin' + base + line, () => {
    const [c, x] = canvas(256);
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = line; x.globalAlpha = 0.5; x.lineWidth = 1.2;
    for (let i = 0; i < 256; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); }
    x.globalAlpha = 1;
    return toTex(c, [3, 3]);
  }),
  sequin: (base) => cached('seq' + base, () => {
    const [c, x] = canvas(256);
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    const col = new THREE.Color(base), r = rng(141);
    for (let j = 0; j < 32; j++) for (let i = 0; i < 32; i++) {
      const v = col.clone().offsetHSL(0, 0, (r() - 0.4) * 0.45);
      x.fillStyle = '#' + v.getHexString();
      x.beginPath(); x.arc(i * 8 + (j % 2) * 4 + 4, j * 8 + 4, 3.6, 0, Math.PI * 2); x.fill();
    }
    return toTex(c, [4, 4]);
  }),
  velvet: (base) => cached('vel' + base, () => {
    const [c, x] = canvas(256);
    const col = new THREE.Color(base);
    paintNoise(x, 256, '#' + col.clone().multiplyScalar(0.7).getHexString(), base, 151, 4, 4, 1.3);
    return toTex(c, [2, 2]);
  }),
  denim: (base = '#3a5a85') => cached('denim' + base, () => {
    const [c, x] = canvas(256);
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(255,255,255,0.12)'; x.lineWidth = 1;
    for (let i = -256; i < 256; i += 4) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 256, 256); x.stroke(); }
    sprinkle(x, 256, 400, ['rgba(255,255,255,0.15)', 'rgba(0,0,0,0.15)'], 0.5, 1.2, 152);
    return toTex(c, [3, 3]);
  }),
  plaid: (a = '#b22222', b = '#1f2a44') => cached('plaid' + a + b, () => {
    const [c, x] = canvas(256);
    x.fillStyle = a; x.fillRect(0, 0, 256, 256);
    x.globalAlpha = 0.55; x.fillStyle = b;
    for (let i = 0; i < 256; i += 64) { x.fillRect(i, 0, 28, 256); x.fillRect(0, i, 256, 28); }
    x.globalAlpha = 0.6; x.fillStyle = '#f2e6c8';
    for (let i = 40; i < 256; i += 64) { x.fillRect(i, 0, 3, 256); x.fillRect(0, i, 256, 3); }
    x.globalAlpha = 1;
    return toTex(c, [2, 2]);
  }),
  floral: (base = '#0f6e8c') => cached('floral' + base, () => {
    const [c, x] = canvas(256);
    x.fillStyle = base; x.fillRect(0, 0, 256, 256);
    const r = rng(161);
    for (let i = 0; i < 26; i++) {
      const cx = r() * 256, cy = r() * 256, s = 8 + r() * 12;
      x.fillStyle = ['#ffd23f', '#ff6f59', '#ffffff', '#f7a1c4'][Math.floor(r() * 4)];
      for (let p = 0; p < 5; p++) {
        const a = p / 5 * Math.PI * 2;
        x.beginPath(); x.ellipse(cx + Math.cos(a) * s * 0.6, cy + Math.sin(a) * s * 0.6, s * 0.5, s * 0.28, a, 0, Math.PI * 2); x.fill();
      }
      x.fillStyle = '#7a3e00'; x.beginPath(); x.arc(cx, cy, s * 0.22, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#2f8f3a';
      x.beginPath(); x.ellipse(cx + s, cy + s * 0.6, s * 0.6, s * 0.2, 0.6, 0, Math.PI * 2); x.fill();
    }
    return toTex(c, [2, 2]);
  }),
  knit: (base) => cached('knit' + base, () => {
    const [c, x] = canvas(128);
    x.fillStyle = base; x.fillRect(0, 0, 128, 128);
    const col = new THREE.Color(base);
    for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
      x.fillStyle = '#' + col.clone().multiplyScalar(j % 2 ? 0.85 : 1.08).getHexString();
      x.beginPath(); x.ellipse(i * 8 + 4, j * 8 + 4, 3, 4.5, 0.5, 0, Math.PI * 2); x.fill();
    }
    return toTex(c, [4, 4]);
  }),
  houndstooth: (a = '#111', b = '#eee') => cached('hound' + a + b, () => {
    const [c, x] = canvas(128);
    x.fillStyle = b; x.fillRect(0, 0, 128, 128);
    x.fillStyle = a;
    for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
      if ((i + j) % 2) continue;
      const px = i * 16, py = j * 16;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + 16, py); x.lineTo(px + 22, py + 8); x.lineTo(px + 16, py + 16); x.lineTo(px, py + 16); x.lineTo(px - 6, py + 8); x.fill();
    }
    return toTex(c, [4, 4]);
  }),
  stripes: (a = '#fff', b = '#1d3557', w = 18) => cached('str' + a + b + w, () => {
    const [c, x] = canvas(128);
    x.fillStyle = a; x.fillRect(0, 0, 128, 128);
    x.fillStyle = b;
    for (let j = 0; j < 128; j += w * 2) x.fillRect(0, j, 128, w);
    return toTex(c, [1, 2]);
  }),
  leopard: () => cached('leopard', () => {
    const [c, x] = canvas(256);
    x.fillStyle = '#d9a35a'; x.fillRect(0, 0, 256, 256);
    const r = rng(171);
    for (let i = 0; i < 70; i++) {
      const cx = r() * 256, cy = r() * 256, s = 5 + r() * 7;
      x.fillStyle = '#3b2412'; x.beginPath(); x.ellipse(cx, cy, s, s * 0.8, r() * 3, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#b07a35'; x.beginPath(); x.ellipse(cx, cy, s * 0.5, s * 0.4, r() * 3, 0, Math.PI * 2); x.fill();
    }
    return toTex(c, [2, 2]);
  }),
};
