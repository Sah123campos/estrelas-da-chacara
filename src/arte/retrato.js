// Retrato (busto 64x64) em pixel art: usado nos diálogos, no camarim e no HUD.
// Se o jogador tiver foto, o rosto da FOTO entra no lugar do rosto desenhado,
// e o cabelo, chapéu, óculos, brincos e a roupa são desenhados por cima/em volta.
import { Pixmap, rgb, misturar, escurecer, clarear, hash } from "./pixel.js";
import { corTecido } from "./tecido.js";
import { pecaDe } from "../dados/guardaroupa.js";
import { dentroRosto, RETRATO } from "../rosto/rosto.js";

const N = RETRATO;
const U = (x) => (x + 0.5 - 32) / 15;
const V = (y) => (y + 0.5 - 29) / 17;
const elipse = (u, v, cu, cv, ru, rv) => ((u - cu) / ru) ** 2 + ((v - cv) / rv) ** 2 <= 1;
const linhaCabelo = (u) => -0.46 + 0.32 * u * u;

// ---------- forma do cabelo ----------
// Devolve "F" (frente), "T" (atrás) ou null para cada pixel.
function cabeloEm(est, u, v) {
  const cap = (r = 1.1) => elipse(u, v, 0, -0.06, r + 0.06, 1.16) && v < linhaCabelo(u);
  const lado = (ate, de = 0.84, ateU = 1.12) => Math.abs(u) > de && Math.abs(u) < ateU && v < ate && v > -0.7;
  switch (est) {
    case "careca":
      return null;
    case "curto":
      return cap() || lado(0.02) ? "F" : null;
    case "topete":
      return cap() || lado(0.02) || elipse(u, v, 0.08, -1.05, 0.72, 0.32) ? "F" : null;
    case "lateral":
      return cap() || lado(0.02) || (v < -0.16 && u > -0.32 && v < linhaCabelo(u) + 0.3 - (u + 0.32) * 0.18 && elipse(u, v, 0, -0.1, 1.1, 1.04)) ? "F" : null;
    case "pixie":
      return cap(1.06) || lado(-0.05) || (v < -0.1 && u < 0.45 && v < -0.1 - (u + 1) * 0.08 && elipse(u, v, 0, -0.1, 1.06, 1.04)) ? "F" : null;
    case "raspado":
      return cap(1.02) || lado(-0.2, 0.86, 1.02) ? "R" : null;
    case "moicano":
      if (Math.abs(u) < 0.24 && v < linhaCabelo(u) && (v > -1.35 || elipse(u, v, 0, -1.35, 0.24, 0.12))) return "F";
      return cap(1.02) ? "R" : null;
    case "cacheado": {
      const a = Math.atan2(v + 0.1, u);
      const r = 1.2 + 0.07 * Math.sin(a * 11);
      return (elipse(u, v, 0, -0.12, r, r * 0.95) && v < linhaCabelo(u) + 0.04) || lado(0.1, 0.82, 1.2) ? "F" : null;
    }
    case "black":
      if (elipse(u, v, 0, -0.38, 1.62, 1.2)) return v < linhaCabelo(u) ? "F" : "T";
      return null;
    case "dreads":
      if (cap(1.12) || lado(0.1)) return "F";
      if (Math.abs(u) > 0.62 && Math.abs(u) < 1.3 && v > -0.4 && v < 2.5) return "T";
      return null;
    case "chanel":
      if (cap(1.14) || lado(0.78, 0.8, 1.2)) return "F";
      if (v < -0.22 && v > -1 && elipse(u, v, 0, -0.1, 1.14, 1.04)) return "F";
      return null;
    case "longo":
    case "ondas":
    case "cachos_longos": {
      const larg = est === "cachos_longos" ? 1.42 : 1.2;
      const w = est === "ondas" ? 0.07 * Math.sin(v * 7) : est === "cachos_longos" ? 0.06 * Math.sin(v * 13) : 0;
      if (cap(est === "cachos_longos" ? 1.22 : 1.12)) return "F";
      if (est === "ondas" && v < -0.05 && u < -0.1 && v < linhaCabelo(u) + 0.42 + u * 0.25 && elipse(u, v, 0, -0.1, 1.12, 1.04)) return "F";
      const au = Math.abs(u) + w;
      if (au > 0.8 && au < larg && v < 0.75 && v > -0.75 + (larg - au) * 0) return elipse(u, v, 0, -0.06, larg + 0.05, 1.16) || v > -0.2 ? "F" : null;
      if (au > 0.8 && au < larg + 0.1 - (v - 0.75) * 0.08 && v >= 0.75 && v < 2.35) return "F";
      if (au <= 0.8 && v > 0 && v < 1.2) return "T";
      return null;
    }
    case "rabo":
      if (cap(1.04) || lado(-0.08)) return "F";
      if (elipse(u, v, 1.08, 0.25, 0.22, 0.7)) return "T";
      return null;
    case "coque":
      if (cap(1.04) || lado(-0.08) || elipse(u, v, 0, -1.2, 0.44, 0.3)) return "F";
      return null;
    case "tranca": {
      if (cap(1.08) || lado(0.1)) return "F";
      const cu = -0.95 + Math.max(0, v) * 0.12;
      if (v > 0 && v < 2.4 && Math.abs(u - cu) < 0.2 - v * 0.02) return "B";
      return null;
    }
    case "maria":
      if (cap(1.06) || lado(-0.05)) return "F";
      if (elipse(u, v, -1.32, 0.45, 0.28, 0.75) || elipse(u, v, 1.32, 0.45, 0.28, 0.75)) return "T";
      return null;
    default:
      return cap() ? "F" : null;
  }
}

