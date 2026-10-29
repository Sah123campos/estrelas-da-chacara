// Monta o cenário da chácara: pinta o chão inteiro (grama, lago, caminhos, pátio azul,
// terraço da piscina, colina...) numa imagem grande, gera a grade de colisão e a lista
// de objetos altos (palmeiras, casa, toboágua...) ordenados por profundidade no jogo.
import { rgb, misturar, escurecer, clarear, hash, fbm, bayer, semente, criarCanvas } from "./pixel.js";
import * as O from "./objetos.js";
import { MAPA, LARGURA_PX, ALTURA_PX, px, py, m } from "../dados/mapa.js";
import { TEMA } from "../config.js";

export const CEL = 4; // resolução da grade de colisão (pixels)

function distSeg(x, y, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l = dx * dx + dy * dy;
  const t = l ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l)) : 0;
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

export class Cenario {
  constructor() {
    this.W = LARGURA_PX;
    this.H = ALTURA_PX;
    this.cw = Math.ceil(this.W / CEL);
    this.ch = Math.ceil(this.H / CEL);
    this.solido = new Uint8Array(this.cw * this.ch);
    this.piso = new Uint8Array(this.cw * this.ch); // 0 grama, 1 terra, 2 pedra, 3 madeira, 4 molhado
    this.objetos = [];
    this.brilhos = [];
    this.animados = [];
    this.pintar();
    this.montarObjetos();
  }

  // ---------- utilidades ----------
  marcarSolido(x, y, w, h, v = 1) {
    const x0 = Math.max(0, Math.floor(x / CEL));
    const y0 = Math.max(0, Math.floor(y / CEL));
    const x1 = Math.min(this.cw - 1, Math.floor((x + w - 1) / CEL));
    const y1 = Math.min(this.ch - 1, Math.floor((y + h - 1) / CEL));
    for (let j = y0; j <= y1; j++) for (let i = x0; i <= x1; i++) this.solido[j * this.cw + i] = v;
  }

  solidoEm(x, y) {
    const i = Math.floor(x / CEL);
    const j = Math.floor(y / CEL);
    if (i < 0 || j < 0 || i >= this.cw || j >= this.ch) return true;
    return this.solido[j * this.cw + i] === 1;
  }

  pisoEm(x, y) {
    const i = Math.floor(x / CEL);
    const j = Math.floor(y / CEL);
    return ["grama", "terra", "pedra", "madeira", "molhado"][this.piso[j * this.cw + i] || 0];
  }

  // ---------- chão ----------
  pintar() {
    const W = this.W;
    const H = this.H;
    const canvas = criarCanvas(W, H);
    const ctx = canvas.getContext("2d");
    const img = ctx.createImageData(W, H);
    const d = img.data;
    this.d = d;
    const set = (x, y, c) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = (y * W + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    };
    const mist = (x, y, c, a) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = (y * W + x) * 4;
      d[i] += (c[0] - d[i]) * a; d[i + 1] += (c[1] - d[i + 1]) * a; d[i + 2] += (c[2] - d[i + 2]) * a;
    };
    this.set = set;
    this.mist = mist;
    const piso = (x, y, v) => { const i = Math.floor(x / CEL), j = Math.floor(y / CEL); if (i >= 0 && j >= 0 && i < this.cw && j < this.ch) this.piso[j * this.cw + i] = v; };

