// Objetos do cenário em pixel art, todos desenhados por código.
// Cada função devolve { img, ox, oy, col } — ox/oy = ponto do "pé" do objeto dentro
// da imagem (usado para ordenar a profundidade); col = caixa de colisão {x, y, w, h}
// relativa ao pé (ou null).
import { Pixmap, rgb, misturar, escurecer, clarear, hash, semente, ruido } from "./pixel.js";

const VERDES = { esc: "#24502a", med: "#3d7a32", cla: "#5f9a3c", luz: "#8fbf4a", brilho: "#b9d86a" };

function pronto(pm, ox, oy, col = null, contorno = true) {
  if (contorno) pm.contorno(0.55);
  return { img: pm.paraCanvas(), ox, oy, col, w: pm.w, h: pm.h };
}

// ---------- Palmeira-real (as das fotos: tronco cinza liso e muito alto) ----------
export function palmeira(s = 1, seed = 1) {
  const r = semente(seed * 97 + 13);
  const H = Math.round(74 * s);
  const W = Math.round(70 * s);
  const pm = new Pixmap(W, H + 34);
  const base = pm.h - 2;
  const cx = W >> 1;
  const curva = (r() - 0.5) * 6 * s;
  const tronco = rgb("#bdb7aa");
  // tronco
  for (let y = 0; y < H; y++) {
    const t = y / H; // 0 = topo
    const x = Math.round(cx + curva * (1 - t) * (1 - t));
    const larg = t > 0.85 ? 3 : t > 0.6 ? 2 : 2;
    for (let i = -larg; i <= larg - 1; i++) {
      let c = tronco;
      if (i === -larg) c = clarear(tronco, 0.25);
      if (i >= larg - 2) c = escurecer(tronco, 0.25);
      if ((base - H + y) % 5 === 0) c = escurecer(c, 0.12);
      pm.set(x + i, base - H + y, c);
    }
  }
  const tx = Math.round(cx + curva);
  const ty = base - H;
  // palmito verde (crownshaft)
  for (let y = -12; y < 0; y++) for (let i = -2; i <= 1; i++) pm.set(tx + i, ty + y, i === -2 ? "#8fb04a" : i === 1 ? "#4f6e2a" : "#6f8f3a");
  // folhas (frondes arqueadas com folíolos)
  const n = 11;
  for (let k = 0; k < n; k++) {
    const ang = (k / n) * Math.PI * 2 + r() * 0.4;
    const comp = (20 + r() * 8) * s;
    const dx = Math.cos(ang);
    const prof = Math.sin(ang) * 0.3;
    for (let t = 0; t <= 1; t += 0.03) {
      const x = tx + dx * comp * t;
      const y = ty - 13 + prof * comp * t - comp * 0.9 * t + comp * 1.05 * t * t;
      const cor = t < 0.25 ? VERDES.cla : dx < -0.2 ? VERDES.luz : dx > 0.3 ? VERDES.med : VERDES.cla;
      pm.set(x, y, cor);
      // folíolos pendurados
      const fol = Math.round((1 - t) * 5 * s + 1);
      for (let f = 1; f <= fol; f++) {
        if (t < 0.12) continue;
        pm.set(x + (dx > 0 ? -f * 0.3 : f * 0.3), y + f, f > fol - 1 ? VERDES.esc : cor);
        if (Math.round(t * 60) % 3 === 0) pm.set(x + dx * 1, y + f, escurecer(cor, 0.15));
      }
    }
  }
  pm.set(tx - 1, ty - 13, VERDES.brilho);
  return pronto(pm, cx, base, { x: -3, y: -3, w: 6, h: 4 });
}

// Touceira de palmeiras finas (a "palmeira-leque" agrupada vista nas fotos).
export function touceira(s = 1, seed = 2) {
  const r = semente(seed * 31 + 7);
  const W = Math.round(56 * s);
  const H = Math.round(64 * s);
  const pm = new Pixmap(W, H);
  const cx = W >> 1;
  const base = H - 2;
  const hastes = 7;
  const topos = [];
  for (let k = 0; k < hastes; k++) {
    const ang = -Math.PI / 2 + (k / (hastes - 1) - 0.5) * 1.3;
    const alt = (34 + r() * 16) * s;
    const x1 = cx + Math.cos(ang) * alt;
    const y1 = base + Math.sin(ang) * alt;
    for (let t = 0; t <= 1; t += 0.02) {
      const x = cx + (k - 3) * 0.6 + (x1 - cx) * t;
      const y = base + (y1 - base) * t;
      pm.set(x, y, t > 0.5 ? "#8a8a6a" : "#a09a80");
    }
    topos.push([x1, y1]);
  }
  for (const [x, y] of topos) {
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      for (let t = 0; t < 1; t += 0.08) {
        pm.set(x + Math.cos(a) * 9 * s * t, y + Math.sin(a) * 4 * s * t + t * t * 5, k % 2 ? VERDES.cla : VERDES.med);
      }
    }
    pm.set(x, y - 1, VERDES.luz);
  }
  return pronto(pm, cx, base, { x: -4, y: -3, w: 8, h: 4 });
}

// Copa redonda (árvore comum) — base para copa, ipê e mangueira.
function arvoreRedonda(s, seed, cores, troncoAlt = 10, achatar = 0.85, larguraExtra = 1) {
  const r = semente(seed * 53 + 3);
  const R = Math.round(16 * s * larguraExtra);
  const W = R * 2 + 6;
  const H = Math.round(R * 2 * achatar + troncoAlt + 6);
  const pm = new Pixmap(W, H);
  const cx = W >> 1;
  const base = H - 2;
  for (let y = base - troncoAlt - 2; y <= base; y++) for (let i = -2; i <= 1; i++) pm.set(cx + i, y, i === -2 ? "#8a6a4a" : i === 1 ? "#4a3420" : "#6a4a30");
  const cy = base - troncoAlt - R * achatar + 2;
  const blobs = [[0, 0, 1]];
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + r();
    blobs.push([Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.45 * achatar, 0.5 + r() * 0.2]);
  }
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let dentro = false;
      let luz = 0;
      for (const [bx, by, br] of blobs) {
        const nx = (x - cx - bx) / (R * br);
        const ny = (y - cy - by) / (R * br * achatar);
        const d = nx * nx + ny * ny;
        if (d <= 1) {
          dentro = true;
          luz = Math.max(luz, (1 - d) * 0.5 - nx * 0.35 - ny * 0.4);
        }
      }
      if (!dentro) continue;
      const n = hash(x >> 1, y >> 1, seed) * 0.35;
      const v = luz + n;
      const c = v > 0.62 ? cores[3] : v > 0.4 ? cores[2] : v > 0.18 ? cores[1] : cores[0];
      pm.set(x, y, c);
    }
  }
  return pronto(pm, cx, base, { x: -3, y: -3, w: 6, h: 4 });
}