class PintorRetrato {
  constructor(ap, extra) {
    this.ap = ap;
    this.pm = new Pixmap(N, N);
    this.pele = rgb(ap.pele || "#e0ac83");
    this.foto = extra?.fotoRetrato && ap.foto?.usar ? extra.fotoRetrato : null;
    this.p = (s) => pecaDe(ap, s);
    this.f = ap.genero === "f";
    this.fase = extra?.fase || 0;
  }

  s(x, y, c) {
    this.pm.set(x, y, c);
  }

  corCabelo(x, y, u, v, tipo) {
    const ap = this.ap;
    let c = rgb(ap.corCabelo || "#2e1c12");
    if (ap.corMechas && (x + Math.floor(y / 3)) % 6 < 2) c = rgb(ap.corMechas);
    const est = ap.cabelo;
    const cacho = est === "cacheado" || est === "black" || est === "cachos_longos";
    if (cacho) {
      const h = hash(x >> 1, y >> 1, 7);
      if (h > 0.7) c = clarear(c, 0.22);
      else if (h < 0.25) c = escurecer(c, 0.2);
    } else {
      if ((x + Math.floor(y / 4)) % 4 === 0) c = escurecer(c, 0.12);
      // brilho em faixa
      if (v > -1.05 && v < -0.88 && u > -0.65 && u < 0.15) c = clarear(c, 0.2);
    }
    if (est === "dreads" && x % 3 === 0) c = escurecer(c, 0.25);
    if (tipo === "B") c = (y % 4 < 2) !== (x % 2 === 0) ? c : escurecer(c, 0.25);
    if (tipo === "T") c = escurecer(c, 0.2);
    if (Math.abs(u) > 0.95 && v > -0.4) c = escurecer(c, 0.1);
    return c;
  }

