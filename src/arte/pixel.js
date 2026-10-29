// Ferramentas de pixel art: cores, ruído e Pixmap (imagem pequena editável pixel a pixel).
// Toda a arte do jogo é desenhada por código a partir destas funções.

export function criarCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// ---------- Cores (arrays [r, g, b, a]) ----------
const cacheCores = new Map();

export function rgb(entrada) {
  if (Array.isArray(entrada)) return entrada;
  if (cacheCores.has(entrada)) return cacheCores.get(entrada);
  let h = entrada.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  cacheCores.set(entrada, c);
  return c;
}

export function misturar(a, b, t) {
  a = rgb(a);
  b = rgb(b);
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    a[3] ?? 255,
  ];
}

// Sombras puxam para um roxo-azulado e luzes para um amarelo quente:
// isso dá mais vida que só escurecer/clarear em cinza.
const TOM_SOMBRA = [28, 16, 52, 255];
const TOM_LUZ = [255, 244, 214, 255];

export function escurecer(c, f = 0.25) {
  return misturar(c, TOM_SOMBRA, f);
}

export function clarear(c, f = 0.2) {
  return misturar(c, TOM_LUZ, f);
}

export function comAlfa(c, a) {
  c = rgb(c);
  return [c[0], c[1], c[2], Math.round(a * 255)];
}

export function css(c, alfa) {
  c = rgb(c);
  const a = alfa ?? (c[3] ?? 255) / 255;
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

// ---------- Aleatoriedade e ruído determinísticos ----------
export function semente(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 2147483647)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function suave(t) {
  return t * t * (3 - 2 * t);
}

export function ruido(x, y, escala = 8, s = 0) {
  const fx = x / escala;
  const fy = y / escala;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = suave(fx - x0);
  const ty = suave(fy - y0);
  const a = hash(x0, y0, s);
  const b = hash(x0 + 1, y0, s);
  const c = hash(x0, y0 + 1, s);
  const d = hash(x0 + 1, y0 + 1, s);
  return a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty;
}

export function fbm(x, y, escala = 16, s = 0, oitavas = 3) {
  let total = 0;
  let amp = 1;
  let soma = 0;
  for (let o = 0; o < oitavas; o++) {
    total += ruido(x, y, escala, s + o * 101) * amp;
    soma += amp;
    amp *= 0.5;
    escala /= 2;
  }
  return total / soma;
}

// Matriz de Bayer 4x4 (pontilhado clássico de pixel art), valores em [0, 1).
export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);

export function bayer(x, y) {
  return BAYER4[(y & 3) * 4 + (x & 3)];
}

// ---------- Pixmap ----------
export class Pixmap {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }

  dentro(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (!c || !this.dentro(x, y)) return;
    c = rgb(c);
    const i = (y * this.w + x) * 4;
    const a = c[3] ?? 255;
    if (a >= 255) {
      this.d[i] = c[0];
      this.d[i + 1] = c[1];
      this.d[i + 2] = c[2];
      this.d[i + 3] = 255;
    } else if (a > 0) {
      const t = a / 255;
      const base = this.d[i + 3] / 255;
      this.d[i] = this.d[i] * (1 - t) + c[0] * t;
      this.d[i + 1] = this.d[i + 1] * (1 - t) + c[1] * t;
      this.d[i + 2] = this.d[i + 2] * (1 - t) + c[2] * t;
      this.d[i + 3] = Math.min(255, (base + t * (1 - base)) * 255);
    }
  }

  get(x, y) {
    if (!this.dentro(x, y)) return null;
    const i = (y * this.w + x) * 4;
    if (this.d[i + 3] === 0) return null;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }

  apagar(x, y) {
    if (!this.dentro(x, y)) return;
    this.d[(y * this.w + x) * 4 + 3] = 0;
  }

  rect(x, y, w, h, c) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c);
  }

  // Elipse preenchida. corFn(x, y, nx, ny) permite sombrear por posição.
  elipse(cx, cy, rx, ry, cor) {
    const x0 = Math.floor(cx - rx);
    const x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry);
    const y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny <= 1) {
          this.set(x, y, typeof cor === "function" ? cor(x, y, nx, ny) : cor);
        }
      }
    }
  }

  linha(x0, y0, x1, y1, c, espessura = 1) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      for (let e = 0; e < espessura; e++) this.set(x0 + e, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  // Desenha uma máscara ASCII. mapa: { 'h': cor, ... }; '.' e ' ' são transparentes.
  mascara(linhas, mapa, dx = 0, dy = 0, espelhar = false) {
    for (let y = 0; y < linhas.length; y++) {
      const linha = linhas[y];
      for (let x = 0; x < linha.length; x++) {
        const ch = linha[x];
        if (ch === "." || ch === " ") continue;
        const c = mapa[ch];
        if (!c) continue;
        const px = espelhar ? linha.length - 1 - x : x;
        this.set(px + dx, y + dy, c);
      }
    }
  }

  // Contorno seletivo: cada pixel transparente vizinho de um opaco recebe
  // uma versão bem escura da cor vizinha (fica mais refinado que preto puro).
  contorno(forca = 0.62, incluirDiagonais = false) {
    const novos = [];
    const viz = incluirDiagonais
      ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.get(x, y)) continue;
        let escolhida = null;
        for (const [ox, oy] of viz) {
          const c = this.get(x + ox, y + oy);
          if (c && c[3] > 200) {
            // Prefere a cor de cima/lado (mais natural nas bordas inferiores).
            escolhida = c;
            if (oy !== 0) break;
          }
        }
        if (escolhida) novos.push([x, y, misturar(escolhida, [18, 10, 30, 255], forca)]);
      }
    }
    for (const [x, y, c] of novos) this.set(x, y, c);
    return this;
  }

  espelhado() {
    const p = new Pixmap(this.w, this.h);
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = (y * this.w + x) * 4;
        const j = (y * this.w + (this.w - 1 - x)) * 4;
        p.d[j] = this.d[i];
        p.d[j + 1] = this.d[i + 1];
        p.d[j + 2] = this.d[i + 2];
        p.d[j + 3] = this.d[i + 3];
      }
    }
    return p;
  }

  colar(outro, dx, dy) {
    for (let y = 0; y < outro.h; y++) {
      for (let x = 0; x < outro.w; x++) {
        const c = outro.get(x, y);
        if (c) this.set(x + dx, y + dy, c);
      }
    }
  }

  paraCanvas() {
    const c = criarCanvas(this.w, this.h);
    c.getContext("2d").putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    return c;
  }
}

// Desenha um canvas pequeno dentro de outro maior (para montar folhas de sprites).
export function colarCanvas(destino, origem, x, y) {
  destino.getContext("2d").drawImage(origem, x, y);
}
