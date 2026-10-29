// Gerador do boneco em pixel art (22x38), montado em camadas a partir da aparência:
// corpo (gênero, altura, porte, pele) → meias → calçado → parte de baixo / vestido →
// parte de cima → casaco → pescoço → luvas e pulso → cabeça (rosto desenhado ou a FOTO
// do jogador, reduzida para pixel art) → cabelo → chapéu → óculos → brincos → item na mão.
// Cada personagem vira uma folha com 4 direções × 8 quadros.
import { Pixmap, rgb, misturar, escurecer, clarear, hash, criarCanvas } from "./pixel.js";
import { corTecido } from "./tecido.js";
import { pecaDe } from "../dados/guardaroupa.js";

export const LARG = 22;
export const ALT = 38;
export const DIRECOES = ["baixo", "esq", "dir", "cima"];
// Colunas: 0-1 parado, 2-5 andando, 6 acenando, 7 sentado.
export const QUADROS = { parado: [0, 1], andar: [2, 3, 4, 5], acenar: [6], sentado: [7] };
const NQ = 8;
const espelhoX = (x) => LARG - 1 - x;

// ---------- Geometria do corpo ----------
// Cada parte é uma lista de faixas [y, x0, x1].
function geometria(ap, vista, q) {
  const andar = q >= 2 && q <= 5 ? q - 2 : -1;
  const sentado = q === 7;
  const respira = q === 1 ? 1 : 0;
  const bob = andar === 1 || andar === 3 ? -1 : 0;
  const f = ap.genero === "f";
  const porte = ap.porte ?? 1;
  const legLen = 7 + (ap.altura ?? 1);
  const baixar = sentado ? legLen - 4 : 0;
  const legTop = 36 - legLen + baixar;
  const hipTop = legTop - 2 + bob;
  const torsoTop = hipTop - 7 + respira;
  const neckY = torsoTop - 1;
  const Y = neckY - 11;
  const g = { Y, torsoTop, hipTop, legTop, legLen, neckY, f, porte, sentado, andar, vista, partes: {} };
  const P = g.partes;
  const add = (nome, y, x0, x1) => (P[nome] ||= []).push([y, Math.min(x0, x1), Math.max(x0, x1)]);

  if (vista === "lado") {
    // cabeça de perfil (olhando para a direita)
    const cab = [[8, 13], [7, 14], [6, 15], [6, 15], [6, 15], [6, 15], [6, 15], [6, 15], [6, 15], [7, 15], [8, 14]];
    cab.forEach(([a, b], r) => add("cabeca", Y + r, a, b));
    add("nariz", Y + 6, 16, 16);
    add("pescoco", neckY, 9, 11);
    const tx0 = 8 - (porte === 2 ? 1 : 0);
    const tx1 = 13 - (porte === 0 ? 1 : 0);
    for (let t = 0; t < 7; t++) {
      let a = tx0 + (t === 0 ? 1 : 0);
      let b = tx1 + (f && (t === 1 || t === 2) ? 1 : 0) - (t === 0 ? 1 : 0);
      add("tronco", torsoTop + t, a, b);
    }
    for (let h = 0; h < 2; h++) add("quadril", hipTop + h, tx0, tx1 + (f ? 1 : 0) - (h === 1 && !f ? 0 : 0));
    // braços: o da frente balança ao andar; o de trás fica mais escuro
    const balanco = andar === 0 ? 2 : andar === 2 ? -2 : 0;
    const bracoAcenar = q === 6;
    for (let r = 0; r < 6; r++) {
      const k = Math.round((balanco * r) / 6);
      add("bracoTras", torsoTop + 1 + r, 9 - k, 10 - k);
      if (bracoAcenar) {
        add("bracoFrente", torsoTop + 1 - r, 11 + Math.min(r, 2), 12 + Math.min(r, 2));
      } else add("bracoFrente", torsoTop + 1 + r, 10 + k, 11 + k);
    }
    const kf = balanco;
    if (bracoAcenar) {
      add("maoFrente", torsoTop - 5, 13, 14);
      add("maoFrente", torsoTop - 6, 13, 14);
    } else {
      add("maoFrente", torsoTop + 7, 10 + kf, 11 + kf);
      add("maoFrente", torsoTop + 8, 10 + kf, 11 + kf);
    }
    add("maoTras", torsoTop + 7, 9 - kf, 10 - kf);
    if (sentado) {
      // coxas para a frente, canelas para baixo
      for (let h = 0; h < 2; h++) add("pernaFrente", hipTop + 2 + h, 9, 15);
      for (let r = 0; r < 3; r++) add("pernaFrente", hipTop + 4 + r, 13, 15);
      g.pes = { frente: [13, hipTop + 7], tras: null };
    } else {
      const ab = andar === 0 ? 2 : andar === 2 ? -2 : 0;
      for (let r = 0; r < legLen; r++) {
        const k = Math.round((ab * (r + 1)) / legLen);
        add("pernaTras", legTop + r, 9 - k, 11 - k);
        add("pernaFrente", legTop + r, 9 + k, 11 + k);
      }
      g.pes = { frente: [9 + ab, 36], tras: [9 - ab, 36] };
    }
    return g;
  }

  // ---------- frente / costas ----------
  const forma = ap.formato || "oval";
  const cortes = {
    oval: [[7, 14], [6, 15], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [6, 15], [7, 14]],
    redondo: [[7, 14], [6, 15], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [6, 15]],
    quadrado: [[6, 15], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [6, 15]],
    coracao: [[6, 15], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [5, 16], [6, 15], [7, 14], [8, 13]],
  }[forma] || [];
  cortes.forEach(([a, b], r) => add("cabeca", Y + r, a, b));
  add("orelhaE", Y + 5, 4, 4);
  add("orelhaE", Y + 6, 4, 4);
  add("orelhaD", Y + 5, 17, 17);
  add("orelhaD", Y + 6, 17, 17);
  add("pescoco", neckY, 9, 12);

  const larg = f ? [7, 6, 6, 7, 7, 6, 6] : [6, 5, 5, 5, 5, 6, 6];
  const aj = porte === 0 ? 1 : porte === 2 ? -1 : 0;
  larg.forEach((x0, t) => {
    const a = Math.max(3, x0 + (t > 0 ? aj : 0));
    add("tronco", torsoTop + t, a, espelhoX(a));
  });
  const hx = Math.max(4, (f ? 6 : 6) + aj - (f && porte === 2 ? 1 : 0));
  for (let h = 0; h < 2; h++) add("quadril", hipTop + h, hx, espelhoX(hx));
  const ombro = Math.max(3, larg[1] + aj);
  const bx = ombro - 2;
  // braços (E = lado esquerdo da tela)
  const acenar = q === 6;
  const desceE = andar === 0 ? 1 : 0;
  const desceD = andar === 2 ? 1 : 0;
  for (let r = 0; r < 6; r++) {
    if (acenar) add("bracoE", torsoTop + 1 - r, bx - (r > 2 ? 1 : 0), bx + 1 - (r > 2 ? 1 : 0));
    else add("bracoE", torsoTop + 1 + r, bx, bx + 1);
    add("bracoD", torsoTop + 1 + r, espelhoX(bx + 1), espelhoX(bx));
  }
  if (acenar) {
    add("maoE", torsoTop - 5, bx - 2, bx);
    add("maoE", torsoTop - 6, bx - 2, bx);
  } else {
    add("maoE", torsoTop + 7 + desceE, bx, bx + 1);
    add("maoE", torsoTop + 8 + desceE, bx, bx + 1);
  }
  add("maoD", torsoTop + 7 + desceD, espelhoX(bx + 1), espelhoX(bx));
  add("maoD", torsoTop + 8 + desceD, espelhoX(bx + 1), espelhoX(bx));

  const lx0 = porte === 0 ? 8 : porte === 2 ? 6 : 7;
  if (sentado) {
    for (let r = 0; r < 4; r++) {
      add("pernaE", legTop + r, lx0, 10);
      add("pernaD", legTop + r, 11, espelhoX(lx0));
    }
    g.pes = { E: [lx0, legTop + 4], D: [11, legTop + 4] };
  } else {
    const sobeE = andar === 2 ? 1 : 0;
    const sobeD = andar === 0 ? 1 : 0;
    for (let r = 0; r < legLen - sobeE; r++) add("pernaE", legTop + r, lx0, 10);
    for (let r = 0; r < legLen - sobeD; r++) add("pernaD", legTop + r, 11, espelhoX(lx0));
    g.pes = { E: [lx0, 36 - sobeE], D: [11, 36 - sobeD] };
  }
  g.ombro = ombro;
  g.bx = bx;
  g.hx = hx;
  g.lx0 = lx0;
  return g;
}

// ---------- Pintura ----------
function sombrear(c, x, x0, x1, forte = 1) {
  if (x1 - x0 < 1) return c;
  if (x === x0) return clarear(c, 0.13 * forte);
  if (x === x1) return escurecer(c, 0.24 * forte);
  return c;
}