export const copa = (s, seed) => arvoreRedonda(s, seed, [VERDES.esc, VERDES.med, VERDES.cla, VERDES.luz]);
export const mangueira = (s, seed) => arvoreRedonda(s * 1.15, seed, ["#1a3a22", "#2a5a2e", "#3a7034", "#5a8a3e"], 8, 0.8, 1.1);
export function ipe(s, seed) {
  const o = arvoreRedonda(s, seed, ["#9a3a6a", "#c95a8a", "#e88ab0", "#ffc0d8"], 12, 0.8);
  return o;
}
export function arbusto(s = 1, seed = 4) {
  const r = semente(seed);
  const W = Math.round(26 * s);
  const H = Math.round(18 * s);
  const pm = new Pixmap(W, H);
  const cx = W / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = (x - cx) / (W / 2 - 1);
    const ny = (y - H * 0.6) / (H * 0.55);
    const bump = Math.sin(x * 0.9 + seed) * 0.12;
    if (nx * nx + ny * ny > 1 + bump || y > H - 2) continue;
    const v = -nx * 0.3 - ny * 0.5 + hash(x >> 1, y >> 1, seed) * 0.4;
    pm.set(x, y, v > 0.45 ? VERDES.luz : v > 0.15 ? VERDES.cla : v > -0.15 ? VERDES.med : VERDES.esc);
  }
  if (r() > 0.4) for (let k = 0; k < 4; k++) pm.set(3 + r() * (W - 6), 2 + r() * (H - 6), r() > 0.5 ? "#f2d544" : "#f4f4f0");
  return pronto(pm, Math.round(cx), H - 2, { x: -W * 0.35, y: -3, w: W * 0.7, h: 4 });
}

export function tronco(s = 1) {
  const pm = new Pixmap(30, 14);
  for (let x = 2; x < 28; x++) for (let y = 5; y < 11; y++) pm.set(x, y, y === 5 ? "#9a7a5a" : y > 9 ? "#4a3420" : (x + y) % 5 === 0 ? "#5a4028" : "#7a5a3a");
  for (let y = 5; y < 11; y++) { pm.set(27, y, "#c9a77a"); pm.set(26, y, y === 7 ? "#8a6a4a" : "#b8966a"); }
  pm.set(10, 4, "#7a5a3a"); pm.set(10, 3, "#7a5a3a"); pm.set(11, 2, VERDES.cla);
  return pronto(pm, 15, 11, { x: -12, y: -4, w: 24, h: 4 });
}

export function pinheiro(s = 1, seed = 5) {
  const W = Math.round(30 * s);
  const H = Math.round(64 * s);
  const pm = new Pixmap(W, H);
  const cx = W >> 1;
  const base = H - 2;
  for (let y = base - 8; y <= base; y++) for (let i = -1; i <= 1; i++) pm.set(cx + i, y, i ? "#4a3420" : "#6a4a30");
  const camadas = 5;
  for (let k = 0; k < camadas; k++) {
    const yb = base - 6 - k * (H - 14) / camadas * 0.95;
    const larg = (W / 2 - 1) * (1 - k / (camadas + 1.2));
    const alt = (H - 10) / camadas * 1.5;
    for (let y = 0; y < alt; y++) {
      const w = larg * (y / alt);
      for (let x = -w; x <= w; x++) {
        const c = x < -w * 0.4 ? "#3a6a3e" : x > w * 0.5 ? "#16321e" : "#24482a";
        pm.set(cx + x, yb - alt + y, (y > alt - 2) ? "#16321e" : hash(cx + x, y, seed) > 0.85 ? "#4a7a4a" : c);
      }
    }
  }
  return pronto(pm, cx, base, { x: -3, y: -3, w: 6, h: 4 });
}

export function eucalipto(s = 1, seed = 6) {
  const r = semente(seed * 7);
  const W = Math.round(40 * s);
  const H = Math.round(86 * s);
  const pm = new Pixmap(W, H);
  const cx = W >> 1;
  const base = H - 2;
  for (let y = base - H * 0.75; y <= base; y++) for (let i = -1; i <= 1; i++) pm.set(cx + i + Math.round(Math.sin(y * 0.05) * 1.5), y, i < 0 ? "#e8e2d2" : i > 0 ? "#a8a090" : (y % 7 === 0 ? "#b8a88a" : "#d4ccba"));
  for (let k = 0; k < 6; k++) {
    const bx = cx + (r() - 0.5) * W * 0.7;
    const by = 6 + r() * H * 0.35;
    const R = 6 + r() * 6;
    for (let y = -R; y <= R; y++) for (let x = -R * 1.3; x <= R * 1.3; x++) {
      if ((x / 1.3) ** 2 + y * y > R * R || hash(bx + x, by + y, seed) > 0.8) continue;
      const v = -x / R * 0.3 - y / R * 0.4 + hash(x, y, k) * 0.3;
      pm.set(bx + x, by + y, v > 0.3 ? "#9ab88a" : v > 0 ? "#6a9070" : "#3e6a52");
    }
  }
  return pronto(pm, cx, base, { x: -3, y: -3, w: 6, h: 4 });
}

export function poste() {
  const pm = new Pixmap(14, 58);
  for (let y = 6; y < 57; y++) { pm.set(6, y, "#8a6a4a"); pm.set(7, y, "#5a4028"); }
  for (let x = 3; x < 12; x++) pm.set(x, 8, "#5a4028");
  for (let x = 1; x < 6; x++) pm.set(x, 9, "#3a3a3a");
  pm.set(2, 10, "#fff3c4"); pm.set(3, 10, "#fff3c4"); pm.set(4, 10, "#e0d0a0");
  for (const x of [9, 10, 11]) pm.set(x, 7, "#2a2a2a");
  return pronto(pm, 7, 56, { x: -2, y: -2, w: 4, h: 3 });
}

export function banco() {
  const pm = new Pixmap(26, 16);
  for (let x = 1; x < 25; x++) {
    for (let y = 2; y < 6; y++) pm.set(x, y, y === 2 ? "#b8865a" : y === 5 ? "#6a4a30" : "#9a6a40");
    for (let y = 8; y < 11; y++) pm.set(x, y, y === 8 ? "#c8966a" : "#9a6a40");
  }
  for (const x of [3, 22]) for (let y = 6; y < 15; y++) pm.set(x, y, "#3a2a1a");
  return pronto(pm, 13, 14, { x: -12, y: -6, w: 24, h: 6 });
}

export function palha() {
  const pm = new Pixmap(40, 16);
  const r = semente(9);
  for (let k = 0; k < 260; k++) {
    const x = 4 + r() * 32;
    const y = 4 + r() * 10 + Math.abs(x - 20) * 0.15;
    const l = 2 + r() * 4;
    const a = (r() - 0.5) * 1.6;
    for (let t = 0; t < l; t++) pm.set(x + Math.cos(a) * t, y + Math.sin(a) * t * 0.5, r() > 0.5 ? "#8a6a3a" : r() > 0.5 ? "#a8844a" : "#5a4224");
  }
  return pronto(pm, 20, 14, null, false);
}