    // ruído de baixa resolução (manchas de grama)
    const G = 8;
    const gw = Math.ceil(W / G) + 2;
    const gh = Math.ceil(H / G) + 2;
    const grade = new Float32Array(gw * gh);
    for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) grade[j * gw + i] = fbm(i, j, 14, 3, 3);
    const manchas = (x, y) => {
      const fx = x / G;
      const fy = y / G;
      const i = Math.floor(fx);
      const j = Math.floor(fy);
      const tx = fx - i;
      const ty = fy - j;
      const a = grade[j * gw + i], b = grade[j * gw + i + 1], c = grade[(j + 1) * gw + i], e = grade[(j + 1) * gw + i + 1];
      return a + (b - a) * tx + (c - a) * ty + (a - b - c + e) * tx * ty;
    };

    const capim = ["#3f7a2c", "#4c8a32", "#5a9a38", "#6aaa40", "#7cb84a", "#90c458"].map(rgb);
    const seco = ["#7a8a3a", "#8a9a44", "#9aa64e"].map(rgb);
    const zColina = py(MAPA.colina.z);
    const lago = MAPA.lago;
    const lx = px(lago.x), ly = py(lago.z), lrx = m(lago.rx), lry = m(lago.rz);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        let n = manchas(x, y);
        // perto do lago o capim é mais escuro (talude úmido)
        const dl = Math.hypot((x - lx) / (lrx + 70), (y - ly) / (lry + 50));
        if (dl < 1) n -= (1 - dl) * 0.25;
        // colina: mais escura e com faixas de corte de grama
        if (y < zColina) n -= 0.06 + (((x + y * 0.3) / 10) % 2 < 1 ? 0.03 : 0);
        const t = n + (bayer(x, y) - 0.5) * 0.12 + (hash(x, y, 1) - 0.5) * 0.08;
        let c;
        if (t < 0.36) c = capim[0];
        else if (t < 0.43) c = capim[1];
        else if (t < 0.5) c = capim[2];
        else if (t < 0.57) c = capim[3];
        else if (t < 0.63) c = capim[4];
        else c = capim[5];
        if (n > 0.64) c = misturar(c, seco[1], Math.min(0.5, (n - 0.64) * 3));
        // folhinhas de grama
        const h = hash(x, y, 7);
        if (h > 0.985) c = clarear(c, 0.25);
        else if (h < 0.012) c = escurecer(c, 0.25);
        set(x, y, c);
      }
    }
    // talude da colina (degrau no terreno)
    for (let x = 0; x < W; x++) {
      const yy = zColina + Math.round(Math.sin(x * 0.012) * 10 + Math.sin(x * 0.05) * 3);
      for (let k = 0; k < 10; k++) mist(x, yy + k, rgb("#1e4a22"), 0.28 * (1 - k / 10));
      for (let k = 1; k < 4; k++) mist(x, yy - k, rgb("#a8d070"), 0.18 / k);
    }
    // flores do campo
    const r = semente(77);
    for (let k = 0; k < 2200; k++) {
      const x = Math.floor(r() * W);
      const y = Math.floor(r() * H);
      const c = ["#f4f4f0", "#f2d544", "#e88ab0", "#c7a6ef"][k % 4];
      set(x, y, rgb(c));
      if (r() > 0.6) set(x + 1, y, rgb(c));
    }

    // ---------- caminhos ----------
    const terra = rgb("#a8865a");
    for (const c of MAPA.caminhos) {
      const pts = c.pts.map(([x, z]) => [px(x), py(z)]);
      const larg = m(c.largura) / 2;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
      for (let y = Math.floor(y0 - larg - 3); y <= y1 + larg + 3; y++) for (let x = Math.floor(x0 - larg - 3); x <= x1 + larg + 3; x++) {
        let dm = Infinity;
        for (let i = 0; i < pts.length - 1; i++) dm = Math.min(dm, distSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
        const borda = larg + (hash(x >> 1, y >> 1, 5) - 0.5) * 4;
        if (dm > borda + 2) continue;
        if (dm > borda) { if (bayer(x, y) > 0.5) mist(x, y, terra, 0.45); continue; }
        let cc = terra;
        const h = hash(x, y, 9);
        if (h > 0.93) cc = rgb("#c8a87a");
        else if (h < 0.08) cc = rgb("#7a5a3a");
        else if (dm > larg - 3) cc = escurecer(terra, 0.08);
        set(x, y, cc);
        piso(x, y, 1);
      }
    }

    // ---------- lago ----------
    const fundo = rgb("#2e5a50");
    const meio = rgb("#3c6e5c");
    const raso = rgb("#5a8a62");
    const lama = rgb("#7a6a48");
    for (let y = ly - lry - 12; y <= ly + lry + 12; y++) {
      for (let x = lx - lrx - 12; x <= lx + lrx + 12; x++) {
        const ang = Math.atan2(y - ly, x - lx);
        const irreg = 1 + Math.sin(ang * 3 + 1) * 0.05 + Math.sin(ang * 7) * 0.025;
        const dd = Math.hypot((x - lx) / lrx, (y - ly) / lry) / irreg;
        if (dd > 1.06) continue;
        if (dd > 1) { if (hash(x, y, 3) > 0.3) set(x, y, hash(x, y, 4) > 0.5 ? lama : escurecer(lama, 0.15)); continue; }
        let c = dd > 0.93 ? raso : dd > 0.7 ? meio : fundo;
        if (dd < 0.93 && hash(x >> 1, y, 11) > 0.97) c = clarear(c, 0.18);
        if (dd < 0.7 && (y + Math.floor(x / 9)) % 7 === 0 && hash(x, y, 6) > 0.6) c = clarear(c, 0.08);
        set(x, y, c);
        if (dd < 0.96) this.marcarSolido(x, y, 1, 1);
        if (dd < 0.9 && hash(x, y, 21) > 0.9985) this.brilhos.push([x, y, 0]);
      }
    }
    // taboas e plantinhas na margem
    for (let k = 0; k < 90; k++) {
      const a = r() * Math.PI * 2;
      const rr = 0.97 + r() * 0.05;
      const bx = Math.round(lx + Math.cos(a) * lrx * rr);
      const by = Math.round(ly + Math.sin(a) * lry * rr);
      for (let i = 0; i < 5; i++) {
        const hx = bx + Math.round((r() - 0.5) * 6);
        const alt = 3 + Math.floor(r() * 5);
        for (let j = 0; j < alt; j++) set(hx, by - j, rgb(j === alt - 1 ? "#6a4a2a" : j > alt - 3 ? "#5a8a3a" : "#3a6a2a"));
      }
    }
    // vitórias-régias
    for (let k = 0; k < 14; k++) {
      const a = r() * Math.PI * 2;
      const rr = 0.4 + r() * 0.45;
      const bx = Math.round(lx + Math.cos(a) * lrx * rr);
      const by = Math.round(ly + Math.sin(a) * lry * rr);
      for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) if (i * i / 9 + j * j / 4 <= 1 && !(i > 0 && j === 0)) set(bx + i, by + j, rgb(j < 0 ? "#6a9a3a" : "#4a7a2e"));
      if (k % 3 === 0) set(bx - 1, by - 1, rgb("#f6a8c8"));
    }

    // ---------- riacho da cachoeira ----------
    {
      const pts = MAPA.riacho.pts.map(([x, z]) => [px(x), py(z)]);
      const larg = m(MAPA.riacho.largura) / 2;
      for (let y = pts[0][1] - 40; y < pts[0][1] + 40; y++) for (let x = pts[0][0] - 20; x < pts[pts.length - 1][0] + 30; x++) {
        let dm = Infinity;
        for (let i = 0; i < pts.length - 1; i++) dm = Math.min(dm, distSeg(x, y, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]));
        if (dm > larg + 3) continue;
        if (dm > larg) { set(x, y, hash(x, y, 2) > 0.5 ? rgb("#8a8478") : rgb("#6a6458")); this.marcarSolido(x, y, 1, 1); continue; }
        set(x, y, (x + y * 2) % 11 < 2 ? rgb("#8ad0e0") : rgb("#4a90a0"));
        this.marcarSolido(x, y, 1, 1);
        if (hash(x, y, 5) > 0.985) this.brilhos.push([x, y, 1]);
      }
    }

    // ---------- pátio azul (o das fotos) ----------
    {
      const p = MAPA.patio;
      const x0 = px(p.x - p.w / 2), x1 = px(p.x + p.w / 2), y0 = py(p.z - p.d / 2), y1 = py(p.z + p.d / 2);
      const azul = rgb("#4f93b8");
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const n = fbm(x, y, 12, 8, 3);
        let c = misturar(azul, rgb("#7aaecb"), n * 0.7);
        const gasto = fbm(x, y, 6, 21, 2);
        if (gasto > 0.66) c = misturar(c, rgb("#a8b4b0"), (gasto - 0.66) * 2.2); // pintura gasta, concreto aparecendo
        if (hash(x, y, 3) > 0.96) c = escurecer(c, 0.12);
        if (hash(x, y, 4) < 0.03) c = clarear(c, 0.1);
        if (y === y1 - 1 || x === x0 || x === x1 - 1) c = escurecer(c, 0.25);
        set(x, y, c);
        piso(x, y, 2);
      }
      // rachaduras
      for (const [ax, ay, n] of [[x0 + 14, y0 + 8, 46], [x0 + 60, y0 + 30, 30], [x0 + 6, y0 + 40, 22]]) {
        let cx = ax, cy = ay;
        for (let k = 0; k < n; k++) { set(Math.round(cx), Math.round(cy), escurecer(azul, 0.4)); cx += 1; cy += (hash(k, ay) - 0.45) * 1.6; }
      }
    }

    // ---------- terraço da piscina ----------
    {
      const t = MAPA.terraco;
      const x0 = px(t.x - t.w / 2), x1 = px(t.x + t.w / 2), y0 = py(t.z - t.d / 2), y1 = py(t.z + t.d / 2);
      this.terraco = { x0, x1, y0, y1 };
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        let c = rgb("#dcc8a0");
        const tx = (x - x0) % 12;
        const ty = (y - y0) % 12;
        if (tx === 0 || ty === 0) c = rgb("#b8a27a");
        else if (hash(Math.floor((x - x0) / 12), Math.floor((y - y0) / 12), 4) > 0.6) c = rgb("#e4d2ac");
        if (tx === 1 || ty === 1) c = clarear(c, 0.1);
        set(x, y, c);
        piso(x, y, 2);
      }
      // muro de arrimo (o terraço é mais alto que o gramado)
      const muro = 14;
      const escadaS = [px(27), px(32)];
      for (let y = y1; y < y1 + muro; y++) for (let x = x0; x < x1; x++) {
        if (x >= escadaS[0] && x < escadaS[1]) {
          set(x, y, (y - y1) % 4 === 0 ? rgb("#9a8a6a") : rgb("#d8c8a0"));
          piso(x, y, 2);
          continue;
        }
        const pedra = ((x + Math.floor((y - y1) / 4) * 5) % 10 === 0) || (y - y1) % 4 === 0;
        set(x, y, pedra ? rgb("#8a8274") : (y - y1) < 2 ? rgb("#e8e4dc") : rgb(hash(x >> 2, y >> 2, 2) > 0.5 ? "#b8b0a0" : "#a8a090"));
      }
      this.marcarSolido(x0, y1 - 2, escadaS[0] - x0, muro + 2);
      this.marcarSolido(escadaS[1], y1 - 2, x1 - escadaS[1], muro + 2);
      // borda oeste com escada
      const escadaO = [py(-31), py(-26)];
      for (let y = y0; y < y1 + muro; y++) for (let x = x0 - 10; x < x0; x++) {
        if (y >= escadaO[0] && y < escadaO[1]) { set(x, y, (x - x0) % 3 === 0 ? rgb("#9a8a6a") : rgb("#d8c8a0")); piso(x, y, 2); continue; }
        if (y < y1) set(x, y, (x === x0 - 1) ? rgb("#e8e4dc") : rgb(hash(x >> 2, y >> 2, 6) > 0.5 ? "#b8b0a0" : "#9a9284"));
      }
      this.marcarSolido(x0 - 10, y0, 12, escadaO[0] - y0);
      this.marcarSolido(x0 - 10, escadaO[1], 12, y1 + muro - escadaO[1]);
      this.marcarSolido(x0, y0 - 4, x1 - x0, 6); // balaustrada norte
      this.marcarSolido(x1 - 2, y0, 6, y1 - y0 + muro); // leste
      this.escadas = { escadaS, escadaO };

      // piscina
      const p = MAPA.piscina;
      const px0 = px(p.x - p.w / 2), px1 = px(p.x + p.w / 2), py0 = py(p.z - p.d / 2), py1 = py(p.z + p.d / 2);
      this.piscina = { x0: px0, x1: px1, y0: py0, y1: py1 };
      for (let y = py0 - 4; y < py1 + 4; y++) for (let x = px0 - 4; x < px1 + 4; x++) {
        if (x < px0 || x >= px1 || y < py0 || y >= py1) { set(x, y, (x + y) % 2 ? rgb("#f8f8f4") : rgb("#e8e8e4")); continue; }
        const prof = (y - py0) / (py1 - py0);
        let c = misturar(rgb("#5ac8f0"), rgb("#2a8ad0"), 0.3 + prof * 0.5);
        if (y < py0 + 3) c = escurecer(c, 0.2);
        // azulejos do fundo
        if ((x - px0) % 8 === 0 || (y - py0) % 8 === 0) c = misturar(c, rgb("#8ad8f8"), 0.25);
        // raia
        if (Math.abs(y - (py0 + py1) / 2) < 1.5 && (x - px0) > 6 && (px1 - x) > 6) c = rgb("#1a5aa0");
        set(x, y, c);
        if (hash(x, y, 8) > 0.992) this.brilhos.push([x, y, 2]);
      }
      this.marcarSolido(px0, py0, px1 - px0, py1 - py0);
      // escadinha de inox na piscina
      for (let k = 0; k < 3; k++) { set(px0 + 6, py0 + 2 + k * 3, rgb("#e8e8f0")); set(px0 + 10, py0 + 2 + k * 3, rgb("#e8e8f0")); }
      // espreguiçadeiras
      for (let k = 0; k < 4; k++) {
        const ex = px0 + 8 + k * 26;
        const ey = py1 + 12;
        for (let j = 0; j < 22; j++) for (let i = 0; i < 9; i++) set(ex + i, ey + j, j < 7 ? rgb("#f4f4f0") : (i + j) % 3 ? rgb("#2a9dce") : rgb("#f4f4f0"));
        this.marcarSolido(ex, ey, 9, 22);
      }
    }

    // ---------- quadra de basquete (provisória) ----------
    {
      const q = MAPA.quadra;
      const x0 = px(q.x - q.w / 2), x1 = px(q.x + q.w / 2), y0 = py(q.z - q.d / 2), y1 = py(q.z + q.d / 2);
      const M = 10;
      const ix0 = x0 + M, ix1 = x1 - M, iy0 = y0 + M, iy1 = y1 - M;
      const cy = (iy0 + iy1) / 2;
      const cx = (ix0 + ix1) / 2;
      const aros = [ix0 + 12, ix1 - 12];
      this.cestas = aros.map((x, i) => ({ x, y: Math.round(cy), lado: i === 0 ? -1 : 1 }));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const fora = x < ix0 || x >= ix1 || y < iy0 || y >= iy1;
        let c;
        if (fora) c = rgb(hash(x >> 1, y >> 1, 2) > 0.5 ? "#3a6a8a" : "#36627f");
        else {
          // piso laranja de quadra, com tábuas
          c = rgb((Math.floor((x - ix0) / 12) + Math.floor((y - iy0) / 4)) % 2 ? "#d48a4a" : "#cc8244");
          if ((y - iy0) % 4 === 0) c = escurecer(c, 0.06);
          // garrafão azul
          for (const ax of aros) {
            const dentro = Math.abs(y - cy) < 20 && (ax < cx ? x < ix0 + 46 : x >= ix1 - 46);
            if (dentro) c = rgb("#2c5a9c");
          }
          const lin = (v) => Math.abs(v) < 0.8;
          let branco = x === ix0 || x === ix1 - 1 || y === iy0 || y === iy1 - 1 || lin(x - cx) || lin(Math.hypot(x - cx, y - cy) - 18);
          for (const ax of aros) {
            const garrafaoX = ax < cx ? ix0 + 46 : ix1 - 46;
            if (Math.abs(y - cy) <= 20 && (ax < cx ? x <= garrafaoX : x >= garrafaoX) && (lin(Math.abs(y - cy) - 20) || lin(x - garrafaoX))) branco = true;
            if (lin(Math.hypot(x - garrafaoX, y - cy) - 20) && (ax < cx ? x >= garrafaoX : x <= garrafaoX)) branco = true;
            const d3 = Math.hypot(x - ax, y - cy);
            if (lin(d3 - 64) && (ax < cx ? x >= ax : x <= ax)) branco = true;
            if (Math.abs(y - cy) > 44 && Math.abs(y - cy) < 46 && (ax < cx ? x < ax : x > ax)) branco = true;
          }
          if (branco) c = rgb("#f4f4f0");
        }
        set(x, y, c);
        piso(x, y, 3);
      }
    }
    // ---------- roda da fogueira ----------
    {
      const f = MAPA.fogueira;
      const cx = px(f.x), cy = py(f.z);
      for (let y = cy - 34; y <= cy + 34; y++) for (let x = cx - 40; x <= cx + 40; x++) {
        const dd = Math.hypot((x - cx) / 38, (y - cy) / 30);
        if (dd > 1) continue;
        if (dd > 0.94 && hash(x, y) > 0.5) continue;
        set(x, y, hash(x, y, 3) > 0.9 ? rgb("#8a6a4a") : dd < 0.3 ? rgb("#5a4a3a") : rgb("#a8865a"));
        piso(x, y, 1);
      }
    }
    // estrada de terra que passa na frente do portão (por onde o ônibus chega)
    {
      const y0 = py(95.6), y1 = py(99.6);
      for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
        let c = hash(x, y, 31) > 0.9 ? rgb("#c8a87a") : hash(x, y, 32) < 0.08 ? rgb("#7a5a3a") : rgb("#a8865a");
        const k = y - y0;
        if (k === 7 || k === 8 || k === 22 || k === 23) c = escurecer(c, 0.14); // marcas de pneu
        if (k < 2 || k > y1 - y0 - 3) { if (hash(x, y, 33) > 0.5) continue; }
        set(x, y, c);
        piso(x, y, 1);
      }
    }
    // chão de terra batida na frente de construções
    const terreiro = (x, z, w, d) => {
      for (let y = py(z); y < py(z + d); y++) for (let xx = px(x); xx < px(x + w); xx++) { if (hash(xx >> 1, y >> 1, 4) > 0.12) set(xx, y, hash(xx, y, 2) > 0.85 ? rgb("#c8a87a") : rgb("#b8966a")); piso(xx, y, 1); }
    };
    terreiro(-40, 45, 20, 4);
    terreiro(-16, 68, 28, 4);
    terreiro(-68, -102, 20, 4);

    ctx.putImageData(img, 0, 0);
    this.chao = canvas;
    this.ctxChao = ctx;
  }

  // sombra de objeto no chão (sol vindo de cima-esquerda)
  sombra(x, y, rx, ry, forca = 0.35) {
    const ctx = this.ctxChao;
    ctx.save();
    ctx.fillStyle = `rgba(16,40,20,${forca})`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ---------- objetos ----------
  add(spr, x, y, extra = {}) {
    const o = { ...spr, x: Math.round(x), y: Math.round(y), ...extra };
    this.objetos.push(o);
    if (spr.col && !extra.semColisao) this.marcarSolido(o.x + spr.col.x, o.y + spr.col.y, spr.col.w, spr.col.h);
    return o;
  }

  montarObjetos() {
    let seed = 1;
    const cache = new Map();
    for (const a of MAPA.arvores) {
      const x = px(a.x);
      const y = py(a.z);
      if (x < 0 || y < 0 || x > this.W || y > this.H) continue;
      seed++;
      let spr;
      if (a.tipo === "palmeira") spr = O.palmeira(a.s, seed);
      else if (a.tipo === "touceira") spr = O.touceira(a.s, seed);
      else if (a.tipo === "copa") spr = O.copa(a.s, seed);
      else if (a.tipo === "mangueira") spr = O.mangueira(a.s, seed);
      else if (a.tipo === "ipe") spr = O.ipe(a.s, seed);
      else if (a.tipo === "arbusto") spr = O.arbusto(a.s, seed);
      else if (a.tipo === "tronco") spr = O.tronco(a.s);
      else if (a.tipo === "pinheiro") { const k = "p" + (seed % 4); if (!cache.has(k)) cache.set(k, O.pinheiro(1, seed)); spr = cache.get(k); }
      else if (a.tipo === "eucalipto") { const k = "e" + (seed % 3); if (!cache.has(k)) cache.set(k, O.eucalipto(1, seed)); spr = cache.get(k); }
      if (!spr) continue;
      const larg = spr.w * 0.42;
      this.sombra(x + larg * 0.35, y + 2, a.tipo === "palmeira" ? 16 * a.s : larg, a.tipo === "palmeira" ? 6 : larg * 0.35, a.tipo === "palmeira" ? 0.22 : 0.3);
      if (a.tipo === "palmeira") this.sombra(x + 26 * a.s, y + 6, 18 * a.s, 7 * a.s, 0.18);
      this.add(spr, x, y, { tipo: a.tipo });
    }
    for (const p of MAPA.postes) this.add(O.poste(), px(p.x), py(p.z), { tipo: "poste", luz: true });
    for (const b of MAPA.bancos) this.add(O.banco(), px(b.x), py(b.z), { tipo: "banco", id: b.id });
    for (const p of MAPA.palha) this.add(O.palha(), px(p.x), py(p.z), { tipo: "palha", chao: true });

    // murinho azul: borda norte da plataforma (virado para o pátio) e as duas dobras laterais
    {
      const mu = MAPA.murinho;
      const W = m(mu.w);
      const pm = criarCanvas(W, 16);
      const c = pm.getContext("2d");
      c.fillStyle = "#3a9ad0"; c.fillRect(0, 0, W, 6);
      c.fillStyle = "#64b6e0"; c.fillRect(0, 0, W, 2);
      c.fillStyle = "#1e5f9a"; c.fillRect(0, 6, W, 9);
      c.fillStyle = "#17487a"; c.fillRect(0, 14, W, 2);
      for (let x = 0; x < W; x += 2) if (hash(x, 3) > 0.6) { c.fillStyle = "rgba(255,255,255,0.12)"; c.fillRect(x, 7 + (x % 6), 2, 1); }
      for (let x = 0; x < W; x += 3) if (hash(x, 9) > 0.8) { c.fillStyle = "rgba(200,210,200,0.35)"; c.fillRect(x, 1 + (x % 4), 3, 1); }
      this.add({ img: pm, ox: W / 2, oy: 15, col: { x: -W / 2, y: -8, w: W, h: 8 }, w: W, h: 16 }, px(mu.x), py(mu.z), { tipo: "murinho" });
      const L = m(mu.lateral);
      for (const lado of [-1, 1]) {
        const lp = criarCanvas(7, L + 16);
        const g = lp.getContext("2d");
        g.fillStyle = "#3a9ad0"; g.fillRect(0, 0, 7, L + 6);
        g.fillStyle = lado < 0 ? "#64b6e0" : "#2a7ab0"; g.fillRect(lado < 0 ? 0 : 5, 0, 2, L + 6);
        g.fillStyle = "#1e5f9a"; g.fillRect(0, L + 6, 7, 9);
        g.fillStyle = "#17487a"; g.fillRect(0, L + 14, 7, 2);
        const x = px(mu.x) + lado * (W / 2) - (lado < 0 ? 0 : 7);
        this.add({ img: lp, ox: 0, oy: L + 15, col: { x: 0, y: -L - 8, w: 7, h: L + 8 }, w: 7, h: L + 16 }, x, py(mu.z) + L, { tipo: "murinho" });
      }
    }
    // degrau/borda da plataforma (ela fica um pouco acima do gramado)
    {
      const p = MAPA.patio;
      const x0 = px(p.x - p.w / 2), x1 = px(p.x + p.w / 2), y1 = py(p.z + p.d / 2);
      const ctx = this.ctxChao;
      ctx.fillStyle = "#3f6f8a"; ctx.fillRect(x0, y1, x1 - x0, 3);
      ctx.fillStyle = "rgba(16,40,20,0.35)"; ctx.fillRect(x0, y1 + 3, x1 - x0, 3);
      ctx.fillStyle = "#3f6f8a"; ctx.fillRect(x0 - 2, py(p.z - p.d / 2), 2, y1 - py(p.z - p.d / 2) + 3); ctx.fillRect(x1, py(p.z - p.d / 2), 2, y1 - py(p.z - p.d / 2) + 3);
    }

    // terraço: balaustradas
    {
      const t = this.terraco;
      const { escadaS, escadaO } = this.escadas;
      this.add(O.balaustrada(escadaS[0] - t.x0), t.x0, t.y1, { tipo: "balaustrada", semColisao: true });
      this.add(O.balaustrada(t.x1 - escadaS[1]), escadaS[1], t.y1, { tipo: "balaustrada", semColisao: true });
      this.add(O.balaustrada(t.x1 - t.x0), t.x0, t.y0, { tipo: "balaustrada", semColisao: true });
      this.add(O.balaustrada(escadaO[0] - t.y0, true), t.x0 - 2, escadaO[0], { tipo: "balaustrada", semColisao: true });
      this.add(O.balaustrada(t.y1 - escadaO[1], true), t.x0 - 2, t.y1, { tipo: "balaustrada", semColisao: true });
      this.add(O.balaustrada(t.y1 - t.y0, true), t.x1 - 2, t.y1, { tipo: "balaustrada", semColisao: true });
    }
    const S = (k, o) => this.add(o, px(MAPA[k].x), py(MAPA[k].z + (MAPA[k].d || 0) / 2), { tipo: k });
    S("quiosque", O.quiosque());
    {
      const t = MAPA.toboagua;
      const dx = px(t.x) - px(t.fim.x);
      const dy = py(t.z) - py(t.fim.z);
      const o = this.add(O.toboagua(-dx, -dy), px(t.fim.x), py(t.fim.z), { tipo: "toboagua" });
      this.toboagua = { trilho: o.trilho.map(([x, y]) => [o.x + x, o.y + y]), torre: { x: px(t.x), y: py(t.z) + 2 }, fim: { x: o.x, y: o.y } };
    }
    S("casa", O.casaAmarela());
    S("refeitorio", O.refeitorio());
    S("alojamento", O.alojamento());
    this.add(O.portao(), px(MAPA.portao.x), py(MAPA.portao.z), { tipo: "portao" });
    for (const c of this.cestas) {
      const o = this.add(O.cesta(c.lado), c.x + c.lado * 10, c.y + 1, { tipo: "cesta" });
      c.aro = { x: o.x + o.aroDx, y: o.y, alt: o.altAro };
    }
    this.marcarSolido(px(MAPA.portao.x) - 44, py(MAPA.portao.z) - 4, 10, 6);
    this.marcarSolido(px(MAPA.portao.x) + 34, py(MAPA.portao.z) - 4, 10, 6);
    this.add(O.placa(), px(4), py(90), { tipo: "placa" });
    this.add(O.sino(), px(-21), py(45.5), { tipo: "sino" });
    this.add(O.arara(), px(-2), py(68.6), { tipo: "arara" });
    this.add(O.fogueira(), px(MAPA.fogueira.x), py(MAPA.fogueira.z), { tipo: "fogueira", fogo: true });
    // cachoeira animada
    {
      const quadros = [0, 1, 2].map((q) => O.cachoeira(q));
      const o = this.add(quadros[0], px(MAPA.cachoeira.x), py(MAPA.cachoeira.z), { tipo: "cachoeira", quadros });
      this.animados.push(o);
    }
    // letreiro coberto
    {
      const L = MAPA.letreiro;
      this.letras = [];
      [...TEMA].forEach((ch, i) => {
        const x = px(L.x + (i - (TEMA.length - 1) / 2) * L.espaco);
        const y = py(L.z);
        const o = this.add(O.lona(i), x, y, { tipo: "lona", ch, i });
        o.letra = O.letra(ch);
        o.letraBrilho = O.letra(ch, 1);
        this.letras.push(o);
      });
    }
    // bordas do mapa
    this.marcarSolido(0, 0, this.W, 8);
    this.marcarSolido(0, 0, 8, this.H);
    this.marcarSolido(this.W - 8, 0, 8, this.H);
    this.marcarSolido(0, this.H - 8, this.W, 8);
    // lugar do pátio/patamar do murinho fica livre (para sentar)
  }
}