class Pintor {
  constructor(ap, vista, q, extra) {
    this.ap = ap;
    this.vista = vista; // frente | costas | lado
    this.q = q;
    this.pm = new Pixmap(LARG, ALT);
    this.g = geometria(ap, vista === "lado" ? "lado" : "frente", q);
    this.pele = rgb(ap.pele || "#e0ac83");
    this.fotoSprite = extra?.fotoSprite || null;
    this.fase = q;
    this.p = (slot) => pecaDe(ap, slot);
  }

  faixas(nome) {
    return this.g.partes[nome] || [];
  }

  pintar(nome, cor, { forte = 1, filtro } = {}) {
    for (const [y, x0, x1] of this.faixas(nome)) {
      for (let x = x0; x <= x1; x++) {
        if (filtro && !filtro(x, y)) continue;
        const c = typeof cor === "function" ? cor(x, y) : cor;
        if (c) this.pm.set(x, y, sombrear(c, x, x0, x1, forte));
      }
    }
  }

  tecido(peca) {
    return (x, y) => corTecido(peca, x, y, 1, this.fase);
  }

  get lado() {
    return this.vista === "lado";
  }
  get costas() {
    return this.vista === "costas";
  }

  // ---------- desenho completo ----------
  desenhar() {
    const g = this.g;
    const pele = this.pele;
    const peleSombra = escurecer(pele, 0.18);
    this.cabeloTras();
    // corpo
    if (this.lado) {
      this.pintar("bracoTras", peleSombra);
      this.pintar("maoTras", peleSombra);
      this.pintar("pernaTras", peleSombra);
    }
    for (const n of ["pernaE", "pernaD", "pernaFrente", "quadril", "tronco", "pescoco"]) this.pintar(n, pele);
    this.roupaBaixo();
    this.calcados();
    this.roupaCima();
    this.casaco();
    for (const n of this.lado ? ["bracoFrente"] : ["bracoE", "bracoD"]) this.braco(n);
    this.pescoco();
    this.maoItem();
    this.cabeca();
    this.cabeloFrente();
    this.chapeu();
    if (!this.costas) {
      this.oculos();
      this.brincos();
    }
    this.pm.contorno(0.66);
    return this.pm;
  }

  braco(nome) {
    const pele = this.pele;
    const top = this.ap.vestido !== "nenhum" ? this.p("vestido") : this.p("cima");
    const cas = this.p("casaco");
    const manga = cas && !cas.semMangas ? cas : top && top.manga !== "nenhuma" ? top : null;
    const comp = cas && !cas.semMangas ? 6 : top?.manga === "longa" ? 6 : top?.manga === "curta" ? 2 : 0;
    const faixas = this.faixas(nome);
    const ordem = [...faixas].sort((a, b) => (this.q === 6 && nome !== "bracoD" ? b[0] - a[0] : a[0] - b[0]));
    ordem.forEach(([y, x0, x1], i) => {
      for (let x = x0; x <= x1; x++) {
        let c = pele;
        if (manga && i < comp) c = corTecido(manga, x, y, 1, this.fase);
        this.pm.set(x, y, sombrear(c, x, x0, x1));
      }
    });
    // punho / relógio / luvas
    const maoNome = nome === "bracoE" ? "maoE" : nome === "bracoD" ? "maoD" : "maoFrente";
    const luva = this.p("luvas");
    const corMao = luva ? rgb(luva.cor) : pele;
    this.pintar(maoNome, corMao);
    if (luva?.longa) {
      ordem.slice(2).forEach(([y, x0, x1]) => {
        for (let x = x0; x <= x1; x++) this.pm.set(x, y, sombrear(corTecido(luva, x, y, 1, this.fase), x, x0, x1));
      });
    }
    const pulso = this.p("pulso");
    if (pulso && (nome === "bracoE" || nome === "bracoFrente") && this.q !== 6) {
      const ult = ordem[ordem.length - 1];
      if (ult) this.pm.set(ult[1], ult[0], pulso.id === "pulseiras" ? (this.fase % 2 ? "#e05a9c" : "#2a9dce") : pulso.cor);
    }
  }

  // ---------- parte de baixo ----------
  roupaBaixo() {
    const g = this.g;
    const meia = this.p("meia");
    const pernas = this.lado ? ["pernaTras", "pernaFrente"] : ["pernaE", "pernaD"];
    if (meia) {
      for (const n of pernas) {
        const fx = this.faixas(n);
        fx.forEach(([y, x0, x1], i) => {
          if (meia.curta && i < fx.length - 2) return;
          for (let x = x0; x <= x1; x++) {
            let c = corTecido(meia, x, y, 1, this.fase);
            if (meia.id === "arrastao") c = (x + y) % 2 ? rgb(meia.cor) : misturar(this.pele, meia.cor, 0.35);
            else if (!meia.curta && meia.id !== "meia_listrada") c = misturar(this.pele, c, 0.7);
            this.pm.set(x, y, sombrear(c, x, x0, x1));
          }
        });
      }
    }
    const vest = this.p("vestido");
    if (vest) {
      if (vest.forma === "macacao") this.calca(vest, "calca");
      else this.saia(vest);
      return;
    }
    const b = this.p("baixo");
    if (!b) return;
    if (b.tipo === "saia") this.saia(b);
    else this.calca(b, b.tipo);
  }

  calca(peca, tipo) {
    const g = this.g;
    const cor = this.tecido(peca);
    this.pintar("quadril", cor);
    const pernas = this.lado ? ["pernaTras", "pernaFrente"] : ["pernaE", "pernaD"];
    for (const n of pernas) {
      const fx = this.faixas(n);
      const lim = tipo === "bermuda" ? Math.ceil(fx.length * 0.45) : fx.length;
      fx.forEach(([y, x0, x1], i) => {
        if (i >= lim) return;
        let a = x0;
        let b = x1;
        if (peca.corte === "larga" && i > fx.length / 2) {
          if (this.lado) b += 1;
          else if (n === "pernaE") a -= 1;
          else b += 1;
        }
        for (let x = a; x <= b; x++) {
          let c = n === "pernaTras" ? escurecer(cor(x, y), 0.15) : cor(x, y);
          if (peca.faixa && !this.lado && (x === a || x === b) && (n === "pernaE" ? x === a : x === b)) c = rgb(peca.faixa);
          if (tipo === "bermuda" && i === lim - 1) c = escurecer(c, 0.12);
          this.pm.set(x, y, sombrear(c, x, a, b));
        }
      });
    }
    // vinco entre as pernas
    if (!this.lado && !this.costas && tipo !== "bermuda") {
      const yy = this.faixas("pernaE")[0]?.[0];
      if (yy !== undefined) this.pm.set(10, yy, escurecer(cor(10, yy), 0.25));
    }
  }

  saia(peca) {
    const g = this.g;
    const cor = this.tecido(peca);
    const hip = this.faixas("quadril");
    if (!hip.length) return;
    const y0 = hip[0][0];
    const comp = peca.comprimento || "midi";
    let fim;
    if (g.sentado) fim = y0 + (comp === "mini" ? 2 : comp === "midi" ? 4 : 6);
    else fim = comp === "mini" ? g.legTop + 2 : comp === "midi" ? g.legTop + g.legLen - 3 : 36;
    const forma = peca.forma || "reta";
    const [, hx0, hx1] = hip[0];
    const n = fim - y0;
    for (let y = y0; y <= fim; y++) {
      const k = y - y0;
      let abre = 0;
      if (forma === "evase") abre = Math.floor(k / 3);
      else if (forma === "baile") abre = Math.min(7, Math.floor(k / 1.4));
      else if (forma === "sereia") abre = k < n - 3 ? (k > 2 ? -1 : 0) : k - (n - 3);
      let a;
      let b;
      if (this.lado) {
        a = hx0 - Math.floor(abre * 0.5);
        b = hx1 + Math.ceil(abre * 0.6);
      } else {
        a = hx0 - abre;
        b = hx1 + abre;
      }
      a = Math.max(0, a);
      b = Math.min(LARG - 1, b);
      for (let x = a; x <= b; x++) {
        let c = cor(x, y);
        // pregas
        if ((forma === "evase" || forma === "baile") && k > 1 && (x - a) % 3 === 2) c = escurecer(c, 0.12);
        if (y === fim) c = escurecer(c, 0.16);
        this.pm.set(x, y, sombrear(c, x, a, b));
      }
    }
    this.fimSaia = fim;
  }