// ---------- Construções ----------
function telhado(pm, x0, y0, w, h, cor = "#c8502e") {
  const c = rgb(cor);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let cc = c;
    if (y % 4 === 3) cc = escurecer(c, 0.25);
    else if ((x + (Math.floor(y / 4) % 2) * 3) % 6 === 0) cc = escurecer(c, 0.12);
    else if (y % 4 === 0) cc = clarear(c, 0.12);
    if (y < 2) cc = clarear(c, 0.2);
    pm.set(x0 + x, y0 + y, cc);
  }
}

function janela(pm, x, y, w = 8, h = 9, mold = "#f4f4f0") {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const borda = i === 0 || j === 0 || i === w - 1 || j === h - 1;
    pm.set(x + i, y + j, borda ? mold : (i === (w >> 1) || j === (h >> 1)) ? mold : j < h / 2 ? "#6ab0d8" : "#3a6a9a");
  }
  pm.set(x + 1, y + 1, "#c8e8ff");
}

export function casaAmarela() {
  const W = 168;
  const H = 108;
  const pm = new Pixmap(W, H);
  const parede = rgb("#f2c84a");
  // varanda e paredes
  const yp = 52;
  for (let y = yp; y < H - 2; y++) for (let x = 4; x < W - 4; x++) {
    let c = parede;
    if (x < 6) c = clarear(parede, 0.15);
    if (x > W - 7) c = escurecer(parede, 0.2);
    if (y > H - 8) c = escurecer(parede, 0.18);
    pm.set(x, y, c);
  }
  // rodapé
  for (let x = 4; x < W - 4; x++) for (let y = H - 5; y < H - 2; y++) pm.set(x, y, "#9a6a3a");
  telhado(pm, 0, 6, W, yp - 4, "#c45a32");
  // cumeeira
  for (let x = 0; x < W; x++) { pm.set(x, 6, "#8a3a1e"); pm.set(x, 7, "#e07a4a"); }
  for (let x = 0; x < W; x++) pm.set(x, yp + 1, "#7a3a1e");
  // porta e janelas
  for (let y = 70; y < H - 4; y++) for (let x = 76; x < 92; x++) pm.set(x, y, x === 76 || x === 91 || y === 70 ? "#f4f4f0" : (x + y) % 6 === 0 ? "#6a3a1a" : "#8a4a22");
  pm.set(88, 86, "#e2b13c");
  for (const x of [18, 40, 110, 134]) janela(pm, x, 66, 14, 16);
  // varanda com pilares
  for (const x of [8, 60, 106, 158]) for (let y = yp + 2; y < H - 4; y++) { pm.set(x, y, "#f4f4f0"); pm.set(x + 1, y, "#d8d4c8"); }
  // chaminé
  for (let y = 0; y < 18; y++) for (let x = 130; x < 140; x++) pm.set(x, y, y < 3 ? "#7a7a7a" : x === 130 ? "#c8a888" : "#a8866a");
  return pronto(pm, W >> 1, H - 2, { x: -80, y: -30, w: 160, h: 28 });
}

export function quiosque() {
  const W = 66;
  const H = 62;
  const pm = new Pixmap(W, H);
  for (const x of [6, 30, 34, 58]) for (let y = 30; y < H - 2; y++) { pm.set(x, y, "#8a5a3a"); pm.set(x + 1, y, "#5a3a22"); }
  // balcão
  for (let x = 8; x < 58; x++) for (let y = 44; y < H - 4; y++) pm.set(x, y, y === 44 ? "#d8b88a" : (x % 8 === 0) ? "#7a5a3a" : "#a87a4a");
  // caixas de pipoca (pista!)
  for (const [bx, by] of [[12, 38], [20, 38], [16, 32]]) for (let y = 0; y < 6; y++) for (let x = 0; x < 7; x++) pm.set(bx + x, by + y, y === 0 ? "#f2e6c4" : x === 0 ? "#e8d8a8" : (x + y) % 4 === 0 ? "#c8302a" : "#e8d0a0");
  telhado(pm, 0, 4, W, 28, "#c8502e");
  for (let x = 0; x < W; x++) pm.set(x, 31, "#7a2a1a");
  return pronto(pm, W >> 1, H - 2, { x: -30, y: -16, w: 60, h: 14 });
}

// Toboágua: torre com escada e um tubo azul que desce em curva até a piscina.
// dx/dy = do pé da torre até onde o tubo cai na água (em pixels). O "pé" do objeto é a saída na água.
export function toboagua(dx = -52, dy = 52) {
  const W = 40 + Math.abs(dx) + 20;
  const tx = W - 22;
  const ty = 86;
  const H = ty + dy + 10;
  const pm = new Pixmap(W, H);
  const azul = rgb("#2a8ad8");
  const alt = 70;
  // torre (pernas, escada e plataforma)
  for (let y = ty - alt; y < ty; y++) for (const x of [tx - 7, tx + 6]) { pm.set(x, y, "#f0f0f0"); pm.set(x + 1, y, "#a8a8b0"); }
  for (let y = ty - alt + 6; y < ty - 1; y += 5) for (let x = tx - 6; x < tx + 6; x++) pm.set(x, y, "#c8c8d0");
  for (let x = tx - 10; x < tx + 10; x++) for (let y = ty - alt - 5; y < ty - alt; y++) pm.set(x, y, y === ty - alt - 5 ? "#ffffff" : "#d0d0d8");
  for (let x = tx - 10; x < tx + 10; x += 3) for (let y = ty - alt - 11; y < ty - alt - 5; y++) pm.set(x, y, "#e8e8f0");
  for (let x = tx - 10; x < tx + 10; x++) pm.set(x, ty - alt - 11, "#e8e8f0");
  // tubo
  const ex = tx + dx;
  const ey = ty + dy;
  const trilho = [];
  for (let t = 0; t <= 1.0001; t += 0.004) {
    const gx = tx - 4 + (ex - (tx - 4)) * t;
    const gy = ty + (ey - ty) * t;
    const h = (alt - 2) * Math.pow(1 - t, 1.25);
    const giro = Math.sin(t * Math.PI * 2) * 18 * (1 - t);
    trilho.push([gx + giro, gy - h + Math.cos(t * Math.PI * 2) * 4 * (1 - t) - 2, h]);
  }
  // suportes até o chão
  for (const k of [0.25, 0.5, 0.72]) {
    const i = Math.floor(k * (trilho.length - 1));
    const [x, y, h] = trilho[i];
    for (let yy = y + 4; yy < y + h; yy++) { pm.set(x, yy, "#c8c8d0"); pm.set(x + 1, yy, "#9a9aa8"); }
  }
  for (const [x, y] of trilho) {
    for (let k = -4; k <= 4; k++) {
      const c = k < -2 ? clarear(azul, 0.35) : k > 2 ? escurecer(azul, 0.3) : k === -1 ? clarear(azul, 0.18) : azul;
      pm.set(x, y + k, c);
    }
  }
  // água escorrendo na saída
  for (let k = 0; k < 6; k++) pm.set(ex - 3 + k, ey - 1, "#c8f0ff");
  const o = pronto(pm, ex, ey, { x: -dx - 9, y: -dy - 5, w: 18, h: 5 });
  o.trilho = trilho.map(([x, y]) => [x - ex, y - ey]);
  o.torre = { x: -dx, y: -dy, topo: -dy - alt - 6 };
  return o;
}