  cabelo(camada) {
    const est = this.ap.cabelo || "curto";
    if (est === "careca") return;
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const u = U(x);
        const v = V(y);
        const t = cabeloEm(est, u, v);
        if (!t) continue;
        if (camada === "T" && t !== "T") continue;
        if (camada === "F" && t === "T") continue;
        if (t === "R") {
          this.s(x, y, misturar(this.pele, rgb(this.ap.corCabelo || "#2e1c12"), 0.5 + (hash(x, y) < 0.3 ? 0.15 : 0)));
          continue;
        }
        this.s(x, y, this.corCabelo(x, y, u, v, t));
      }
    }
    if (camada === "F") {
      if (est === "rabo" || est === "coque") this.s(est === "coque" ? 32 : 47, est === "coque" ? 0 : 20, "#e05a9c");
      if (est === "maria") { for (const x of [10, 11, 52, 53]) this.s(x, 22, "#e05a9c"); }
      if (est === "lateral") for (let y = 12; y < 18; y++) this.s(27, y, escurecer(rgb(this.ap.corCabelo), 0.3));
    }
  }

  // ---------- corpo e roupa ----------
  tronco() {
    const f = this.f;
    const porte = this.ap.porte ?? 1;
    const largTopo = (f ? 19 : 22) + (porte - 1) * 3;
    const largBase = largTopo + 6;
    this.limites = (y) => {
      if (y < 50) return null;
      const k = Math.min(1, (y - 50) / 8);
      const w = largTopo + (largBase - largTopo) * k;
      // ombros arredondados
      const corte = y < 53 ? (53 - y) * 1.6 : 0;
      return [Math.round(32 - w + corte), Math.round(31 + w - corte)];
    };
    // pescoço
    for (let y = 42; y < 53; y++) for (let x = 26; x <= 37; x++) this.s(x, y, x > 34 ? escurecer(this.pele, 0.16) : y < 46 ? escurecer(this.pele, 0.2) : this.pele);
    const vest = this.p("vestido");
    const top = vest || this.p("cima");
    const cas = this.p("casaco");
    for (let y = 50; y < N; y++) {
      const [a, b] = this.limites(y);
      for (let x = a; x <= b; x++) {
        let c = top ? corTecido(top, x, y, 2, this.fase) : this.pele;
        c = this.decote(top, x, y, c);
        if (x <= a + 1) c = clarear(c, 0.1);
        if (x >= b - 2) c = escurecer(c, 0.18);
        this.s(x, y, c);
      }
    }
    if (top && !vest) this.detalhesCima(top);
    if (vest) this.detalhesCima(vest);
    if (cas) this.casaco(cas);
    this.pescoco();
  }

  decote(top, x, y, c) {
    if (!top) return c;
    const gola = top.gola || "redonda";
    const pele = this.pele;
    const dx = Math.abs(x + 0.5 - 32);
    if (gola === "v" && y < 60 && dx < (60 - y) * 0.7) return pele;
    if (gola === "tomara" && y < 55) return pele;
    if (gola === "frenteunica" && y < 57 && dx > 7 + (y - 50) * 1.2) return pele;
    if (gola === "canoa" && y < 52 + (dx < 12 ? 1 : 0) && dx < 16) return pele;
    if (gola === "redonda" && y < 51 + (dx < 5 ? 2 : 0) && dx < 7) return pele;
    if ((gola === "social" || gola === "polo") && y < 51 && dx < 5) return pele;
    return c;
  }

  detalhesCima(top) {
    const gola = top.gola;
    const base = rgb(top.cor);
    if (gola === "social" || gola === "polo") {
      const claro = clarear(base, 0.3);
      for (let k = 0; k < 6; k++) {
        for (let i = 0; i <= k / 1.6; i++) {
          this.s(26 + i + Math.floor(k / 2), 49 + k, k === 5 ? escurecer(base, 0.2) : claro);
          this.s(37 - i - Math.floor(k / 2), 49 + k, k === 5 ? escurecer(base, 0.3) : clarear(base, 0.15));
        }
      }
      const fim = gola === "polo" ? 58 : 63;
      for (let y = 55; y <= fim; y++) this.s(32, y, escurecer(base, 0.12));
      for (let y = 56; y <= fim; y += 3) this.s(31, y, clarear(base, 0.5));
    }
    if (gola === "alta") for (let y = 40; y < 51; y++) for (let x = 25; x <= 38; x++) this.s(x, y, escurecer(corTecido(top, x, y, 2, this.fase), y % 2 ? 0 : 0.08));
    if (gola === "frenteunica") for (let y = 44; y < 51; y++) for (let x = 27; x <= 36; x++) this.s(x, y, corTecido(top, x, y, 2, this.fase));
    if (gola === "tomara") for (let x = 0; x < N; x++) { const l = this.limites(55); if (l && x >= l[0] && x <= l[1]) this.s(x, 55, clarear(base, 0.2)); }
  }

  casaco(cas) {
    const lap = rgb(cas.lapelaCor || escurecer(rgb(cas.cor), 0.12));
    const aberto = cas.comprimento === "cintura" || cas.lapela === "nenhuma";
    const temLapela = cas.lapela && cas.lapela !== "nenhuma";
    for (let y = 50; y < N; y++) {
      const [a, b] = this.limites(y);
      const meio = aberto ? 3 : Math.max(0, (63 - y) * 0.55);
      for (let x = a; x <= b; x++) {
        const dx = Math.abs(x + 0.5 - 32);
        if (dx < meio + (aberto ? 0 : 0.5)) continue;
        let c = corTecido(cas, x, y, 2, this.fase);
        if (temLapela && dx < meio + 4 + (cas.lapela === "pico" && y > 53 && y < 57 ? 3 : 0) && y < 62) c = cas.lapela === "xale" ? clarear(lap, 0.06 + (dx - meio < 1 ? 0.12 : 0)) : lap;
        if (x <= a + 1) c = clarear(c, 0.1);
        if (x >= b - 2) c = escurecer(c, 0.2);
        this.s(x, y, c);
      }
    }
    if (temLapela && cas.grupo === "gala") {
      for (let x = 45; x <= 48; x++) this.s(x, 58, "#f4f4f0");
      this.s(46, 57, "#f4f4f0");
      this.s(47, 57, "#ffffff");
    }
    if (!aberto) this.s(32, 62, clarear(lap, 0.5));
  }

  pescoco() {
    const n = this.p("pescoco");
    if (!n) return;
    const c = rgb(n.cor);
    const s = (x, y, cc = c) => this.s(x, y, cc);
    switch (n.tipo) {
      case "borboleta":
        for (let j = -2; j <= 2; j++) for (let i = 1; i <= 5; i++) if (Math.abs(j) <= Math.ceil(i * 0.6)) { s(32 + i, 51 + j, i === 5 ? escurecer(c, 0.2) : c); s(31 - i, 51 + j, i === 1 ? clarear(c, 0.15) : c); }
        for (let j = -1; j <= 1; j++) { s(31, 51 + j, escurecer(c, 0.3)); s(32, 51 + j, escurecer(c, 0.3)); }
        break;
      case "gravata":
        for (let y = 50; y < N; y++) {
          const w = y < 53 ? 1 : 2 + Math.min(1, (y - 53) / 6);
          for (let x = Math.round(31.5 - w); x <= Math.round(31.5 + w); x++) s(x, y, x > 32 ? escurecer(c, 0.2) : (x + y) % 5 === 0 ? clarear(c, 0.2) : c);
        }
        break;
      case "lenco":
        for (let x = 24; x <= 39; x++) { s(x, 49); s(x, 50, escurecer(c, 0.1)); }
        for (let y = 51; y < 57; y++) for (let x = 29; x <= 34 - (y - 51) * 0.6; x++) s(x, y, (x + y) % 3 ? c : clarear(c, 0.25));
        break;
      case "perolas":
        for (let k = 0; k <= 16; k++) {
          const a = (k / 16) * Math.PI;
          const x = Math.round(32 - Math.cos(a) * 9);
          const y = Math.round(50 + Math.sin(a) * 5);
          s(x, y, clarear(c, 0.15));
          s(x + 1, y, escurecer(c, 0.15));
        }
        break;
      case "corrente":
      case "medalha":
        for (let k = 0; k <= 20; k++) {
          const a = (k / 20) * Math.PI;
          s(Math.round(32 - Math.cos(a) * 8), Math.round(49 + Math.sin(a) * 7), k % 2 ? c : clarear(c, 0.35));
        }
        if (n.tipo === "medalha") for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (i * i + j * j <= 5) s(32 + i, 58 + j, i + j < 0 ? clarear(c, 0.3) : c);
        break;
      case "gargantilha":
        for (let x = 26; x <= 37; x++) { s(x, 46); s(x, 47, escurecer(c, 0.2)); }
        s(31, 48, "#dff4ff");
        break;
      case "estola":
        for (let y = 48; y < 58; y++) {
          const l = this.limites(Math.max(50, y));
          if (!l) continue;
          for (let x = l[0] - 2; x <= l[1] + 2; x++) {
            const dx = Math.abs(x + 0.5 - 32);
            if (dx < 9 - (y - 48) * 0.3 && y > 49) continue;
            if (y < 51 && dx > 22) continue;
            this.s(x, y, hash(x, y, 2) > 0.45 ? c : escurecer(c, 0.12));
          }
        }
        break;
    }
  }

  // ---------- cabeça ----------
  cabeca() {
    const pele = this.pele;
    const formato = this.ap.formato || "oval";
    // orelhas
    for (const cx of [16, 47]) for (let y = 26; y <= 35; y++) for (let x = cx - 2; x <= cx + 2; x++) if (((x - cx) / 2.4) ** 2 + ((y - 30.5) / 4.6) ** 2 <= 1) this.s(x, y, cx < 32 ? escurecer(pele, 0.06) : escurecer(pele, 0.2));
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (!dentroRosto(x, y, formato)) continue;
        let c = pele;
        const u = U(x);
        const v = V(y);
        if (u > 0.55) c = escurecer(pele, 0.1 + (u - 0.55) * 0.3);
        if (u < -0.6) c = clarear(pele, 0.06);
        if (v > 0.8) c = escurecer(c, 0.08);
        this.s(x, y, c);
      }
    }
    if (this.foto) {
      const fr = this.foto;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const c = fr.get(x, y);
        if (c && dentroRosto(x, y, formato)) this.s(x, y, c);
      }
      return;
    }
    this.rosto();
  }

  rosto() {
    const ap = this.ap;
    const pele = this.pele;
    const marcas = new Set(ap.marcas || []);
    const olho = rgb(ap.corOlhos || "#4a2e1b");
    const pupila = misturar(olho, "#0c0608", 0.7);
    const branco = [250, 247, 242, 255];
    const contorno = misturar(rgb(ap.corCabelo || "#2e1c12"), "#120a0e", 0.5);
    const s = (x, y, c) => this.s(x, y, c);
    const tipo = ap.olhos || "redondo";
    const sombra = ap.sombra && ap.sombra !== "nenhuma" ? rgb(ap.sombra) : null;
    const desenhaOlho = (cx, d) => {
      // cx = centro do olho; d = -1 (esquerdo da tela) ou 1
      const y0 = 27;
      if (sombra) for (let i = -3; i <= 3; i++) { s(cx + i, y0 - 1, misturar(pele, sombra, 0.55)); s(cx + i, y0 - 2, misturar(pele, sombra, 0.3)); }
      if (tipo === "sorridente") {
        for (let i = -3; i <= 3; i++) s(cx + i, y0 + 2 - (Math.abs(i) < 2 ? 1 : 0) - (i === 0 ? 1 : 0), contorno);
        return;
      }
      const alto = tipo === "grande" ? 4 : tipo === "sonolento" ? 2 : tipo === "amendoa" ? 3 : 3;
      const larg = tipo === "amendoa" ? 4 : 3;
      for (let j = 0; j < alto; j++) {
        const w = j === 0 || j === alto - 1 ? larg - 1 : larg;
        for (let i = -w; i <= w; i++) s(cx + i, y0 + j, branco);
      }
      // íris + pupila + brilho
      for (let j = 0; j < alto; j++) for (let i = -1; i <= 1; i++) s(cx + i, y0 + j, j === 0 ? escurecer(olho, 0.2) : olho);
      s(cx, y0 + Math.floor(alto / 2), pupila);
      s(cx + (alto > 2 ? 0 : 1), y0 + Math.floor(alto / 2) - (alto > 3 ? 1 : 0), pupila);
      s(cx - 1, y0, [255, 255, 255, 255]);
      // pálpebra e cílios
      for (let i = -larg; i <= larg; i++) s(cx + i, y0 - 1, contorno);
      if (tipo === "sonolento") for (let i = -larg; i <= larg; i++) s(cx + i, y0, escurecer(pele, 0.25));
      if (marcas.has("cilios") || marcas.has("delineado")) {
        s(cx + d * (larg + 1), y0 - 1, contorno);
        s(cx + d * (larg + 1), y0 - 2, contorno);
        if (marcas.has("delineado")) s(cx + d * (larg + 2), y0 - 3, contorno);
      }
      s(cx - larg + (d > 0 ? 0 : 1), y0 + alto, escurecer(pele, 0.12));
    };
    desenhaOlho(25, -1);
    desenhaOlho(38, 1);
    // sobrancelhas
    const tipoS = ap.sobrancelha || "natural";
    const sob = misturar(rgb(ap.corCabelo || "#2e1c12"), "#100808", 0.2);
    for (const [cx, d] of [[25, -1], [38, 1]]) {
      for (let i = -4; i <= 4; i++) {
        const k = i * d; // positivo = lado de fora
        let y = 23;
        if (tipoS === "arqueada") y = 23 - (Math.abs(k - 1) < 2 ? 1 : 0) + (k > 3 ? 1 : 0);
        else if (k > 2) y = 24;
        if (tipoS === "fina" && Math.abs(i) > 3) continue;
        s(cx + i, y, tipoS === "fina" ? misturar(sob, pele, 0.3) : sob);
        if (tipoS === "grossa" || (tipoS === "natural" && k < 1)) s(cx + i, y + 1, misturar(sob, pele, tipoS === "grossa" ? 0 : 0.5));
      }
    }
    // nariz
    const nariz = ap.nariz || "pequeno";
    const ns = escurecer(pele, 0.2);
    for (let y = 29; y <= 33; y++) s(34, y, escurecer(pele, 0.08));
    const nl = nariz === "largo" ? 4 : nariz === "medio" ? 3 : 2;
    for (let i = -nl; i <= nl; i++) s(32 + i, 34, Math.abs(i) === nl ? ns : escurecer(pele, 0.1));
    s(31 - nl + 1, 33, ns);
    s(32 + nl, 33, ns);
    s(31, 32, clarear(pele, 0.15));
    // bochechas e marcas
    if (marcas.has("blush")) for (const cx of [21, 42]) for (let i = -2; i <= 2; i++) for (let j = 0; j < 2; j++) s(cx + i, 33 + j, misturar(pele, "#f06a7a", 0.35));
    if (marcas.has("sardas")) for (const [x, y] of [[20, 31], [22, 32], [24, 31], [21, 33], [39, 31], [41, 32], [43, 31], [42, 33], [30, 31], [33, 31]]) s(x, y, escurecer(pele, 0.22));
    if (marcas.has("pinta")) s(41, 37, "#2a1414");
    // boca
    const batom = ap.batom && ap.batom !== "nenhum" ? rgb(ap.batom) : null;
    const labio = batom || misturar(pele, "#b0485a", 0.38);
    const linha = batom ? escurecer(batom, 0.35) : escurecer(pele, 0.45);
    const boca = ap.boca || "sorriso";
    const y0 = 38;
    if (boca === "risada") {
      for (let i = -5; i <= 5; i++) s(32 + i - 1 + 1, y0, linha);
      for (let i = -4; i <= 4; i++) { s(31 + i + 1, y0 + 1, i > -4 && i < 4 ? branco : linha); s(31 + i + 1, y0 + 2, linha); }
      for (let i = -3; i <= 3; i++) s(31 + i + 1, y0 + 3, labio);
    } else if (boca === "biquinho") {
      for (let i = -2; i <= 2; i++) { s(32 + i, y0, labio); s(32 + i, y0 + 1, i === 0 ? linha : labio); s(32 + i, y0 + 2, clarear(labio, 0.1)); }
    } else if (boca === "canto") {
      for (let i = -4; i <= 4; i++) s(32 + i, y0 + (i > 1 ? -1 : 0) + (i < -2 ? 0 : 0), linha);
      for (let i = -3; i <= 2; i++) s(32 + i, y0 + 1, labio);
    } else if (boca === "neutra") {
      for (let i = -3; i <= 3; i++) { s(32 + i, y0, linha); s(32 + i, y0 + 1, labio); }
    } else {
      s(27, y0 - 1, linha); s(37, y0 - 1, linha);
      for (let i = -4; i <= 4; i++) s(32 + i, y0, linha);
      for (let i = -3; i <= 3; i++) s(32 + i, y0 + 1, labio);
      for (let i = -2; i <= 2; i++) s(32 + i, y0 + 2, escurecer(labio, 0.1));
    }
    if (batom) for (let i = -2; i <= 2; i++) s(32 + i, y0 - 1, labio);
    this.barba();
  }

  barba() {
    const b = this.ap.barba || "nenhuma";
    if (b === "nenhuma") return;
    const cor = rgb(this.ap.corCabelo || "#2e1c12");
    const formato = this.ap.formato || "oval";
    const s = (x, y, c = cor) => { if (dentroRosto(x, y, formato) || y > 44) this.s(x, y, c); };
    const textura = (x, y) => (hash(x, y, 11) > 0.6 ? clarear(cor, 0.15) : hash(x, y, 12) < 0.25 ? escurecer(cor, 0.2) : cor);
    if (b === "porfazer") {
      for (let y = 33; y < 47; y++) for (let x = 16; x < 48; x++) if (dentroRosto(x, y, formato) && (V(y) > 0.4 || Math.abs(U(x)) > 0.75) && !(y >= 37 && y <= 41 && Math.abs(x - 32) < 6) && hash(x, y, 3) > 0.45) this.s(x, y, misturar(this.pele, cor, 0.5));
      return;
    }
    if (b === "bigode" || b === "cavanhaque" || b === "cheia") for (let x = 26; x <= 38; x++) { s(x, 36, textura(x, 36)); if (Math.abs(x - 32) < 5) s(x, 35, textura(x, 35)); }
    if (b === "cavanhaque") for (let y = 41; y <= 46; y++) for (let x = 29; x <= 35; x++) s(x, y, textura(x, y));
    if (b === "cheia" || b === "costeleta") for (let y = 22; y <= 36; y++) for (let x = 16; x <= 47; x++) if (Math.abs(U(x)) > 0.82 && dentroRosto(x, y, formato)) s(x, y, textura(x, y));
    if (b === "cheia") for (let y = 34; y < 48; y++) for (let x = 15; x < 49; x++) {
      if (!(dentroRosto(x, y, formato) || (y > 44 && y < 48 && Math.abs(x - 32) < 10 - (y - 44) * 2))) continue;
      if (V(y) < 0.4 && Math.abs(U(x)) < 0.75) continue;
      if (y >= 37 && y <= 40 && Math.abs(x - 32) < 5) continue;
      this.s(x, y, textura(x, y));
    }
  }

  // ---------- acessórios ----------
  chapeu() {
    const ch = this.p("chapeu");
    if (!ch) return;
    const c = rgb(ch.cor);
    const c2 = rgb(ch.cor2 || escurecer(c, 0.3));
    const s = (x, y, cc = c) => this.s(x, y, cc);
    const ret = (x0, x1, y0, y1, fn) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s(x, y, typeof fn === "function" ? fn(x, y) : fn); };
    const sh = (x0, x1) => (x, y) => (x <= x0 + 1 ? clarear(c, 0.18) : x >= x1 - 2 ? escurecer(c, 0.25) : c);
    const apagaTopo = (y1) => { for (let y = 0; y <= y1; y++) for (let x = 0; x < N; x++) this.pm.apagar(x, y); };
    switch (ch.tipo) {
      case "fedora":
        apagaTopo(9);
        ret(19, 44, 2, 12, sh(19, 44));
        ret(22, 41, 2, 3, escurecer(c, 0.15));
        ret(19, 44, 10, 12, c2);
        ret(8, 55, 13, 15, (x) => (x < 12 || x > 51 ? escurecer(c, 0.15) : c));
        break;
      case "cartola":
        apagaTopo(10);
        ret(20, 43, 0, 12, sh(20, 43));
        ret(20, 43, 9, 11, c2);
        ret(12, 51, 13, 14, escurecer(c, 0.1));
        break;
      case "palha":
        apagaTopo(8);
        ret(19, 44, 3, 12, (x, y) => ((x + y) % 2 ? c : escurecer(c, 0.12)));
        ret(19, 44, 10, 12, c2);
        ret(2, 61, 13, 15, (x, y) => ((x + y) % 2 ? c : escurecer(c, 0.15)));
        break;
      case "cowboy":
        apagaTopo(8);
        ret(20, 43, 2, 12, sh(20, 43));
        ret(29, 34, 2, 4, escurecer(c, 0.3));
        ret(20, 43, 10, 12, c2);
        ret(6, 57, 13, 15, escurecer(c, 0.06));
        ret(3, 7, 9, 13, c);
        ret(56, 60, 9, 13, c);
        break;
      case "bone":
        apagaTopo(10);
        ret(16, 47, 4, 15, sh(16, 47));
        ret(30, 33, 4, 5, c2);
        ret(14, 49, 15, 17, escurecer(c, 0.25));
        break;
      case "boina":
        ret(13, 51, 6, 13, (x, y) => (y > 11 ? escurecer(c, 0.15) : x < 18 ? clarear(c, 0.12) : c));
        ret(38, 40, 3, 5, c);
        break;
      case "pamela":
        apagaTopo(8);
        ret(19, 44, 3, 12, sh(19, 44));
        ret(19, 44, 10, 12, c2);
        ret(0, 63, 13, 15, c);
        ret(0, 63, 16, 17, escurecer(c, 0.2));
        break;
      case "tiara":
        for (let x = 18; x <= 45; x++) s(x, 14 - Math.round(Math.sin(((x - 18) / 27) * Math.PI) * 3), x % 3 === 0 ? "#ffffff" : c);
        s(31, 10, "#8fd8ff"); s(32, 10, "#ffffff"); s(31, 9, "#ffffff");
        break;
      case "coroa":
        ret(19, 44, 5, 10, (x) => (x % 4 === 0 ? clarear(c, 0.3) : c));
        for (const x of [19, 25, 31, 32, 38, 44]) ret(x, x, 1, 4, c);
        s(32, 7, "#e05a5a"); s(25, 7, "#3a8aff"); s(38, 7, "#3aca6a");
        break;
      case "laco":
        ret(36, 41, 5, 10, c); ret(44, 49, 5, 10, c); ret(41, 44, 6, 9, escurecer(c, 0.25));
        break;
      case "flor":
        for (const [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0]]) ret(45 + dx - 1, 45 + dx + 1, 16 + dy - 1, 16 + dy + 1, c);
        ret(44, 46, 15, 17, "#f2d544");
        break;
      case "fone":
        for (let x = 15; x <= 48; x++) s(x, 10 - Math.round(Math.sin(((x - 15) / 33) * Math.PI) * 9), c);
        ret(11, 17, 25, 36, c); ret(46, 52, 25, 36, c);
        ret(12, 13, 26, 28, clarear(c, 0.3));
        break;
    }
  }

  oculos() {
    const o = this.p("oculos");
    if (!o) return;
    const f = rgb(o.cor);
    const l = o.lente ? rgb(o.lente) : null;
    const s = (x, y, c) => this.s(x, y, c);
    const tipo = o.tipo;
    for (const cx of [25, 38]) {
      for (let y = 23; y <= 33; y++) for (let x = cx - 7; x <= cx + 7; x++) {
        const dx = x + 0.5 - (cx + 0.5);
        const dy = y + 0.5 - 28.5;
        let dentro;
        let borda;
        if (tipo === "redondo") { const r = Math.hypot(dx / 5, dy / 4.6); dentro = r <= 1; borda = r > 0.78; }
        else if (tipo === "aviador") { const r = Math.hypot(dx / 5.4, (dy + (dy < 0 ? 0.6 : -0.4)) / (dy < 0 ? 3.6 : 4.8)); dentro = r <= 1; borda = r > 0.8; }
        else if (tipo === "gatinho") { const up = (cx < 32 ? -dx : dx) * 0.35; dentro = Math.abs(dx) <= 5.5 && dy >= -3.5 - Math.max(0, up) && dy <= 3; borda = dentro && (Math.abs(dx) > 4.5 || dy < -2.5 - Math.max(0, up) || dy > 2); }
        else if (tipo === "coracao") { const X = dx / 5; const Y = -(dy + 0.5) / 4.5; dentro = (X * X + Y * Y - 1) ** 3 - X * X * Y * Y * Y <= 0; borda = dentro && (X * X + Y * Y - 0.55) ** 3 - X * X * Y * Y * Y > 0; }
        else if (tipo === "estrela") { const a = Math.atan2(dy, dx); const r = Math.hypot(dx, dy); const R = 4 + 2.4 * Math.cos(5 * (a + Math.PI / 2)); dentro = r <= R; borda = r > R - 1.2; }
        else { dentro = Math.abs(dx) <= 5.5 && Math.abs(dy) <= 3.6; borda = Math.abs(dx) > 4.6 || Math.abs(dy) > 2.7; }
        if (!dentro) continue;
        if (borda) s(x, y, y < 27 ? clarear(f, 0.2) : f);
        else if (l) s(x, y, dx < -1 && dy < -0.5 ? clarear(l, 0.35) : l);
        else if ((x + y) % 7 === 0) s(x, y, misturar(this.pm.get(x, y) || this.pele, [255, 255, 255, 255], 0.35));
      }
    }
    for (let x = 30; x <= 33; x++) s(x, 27, f);
    for (let x = 14; x <= 19; x++) s(x, 27, f);
    for (let x = 44; x <= 49; x++) s(x, 27, f);
  }

  brincos() {
    const b = this.p("brinco");
    if (!b) return;
    const c = rgb(b.cor);
    for (const cx of [16, 47]) {
      if (b.tipo === "argola") for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; this.s(Math.round(cx + Math.cos(a) * 2), Math.round(38 + Math.sin(a) * 2.4), k < 6 ? escurecer(c, 0.15) : c); }
      else if (b.tipo === "pendente") { for (let y = 35; y < 42; y++) this.s(cx, y, c); this.s(cx, 42, clarear(c, 0.4)); this.s(cx - 1, 42, c); this.s(cx + 1, 42, c); this.s(cx, 43, c); }
      else { this.s(cx, 36, clarear(c, 0.3)); this.s(cx + 1, 36, c); this.s(cx, 37, c); this.s(cx + 1, 37, escurecer(c, 0.2)); }
    }
  }

  maoItem() {
    const it = this.p("mao");
    if (!it) return;
    const c = rgb(it.cor);
    const s = (x, y, cc = c) => this.s(x, y, cc);
    const ret = (x0, x1, y0, y1, fn) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) s(x, y, typeof fn === "function" ? fn(x, y) : fn); };
    // mão segurando o item no canto inferior direito
    const mao = () => ret(50, 56, 58, 63, (x) => (x > 54 ? escurecer(this.pele, 0.15) : this.pele));
    switch (it.tipo) {
      case "microfone":
        ret(52, 54, 46, 63, "#8a8a94");
        for (let y = 38; y < 47; y++) for (let x = 49; x <= 57; x++) if ((x - 53) ** 2 + (y - 42) ** 2 <= 17) s(x, y, (x + y) % 2 ? c : "#5a5a64");
        mao();
        break;
      case "camera":
        ret(40, 60, 44, 58, (x, y) => (y === 44 ? "#3a3a44" : c));
        for (let y = 46; y < 57; y++) for (let x = 42; x < 54; x++) if ((x - 48) ** 2 + (y - 51) ** 2 <= 20) s(x, y, (x - 48) ** 2 + (y - 51) ** 2 <= 6 ? "#5a8ad8" : "#3a3a44");
        ret(56, 58, 46, 47, "#d0202e");
        mao();
        break;
      case "estatueta":
        ret(51, 55, 59, 63, escurecer(c, 0.45));
        ret(52, 54, 40, 58, (x) => (x === 52 ? clarear(c, 0.35) : x === 54 ? escurecer(c, 0.2) : c));
        ret(51, 55, 44, 50, (x) => (x === 51 ? clarear(c, 0.3) : c));
        ret(52, 54, 37, 39, clarear(c, 0.2));
        mao();
        break;
      case "claquete":
        ret(44, 60, 46, 49, (x) => ((x >> 1) % 2 ? "#f4f4f0" : c));
        ret(44, 60, 50, 60, c);
        ret(46, 58, 53, 53, "#f4f4f0");
        ret(46, 58, 56, 56, "#f4f4f0");
        mao();
        break;
      case "pipoca":
        for (let y = 48; y < 63; y++) { const w = 7 - (y - 48) * 0.15; for (let x = Math.round(53 - w); x <= Math.round(53 + w); x++) s(x, y, ((x >> 1) % 2 ? "#f4f4f0" : c)); }
        for (let k = 0; k < 40; k++) { const x = 46 + Math.floor(hash(k, 1) * 15); const y = 42 + Math.floor(hash(k, 2) * 7); s(x, y, hash(k, 3) > 0.5 ? "#fff3c4" : "#ffe08a"); }
        break;
      case "bolsa":
        ret(46, 60, 54, 62, (x, y) => (y === 54 ? clarear(c, 0.3) : (x + y) % 4 === 0 ? clarear(c, 0.15) : c));
        ret(52, 54, 56, 57, "#f4f4f0");
        break;
      case "leque":
        for (let y = 40; y < 60; y++) for (let x = 40; x < 64; x++) { const dx = x - 52; const dy = y - 60; const r = Math.hypot(dx, dy); if (r < 18 && r > 3 && dy < 0 && Math.abs(dx) < -dy * 1.1) s(x, y, Math.floor(Math.atan2(dy, dx) * 6) % 2 ? c : clarear(c, 0.25)); }
        mao();
        break;
      case "buque":
        for (let k = 0; k < 9; k++) { const x = 48 + (k % 3) * 5; const y = 42 + Math.floor(k / 3) * 5; ret(x - 2, x + 2, y - 2, y + 2, k % 2 ? c : "#f4f4f0"); s(x, y, "#f2d544"); }
        ret(52, 54, 56, 63, "#2f7a46");
        break;
      case "violao":
        ret(42, 63, 50, 63, (x, y) => (Math.hypot(x - 52, y - 58) < 3 ? "#2a1a10" : (x + y) % 5 === 0 ? escurecer(c, 0.15) : c));
        ret(55, 57, 30, 50, "#3e2616");
        break;
      case "copo":
        ret(50, 57, 48, 62, (x, y) => (y < 51 ? "#f4f4f0" : x === 50 ? clarear(c, 0.3) : c));
        ret(55, 56, 40, 48, "#e05a9c");
        mao();
        break;
    }
  }

  desenhar() {
    this.cabelo("T");
    this.tronco();
    this.cabeca();
    this.cabelo("F");
    this.chapeu();
    this.oculos();
    this.brincos();
    this.maoItem();
    this.pm.contorno(0.6);
    return this.pm;
  }
}