  // ---------- calçados ----------
  calcados() {
    const g = this.g;
    const c = this.p("calcado");
    const cor = c ? rgb(c.cor) : escurecer(this.pele, 0.1);
    const sola = c?.sola ? rgb(c.sola) : escurecer(cor, 0.35);
    const tipo = c?.tipo || "descalco";
    const brilho = clarear(cor, 0.45);
    const pe = (x0, y, larg, ladoDir, tras) => {
      const corP = tras ? escurecer(cor, 0.15) : cor;
      if (tipo === "salto") {
        // salto: peito do pé à mostra + salto fino
        this.pm.set(x0 + (ladoDir ? 0 : larg - 1), y, corP);
        for (let x = x0; x < x0 + larg; x++) this.pm.set(x, y + 1, corP);
        this.pm.set(ladoDir ? x0 : x0 + larg - 1, y, misturar(this.pele, corP, 0.2));
        this.pm.set(x0 + (ladoDir ? 1 : 0), y, brilho);
        return;
      }
      if (tipo === "chinelo" || tipo === "sandalia") {
        for (let x = x0; x < x0 + larg; x++) {
          this.pm.set(x, y, this.pele);
          this.pm.set(x, y + 1, tipo === "chinelo" ? corP : escurecer(this.pele, 0.1));
        }
        this.pm.set(x0 + (larg >> 1), y, corP);
        return;
      }
      if (tipo === "bota") {
        for (let x = x0; x < x0 + larg; x++) {
          this.pm.set(x, y - 2, corP);
          this.pm.set(x, y - 1, corP);
        }
      }
      for (let x = x0; x < x0 + larg; x++) {
        this.pm.set(x, y, corP);
        this.pm.set(x, y + 1, tipo === "tenis" ? sola : escurecer(corP, 0.2));
      }
      if (tipo === "social") this.pm.set(x0 + (ladoDir ? larg - 2 : 1), y, brilho);
      if (tipo === "tenis") this.pm.set(x0 + 1, y, misturar(cor, "#ffffff", 0.6));
    };
    if (this.lado) {
      if (g.pes.tras) pe(g.pes.tras[0], g.pes.tras[1], 4, true, true);
      pe(g.pes.frente[0], g.pes.frente[1], 4, true, false);
    } else {
      const lx0 = g.lx0;
      const w = 11 - lx0;
      pe(g.pes.E[0], g.pes.E[1], w, false, false);
      pe(g.pes.D[0], g.pes.D[1], w, true, false);
    }
  }

  // ---------- parte de cima ----------
  roupaCima() {
    const vest = this.p("vestido");
    const top = vest || this.p("cima");
    if (!top) return;
    const cor = this.tecido(top);
    const g = this.g;
    const pele = this.pele;
    const t0 = g.torsoTop;
    const gola = top.gola || "redonda";
    const centro = (x) => (this.lado ? x >= 13 : x >= 9 && x <= 12);
    this.pintar("tronco", (x, y) => {
      const t = y - t0;
      if (this.costas) {
        if ((gola === "tomara") && t === 0) return pele;
        if (gola === "frenteunica" && t <= 2 && !(x >= 9 && x <= 12 && t === 0)) return pele;
        return cor(x, y);
      }
      if (gola === "tomara" && t === 0) return pele;
      if (gola === "frenteunica" && t === 0 && !(x >= 9 && x <= 12)) return pele;
      if (gola === "frenteunica" && t === 1 && (x < 7 || x > 14)) return pele;
      if (gola === "canoa" && t === 0 && (this.lado || (x >= 7 && x <= 14))) return pele;
      if (gola === "v") {
        if (t === 0 && centro(x)) return pele;
        if (t === 1 && (this.lado ? x >= 14 : x >= 10 && x <= 11)) return pele;
      }
      return cor(x, y);
    });
    // camisas por fora cobrem o começo do quadril
    const porFora = !vest && (top.grupo === "casual" || top.grupo === "caipira") && this.p("baixo")?.tipo !== "saia";
    if (porFora) {
      const h = this.faixas("quadril")[0];
      if (h) for (let x = h[1]; x <= h[2]; x++) this.pm.set(x, h[0], sombrear(cor(x, h[0]), x, h[1], h[2]));
    }
    if (this.costas || this.lado) {
      if (gola === "alta") this.pintar("pescoco", cor);
      return;
    }
    // detalhes da frente
    const claro = clarear(rgb(top.cor), 0.35);
    if (gola === "social" || gola === "polo") {
      this.pm.set(9, t0, claro);
      this.pm.set(12, t0, claro);
      this.pm.set(10, t0, escurecer(rgb(top.cor), 0.1));
      this.pm.set(11, t0, escurecer(rgb(top.cor), 0.1));
      const vincos = gola === "polo" ? 2 : 6;
      for (let t = 1; t <= vincos; t++) if (t % 2 === 0 || gola === "social") this.pm.set(10, t0 + t, t % 2 ? escurecer(rgb(top.cor), 0.12) : claro);
    }
    if (gola === "alta") this.pintar("pescoco", cor);
    if (gola === "frenteunica") this.pm.set(10, t0 - 1, cor(10, t0));
  }

  casaco() {
    const cas = this.p("casaco");
    if (!cas) return;
    const g = this.g;
    const t0 = g.torsoTop;
    const cor = this.tecido(cas);
    const lap = rgb(cas.lapelaCor || escurecer(rgb(cas.cor), 0.12));
    const aberto = cas.comprimento === "cintura" || cas.lapela === "nenhuma";
    const temLapela = cas.lapela && cas.lapela !== "nenhuma";
    const vAberto = (x, t) => {
      if (this.lado) return t <= 2 && x >= 13;
      if (aberto) return x >= 10 && x <= 11 && (cas.lapela === "nenhuma" ? t <= 6 : true);
      const lim = [[8, 13], [9, 12], [9, 12], [10, 11]][t];
      return lim ? x >= lim[0] && x <= lim[1] : false;
    };
    this.pintar("tronco", (x, y) => {
      const t = y - t0;
      if (!this.costas && vAberto(x, t)) return null;
      return cor(x, y);
    });
    if (!this.costas && !this.lado && temLapela) {
      const marcar = (x, y) => this.pm.set(x, y, cas.lapela === "xale" ? clarear(lap, 0.08) : lap);
      for (let t = 0; t < 4; t++) {
        const lim = aberto ? [10, 11] : [[8, 13], [9, 12], [9, 12], [10, 11]][t];
        marcar(lim[0] - 1, t0 + t);
        marcar(lim[1] + 1, t0 + t);
      }
      if (cas.lapela === "pico") {
        marcar(6 + (g.porte === 0 ? 1 : 0), t0 + 1);
        marcar(15 - (g.porte === 0 ? 1 : 0), t0 + 1);
      }
      if (!aberto) {
        this.pm.set(10, t0 + 5, clarear(lap, 0.5));
      }
      // bolso com lenço
      if (cas.grupo === "gala") this.pm.set(14 - (g.porte === 0 ? 1 : 0), t0 + 2, "#f4f4f0");
    }
    if (this.lado && temLapela) this.pm.set(13, t0 + 2, lap);
    // comprimento
    const quadril = this.faixas("quadril");
    if (cas.comprimento !== "cintura") {
      for (const [y, x0, x1] of quadril) {
        for (let x = x0 - (this.lado ? 0 : 0); x <= x1; x++) {
          if (!this.costas && !this.lado && x >= 10 && x <= 11) continue;
          this.pm.set(x, y, sombrear(cor(x, y), x, x0, x1));
        }
      }
    }
    if (cas.comprimento === "joelho") {
      const y0 = quadril.length ? quadril[quadril.length - 1][0] + 1 : g.legTop;
      const n = g.sentado ? 2 : Math.floor(g.legLen / 2) + 1;
      const [, hx0, hx1] = quadril[0] || [0, 6, 15];
      for (let y = y0; y < y0 + n; y++) {
        const k = y - y0;
        const a = hx0 - (k > 1 ? 1 : 0);
        const b = hx1 + (k > 1 ? 1 : 0);
        for (let x = a; x <= b; x++) {
          if (!this.costas && !this.lado && x >= 9 + (k > 2 ? 0 : 1) && x <= 12 - (k > 2 ? 0 : 1)) continue;
          let c = cor(x, y);
          if (k === n - 1) c = escurecer(c, 0.14);
          this.pm.set(x, y, sombrear(c, x, a, b));
        }
      }
    }
  }