export function refeitorio() {
  const W = 148;
  const H = 98;
  const pm = new Pixmap(W, H);
  const parede = rgb("#e8dcc0");
  for (let y = 46; y < H - 2; y++) for (let x = 4; x < W - 4; x++) pm.set(x, y, y > H - 6 ? "#8a6a4a" : x > W - 7 ? escurecer(parede, 0.2) : (y - 46) % 7 === 0 ? escurecer(parede, 0.08) : parede);
  telhado(pm, 0, 2, W, 46, "#9a4a2e");
  for (let y = 64; y < H - 4; y++) for (let x = 64; x < 84; x++) pm.set(x, y, x === 64 || x === 83 || y === 64 ? "#f4f4f0" : x === 74 ? "#5a3a22" : "#7a4a2a");
  for (const x of [16, 38, 100, 122]) janela(pm, x, 60, 12, 12);
  // placa
  for (let x = 54; x < 94; x++) for (let y = 50; y < 58; y++) pm.set(x, y, y === 50 || y === 57 ? "#5a3a22" : "#f4ecd8");
  for (let x = 58; x < 90; x += 3) pm.set(x, 54, "#5a3a22");
  return pronto(pm, W >> 1, H - 2, { x: -70, y: -26, w: 140, h: 24 });
}

export function alojamento() {
  const W = 212;
  const H = 82;
  const pm = new Pixmap(W, H);
  const parede = rgb("#d8e8f0");
  for (let y = 38; y < H - 2; y++) for (let x = 4; x < W - 4; x++) pm.set(x, y, y > H - 6 ? "#6a7a8a" : x > W - 7 ? escurecer(parede, 0.2) : parede);
  telhado(pm, 0, 2, W, 38, "#5a7a9a");
  for (let k = 0; k < 6; k++) {
    const x = 14 + k * 34;
    for (let y = 52; y < H - 4; y++) for (let i = 0; i < 12; i++) pm.set(x + i, y, i === 0 || i === 11 || y === 52 ? "#f4f4f0" : "#3a5a7a");
    janela(pm, x + 16, 52, 10, 10);
  }
  return pronto(pm, W >> 1, H - 2, { x: -102, y: -22, w: 204, h: 20 });
}

export function portao() {
  const W = 88;
  const H = 70;
  const pm = new Pixmap(W, H);
  for (const x of [6, 78]) for (let y = 10; y < H - 2; y++) for (let i = 0; i < 6; i++) pm.set(x + i, y, i === 0 ? "#b89a7a" : i === 5 ? "#5a4028" : "#8a6a4a");
  for (let x = 2; x < W - 2; x++) for (let y = 8; y < 22; y++) pm.set(x, y, y === 8 || y === 21 ? "#5a4028" : "#a87a4a");
  for (let x = 14; x < 74; x += 4) for (let y = 12; y < 18; y++) if ((x + y) % 3) pm.set(x, y, "#f4ecd8");
  return pronto(pm, W >> 1, H - 2, null);
}

export function sino() {
  const pm = new Pixmap(18, 40);
  for (let y = 4; y < 39; y++) { pm.set(8, y, "#6a4a30"); pm.set(9, y, "#4a3420"); }
  for (let x = 3; x < 15; x++) pm.set(x, 4, "#4a3420");
  for (let y = 6; y < 14; y++) { const w = 1 + (y - 6) * 0.45; for (let x = -w; x <= w; x++) pm.set(12 + x - 3, y, x < 0 ? "#f2d064" : "#c89a2a"); }
  return pronto(pm, 9, 38, { x: -2, y: -2, w: 4, h: 3 });
}

export function arara() {
  const pm = new Pixmap(34, 36);
  for (const x of [3, 30]) for (let y = 6; y < 35; y++) pm.set(x, y, "#c8c8d0");
  for (let x = 3; x < 31; x++) pm.set(x, 6, "#e8e8f0");
  const cores = ["#c9a14a", "#b0121f", "#16161a", "#e05a9c", "#2c4a9c", "#f4f4f0"];
  cores.forEach((c, k) => { for (let y = 8; y < 26; y++) for (let i = 0; i < 4; i++) pm.set(5 + k * 4 + i, y, y > 24 ? escurecer(rgb(c), 0.3) : i === 0 ? clarear(rgb(c), 0.2) : c); });
  // espelho
  return pronto(pm, 17, 34, { x: -15, y: -3, w: 30, h: 3 });
}

export function placa() {
  const pm = new Pixmap(24, 26);
  for (let y = 10; y < 25; y++) { pm.set(11, y, "#6a4a30"); pm.set(12, y, "#4a3420"); }
  for (let x = 1; x < 23; x++) for (let y = 2; y < 12; y++) pm.set(x, y, y === 2 ? "#d8b88a" : y === 11 ? "#6a4a2a" : "#b8906a");
  for (let x = 4; x < 20; x += 2) pm.set(x, 6, "#4a3420");
  return pronto(pm, 12, 24, { x: -2, y: -2, w: 4, h: 3 });
}

export function fogueira() {
  const pm = new Pixmap(30, 16);
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const x = 15 + Math.cos(a) * 11;
    const y = 9 + Math.sin(a) * 4.5;
    for (let j = -1; j <= 1; j++) for (let i = -2; i <= 1; i++) pm.set(x + i, y + j, j < 0 ? "#b8b0a0" : "#7a7268");
  }
  for (let i = -6; i <= 6; i++) { pm.set(15 + i, 9 - Math.round(i * 0.3), "#6a4a30"); pm.set(15 + i, 10 + Math.round(i * 0.3), "#4a3420"); }
  return pronto(pm, 15, 13, { x: -12, y: -7, w: 24, h: 8 });
}

