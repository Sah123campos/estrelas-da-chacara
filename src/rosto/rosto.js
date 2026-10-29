// Transforma a foto do jogador em rosto de pixel art.
// 1) alinha a foto pelos olhos e boca (marcadores detectados ou ajustados à mão);
// 2) reduz para a grade do retrato (64x64) com poucos tons, como pixel art;
// 3) reduz de novo para o rosto do boneco (12x8), realçando olhos e boca.
// Tudo acontece no próprio aparelho: a foto nunca sai daqui.
import { Pixmap, criarCanvas } from "../arte/pixel.js";

export const RETRATO = 64;
// Posições canônicas no retrato (em pixels da grade 64x64).
export const CANON = { olhoE: { x: 25.5, y: 28.5 }, olhoD: { x: 38.5, y: 28.5 }, boca: { x: 32, y: 39 } };
// Caixa da cabeça no retrato.
export const CABECA = { x0: 17, x1: 46, y0: 12, y1: 46 };

// Transformação afim que leva 3 pontos da foto para 3 pontos do retrato.
function afim(src, dst) {
  const [p0, p1, p2] = src;
  const [q0, q1, q2] = dst;
  const det = (p1.x - p0.x) * (p2.y - p0.y) - (p2.x - p0.x) * (p1.y - p0.y);
  if (Math.abs(det) < 1e-9) return null;
  const inv = [(p2.y - p0.y) / det, -(p2.x - p0.x) / det, -(p1.y - p0.y) / det, (p1.x - p0.x) / det];
  const ax = [q1.x - q0.x, q2.x - q0.x];
  const ay = [q1.y - q0.y, q2.y - q0.y];
  const a = ax[0] * inv[0] + ax[1] * inv[2];
  const c = ax[0] * inv[1] + ax[1] * inv[3];
  const b = ay[0] * inv[0] + ay[1] * inv[2];
  const d = ay[0] * inv[1] + ay[1] * inv[3];
  const e = q0.x - a * p0.x - c * p0.y;
  const f = q0.y - b * p0.x - d * p0.y;
  return [a, b, c, d, e, f];
}

// Máscara do rosto (onde a foto aparece) no retrato, de acordo com o formato.
export function dentroRosto(x, y, formato = "oval") {
  const u = (x + 0.5 - 32) / 15;
  const v = (y + 0.5 - 29) / 17;
  let rx = 1;
  if (v > 0.25) {
    const k = (v - 0.25) / 0.75;
    const queixo = { oval: 0.42, redondo: 0.25, quadrado: 0.12, coracao: 0.55 }[formato] ?? 0.42;
    rx = 1 - k * k * queixo - (formato === "quadrado" ? 0 : k * 0.12);
  }
  if (v < -0.55) rx *= 1 - (-v - 0.55) * (formato === "quadrado" ? 0.5 : 0.85);
  return Math.abs(u) <= rx && v >= -1 && v <= 1;
}

// Gera os dois rostos a partir da foto (canvas) e dos ajustes do jogador.
// marcos: { eyeL, eyeR, mouth } normalizados (0..1). ajuste: { zoom, dx, dy, brilho }.
export function processarFoto(foto, marcos, ajuste = {}, formato = "oval") {
  const W = foto.width;
  const H = foto.height;
  const zoom = ajuste.zoom || 1;
  const src = [
    { x: marcos.eyeL.x * W, y: marcos.eyeL.y * H },
    { x: marcos.eyeR.x * W, y: marcos.eyeR.y * H },
    { x: marcos.mouth.x * W, y: marcos.mouth.y * H },
  ];
  const cx = 32 + (ajuste.dx || 0);
  const cy = 32 + (ajuste.dy || 0);
  const ajusta = (p) => ({ x: cx + (p.x - 32) * zoom, y: cy + (p.y - 32) * zoom });
  const dst = [ajusta(CANON.olhoE), ajusta(CANON.olhoD), ajusta(CANON.boca)];
  // renderiza em alta (4x) e reduz, para suavizar antes de "pixelar"
  const K = 4;
  const alta = criarCanvas(RETRATO * K, RETRATO * K);
  const ax = alta.getContext("2d", { willReadFrequently: true });
  const m = afim(src, dst.map((p) => ({ x: p.x * K, y: p.y * K })));
  ax.fillStyle = "#808080";
  ax.fillRect(0, 0, alta.width, alta.height);
  ax.imageSmoothingEnabled = true;
  ax.imageSmoothingQuality = "high";
  if (m) ax.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ax.drawImage(foto, 0, 0);
  ax.setTransform(1, 0, 0, 1, 0, 0);
  const baixa = criarCanvas(RETRATO, RETRATO);
  const bx = baixa.getContext("2d", { willReadFrequently: true });
  bx.imageSmoothingEnabled = true;
  bx.imageSmoothingQuality = "high";
  // reduz em duas etapas (melhor média de cores)
  const meio = criarCanvas(RETRATO * 2, RETRATO * 2);
  const mx = meio.getContext("2d");
  mx.imageSmoothingQuality = "high";
  mx.drawImage(alta, 0, 0, meio.width, meio.height);
  bx.drawImage(meio, 0, 0, RETRATO, RETRATO);
  const dados = bx.getImageData(0, 0, RETRATO, RETRATO).data;

  const brilho = (ajuste.brilho || 0) * 0.25;
  limparBordas(dados, formato);
  const pm = new Pixmap(RETRATO, RETRATO);
  for (let y = 0; y < RETRATO; y++) {
    for (let x = 0; x < RETRATO; x++) {
      if (!dentroRosto(x, y, formato)) continue;
      const i = (y * RETRATO + x) * 4;
      pm.set(x, y, tom([dados[i], dados[i + 1], dados[i + 2]], brilho));
    }
  }
  const pele = amostraPele(dados);
  return { retrato: pm, sprite: reduzirParaBoneco(dados, formato, brilho), pele };
}