  pescoco() {
    const n = this.p("pescoco");
    if (!n || this.costas) {
      if (n?.tipo === "estola") this.estola(n);
      return;
    }
    const t0 = this.g.torsoTop;
    const c = rgb(n.cor);
    const L = this.lado;
    switch (n.tipo) {
      case "borboleta":
        if (L) this.pm.set(13, t0, c);
        else {
          this.pm.set(9, t0, c);
          this.pm.set(12, t0, c);
          this.pm.set(10, t0, escurecer(c, 0.2));
          this.pm.set(11, t0, escurecer(c, 0.2));
        }
        break;
      case "gravata":
        if (L) this.pm.set(13, t0 + 1, c);
        else {
          this.pm.set(10, t0, c);
          this.pm.set(11, t0, c);
          for (let t = 1; t <= 4; t++) this.pm.set(t % 2 ? 10 : 11, t0 + t, t === 4 ? escurecer(c, 0.15) : c);
          this.pm.set(10, t0 + 3, c);
          this.pm.set(11, t0 + 2, c);
        }
        break;
      case "lenco":
        if (L) {
          this.pm.set(12, t0, c);
          this.pm.set(13, t0, c);
        } else {
          for (let x = 8; x <= 13; x++) this.pm.set(x, t0, x === 10 || x === 11 ? escurecer(c, 0.15) : c);
          this.pm.set(10, t0 + 1, c);
          this.pm.set(11, t0 + 1, clarear(c, 0.2));
        }
        break;
      case "perolas":
        if (L) this.pm.set(13, t0 + 1, c);
        else for (let x = 8; x <= 13; x++) this.pm.set(x, t0 + (x === 8 || x === 13 ? 0 : 1), x % 2 ? c : clarear(c, 0.3));
        break;
      case "corrente":
      case "medalha":
        if (L) this.pm.set(13, t0 + 1, c);
        else {
          this.pm.set(9, t0, c);
          this.pm.set(12, t0, c);
          this.pm.set(10, t0 + 1, c);
          this.pm.set(11, t0 + 1, c);
          if (n.tipo === "medalha") {
            this.pm.set(10, t0 + 2, clarear(c, 0.3));
            this.pm.set(11, t0 + 2, c);
          }
        }
        break;
      case "gargantilha":
        this.pintar("pescoco", c);
        break;
      case "estola":
        this.estola(n);
        break;
    }
  }

  estola(n) {
    const t0 = this.g.torsoTop;
    const c = rgb(n.cor);
    const fx = this.faixas("tronco");
    for (const [y, x0, x1] of fx.slice(0, 2)) {
      for (let x = x0 - 1; x <= x1 + 1; x++) {
        if (!this.costas && !this.lado && x >= 9 && x <= 12 && y === t0 + 1) continue;
        this.pm.set(x, y, hash(x, y, 4) > 0.5 ? c : escurecer(c, 0.1));
      }
    }
    if (!this.costas && !this.lado) {
      for (let t = 2; t < 6; t++) {
        this.pm.set(this.g.bx + 1, t0 + t, c);
        this.pm.set(espelhoX(this.g.bx + 1), t0 + t, c);
      }
    }
  }

  // ---------- item na mão ----------
  maoItem() {
    const it = this.p("mao");
    if (!it || this.costas) return;
    const fx = this.faixas(this.lado ? "maoFrente" : "maoE");
    if (!fx.length) return;
    const [y, x0] = fx[fx.length - 1];
    const c = rgb(it.cor);
    const s = (dx, dy, cc) => this.pm.set(x0 + dx, y + dy, cc);
    const acima = this.q === 6;
    const by = acima ? -3 : 0;
    switch (it.tipo) {
      case "bolsa":
        for (let i = -1; i <= 1; i++) for (let j = 1; j <= 2; j++) s(i, j + by, j === 1 ? clarear(c, 0.25) : c);
        break;
      case "leque":
        for (let i = -2; i <= 1; i++) s(i, -1, i % 2 ? c : clarear(c, 0.3));
        s(-1, 0, c);
        s(0, 0, escurecer(c, 0.2));
        break;
      case "buque":
        s(0, 1, "#2f7a46");
        s(0, 2, "#2f7a46");
        s(-1, 0, c);
        s(1, 0, "#f2d544");
        s(0, -1, "#f4f4f0");
        s(0, 0, c);
        break;
      case "violao":
        if (this.lado) {
          for (let i = -2; i <= 1; i++) for (let j = -3; j <= -1; j++) s(i, j, c);
          s(2, -5, "#3e2616");
          s(3, -6, "#3e2616");
        } else {
          for (let i = 1; i <= 4; i++) for (let j = -3; j <= -1; j++) s(i, j, (i + j) % 3 ? c : escurecer(c, 0.15));
          s(3, -2, "#2a1a10");
          for (let k = 1; k <= 4; k++) s(4 + k, -3 - k, "#3e2616");
        }
        break;
      case "copo":
        s(0, -1, "#f4f4f0");
        s(0, 0, c);
        s(0, 1, c);
        s(1, -2, "#e05a9c");
        break;
      case "estatueta":
        s(0, -1 + by, clarear(c, 0.3));
        s(0, -2 + by, c);
        s(0, -3 + by, c);
        s(0, -4 + by, clarear(c, 0.4));
        s(0, 1 + by, escurecer(c, 0.4));
        break;
      case "claquete":
        for (let i = -1; i <= 2; i++) {
          s(i, -1, (i % 2 ? "#f4f4f0" : c));
          s(i, 0, c);
          s(i, 1, c);
        }
        s(0, 0, "#f4f4f0");
        break;
      case "pipoca":
        for (let i = -1; i <= 1; i++) {
          s(i, -1, "#fff3c4");
          s(i, 0, i === 0 ? "#f4f4f0" : c);
          s(i, 1, i === 0 ? "#f4f4f0" : c);
        }
        s(0, -2, "#fff3c4");
        break;
    }
  }

  // ---------- cabeça e rosto ----------
  cabeca() {
    const g = this.g;
    const Y = g.Y;
    const pele = this.pele;
    const ap = this.ap;
    this.pintar("cabeca", (x, y) => {
      const r = y - Y;
      let c = pele;
      if (r >= 9) c = escurecer(pele, 0.06);
      return c;
    }, { forte: 0.8 });
    if (this.lado) {
      this.pintar("nariz", pele);
      this.pm.set(10, Y + 5, escurecer(pele, 0.2));
      this.pm.set(10, Y + 6, escurecer(pele, 0.12));
      if (this.costas) return;
      this.rostoLado();
      return;
    }
    this.pintar("orelhaE", escurecer(pele, 0.08));
    this.pintar("orelhaD", escurecer(pele, 0.2));
    if (this.costas) return;
    // sombra do queixo no pescoço
    for (let x = 9; x <= 12; x++) this.pm.set(x, g.neckY, escurecer(pele, 0.22));
    if (this.fotoSprite && ap.foto?.usar && ap.foto?.noBoneco) {
      this.rostoFoto();
      return;
    }
    this.rostoFrente();
  }

  rostoFoto() {
    const Y = this.g.Y;
    const f = this.fotoSprite;
    for (let j = 0; j < f.h; j++) {
      for (let i = 0; i < f.w; i++) {
        const c = f.get(i, j);
        if (!c) continue;
        const x = 5 + i;
        const y = Y + 3 + j;
        if (!this.pm.get(x, y)) continue;
        this.pm.set(x, y, c);
      }
    }
  }

  rostoFrente() {
    const ap = this.ap;
    const Y = this.g.Y;
    const pele = this.pele;
    const corCab = rgb(ap.corCabelo || "#2e1c12");
    const marcas = new Set(ap.marcas || []);
    const olho = rgb(ap.corOlhos || "#4a2e1b");
    const escuro = misturar(olho, "#120a10", 0.6);
    const branco = [250, 246, 240, 255];
    const sombra = ap.sombra && ap.sombra !== "nenhuma" ? rgb(ap.sombra) : null;
    const s = (x, y, c) => this.pm.set(x, Y + y, c);
    // sobrancelhas
    const sob = misturar(corCab, "#100808", 0.25);
    const tipoS = ap.sobrancelha || "natural";
    const sobr = (xs, lado) => {
      const [a, b, c] = xs;
      if (tipoS === "grossa") {
        s(a, 4, sob); s(b, 4, sob); s(c, 4, sob);
      } else if (tipoS === "fina") {
        s(b, 4, misturar(sob, pele, 0.35)); s(c, 4, misturar(sob, pele, 0.35));
      } else if (tipoS === "arqueada") {
        s(b, 3, sob); s(lado < 0 ? a : c, 4, sob); s(lado < 0 ? c : a, 4, misturar(sob, pele, 0.4));
      } else {
        s(b, 4, sob); s(lado < 0 ? c : a, 4, sob);
      }
    };
    sobr([7, 8, 9], -1);
    sobr([12, 13, 14], 1);
    // olhos
    const tipo = ap.olhos || "redondo";
    const olhoEm = (x, d) => {
      // x = coluna interna do olho esquerdo da tela; d = 1 normal, -1 espelhado
      const a = x;
      const b = x + 1;
      if (sombra) { s(a, 4, misturar(pele, sombra, 0.6)); s(b, 4, misturar(pele, sombra, 0.6)); }
      if (tipo === "sorridente") {
        s(a, 6, escuro); s(b, 5, escuro); s(b + d, 6, escuro);
        return;
      }
      if (tipo === "sonolento") {
        s(a, 5, escurecer(pele, 0.25)); s(b, 5, escurecer(pele, 0.25));
        s(a, 6, olho); s(b, 6, escuro);
        return;
      }
      if (tipo === "amendoa") {
        s(a, 5, escuro); s(b, 5, escuro);
        s(a, 6, olho); s(b, 6, branco);
        return;
      }
      if (tipo === "grande") {
        s(a, 5, branco); s(b, 5, escuro);
        s(a, 6, olho); s(b, 6, olho);
        s(a - (d > 0 ? 1 : -2), 6, misturar(pele, branco, 0.6));
        return;
      }
      s(a, 5, branco); s(b, 5, escuro);
      s(a, 6, olho); s(b, 6, escuro);
    };
    olhoEm(7, 1);
    olhoEm(13, -1);
    if (marcas.has("cilios") || marcas.has("delineado")) {
      s(6, 5, escuro); s(15, 5, escuro);
      if (marcas.has("delineado")) { s(6, 4, escuro); s(15, 4, escuro); }
    }
    // nariz
    const nariz = ap.nariz || "pequeno";
    const ns = escurecer(pele, 0.2);
    if (nariz === "largo") { s(10, 7, ns); s(11, 7, ns); }
    else if (nariz === "medio") { s(11, 7, ns); s(11, 6, escurecer(pele, 0.1)); }
    else s(11, 7, escurecer(pele, 0.14));
    // bochechas
    if (marcas.has("blush")) { s(6, 7, misturar(pele, "#f06a7a", 0.45)); s(15, 7, misturar(pele, "#f06a7a", 0.45)); }
    if (marcas.has("sardas")) { s(7, 7, escurecer(pele, 0.22)); s(14, 7, escurecer(pele, 0.22)); s(8, 7, escurecer(pele, 0.12)); }
    if (marcas.has("pinta")) s(14, 8, "#2a1414");
    // boca
    const batom = ap.batom && ap.batom !== "nenhum" ? rgb(ap.batom) : null;
    const labio = batom || misturar(pele, "#a8444a", 0.45);
    const bocaEsc = batom ? escurecer(batom, 0.3) : escurecer(pele, 0.42);
    const boca = ap.boca || "sorriso";
    if (boca === "sorriso") { s(9, 8, bocaEsc); s(10, 9, labio); s(11, 9, labio); s(12, 8, bocaEsc); s(10, 8, bocaEsc); s(11, 8, bocaEsc); }
    else if (boca === "risada") { s(9, 8, bocaEsc); s(10, 8, branco); s(11, 8, branco); s(12, 8, bocaEsc); s(10, 9, labio); s(11, 9, labio); }
    else if (boca === "biquinho") { s(10, 8, labio); s(11, 8, labio); s(10, 9, bocaEsc); }
    else if (boca === "canto") { s(10, 8, bocaEsc); s(11, 8, bocaEsc); s(12, 7, bocaEsc); }
    else { s(10, 8, bocaEsc); s(11, 8, bocaEsc); if (batom) { s(10, 9, labio); s(11, 9, labio); } }
    this.barba();
  }