// Cachoeira virada para o leste (para o lago): o paredão de pedra fica à esquerda,
// a água cai pela borda direita e espuma no poço que vira o riacho (3 quadros de animação).
export function cachoeira(q = 0) {
  const W = 104;
  const H = 104;
  const pm = new Pixmap(W, H);
  const base = H - 10;
  const borda = 66; // x da borda de onde a água cai
  // paredão de pedra
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const n = ruido(x, y, 9, 4) + ruido(x, y, 4, 8) * 0.4;
    const nx = (x - 38) / 34;
    const ny = (y - 58) / 50;
    if (nx * nx + ny * ny > 1 - (n - 0.5) * 0.25 && !(x > borda - 4 && x < borda + 6 && y > 8 && y < base)) continue;
    if (y > base + 4) continue;
    const v = n - (y / H) * 0.25 + (x < borda - 20 ? 0.15 : -0.12) - (x > borda - 6 ? 0.2 : 0);
    let c = v > 0.85 ? "#b8b0a0" : v > 0.65 ? "#8a8478" : v > 0.45 ? "#6a6458" : "#4a4640";
    if (ny < -0.82 && hash(x, y, 2) > 0.35) c = hash(x, y, 7) > 0.5 ? VERDES.med : VERDES.cla;
    if (hash(x >> 1, y >> 1, 3) > 0.93) c = VERDES.cla;
    pm.set(x, y, c);
  }
  // samambaias na pedra
  for (const [fx, fy] of [[12, 30], [30, 52], [48, 26], [20, 72]]) for (let k = -4; k <= 4; k++) { pm.set(fx + k, fy - Math.abs(k) * 0.5, VERDES.cla); pm.set(fx + k, fy + 1 - Math.abs(k) * 0.5, VERDES.med); }
  // poço de espuma (a leste do paredão)
  for (let y = base - 12; y < base + 8; y++) for (let x = borda - 6; x < W - 2; x++) {
    const nx = (x - (borda + 14)) / 24;
    const ny = (y - (base - 2)) / 9;
    if (nx * nx + ny * ny > 1) continue;
    const k = hash(x + q * 3, y, 9);
    pm.set(x, y, nx * nx + ny * ny < 0.35 ? (k > 0.4 ? "#ffffff" : "#d8f4ff") : k > 0.6 ? "#c8ecff" : "#5aa8c8");
  }
  // água caindo: sai da borda, faz uma curvinha para fora (leste) e cai no poço
  for (let y = 12; y < base - 4; y++) {
    const f = (y - 12) / (base - 16);
    const cx = borda + 2 + Math.sqrt(f) * 9;
    const w = 4 + f * 4;
    for (let x = -w; x <= w; x++) {
      const k = (y + q * 5 + Math.floor((x + 20) * 1.7) * 3) % 9;
      pm.set(cx + x, y, k < 2 ? "#ffffff" : k < 5 ? "#c8ecff" : "#8ad0f0");
    }
  }
  return pronto(pm, W >> 1, base, { x: -50, y: -34, w: 100, h: 40 }, false);
}

// Balaustrada branca do terraço (com pilares rosados, como na foto DJI_0336).
export function balaustrada(comp, vertical = false) {
  if (vertical) {
    const pm = new Pixmap(8, comp + 14);
    for (let y = 0; y < comp + 12; y++) for (let x = 2; x < 6; x++) pm.set(x, y, x === 2 ? "#ffffff" : x === 5 ? "#c8c4bc" : "#ecebe6");
    for (let y = 0; y < comp + 12; y += 26) for (let x = 0; x < 8; x++) for (let j = 0; j < 4; j++) pm.set(x, y + j, j === 0 ? "#f08aa0" : "#c8506a");
    return pronto(pm, 4, comp + 12, { x: -3, y: -comp, w: 6, h: comp });
  }
  const pm = new Pixmap(comp, 16);
  for (let x = 0; x < comp; x++) {
    pm.set(x, 2, "#ffffff");
    pm.set(x, 3, "#e8e6e0");
    pm.set(x, 13, "#d8d4cc");
    if (x % 4 === 1) for (let y = 4; y < 13; y++) pm.set(x, y, y === 8 ? "#ffffff" : "#e4e2dc");
    if (x % 4 === 2) for (let y = 4; y < 13; y++) pm.set(x, y, "#b8b4ac");
  }
  for (let x = 0; x < comp; x += 26) for (let y = 0; y < 15; y++) for (let i = 0; i < 5; i++) pm.set(x + i, y, y < 2 ? "#f6a0b0" : i === 0 ? "#e87a90" : i === 4 ? "#a83a52" : "#c8506a");
  return pronto(pm, 0, 14, { x: 0, y: -4, w: comp, h: 4 });
}

// As lonas misteriosas e as letras reveladas.
const GLIFOS = {
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
};

export function lona(seed = 0) {
  const r = semente(seed * 11 + 5);
  const W = 44;
  const H = 54;
  const pm = new Pixmap(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const nx = (x - W / 2) / (W / 2 - 2);
    const topo = 6 + nx * nx * 8 + Math.sin(x * 0.5 + seed) * 1.5;
    if (y < topo || y > H - 3) continue;
    const dobra = Math.sin(x * 0.7 + seed * 2 + y * 0.08);
    let c = dobra > 0.6 ? "#f4f2ea" : dobra > -0.2 ? "#dedad0" : "#bcb6aa";
    if (y > H - 7) c = "#a8a296";
    pm.set(x, y, c);
  }
  // cordas e estacas
  for (let y = 10; y < H - 2; y++) { pm.set(6 + y * 0.05, y, "#8a6a3a"); pm.set(W - 7 - y * 0.05, y, "#8a6a3a"); }
  for (const x of [3, W - 4]) for (let y = H - 6; y < H - 1; y++) pm.set(x, y, "#6a4a2a");
  if (r() > 0.5) for (let x = 14; x < 30; x++) pm.set(x, 22, "#a89a7a");
  return pronto(pm, W >> 1, H - 2, { x: -18, y: -6, w: 36, h: 6 });
}

export function letra(ch, brilho = 0) {
  const g = GLIFOS[ch] || GLIFOS.O;
  const cel = 6;
  const W = 5 * cel + 6;
  const H = 7 * cel + 12;
  const pm = new Pixmap(W, H);
  // estacas
  for (const x of [8, W - 9]) for (let y = 7 * cel; y < H - 1; y++) { pm.set(x, y, "#6a5a48"); pm.set(x + 1, y, "#4a3e32"); }
  g.forEach((linha, j) => [...linha].forEach((c, i) => {
    if (c !== "#") return;
    for (let y = 0; y < cel; y++) for (let x = 0; x < cel; x++) {
      let cor = rgb("#f7f5ef");
      if (x === 0 || y === 0) cor = rgb("#ffffff");
      if (x === cel - 1 || y === cel - 1) cor = rgb("#cfcac0");
      if (brilho) cor = misturar(cor, [255, 240, 190, 255], brilho * 0.35);
      pm.set(3 + i * cel + x, 2 + j * cel + y, cor);
    }
  }));
  return pronto(pm, W >> 1, H - 2, { x: -14, y: -4, w: 28, h: 4 });
}

// Tabela de basquete vista de cima/frente: poste, tabela branca com quadrado vermelho,
// aro laranja e redinha. lado -1 = cesta da esquerda (aro virado para a direita).
export function cesta(lado = -1) {
  const W = 34;
  const H = 66;
  const pm = new Pixmap(W, H);
  const px0 = lado < 0 ? 4 : W - 6; // poste
  for (let y = 18; y < H - 2; y++) { pm.set(px0, y, "#5a5a64"); pm.set(px0 + 1, y, "#3a3a44"); }
  for (let x = -2; x <= 3; x++) pm.set(px0 + x, H - 2, "#2a2a30");
  // braço
  const tx = lado < 0 ? 8 : W - 10;
  for (let k = 0; k < 5; k++) pm.set(lado < 0 ? px0 + 1 + k : px0 - k, 20, "#4a4a54");
  // tabela (vista de lado, fininha) com o quadrado
  for (let y = 6; y < 28; y++) for (let i = 0; i < 3; i++) pm.set(tx + (lado < 0 ? i : -i), y, i === 1 ? "#ffffff" : "#d8d8e0");
  for (let y = 14; y < 22; y++) pm.set(tx + (lado < 0 ? 1 : -1), y, "#d0202e");
  // aro (elipse) e rede
  const ax = lado < 0 ? tx + 10 : tx - 10;
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    pm.set(ax + Math.cos(a) * 6, 24 + Math.sin(a) * 2, k < 12 ? "#e8601e" : "#ff8a3a");
  }
  for (let y = 26; y < 34; y++) {
    const w = 5 - (y - 26) * 0.35;
    for (let x = -w; x <= w; x++) if ((Math.round(x) + y) % 2 === 0) pm.set(ax + x, y, "#f4f4f4");
  }
  const o = pronto(pm, lado < 0 ? px0 : px0, H - 2, { x: -2, y: -3, w: 5, h: 3 });
  o.altAro = H - 2 - 24;
  o.aroDx = ax - px0;
  return o;
}

