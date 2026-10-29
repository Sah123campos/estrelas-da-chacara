// Padrões de tecido em pixel art, usados no boneco (escala 1) e no retrato (escala 2+).
import { rgb, misturar, escurecer, clarear, hash } from "./pixel.js";

// Cor de uma peça no pixel (x, y). fase muda o brilho das lantejoulas entre quadros.
export function corTecido(peca, x, y, escala = 1, fase = 0) {
  const base = rgb(peca.cor || "#888888");
  const c2 = rgb(peca.cor2 || contraste(base));
  const X = Math.floor(x / escala);
  const Y = Math.floor(y / escala);
  switch (peca.padrao) {
    case "cetim":
      return (X + Y * 2) % 9 === 0 || (X + Y * 2) % 9 === 1 ? clarear(base, 0.22) : base;
    case "veludo":
      return (X + Y) % 2 === 0 && hash(X, Y, 3) < 0.5 ? escurecer(base, 0.14) : misturar(base, clarear(base, 0.3), hash(X, Y, 9) * 0.12);
    case "lantejoula": {
      const h = hash(X, Y, 17 + fase * 31);
      if (h > 0.84) return clarear(base, 0.55);
      if (h < 0.18) return escurecer(base, 0.22);
      return base;
    }
    case "metalico":
      return X % 4 === 0 ? clarear(base, 0.4) : X % 4 === 2 ? escurecer(base, 0.15) : base;
    case "listras":
      return Y % 3 === 0 ? c2 : base;
    case "riscagiz":
      return X % 3 === 0 ? misturar(base, c2, 0.45) : base;
    case "xadrez": {
      const a = X % 4 < 2;
      const b = Y % 4 < 2;
      if (a && b) return misturar(base, c2, 0.7);
      if (a || b) return misturar(base, c2, 0.32);
      return base;
    }
    case "poa":
      return (X + (Math.floor(Y / 2) % 2) * 2) % 4 === 0 && Y % 2 === 0 ? c2 : base;
    case "jeans":
      return (X + Y) % 3 === 0 ? clarear(base, 0.1) : (X - Y) % 5 === 0 ? escurecer(base, 0.1) : base;
    case "couro":
      return hash(X, Y, 5) > 0.88 ? clarear(base, 0.3) : base;
    case "trico":
      return Y % 2 === 0 && X % 2 === 0 ? escurecer(base, 0.16) : base;
    case "oncinha": {
      const k = (X * 7 + Y * 13 + (Y >> 1) * 3) % 11;
      if (k === 0) return c2;
      if (k === 1) return misturar(base, c2, 0.5);
      return base;
    }
    case "floral": {
      const k = (X * 5 + Y * 3) % 9;
      if (k === 0) return c2;
      if (k === 4 && (X + Y) % 2) return clarear(base, 0.3);
      return base;
    }
    case "estrelas": {
      const cx = ((X % 7) + 7) % 7;
      const cy = (((Y + (Math.floor(X / 7) % 2) * 3) % 7) + 7) % 7;
      const ESTRELA = ["..#..", ".###.", "#####", ".###.", ".#.#."];
      if (cx < 5 && cy < 5 && ESTRELA[cy][cx] === "#") return c2;
      return base;
    }
    default:
      return base;
  }
}

export function contraste(c) {
  c = rgb(c);
  const l = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
  return l > 140 ? escurecer(c, 0.55) : clarear(c, 0.55);
}

export function luminancia(c) {
  c = rgb(c);
  return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255;
}