  barba() {
    const ap = this.ap;
    const b = ap.barba || "nenhuma";
    if (b === "nenhuma") return;
    const Y = this.g.Y;
    const cor = rgb(ap.corCabelo || "#2e1c12");
    const s = (x, y, c = cor) => { if (this.pm.get(x, Y + y)) this.pm.set(x, Y + y, c); };
    const meio = misturar(this.pele, cor, 0.45);
    if (this.lado) {
      if (b === "bigode" || b === "cavanhaque" || b === "cheia") s(14, 7);
      if (b === "cavanhaque" || b === "cheia") { s(14, 9); s(13, 10); }
      if (b === "cheia" || b === "costeleta") for (let r = 4; r <= 9; r++) s(11, r);
      if (b === "cheia") for (let r = 7; r <= 10; r++) for (let x = 11; x <= 14; x++) if (!(r === 8 && x >= 14)) s(x, r);
      if (b === "porfazer") for (let r = 7; r <= 10; r++) for (let x = 11; x <= 14; x++) if ((x + r) % 2) s(x, r, meio);
      return;
    }
    if (b === "porfazer") {
      for (let r = 7; r <= 10; r++) for (let x = 5; x <= 16; x++) if ((x + r) % 2 && !(r === 8 && x >= 9 && x <= 12) && (r > 7 || x < 8 || x > 13)) s(x, r, meio);
      return;
    }
    if (b === "costeleta" || b === "cheia") for (let r = 3; r <= 7; r++) { s(5, r); s(16, r); }
    if (b === "bigode" || b === "cavanhaque" || b === "cheia") for (let x = 9; x <= 12; x++) s(x, 7, x === 9 || x === 12 ? meio : cor);
    if (b === "cavanhaque") for (let x = 10; x <= 11; x++) { s(x, 9); s(x, 10); }
    if (b === "cheia") {
      for (let r = 8; r <= 10; r++) for (let x = 5; x <= 16; x++) if (!(r === 8 && x >= 9 && x <= 12)) s(x, r, (x + r) % 3 ? cor : escurecer(cor, 0.15));
      for (let x = 6; x <= 15; x++) if (this.pm.get(x, Y + 11) === null) this.pm.set(x, Y + 11, cor);
    }
  }

  rostoLado() {
    const ap = this.ap;
    const Y = this.g.Y;
    const pele = this.pele;
    const olho = rgb(ap.corOlhos || "#4a2e1b");
    const corCab = rgb(ap.corCabelo || "#2e1c12");
    const s = (x, y, c) => this.pm.set(x, Y + y, c);
    s(13, 4, misturar(corCab, "#100808", 0.25));
    s(14, 4, misturar(corCab, "#100808", 0.25));
    if (ap.olhos === "sorridente") s(13, 5, misturar(olho, "#120a10", 0.6));
    else {
      s(13, 5, misturar(olho, "#120a10", 0.6));
      s(13, 6, olho);
      s(14, 5, [250, 246, 240, 255]);
    }
    if ((ap.marcas || []).includes("cilios")) s(14, 4, "#1a0f14");
    s(16, 7, escurecer(pele, 0.12));
    const batom = ap.batom && ap.batom !== "nenhum" ? rgb(ap.batom) : escurecer(pele, 0.38);
    s(14, 8, batom);
    s(15, 8, batom);
    if ((ap.marcas || []).includes("blush")) s(12, 7, misturar(pele, "#f06a7a", 0.45));
    this.barba();
  }

  // ---------- cabelo ----------
  corCabelo(x, y) {
    const ap = this.ap;
    const c = rgb(ap.corCabelo || "#2e1c12");
    const m = ap.corMechas ? rgb(ap.corMechas) : null;
    if (m && (x * 3 + y) % 5 === 0) return m;
    return c;
  }

  // Pinta um pixel de cabelo com sombreado (claro em cima/esquerda, escuro embaixo/direita).
  hp(x, y, tom = 0) {
    if (x < 0 || x >= LARG || y < 0 || y >= ALT) return;
    let c = this.corCabelo(x, y);
    if (tom > 0) c = clarear(c, 0.22 * tom);
    if (tom < 0) c = escurecer(c, 0.2 * -tom);
    this.pm.set(x, y, c);
  }

  // Cabelo que fica atrás do corpo (cabelos longos, black power, rabo visto de frente).
  cabeloTras() {
    const est = this.ap.cabelo;
    const Y = this.g.Y;
    const t0 = this.g.torsoTop;
    const h = (x, y, t) => this.hp(x, y, t);
    if (this.lado) {
      if (["longo", "ondas", "cachos_longos", "dreads"].includes(est)) {
        const fim = est === "cachos_longos" ? t0 + 5 : t0 + 4;
        for (let y = Y + 4; y <= fim; y++) for (let x = 5; x <= 9; x++) if (!(y > Y + 10 && x > 8)) h(x, y, x === 5 ? -1 : 0);
      }
      if (est === "black") for (let y = Y - 3; y <= Y + 10; y++) for (let x = 3; x <= 13; x++) { const nx = (x - 8) / 5.8; const ny = (y - (Y + 3)) / 7.2; if (nx * nx + ny * ny <= 1) h(x, y, ny > 0.5 ? -1 : 0); }
      if (est === "rabo") for (let y = Y + 2; y <= Y + 11; y++) { h(4 + (y > Y + 6 ? 0 : 1), y, -1); h(5, y, 0); }
      if (est === "maria") for (let y = Y + 4; y <= Y + 10; y++) { h(5, y, 0); h(6, y, -1); }
      return;
    }
    if (this.costas) return; // nas costas o cabelo longo é pintado por cima do corpo
    if (["longo", "ondas", "cachos_longos"].includes(est)) {
      const fim = est === "cachos_longos" ? t0 + 5 : t0 + 4;
      const x0 = est === "cachos_longos" ? 3 : 4;
      for (let y = Y + 6; y <= fim; y++) for (let x = x0; x <= espelhoX(x0); x++) h(x, y, x < 8 ? 0 : -1);
    }
    if (est === "black") {
      for (let y = Y - 4; y <= Y + 11; y++) for (let x = 1; x <= 20; x++) {
        const nx = (x - 10.5) / 9.6;
        const ny = (y - (Y + 3)) / 7.8;
        if (nx * nx + ny * ny <= 1) h(x, y, ny < -0.5 ? 1 : ny > 0.4 ? -1 : 0);
      }
    }
    if (est === "rabo") for (let y = Y + 2; y <= Y + 9; y++) { h(17, y, -1); h(18, y, -1); }
    if (est === "dreads") for (let y = Y + 6; y <= t0 + 3; y++) for (const x of [4, 6, 15, 17]) h(x, y, y % 2 ? 0 : -1);
  }