// Ônibus do acampamento visto de lado, indo para a direita (q = quadro das rodas).
export function onibus(q = 0, portaAberta = false) {
  const W = 104;
  const H = 44;
  const pm = new Pixmap(W, H);
  const base = H - 6;
  // carroceria
  for (let y = 4; y < base; y++) for (let x = 2; x < W - 2; x++) {
    let c = "#f4f2ea";
    if (y < 7) c = "#ffffff";
    if (y > base - 9 && y < base - 5) c = "#2a6ad0"; // faixa azul
    if (y === base - 9) c = "#f2c14e";
    if (y >= base - 3) c = "#c8c4bc";
    if (x > W - 10 && y < base - 12) c = y < 9 ? "#ffffff" : "#e8e6e0"; // frente
    pm.set(x, y, c);
  }
  // cantos arredondados
  for (const [x, y] of [[2, 4], [3, 4], [2, 5], [W - 3, 4], [W - 4, 4], [W - 3, 5]]) pm.apagar(x, y);
  // janelas com passageiros
  for (let k = 0; k < 7; k++) {
    const x0 = 6 + k * 12;
    for (let y = 9; y < 19; y++) for (let x = x0; x < x0 + 9; x++) pm.set(x, y, y < 11 ? "#9ad4f0" : "#3a6a9a");
    if (k % 2 === 0 || k === 5) { for (let y = 13; y < 19; y++) for (let x = x0 + 3; x < x0 + 7; x++) pm.set(x, y, y < 16 ? "#3a2418" : "#c98e62"); }
  }
  // para-brisa
  for (let y = 9; y < 21; y++) for (let x = W - 9; x < W - 3; x++) pm.set(x, y, y < 12 ? "#c8ecff" : "#5a9ac8");
  // porta (perto da frente)
  const px0 = W - 22;
  for (let y = 9; y < base - 1; y++) for (let x = px0; x < px0 + 9; x++) {
    if (portaAberta) pm.set(x, y, y < base - 4 ? "#2a2a34" : "#8a8a94");
    else pm.set(x, y, x === px0 + 4 ? "#c8c4bc" : y < 22 ? "#9ad4f0" : "#e8e6e0");
  }
  // letreiro do acampamento
  for (let x = 8; x < 50; x++) for (let y = 21; y < 25; y++) pm.set(x, y, "#16161a");
  for (let x = 10; x < 48; x += 2) pm.set(x, 22 + ((x >> 1) % 2), "#ffd84a");
  // farol e para-choque
  pm.set(W - 3, base - 7, "#fff3a0"); pm.set(W - 3, base - 6, "#fff3a0");
  for (let x = W - 6; x < W - 1; x++) pm.set(x, base - 2, "#6a6a74");
  // rodas
  for (const cx of [20, W - 26]) {
    for (let y = -5; y <= 5; y++) for (let x = -5; x <= 5; x++) {
      const d = Math.hypot(x, y);
      if (d > 5.4) continue;
      let c = d > 3.6 ? "#1a1a20" : d > 1.5 ? "#8a8a94" : "#c8c8d0";
      if (d > 1.5 && d <= 3.6 && ((Math.round(Math.atan2(y, x) * 2 / Math.PI + q) % 2 + 2) % 2 === 0)) c = "#5a5a64";
      pm.set(cx + x, base + y - 1, c);
    }
  }
  return pronto(pm, W >> 1, H - 1, null);
}

// Interior do ônibus (cena de abertura), na resolução da tela.
export function interiorOnibus(x, w, h, t) {
  // paisagem passando pelas janelas
  const jy0 = Math.round(h * 0.16);
  const jy1 = Math.round(h * 0.52);
  const g = x.createLinearGradient(0, jy0, 0, jy1);
  g.addColorStop(0, "#6ab8f0"); g.addColorStop(1, "#bfe6ff");
  x.fillStyle = g;
  x.fillRect(0, jy0, w, jy1 - jy0);
  const morro = (vel, alt, cor, freq) => {
    x.fillStyle = cor;
    for (let i = 0; i < w; i++) {
      const xx = i + t * vel;
      const y = jy1 - alt - Math.sin(xx * freq) * alt * 0.4 - Math.sin(xx * freq * 2.3) * alt * 0.2;
      x.fillRect(i, Math.round(y), 1, jy1 - Math.round(y));
    }
  };
  morro(8, h * 0.12, "#7ab060", 0.02);
  morro(30, h * 0.07, "#4f8a34", 0.045);
  // palmeiras e postes passando rápido
  for (let k = 0; k < 6; k++) {
    const xx = ((k * 97 - t * 90) % (w + 60) + w + 60) % (w + 60) - 30;
    x.fillStyle = k % 3 ? "#bdb7aa" : "#6a4a30";
    x.fillRect(Math.round(xx), jy0 + 10, 3, jy1 - jy0 - 10);
    if (k % 3) { x.fillStyle = "#3d7a32"; for (let f = -3; f <= 3; f++) x.fillRect(Math.round(xx) + f * 4 - 2, jy0 + 8 + Math.abs(f) * 2, 6, 3); }
  }
  // paredes, janelas e teto
  x.fillStyle = "#d8d4cc"; x.fillRect(0, 0, w, jy0);
  x.fillStyle = "#c0bcb4"; x.fillRect(0, jy0 - 3, w, 3);
  x.fillStyle = "#e8e4dc"; x.fillRect(0, jy1, w, h - jy1);
  x.fillStyle = "#a8a49c";
  for (let k = 0; k <= 5; k++) x.fillRect(Math.round((k * w) / 5) - 3, jy0, 6, jy1 - jy0);
  for (let k = 0; k < w; k += 40) { x.fillStyle = "#fff8dc"; x.fillRect(k + 14, 6, 14, 3); }
  // corredor e bancos azuis
  x.fillStyle = "#6a6a74"; x.fillRect(0, h - Math.round(h * 0.12), w, h);
  for (let k = 0; k < 4; k++) {
    const bx = Math.round(w * 0.04 + k * (w * 0.25));
    x.fillStyle = "#1e4a8a"; x.fillRect(bx, Math.round(h * 0.5), Math.round(w * 0.2), Math.round(h * 0.2));
    x.fillStyle = "#2a6ad0"; x.fillRect(bx + 2, Math.round(h * 0.5) + 2, Math.round(w * 0.2) - 4, 5);
    x.fillStyle = "#16386a"; x.fillRect(bx, Math.round(h * 0.7), Math.round(w * 0.2), Math.round(h * 0.06));
  }
}