// Ajuste de tons "de pixel art": um pouco mais de contraste e cor, e menos níveis.
function tom([r, g, b], brilho = 0) {
  const out = [r, g, b].map((v) => {
    let t = v / 255 + brilho;
    t = (t - 0.5) * 1.12 + 0.5;
    return Math.max(0, Math.min(1, t));
  });
  // saturação
  const l = 0.299 * out[0] + 0.587 * out[1] + 0.114 * out[2];
  const sat = out.map((v) => Math.max(0, Math.min(1, l + (v - l) * 1.15)));
  // aquece levemente e reduz para 24 níveis por canal
  sat[0] = Math.min(1, sat[0] * 1.02);
  sat[2] = sat[2] * 0.97;
  return [...sat.map((v) => Math.round(v * 23) / 23 * 255), 255];
}

// Nas bordas do rosto a foto às vezes mostra o fundo (parede branca, céu...). Esses pontos
// claros/diferentes da pele, perto da borda, viram pele — assim não fica "ponta branca".
function limparBordas(d, formato) {
  const hex = amostraPele(d);
  const pele = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const lumP = 0.299 * pele[0] + 0.587 * pele[1] + 0.114 * pele[2];
  for (let y = 0; y < RETRATO; y++) {
    for (let x = 0; x < RETRATO; x++) {
      if (!dentroRosto(x, y, formato)) continue;
      const u = (x + 0.5 - 32) / 15;
      const v = (y + 0.5 - 29) / 17;
      const borda = u * u + v * v > 0.5 || v < -0.4;
      if (!borda) continue;
      const i = (y * RETRATO + x) * 4;
      const c = [d[i], d[i + 1], d[i + 2]];
      const lum = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
      const dist = Math.hypot(c[0] - pele[0], c[1] - pele[1], c[2] - pele[2]);
      const sat = Math.max(...c) - Math.min(...c);
      const fundoClaro = lum > lumP + 35 && dist > 60;
      const fundoCinza = sat < 18 && dist > 70 && lum > lumP - 50;
      if (fundoClaro || fundoCinza) {
        const sombra = 1 - Math.max(0, u) * 0.18 - Math.max(0, v - 0.6) * 0.2;
        d[i] = pele[0] * sombra; d[i + 1] = pele[1] * sombra; d[i + 2] = pele[2] * sombra;
      }
    }
  }
}

function amostraPele(d) {
  const pts = [[24, 36], [40, 36], [32, 22], [27, 37], [37, 37]];
  let r = 0, g = 0, b = 0, n = 0;
  for (const [x, y] of pts) {
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const k = ((y + j) * RETRATO + (x + i)) * 4;
      r += d[k]; g += d[k + 1]; b += d[k + 2]; n++;
    }
  }
  const h = (v) => Math.round(v / n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

// Rosto do boneco: região x 17..46, y 20..45 do retrato → 12x8, com realce.
function reduzirParaBoneco(d, formato, brilho) {
  const W = 12;
  const Hh = 8;
  const x0 = 17;
  const y0 = 20;
  const sx = 30 / W;
  const sy = 26 / Hh;
  const media = [];
  for (let j = 0; j < Hh; j++) {
    for (let i = 0; i < W; i++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = Math.floor(y0 + j * sy); y < Math.floor(y0 + (j + 1) * sy); y++) {
        for (let x = Math.floor(x0 + i * sx); x < Math.floor(x0 + (i + 1) * sx); x++) {
          const k = (y * RETRATO + x) * 4;
          r += d[k]; g += d[k + 1]; b += d[k + 2]; n++;
        }
      }
      media.push([r / n, g / n, b / n]);
    }
  }
  // realce (unsharp) para olhos e boca não sumirem
  const pm = new Pixmap(W, Hh);
  const get = (i, j) => media[Math.max(0, Math.min(Hh - 1, j)) * W + Math.max(0, Math.min(W - 1, i))];
  for (let j = 0; j < Hh; j++) {
    for (let i = 0; i < W; i++) {
      const c = get(i, j);
      const viz = [get(i - 1, j), get(i + 1, j), get(i, j - 1), get(i, j + 1)];
      const out = c.map((v, k) => {
        const m = viz.reduce((s, q) => s + q[k], 0) / 4;
        return v + (v - m) * 0.9;
      });
      pm.set(i, j, tom(out.map((v) => Math.max(0, Math.min(255, v))), brilho));
    }
  }
  return pm;
}