  cabeloFrente() {
    const est = this.ap.cabelo || "curto";
    const Y = this.g.Y;
    const t0 = this.g.torsoTop;
    const temChapeu = !!this.p("chapeu") && !["tiara", "laco", "flor", "fone"].includes(this.p("chapeu").tipo);
    const h = (x, y, t = 0) => this.hp(x, y, t);
    const linha = (y, a, b, t = 0) => { for (let x = a; x <= b; x++) h(x, y, t); };
    if (est === "careca") {
      if (!this.costas && !this.lado) this.pm.set(8, Y + 1, clarear(this.pele, 0.35));
      return;
    }
    if (this.lado) return this.cabeloLado(est, h, linha, temChapeu);
    const C = this.costas;
    // calota básica
    const calota = (alto = 0) => {
      if (alto) linha(Y - 2, 8, 13, 1);
      linha(Y - 1, 7, 14, 1);
      linha(Y, 6, 15, 0);
      linha(Y + 1, 5, 16, 0);
      linha(Y + 2, 5, 16, 0);
      h(7, Y - 1, 2);
      h(8, Y - 1, 2);
      h(6, Y, 1);
    };
    const nuca = (ate) => { for (let y = Y + 3; y <= ate; y++) linha(y, 5, 16, y > ate - 2 ? -1 : 0); };
    switch (est) {
      case "curto":
      case "topete":
      case "lateral":
      case "pixie":
        calota(est === "topete" ? 1 : 0);
        if (C) { nuca(Y + 8); break; }
        h(5, Y + 3); h(16, Y + 3); h(5, Y + 4, -1); h(16, Y + 4, -1);
        if (est === "topete") { linha(Y - 3, 9, 12, 1); h(9, Y - 2, 2); }
        if (est === "lateral") { linha(Y + 3, 11, 16); h(8, Y, 2); h(8, Y + 1, 2); }
        if (est === "pixie") { linha(Y + 3, 5, 10); linha(Y + 4, 5, 7, -1); }
        break;
      case "raspado": {
        const c = (x, y) => this.pm.set(x, y, misturar(this.pele, this.corCabelo(x, y), 0.55));
        for (let x = 7; x <= 14; x++) c(x, Y - 1);
        for (let x = 6; x <= 15; x++) c(x, Y);
        for (let x = 5; x <= 16; x++) c(x, Y + 1);
        if (C) for (let y = Y + 2; y <= Y + 7; y++) for (let x = 5; x <= 16; x++) c(x, y);
        else { c(5, Y + 2); c(16, Y + 2); }
        break;
      }
      case "moicano":
        for (let y = Y - 4; y <= Y + 1; y++) linha(y, 9, 12, y < Y - 2 ? 1 : 0);
        for (let x = 6; x <= 15; x++) if (x < 9 || x > 12) this.pm.set(x, Y, misturar(this.pele, this.corCabelo(x, Y), 0.4));
        if (C) for (let y = Y + 2; y <= Y + 8; y++) linha(y, 9, 12);
        break;
      case "cacheado":
        calota(1);
        for (let x = 6; x <= 15; x += 2) h(x, Y - 2, 1);
        for (let x = 7; x <= 14; x += 3) h(x, Y - 3, 2);
        h(4, Y + 1); h(17, Y + 1); h(4, Y + 2, -1); h(17, Y + 2, -1);
        if (C) nuca(Y + 8);
        else { linha(Y + 3, 5, 7); linha(Y + 3, 14, 16); h(9, Y + 3, -1); h(12, Y + 3, -1); }
        for (let y = Y - 2; y <= Y + 2; y++) for (let x = 5; x <= 16; x++) if ((x + y * 2) % 4 === 0) h(x, y, 1);
        break;
      case "black":
        for (let y = Y - 4; y <= Y + 2; y++) for (let x = 1; x <= 20; x++) {
          const nx = (x - 10.5) / 9.6;
          const ny = (y - (Y + 3)) / 7.8;
          if (nx * nx + ny * ny <= 1) h(x, y, ny < -0.6 ? 1 : (x + y) % 4 === 0 ? 1 : 0);
        }
        if (C) for (let y = Y + 3; y <= Y + 10; y++) for (let x = 2; x <= 19; x++) { const nx = (x - 10.5) / 9.6; const ny = (y - (Y + 3)) / 7.8; if (nx * nx + ny * ny <= 1) h(x, y, -1); }
        break;
      case "dreads":
        calota(0);
        if (C) { for (let y = Y + 3; y <= t0 + 4; y++) for (let x = 5; x <= 16; x++) h(x, y, x % 2 ? -1 : 0); break; }
        for (let y = Y + 3; y <= Y + 8; y++) { h(5, y, y % 2 ? 0 : -1); h(16, y, y % 2 ? -1 : 0); }
        break;
      case "chanel":
        calota(0);
        if (C) { for (let y = Y + 3; y <= Y + 10; y++) linha(y, 4, 17, y > Y + 8 ? -1 : 0); break; }
        linha(Y + 3, 5, 16, 0);
        for (let y = Y + 3; y <= Y + 10; y++) { h(4, y, 0); h(5, y, 0); h(16, y, -1); h(17, y, -1); }
        linha(Y + 10, 4, 6, -1);
        linha(Y + 10, 15, 17, -1);
        break;
      case "longo":
      case "ondas":
      case "cachos_longos": {
        calota(est === "cachos_longos" ? 1 : 0);
        const fim = est === "cachos_longos" ? t0 + 5 : t0 + 4;
        const x0 = est === "cachos_longos" ? 3 : 4;
        if (C) {
          for (let y = Y + 3; y <= fim; y++) for (let x = x0; x <= espelhoX(x0); x++) h(x, y, (est === "ondas" && y % 4 === 0 && x % 3 === 1) || (est === "cachos_longos" && (x + y) % 3 === 0) ? 1 : x > 14 ? -1 : 0);
          break;
        }
        for (let y = Y + 3; y <= Y + 9; y++) {
          const w = est === "ondas" ? (y % 4 < 2 ? 0 : 1) : 0;
          h(x0 + w, y, 0); h(5, y, 0);
          h(16, y, -1); h(espelhoX(x0) - w, y, -1);
        }
        if (est === "ondas") { linha(Y + 3, 5, 9, 0); h(6, Y + 4); h(5, Y + 4); h(7, Y + 2, 2); }
        else if (est === "longo") { h(10, Y + 1, 2); h(11, Y + 1, 2); }
        else { for (let y = Y - 2; y <= Y + 9; y++) for (let x = 3; x <= 18; x++) if ((x + y * 2) % 5 === 0 && this.pm.get(x, y) && (x < 6 || x > 15 || y < Y + 3)) h(x, y, 1); }
        break;
      }
      case "rabo":
        calota(0);
        h(5, Y + 3, -1); h(16, Y + 3, -1);
        if (C) { linha(Y + 3, 5, 16); linha(Y + 4, 6, 15, -1); for (let y = Y + 2; y <= t0 + 2; y++) { h(10, y, 0); h(11, y, -1); } h(10, Y + 2, 2); this.pm.set(10, Y + 3, "#e05a9c"); this.pm.set(11, Y + 3, "#e05a9c"); }
        break;
      case "coque":
        calota(0);
        for (let y = Y - 4; y <= Y - 1; y++) linha(y, 8 + (y === Y - 4 ? 1 : 0), 13 - (y === Y - 4 ? 1 : 0), y === Y - 4 ? 1 : 0);
        h(9, Y - 3, 2);
        if (C) linha(Y + 3, 5, 16, -1);
        else { h(5, Y + 3, -1); h(16, Y + 3, -1); }
        break;
      case "tranca":
        calota(0);
        if (C) { for (let y = Y + 3; y <= Y + 6; y++) linha(y, 5, 16, -1); for (let y = Y + 6; y <= t0 + 5; y++) h(y % 2 ? 6 : 7, y, y % 2 ? 0 : -1); break; }
        h(5, Y + 3); h(16, Y + 3, -1);
        for (let y = Y + 4; y <= t0 + 5; y++) { h(y % 2 ? 4 : 5, y, 0); h(y % 2 ? 5 : 4, y, -1); }
        this.pm.set(4, t0 + 6, "#e05a9c");
        break;
      case "maria":
        calota(0);
        if (C) linha(Y + 3, 5, 16, -1);
        else { h(5, Y + 3, -1); h(16, Y + 3, -1); }
        for (let y = Y + 2; y <= Y + 10; y++) { h(3, y, 0); h(4, y, -1); h(17, y, 0); h(18, y, -1); }
        this.pm.set(4, Y + 2, "#e05a9c");
        this.pm.set(17, Y + 2, "#e05a9c");
        break;
      default:
        calota(0);
    }
    if (temChapeu) {
      // o chapéu esconde o topo do cabelo
      for (let y = Y - 4; y < Y; y++) for (let x = 0; x < LARG; x++) if (y < Y - 1 || (x > 6 && x < 15)) this.pm.apagar(x, y);
    }
  }