// ======================= Objetos extras (alojamentos, refeitório, palco, estacionamento) =======================
const R = (pm, x0, y0, w, h, c) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) pm.set(x, y, typeof c === "function" ? c(x, y) : c); };

// Cama vista de cima (cabeceira em cima), com travesseiro, lençol e cobertor.
export function cama(cor = "#e05a9c", estampa = 0) {
  const pm = new Pixmap(18, 30);
  R(pm, 0, 0, 18, 30, "#7a4a24");
  R(pm, 1, 1, 16, 28, "#f4f2ea");
  R(pm, 3, 2, 12, 6, (x, y) => (y === 2 ? "#ffffff" : "#e8e4dc"));
  const c = rgb(cor);
  R(pm, 1, 10, 16, 19, (x, y) => {
    if (y === 10) return clarear(c, 0.3);
    if (estampa === 1 && (x + y) % 6 === 0) return clarear(c, 0.4);
    if (estampa === 2 && y % 4 === 0) return escurecer(c, 0.2);
    if (x === 16) return escurecer(c, 0.2);
    return c;
  });
  R(pm, 0, 0, 18, 1, "#5a3418");
  return pronto(pm, 9, 29, { x: -9, y: -29, w: 18, h: 29 });
}

export function mala(cor = "#2c4a9c") {
  const pm = new Pixmap(12, 10);
  R(pm, 0, 2, 12, 8, (x, y) => (y === 2 ? clarear(rgb(cor), 0.25) : x === 11 ? escurecer(rgb(cor), 0.25) : cor));
  R(pm, 4, 0, 4, 2, "#3a3a3a");
  R(pm, 0, 5, 12, 1, escurecer(rgb(cor), 0.3));
  return pronto(pm, 6, 9, { x: -6, y: -4, w: 12, h: 4 });
}

export function criado(item = "abajur") {
  const pm = new Pixmap(12, 18);
  R(pm, 0, 8, 12, 10, (x, y) => (y === 8 ? "#c8966a" : x === 11 ? "#6a4a30" : "#9a6a40"));
  R(pm, 2, 12, 8, 1, "#5a3a22");
  if (item === "abajur") { R(pm, 5, 3, 2, 5, "#8a8a8a"); R(pm, 3, 0, 6, 4, "#fff3c4"); }
  if (item === "bombinhas") { R(pm, 1, 4, 10, 4, "#d0202e"); R(pm, 2, 5, 8, 1, "#ffd84a"); for (const x of [2, 5, 8]) { R(pm, x, 1, 2, 3, "#e8e8e8"); pm.set(x, 0, "#3a3a3a"); } }
  if (item === "pelucia") { R(pm, 3, 2, 6, 6, "#c9a07a"); pm.set(3, 1, "#c9a07a"); pm.set(8, 1, "#c9a07a"); pm.set(4, 4, "#1a1010"); pm.set(7, 4, "#1a1010"); }
  if (item === "maquiagem") { R(pm, 2, 5, 8, 3, "#f08aa8"); R(pm, 3, 3, 2, 2, "#b0121f"); R(pm, 7, 2, 2, 3, "#c9a14a"); }
  return pronto(pm, 6, 17, { x: -6, y: -6, w: 12, h: 6 });
}

export function tapete(w, h, cor = "#b0485a") {
  const pm = new Pixmap(w, h);
  const c = rgb(cor);
  R(pm, 0, 0, w, h, (x, y) => (x < 2 || y < 2 || x >= w - 2 || y >= h - 2 ? clarear(c, 0.3) : (x + y) % 6 < 3 ? c : escurecer(c, 0.12)));
  return pronto(pm, w >> 1, h - 1, null, false);
}

// Parede do alojamento (vista de frente), com pôsteres e janela.
export function paredeQuarto(w, cor, posteres = []) {
  const H = 26;
  const pm = new Pixmap(w, H);
  const c = rgb(cor);
  R(pm, 0, 0, w, 4, escurecer(c, 0.35));
  R(pm, 0, 4, w, H - 6, (x, y) => (y % 7 === 0 ? escurecer(c, 0.06) : c));
  R(pm, 0, H - 2, w, 2, "#6a4a30");
  for (const [px0, pc] of posteres) {
    R(pm, px0, 8, 10, 12, "#f4f4f0");
    R(pm, px0 + 1, 9, 8, 10, pc);
    R(pm, px0 + 3, 12, 4, 4, clarear(rgb(pc), 0.4));
  }
  for (let k = 0; k < w; k += 70) janela(pm, k + 30, 7, 14, 12);
  return pronto(pm, 0, H - 1, { x: 0, y: -6, w, h: 6 });
}

export function paredeLado(h, cor) {
  const pm = new Pixmap(6, h + 8);
  R(pm, 0, 0, 6, h + 8, (x) => (x < 2 ? clarear(rgb(cor), 0.15) : x > 4 ? escurecer(rgb(cor), 0.3) : escurecer(rgb(cor), 0.1)));
  return pronto(pm, 0, h + 7, { x: 0, y: -h, w: 6, h });
}

export function muretaFrente(w, cor) {
  const pm = new Pixmap(w, 9);
  R(pm, 0, 0, w, 3, escurecer(rgb(cor), 0.35));
  R(pm, 0, 3, w, 6, (x) => (x % 12 === 0 ? escurecer(rgb(cor), 0.15) : cor));
  return pronto(pm, 0, 8, { x: 0, y: -4, w, h: 4 });
}

// Carro visto de lado (frente para a direita).
export function carro(cor = "#b0121f") {
  const W = 44, H = 22;
  const pm = new Pixmap(W, H);
  const c = rgb(cor);
  R(pm, 2, 9, W - 4, 8, (x, y) => (y === 9 ? clarear(c, 0.25) : x > W - 6 ? escurecer(c, 0.1) : c));
  R(pm, 10, 3, 22, 7, (x, y) => (y === 3 ? clarear(c, 0.2) : c));
  R(pm, 12, 4, 8, 5, "#9ad4f0"); R(pm, 22, 4, 8, 5, "#7ab8e0");
  R(pm, 2, 12, W - 4, 1, escurecer(c, 0.25));
  pm.set(W - 3, 11, "#fff3a0"); pm.set(2, 11, "#d0202e");
  for (const cx of [10, W - 11]) for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) { const d = Math.hypot(x, y); if (d <= 4.2) pm.set(cx + x, 17 + y, d > 2.4 ? "#1a1a20" : "#a8a8b0"); }
  return pronto(pm, W >> 1, H - 1, { x: -20, y: -6, w: 40, h: 6 });
}