export function desenharRetrato(ap, extra) {
  return new PintorRetrato(ap, extra).desenhar();
}

// Retrato do bebê João: cabeça grande e redonda, cachinhos, bochechas rosadas e macacãozinho.
export function desenharRetratoBebe(ap) {
  const pm = new Pixmap(N, N);
  const pele = rgb(ap.pele || "#a86a42");
  const cab = rgb(ap.corCabelo || "#1a1010");
  const roupa = rgb("#8ac4e8");
  // corpinho
  for (let y = 48; y < N; y++) for (let x = 8; x < 56; x++) {
    const w = 18 + (y - 48) * 0.9;
    if (Math.abs(x + 0.5 - 32) > w) continue;
    let c = (x + y) % 7 === 0 ? clarear(roupa, 0.25) : roupa;
    if (x + 0.5 - 32 > w - 3) c = escurecer(c, 0.2);
    pm.set(x, y, c);
  }
  for (let x = 24; x < 40; x++) { pm.set(x, 49, "#ffffff"); pm.set(x, 50, "#f0f0f0"); }
  for (const y of [55, 59]) { pm.set(31, y, "#f2d544"); pm.set(32, y, "#f2d544"); }
  // orelhas
  for (const cx of [11, 52]) for (let y = 26; y < 36; y++) for (let x = cx - 3; x <= cx + 3; x++) if (((x - cx) / 3) ** 2 + ((y - 31) / 5) ** 2 <= 1) pm.set(x, y, escurecer(pele, cx < 32 ? 0.05 : 0.18));
  // cabeça
  for (let y = 4; y < 52; y++) for (let x = 8; x < 56; x++) {
    const nx = (x + 0.5 - 32) / 21;
    const ny = (y + 0.5 - 28) / 22;
    if (nx * nx + ny * ny > 1) continue;
    let c = pele;
    if (nx > 0.5) c = escurecer(pele, 0.08 + (nx - 0.5) * 0.3);
    if (nx < -0.6) c = clarear(pele, 0.06);
    pm.set(x, y, c);
  }
  // cachinhos
  for (let k = 0; k < 26; k++) {
    const a = Math.PI + (k / 25) * Math.PI;
    const cx = 32 + Math.cos(a) * (17 + (k % 3));
    const cy = 22 + Math.sin(a) * 15;
    for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 9) pm.set(cx + i, cy + j, i + j < -2 ? clarear(cab, 0.25) : (i + j) > 2 ? escurecer(cab, 0.2) : cab);
  }
  // olhos grandes
  const olho = misturar(rgb(ap.corOlhos || "#2a1a10"), "#0a0608", 0.4);
  for (const cx of [24, 40]) {
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) if (i * i + j * j * 1.1 <= 17) pm.set(cx + i, 30 + j, i * i + j * j <= 7 ? olho : [250, 247, 242, 255]);
    pm.set(cx - 1, 28, [255, 255, 255, 255]); pm.set(cx - 2, 28, [255, 255, 255, 255]); pm.set(cx - 1, 27, [255, 255, 255, 255]);
    for (let i = -4; i <= 4; i++) pm.set(cx + i, 25, escurecer(pele, 0.45));
  }
  // bochechas, nariz e boca aberta (falando)
  for (const cx of [18, 46]) for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) if (i * i / 9 + j * j / 4 <= 1) pm.set(cx + i, 38 + j, misturar(pele, "#f06a7a", 0.45));
  pm.set(31, 36, escurecer(pele, 0.25)); pm.set(33, 36, escurecer(pele, 0.25));
  for (let j = 0; j < 5; j++) for (let i = -4; i <= 4; i++) if (i * i / 16 + (j - 2) ** 2 / 6 <= 1) pm.set(32 + i, 40 + j, j > 2 ? "#e87a8a" : "#5a1a1a");
  pm.contorno(0.6);
  return pm;
}