  cabeloLado(est, h, linha, temChapeu) {
    const Y = this.g.Y;
    const t0 = this.g.torsoTop;
    if (est === "raspado") {
      for (let y = Y - 1; y <= Y + 3; y++) for (let x = 6; x <= 14; x++) if (this.pm.get(x, y) || y === Y - 1) if (x < 12 || y < Y + 1) this.pm.set(x, y, misturar(this.pele, this.corCabelo(x, y), 0.55));
      return;
    }
    if (est === "moicano") {
      for (let y = Y - 4; y <= Y + 1; y++) linha(y, 7, 13, y < Y - 2 ? 1 : 0);
      return;
    }
    if (est === "black") {
      for (let y = Y - 4; y <= Y + 3; y++) for (let x = 3; x <= 16; x++) { const nx = (x - 9) / 7; const ny = (y - (Y + 3)) / 7.5; if (nx * nx + ny * ny <= 1 && !(x > 12 && y > Y + 1)) h(x, y, ny < -0.6 ? 1 : 0); }
      return;
    }
    // calota de perfil
    linha(Y - 1, 8, 13, 1);
    linha(Y, 7, 14, 0);
    linha(Y + 1, 6, 15, 0);
    linha(Y + 2, 6, 13, 0);
    h(9, Y - 1, 2);
    const nucaAte = { curto: Y + 7, topete: Y + 7, lateral: Y + 7, pixie: Y + 7, cacheado: Y + 7, rabo: Y + 5, coque: Y + 5, maria: Y + 6, tranca: Y + 6, chanel: Y + 10, dreads: t0 + 4, longo: Y + 10, ondas: Y + 10, cachos_longos: Y + 10 }[est] ?? Y + 7;
    for (let y = Y + 3; y <= nucaAte; y++) linha(y, 6, y <= Y + 8 ? 8 : 7, y > nucaAte - 2 ? -1 : 0);
    if (est === "topete") { linha(Y - 2, 10, 14, 1); h(15, Y - 1, 1); }
    if (est === "cacheado") { linha(Y - 2, 8, 13, 1); for (let x = 7; x <= 13; x += 2) h(x, Y - 3, 2); h(5, Y + 2); h(5, Y + 4); }
    if (est === "chanel") { for (let y = Y + 3; y <= Y + 10; y++) h(5, y, -1); linha(Y + 3, 13, 15, 0); }
    if (est === "ondas" || est === "longo" || est === "cachos_longos") { h(14, Y + 3, 0); h(15, Y + 2, 0); }
    if (est === "coque") { for (let y = Y - 3; y <= Y; y++) linha(y, 6, 9, y === Y - 3 ? 1 : 0); }
    if (est === "tranca") for (let y = Y + 6; y <= t0 + 4; y++) h(y % 2 ? 6 : 7, y, 0);
    if (est === "dreads") for (let y = Y + 3; y <= t0 + 4; y++) h(5, y, -1);
    if (temChapeu) for (let y = Y - 4; y < Y; y++) for (let x = 0; x < LARG; x++) this.pm.apagar(x, y);
  }

  // ---------- chapéus ----------
  chapeu() {
    const ch = this.p("chapeu");
    if (!ch) return;
    const Y = this.g.Y;
    const c = rgb(ch.cor);
    const c2 = rgb(ch.cor2 || escurecer(c, 0.3));
    const L = this.lado;
    const s = (x, y, cc = c) => this.pm.set(x, y, cc);
    const linha = (y, a, b, cc = c) => { for (let x = a; x <= b; x++) s(x, y, typeof cc === "function" ? cc(x, y) : cc); };
    const sh = (x, a, b) => (x === a ? clarear(c, 0.18) : x === b ? escurecer(c, 0.25) : c);
    const copa = (y0, y1, a, b) => { for (let y = y0; y <= y1; y++) linha(y, a, b, (x) => sh(x, a, b)); };
    const ab = L ? [5, 16] : [4, 17];
    switch (ch.tipo) {
      case "fedora":
        copa(Y - 3, Y - 1, 7, 14); linha(Y - 3, 8, 13, escurecer(c, 0.15));
        linha(Y, 7, 14, c2);
        linha(Y + 1, ab[0], ab[1], escurecer(c, 0.1));
        break;
      case "cartola":
        copa(Y - 6, Y - 1, 7, 14);
        linha(Y - 1, 7, 14, c2);
        linha(Y, ab[0] + 1, ab[1] - 1);
        break;
      case "palha": {
        const pal = (x, y) => ((x + y) % 2 ? c : escurecer(c, 0.12));
        copa(Y - 2, Y, 7, 14);
        for (let y = Y - 2; y <= Y; y++) for (let x = 7; x <= 14; x++) s(x, y, pal(x, y));
        linha(Y, 7, 14, c2);
        linha(Y + 1, 2, 19, pal);
        break;
      }
      case "cowboy":
        copa(Y - 3, Y, 7, 14);
        s(10, Y - 3, escurecer(c, 0.25)); s(11, Y - 3, escurecer(c, 0.25));
        linha(Y, 7, 14, c2);
        linha(Y + 1, 4, 17, escurecer(c, 0.08));
        s(3, Y); s(18, Y); s(2, Y - 1); s(19, Y - 1);
        break;
      case "bone":
        copa(Y - 1, Y + 1, 6, 15);
        s(10, Y - 1, c2);
        if (L) { linha(Y + 2, 12, 18, escurecer(c, 0.15)); }
        else if (!this.costas) linha(Y + 2, 6, 15, escurecer(c, 0.2));
        break;
      case "boina":
        linha(Y - 2, 7, 15); linha(Y - 1, 5, 17); linha(Y, 5, 16, escurecer(c, 0.15));
        s(12, Y - 3, c);
        break;
      case "pamela":
        copa(Y - 2, Y, 7, 14);
        linha(Y, 7, 14, c2);
        linha(Y + 1, 0, 21, escurecer(c, 0.05));
        linha(Y + 2, 1, 20, escurecer(c, 0.18));
        break;
      case "tiara":
        for (let x = 6; x <= 15; x++) s(x, Y + 1, x % 3 === 0 ? "#ffffff" : c);
        s(10, Y, "#ffffff"); s(11, Y, "#8fd8ff");
        break;
      case "coroa":
        linha(Y - 1, 7, 14, c);
        linha(Y, 7, 14, escurecer(c, 0.15));
        for (const x of [7, 10, 11, 14]) s(x, Y - 2, c);
        s(7, Y - 3, clarear(c, 0.4)); s(14, Y - 3, clarear(c, 0.4)); s(10, Y - 3, "#e05a5a");
        break;
      case "laco":
        if (L) { s(8, Y - 1); s(9, Y - 1, escurecer(c, 0.2)); s(10, Y - 1); }
        else { s(13, Y - 1); s(14, Y - 1, escurecer(c, 0.2)); s(15, Y - 1); s(13, Y - 2); s(15, Y - 2); }
        break;
      case "flor":
        if (L) { s(8, Y + 2); s(7, Y + 1, "#f2d544"); }
        else { s(15, Y + 1); s(16, Y + 1); s(15, Y + 2); s(16, Y + 2, escurecer(c, 0.2)); s(16, Y, c); s(15, Y + 1, "#f2d544"); }
        break;
      case "fone":
        linha(Y - 2, 7, 14);
        if (L) { s(9, Y + 4); s(10, Y + 4); s(9, Y + 5); s(10, Y + 5); s(9, Y + 3, c); }
        else { for (const x of [4, 17]) for (let y = Y + 4; y <= Y + 6; y++) s(x, y); s(5, Y - 1); s(16, Y - 1); s(5, Y); s(16, Y); }
        break;
    }
  }