// Refeitório: mesa comprida com toalha e comida, cadeiras e balcão de comida.
export function mesaComida(seed = 0) {
  const W = 46, H = 26;
  const pm = new Pixmap(W, H);
  R(pm, 0, 4, W, 14, (x, y) => ((Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? "#f4f4f0" : "#d0303e"));
  R(pm, 0, 18, W, 3, "#8a5a3a");
  for (const x of [2, W - 4]) R(pm, x, 21, 2, 4, "#5a3a22");
  const pratos = [[6, 8], [16, 12], [26, 8], [36, 12]];
  pratos.forEach(([x, y], k) => {
    R(pm, x, y, 6, 4, "#ffffff");
    R(pm, x + 1, y + 1, 4, 2, ["#f2d544", "#8a4a22", "#9ccf6a", "#e86a2a"][(k + seed) % 4]);
  });
  R(pm, 20, 4, 6, 4, "#e8e8f0"); R(pm, 21, 2, 4, 2, "#f29a2a"); // jarra de suco
  return pronto(pm, W >> 1, H - 1, { x: -23, y: -12, w: 46, h: 12 });
}

export function cadeira(cor = "#c8966a") {
  const pm = new Pixmap(8, 12);
  R(pm, 0, 0, 8, 4, escurecer(rgb(cor), 0.15));
  R(pm, 0, 4, 8, 4, cor);
  R(pm, 0, 8, 1, 4, "#5a3a22"); R(pm, 7, 8, 1, 4, "#5a3a22");
  return pronto(pm, 4, 11, { x: -3, y: -3, w: 6, h: 3 });
}

export function buffet() {
  const W = 60, H = 26;
  const pm = new Pixmap(W, H);
  R(pm, 0, 8, W, 12, (x, y) => (y === 8 ? "#e8e8f0" : y < 12 ? "#c8c8d0" : "#a8a8b0"));
  for (let k = 0; k < 4; k++) {
    const x = 4 + k * 14;
    R(pm, x, 2, 11, 7, "#8a8a94");
    R(pm, x + 1, 3, 9, 4, ["#f4f0e0", "#6a3a1a", "#e86a2a", "#9ccf6a"][k]);
    if (k === 1) for (let i = 0; i < 4; i++) pm.set(x + 2 + i * 2, 3, "#3a1a0a");
    pm.set(x + 5, 1, "#ffffff"); pm.set(x + 6, 0, "#ffffff");
  }
  R(pm, 0, 20, W, 5, "#6a6a74");
  return pronto(pm, W >> 1, H - 1, { x: -30, y: -12, w: 60, h: 12 });
}

// Palco: bateria, violão no suporte, pedestal de microfone e caixa de som.
export function bateria() {
  const pm = new Pixmap(34, 30);
  const tambor = (cx, cy, r, cor) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y * 1.6 <= r * r) pm.set(cx + x, cy + y, x * x + y * y * 1.6 > (r - 1.2) * (r - 1.2) ? cor : "#f4f2ea"); };
  R(pm, 11, 14, 12, 12, (x, y) => (y < 16 ? "#f4f2ea" : "#b0121f"));
  tambor(17, 20, 6, "#b0121f");
  tambor(8, 15, 4, "#b0121f"); tambor(26, 15, 4, "#b0121f");
  for (const [x, y] of [[3, 6], [31, 5]]) { R(pm, x - 4, y, 9, 2, "#e2b13c"); R(pm, x, y + 2, 1, 22 - y, "#8a8a94"); }
  R(pm, 15, 26, 4, 3, "#3a3a44");
  return pronto(pm, 17, 29, { x: -15, y: -8, w: 30, h: 8 });
}

export function violaoSuporte() {
  const pm = new Pixmap(12, 26);
  R(pm, 5, 0, 2, 12, "#3e2616");
  for (let y = 10; y < 24; y++) { const w = y < 15 ? 3 : 5; R(pm, 6 - w, y, w * 2, 1, y % 5 === 0 ? "#8a5a2a" : "#c8843a"); }
  pm.set(6, 16, "#2a1a10"); pm.set(5, 16, "#2a1a10");
  R(pm, 2, 24, 8, 2, "#3a3a44");
  return pronto(pm, 6, 25, { x: -3, y: -2, w: 6, h: 2 });
}

export function pedestalMic() {
  const pm = new Pixmap(10, 30);
  R(pm, 4, 6, 1, 22, "#8a8a94");
  R(pm, 3, 2, 3, 4, "#2a2a30"); pm.set(4, 2, "#8a8a94");
  R(pm, 1, 28, 7, 2, "#3a3a44");
  pm.set(6, 12, "#16161a"); pm.set(7, 13, "#16161a"); pm.set(8, 14, "#16161a"); // cabo
  return pronto(pm, 4, 29, { x: -2, y: -2, w: 4, h: 2 });
}

export function caixaSom() {
  const pm = new Pixmap(16, 22);
  R(pm, 0, 0, 16, 22, (x, y) => (x === 0 || y === 0 ? "#3a3a44" : "#1a1a20"));
  for (const [cy, r] of [[7, 4], [16, 3]]) for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) pm.set(8 + x, cy + y, x * x + y * y <= 1.5 ? "#8a8a94" : "#4a4a54");
  return pronto(pm, 8, 21, { x: -8, y: -5, w: 16, h: 5 });
}

// Púlpito de madeira com a Bíblia aberta.
export function pulpitoBiblia() {
  const pm = new Pixmap(18, 30);
  R(pm, 5, 10, 8, 18, (x) => (x === 5 ? "#c8966a" : x === 12 ? "#5a3a22" : "#8a5a3a"));
  R(pm, 1, 6, 16, 5, (x, y) => (y === 6 ? "#c8966a" : "#9a6a40"));
  R(pm, 2, 1, 14, 6, "#f4ecd8");
  R(pm, 8, 1, 2, 6, "#c8b898");
  for (let y = 2; y < 6; y++) for (const x of [3, 5, 11, 13]) pm.set(x, y, "#8a7a6a");
  R(pm, 8, 6, 2, 3, "#b0121f"); // fitinha
  R(pm, 3, 28, 12, 2, "#5a3a22");
  return pronto(pm, 9, 29, { x: -6, y: -3, w: 12, h: 3 });
}

// Corda enrolada e molhada encostada na árvore (com poça).
export function cordaMolhada() {
  const pm = new Pixmap(30, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 30; x++) { const nx = (x - 15) / 15; const ny = (y - 10) / 6; if (nx * nx + ny * ny <= 1) pm.set(x, y, hash(x, y, 4) > 0.8 ? "#9ad4f0" : "#5a8aa8"); }
  for (let k = 0; k < 3; k++) for (let a = 0; a < 40; a++) { const t = (a / 40) * Math.PI * 2; pm.set(13 + Math.cos(t) * (6 - k), 8 + Math.sin(t) * (3 - k * 0.6), k % 2 ? "#b8945a" : "#d8b878"); }
  for (let y = 0; y < 8; y++) pm.set(6 + y * 0.2, y, "#c8a46a");
  return pronto(pm, 15, 15, null, false);
}