  oculos() {
    const o = this.p("oculos");
    if (!o) return;
    const Y = this.g.Y;
    const f = rgb(o.cor);
    const l = o.lente ? rgb(o.lente) : null;
    const s = (x, y, c) => this.pm.set(x, Y + y, c);
    if (this.lado) {
      s(12, 5, f); s(13, 5, l || f); s(14, 5, f); s(12, 6, f); s(13, 6, l || f); s(14, 6, f);
      s(10, 5, f); s(11, 5, f);
      return;
    }
    const lente = (x0) => {
      for (let x = x0; x <= x0 + 2; x++) {
        if (l) { s(x, 5, x === x0 ? clarear(l, 0.4) : l); s(x, 6, l); }
        else { s(x, 5, misturar(f, this.pm.get(x, Y + 5) || this.pele, 0.6)); }
      }
      s(x0 - 1 < 6 ? 6 : x0 - 1, 5, f);
    };
    switch (o.tipo) {
      case "aviador":
        lente(6); lente(13); s(10, 5, f); s(11, 5, f); s(10, 4, f); s(11, 4, f);
        s(6, 6, f); s(15, 6, f);
        break;
      case "redondo":
        lente(6); lente(13); s(10, 5, f); s(11, 5, f); s(5, 5, f); s(16, 5, f);
        break;
      case "gatinho":
        lente(6); lente(13); s(10, 5, f); s(11, 5, f); s(5, 4, f); s(16, 4, f); s(5, 5, f); s(16, 5, f);
        break;
      case "coracao":
      case "estrela":
        lente(6); lente(13); s(10, 5, f); s(11, 5, f);
        s(7, 4, f); s(14, 4, f); s(5, 5, f); s(16, 5, f);
        if (o.tipo === "estrela") { s(5, 3, f); s(16, 3, f); }
        break;
      default:
        lente(6); lente(13); s(10, 5, f); s(11, 5, f); s(5, 5, f); s(16, 5, f);
        for (let x = 6; x <= 15; x++) if (x < 9 || x > 12) s(x, 4, f);
    }
  }

  brincos() {
    const b = this.p("brinco");
    if (!b) return;
    const Y = this.g.Y;
    const c = rgb(b.cor);
    const s = (x, y, cc = c) => this.pm.set(x, Y + y, cc);
    const xs = this.lado ? [10] : [4, 17];
    for (const x of xs) {
      if (b.tipo === "argola") { s(x, 7); s(x, 8, escurecer(c, 0.2)); }
      else if (b.tipo === "pendente") { s(x, 7); s(x, 8); s(x, 9, clarear(c, 0.4)); }
      else s(x, 7, clarear(c, 0.2));
    }
  }
}

// ---------- API ----------
export function desenharQuadro(ap, dir, q, extra) {
  if (dir === "esq") return desenharQuadro(ap, "dir", q, extra).espelhado();
  const vista = dir === "baixo" ? "frente" : dir === "cima" ? "costas" : "lado";
  return new Pintor(ap, vista, q, extra).desenhar();
}

// Folha de sprites: 8 colunas × 4 linhas (baixo, esq, dir, cima).
export function gerarFolha(ap, extra) {
  const c = criarCanvas(LARG * NQ, ALT * 4);
  const ctx = c.getContext("2d");
  DIRECOES.forEach((d, j) => {
    for (let q = 0; q < NQ; q++) {
      const pm = desenharQuadro(ap, d, q, extra);
      ctx.putImageData(new ImageData(pm.d, LARG, ALT), q * LARG, j * ALT);
    }
  });
  return { canvas: c, larg: LARG, alt: ALT };
}

export function quadroDe(dir, pose, t) {
  const lista = QUADROS[pose] || QUADROS.parado;
  const vel = pose === "andar" ? 8 : pose === "parado" ? 1.4 : 1;
  const q = lista[Math.floor(t * vel) % lista.length];
  return { sx: q * LARG, sy: DIRECOES.indexOf(dir) * ALT };
}

// ---------- Bebê (o João) ----------
// Mesma folha (8 quadros × 4 direções) do adulto, mas com corpinho de bebê de ~20 px.
function quadroBebe(ap, dir, q) {
  const pm = new Pixmap(LARG, ALT);
  const pele = rgb(ap.pele || "#a86a42");
  const cab = rgb(ap.corCabelo || "#1a1010");
  const roupa = rgb("#8ac4e8");
  const lado = dir === "esq" || dir === "dir";
  const costas = dir === "cima";
  const andar = q >= 2 && q <= 5 ? q - 2 : -1;
  const bob = andar === 1 || andar === 3 ? -1 : 0;
  const sentado = q === 7;
  const desce = sentado ? 3 : 0;
  const r = (x0, x1, y0, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) pm.set(x, y, typeof c === "function" ? c(x, y) : c); };
  const Y = 18 + bob + desce; // topo da cabeça
  // pernas e pés
  if (!sentado) {
    const sobeE = andar === 0 ? 1 : 0;
    const sobeD = andar === 2 ? 1 : 0;
    if (lado) {
      const k = andar === 0 ? 1 : andar === 2 ? -1 : 0;
      r(9 - k, 10 - k, 34, 36, escurecer(pele, 0.15));
      r(11 + k, 12 + k, 34, 36, pele);
      r(9 - k, 11 - k, 37, 37, "#f4f4f4");
      r(11 + k, 13 + k, 37, 37, "#ffffff");
    } else {
      r(8, 10, 34, 36 - sobeE, pele);
      r(11, 13, 34, 36 - sobeD, escurecer(pele, 0.08));
      r(8, 10, 37 - sobeE, 37 - sobeE, "#f4f4f4");
      r(11, 13, 37 - sobeD, 37 - sobeD, "#f4f4f4");
    }
  } else {
    r(7, 14, 35, 37, (x) => (x === 7 ? clarear(roupa, 0.1) : roupa));
    r(6, 8, 36, 37, pele);
    r(13, 15, 36, 37, pele);
  }
  // corpinho (macacãozinho)
  const t0 = Y + 9;
  r(lado ? 8 : 7, lado ? 13 : 14, t0, t0 + 6, (x, y) => {
    let c = roupa;
    if ((x + y) % 5 === 0) c = clarear(roupa, 0.25);
    if (x === (lado ? 13 : 14)) c = escurecer(roupa, 0.2);
    return c;
  });
  if (!lado && !costas) { pm.set(10, t0 + 1, "#ffffff"); pm.set(11, t0 + 1, "#ffffff"); pm.set(10, t0 + 3, "#f2d544"); pm.set(10, t0 + 5, "#f2d544"); }
  // bracinhos
  const acenar = q === 6;
  if (lado) r(10, 11, t0 + 1, t0 + 4, pele);
  else {
    if (acenar) r(4, 5, t0 - 4, t0 + 1, pele);
    else r(5, 6, t0 + 1, t0 + 4 + (andar === 0 ? 1 : 0), pele);
    r(15, 16, t0 + 1, t0 + 4 + (andar === 2 ? 1 : 0), pele);
  }
  // cabeça grande e redonda
  for (let y = 0; y < 10; y++) for (let x = 0; x < 11; x++) {
    const nx = (x - 5) / 5.4;
    const ny = (y - 4.6) / 5;
    if (nx * nx + ny * ny > 1) continue;
    let c = pele;
    if (x > 7) c = escurecer(pele, 0.12);
    if (x < 2) c = clarear(pele, 0.08);
    pm.set(5 + x, Y + y, c);
  }
  // cabelinho cacheado
  const tufos = costas ? [[6, 0], [8, -1], [10, 0], [12, -1], [14, 0], [7, 2], [10, 2], [13, 2], [6, 4], [9, 4], [12, 4], [15, 4], [8, 6], [11, 6], [14, 6]] : lado ? [[7, 0], [9, -1], [11, 0], [13, 0], [6, 2], [8, 2], [6, 4]] : [[7, 0], [9, -1], [11, -1], [13, 0], [6, 1], [15, 1], [10, 1]];
  for (const [x, y] of tufos) { pm.set(x, Y + y, cab); pm.set(x + 1, Y + y, clarear(cab, 0.2)); pm.set(x, Y + y + 1, cab); }
  if (!costas) {
    const olho = misturar(rgb(ap.corOlhos || "#2a1a10"), "#0a0608", 0.5);
    if (lado) {
      pm.set(13, Y + 5, olho); pm.set(13, Y + 4, "#ffffff");
      pm.set(13, Y + 7, misturar(pele, "#f06a7a", 0.5));
      pm.set(15, Y + 7, escurecer(pele, 0.4));
    } else {
      pm.set(7, Y + 4, "#ffffff"); pm.set(8, Y + 4, olho); pm.set(7, Y + 5, olho); pm.set(8, Y + 5, olho);
      pm.set(12, Y + 4, "#ffffff"); pm.set(13, Y + 4, olho); pm.set(12, Y + 5, olho); pm.set(13, Y + 5, olho);
      pm.set(6, Y + 6, misturar(pele, "#f06a7a", 0.5)); pm.set(14, Y + 6, misturar(pele, "#f06a7a", 0.5));
      pm.set(10, Y + 7, escurecer(pele, 0.45)); pm.set(9, Y + 7, misturar(pele, "#c0485a", 0.5)); pm.set(11, Y + 7, misturar(pele, "#c0485a", 0.5));
    }
  }
  pm.contorno(0.66);
  if (dir === "esq") return pm.espelhado();
  return pm;
}

export function gerarFolhaBebe(ap) {
  const c = criarCanvas(LARG * NQ, ALT * 4);
  const ctx = c.getContext("2d");
  DIRECOES.forEach((d, j) => {
    for (let q = 0; q < NQ; q++) {
      const pm = quadroBebe(ap, d, q);
      ctx.putImageData(new ImageData(pm.d, LARG, ALT), q * LARG, j * ALT);
    }
  });
  return { canvas: c, larg: LARG, alt: ALT };
}
