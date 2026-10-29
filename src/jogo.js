// Núcleo do jogo: mundo, jogador, NPCs, câmera, interações, pistas e a revelação do tema.
import { VELOCIDADE_JOGADOR, FATOR_CORRIDA, TEMA, DEBUG, POS_INICIAL } from "./config.js";
import { Cenario } from "./arte/cenario.js";
import { gerarFolha, gerarFolhaBebe, quadroDe, LARG, ALT } from "./arte/personagem.js";
import { desenharRetrato, desenharRetratoBebe } from "./arte/retrato.js";
import { MAPA, px, py, m, ponto } from "./dados/mapa.js";
import { NPCS } from "./dados/npcs.js";
import { aparenciaPadrao } from "./dados/guardaroupa.js";
import { EstadoHistoria, Conversa } from "./motor/conversa.js";
import { hash, criarCanvas } from "./arte/pixel.js";
import { onibus, interiorOnibus } from "./arte/objetos.js";

export const PISTAS = NPCS.filter((n) => !n.bebe && !n.extra).map((n) => ({ id: n.id, flag: `pista_${n.id}`, nome: n.nome }));
export const TEXTO_PISTAS = {
  pista_davi_dicaprio: "Davi: mandaram decorar falas e ensaiar o melhor ângulo… coisa de CINEMA.",
  pista_taylor_frisso: "Taylor: tapete VERMELHO e estrelas… na calçada.",
  pista_thais_grande: "Thais: pipoca para 300 pessoas e um telão. Lugar famoso por estreias…",
  pista_samuel_pitt: "Samuel: letras brancas gigantes no morro. Nove letras. Começa com H.",
};
export const PISTAS_EXTRAS = {
  extra_palha: "Bilhete na palha do pátio: “ensaio geral às 19h — não contem pra ninguém”.",
  extra_quiosque: "Quiosque da piscina: caixas e mais caixas de milho de pipoca.",
  extra_casa: "Casa amarela: araras de roupas brilhantes e um cartaz enrolado.",
};

class Ator {
  constructor(id, ap, x, y, bebe = false) {
    this.id = id;
    this.bebe = bebe;
    this.x = x;
    this.y = y;
    this.dir = "baixo";
    this.pose = "parado";
    this.t = Math.random() * 3;
    this.definir(ap);
  }
  definir(ap, extra) {
    this.ap = ap;
    if (this.bebe) {
      this.folha = gerarFolhaBebe(ap);
      this.retrato = desenharRetratoBebe(ap).paraCanvas();
      return;
    }
    this.folha = gerarFolha(ap, extra);
    this.retrato = desenharRetrato(ap, extra).paraCanvas();
  }
}

export class Jogo {
  constructor(tela, entrada, audio, ui) {
    this.tela = tela;
    this.ctx = tela.ctx;
    this.entrada = entrada;
    this.audio = audio;
    this.ui = ui;
    this.cen = new Cenario();
    this.estado = new EstadoHistoria();
    this.modo = "titulo";
    this.tempo = 0;
    this.cam = { x: px(-6), y: py(-14) };
    this.particulas = [];
    this.npcs = [];
    this.passoT = 0;
    this.camTitulo = 0;
    this.jogador = new Ator("jogador", aparenciaPadrao("f"), px(MAPA.inicio.x), py(MAPA.inicio.z));
    this.jogador.dir = MAPA.inicio.dir;
    this.extraFoto = null;
    this.criarNPCs();
    this.tapete = this.pintarTapete();
    this.colocarBola();
  }

  // ---------- bola de basquete ----------
  colocarBola() {
    const q = MAPA.quadra;
    this.bola = { x: px(q.x) + 14, y: py(q.z) + 22, alt: 0, va: 0, vx: 0, vy: 0, arremesso: null };
    this.cestasFeitas = 0;
  }

  arremessar() {
    const j = this.jogador;
    const b = this.bola;
    const cesta = this.cen.cestas.reduce((m, c) => (Math.abs(c.aro.x - j.x) < Math.abs(m.aro.x - j.x) ? c : m));
    j.dir = cesta.aro.x < j.x ? "esq" : "dir";
    j.acenarAte = this.tempo + 0.8;
    const dist = Math.hypot(cesta.aro.x - j.x, cesta.aro.y - j.y);
    b.arremesso = { t: 0, dur: 0.7 + dist / 260, de: { x: j.x + (j.dir === "esq" ? -6 : 6), y: j.y, alt: 24 }, ate: { x: cesta.aro.x, y: cesta.aro.y, alt: cesta.aro.alt }, cesta, acerto: Math.random() < Math.max(0.35, 0.92 - dist / 400) };
    this.audio.sfx("clique");
  }

  atualizarBola(dt) {
    const b = this.bola;
    const A = b.arremesso;
    if (A) {
      A.t += dt;
      const k = Math.min(1, A.t / A.dur);
      b.x = A.de.x + (A.ate.x - A.de.x) * k;
      b.y = A.de.y + (A.ate.y - A.de.y) * k;
      b.alt = A.de.alt + (A.ate.alt - A.de.alt) * k + Math.sin(k * Math.PI) * (36 + A.dur * 20);
      if (k >= 1) {
        b.arremesso = null;
        if (A.acerto) {
          b.alt = A.ate.alt - 3; b.va = -20; b.vx = -A.cesta.lado * 12; b.vy = 4;
          this.cestasFeitas++;
          this.audio.sfx("escolha");
          this.ui.aviso(`🏀 <b>Cesta!</b> ${this.cestasFeitas > 1 ? `(${this.cestasFeitas} cestas)` : "Que arremesso de estrela!"}`, 1800);
        } else {
          b.va = 70; b.vx = -A.cesta.lado * 55; b.vy = (Math.random() - 0.5) * 30;
          this.audio.sfx("erro");
          this.ui.aviso("Bateu no aro! Tenta de novo.", 1500);
        }
      }
      return;
    }
    if (!b.alt && !b.va && Math.abs(b.vx) < 1 && Math.abs(b.vy) < 1) return;
    b.va -= 320 * dt;
    b.alt += b.va * dt;
    if (b.alt <= 0) {
      b.alt = 0;
      b.va = Math.abs(b.va) > 30 ? -b.va * 0.55 : 0;
      if (b.va) this.audio.sfx("clique");
      b.vx *= 0.8; b.vy *= 0.8;
    }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (!b.alt) { b.vx *= 0.97; b.vy *= 0.97; }
    // fica dentro da quadra
    const q = MAPA.quadra;
    const x0 = px(q.x - q.w / 2) + 6, x1 = px(q.x + q.w / 2) - 6, y0 = py(q.z - q.d / 2) + 6, y1 = py(q.z + q.d / 2) - 6;
    if (b.x < x0 || b.x > x1) { b.vx = -b.vx; b.x = Math.max(x0, Math.min(x1, b.x)); }
    if (b.y < y0 || b.y > y1) { b.vy = -b.vy; b.y = Math.max(y0, Math.min(y1, b.y)); }
  }

  desenharBola(cx, cy) {
    const b = this.bola;
    const ctx = this.ctx;
    const x = Math.round(b.x - cx);
    const y = Math.round(b.y - cy);
    ctx.fillStyle = "rgba(10,30,14,0.35)";
    ctx.fillRect(x - 2, y, 5, 1);
    const by = y - 5 - Math.round(b.alt);
    ctx.fillStyle = "#1a0e08";
    ctx.fillRect(x - 2, by - 1, 5, 7); ctx.fillRect(x - 3, by, 7, 5);
    ctx.fillStyle = "#e8702a";
    ctx.fillRect(x - 2, by, 5, 5);
    ctx.fillStyle = "#ffa060";
    ctx.fillRect(x - 1, by, 2, 1);
    ctx.fillStyle = "#5a2a10";
    ctx.fillRect(x, by, 1, 5); ctx.fillRect(x - 2, by + 2, 5, 1);
  }

  // ---------- configuração ----------
  criarNPCs() {
    for (const def of NPCS) {
      const ap = { ...aparenciaPadrao(def.aparencia.genero || "f"), ...def.aparencia, nome: def.nome };
      const p = typeof def.local === "string" ? ponto(def.local) : { x: px(def.local.x), y: py(def.local.z) };
      const a = new Ator(def.id, ap, p.x, p.y, !!def.bebe);
      a.def = def;
      a.casa = { x: p.x, y: p.y };
      a.alvo = null;
      a.espera = 1 + Math.random() * 2;
      a.indice = 0;
      const c = def.comportamento || {};
      if (c.tipo === "sentar") { a.pose = "sentado"; a.dir = c.dir || "baixo"; }
      if (c.tipo === "patrulha") a.pontos = c.pontos.map(([x, z]) => ({ x: px(x), y: py(z) }));
      this.npcs.push(a);
    }
  }

  definirAparencia(ap, extraFoto) {
    this.extraFoto = extraFoto || null;
    this.jogador.definir(ap, extraFoto || undefined);
  }

  carregar(salvo) {
    this.estado = new EstadoHistoria(salvo);
    if (salvo?.x !== undefined && !salvo.migrado) {
      this.jogador.x = salvo.x;
      this.jogador.y = salvo.y;
      this.jogador.dir = salvo.dir || "baixo";
    } else {
      this.jogador.x = px(MAPA.inicio.x);
      this.jogador.y = py(MAPA.inicio.z);
      this.jogador.dir = MAPA.inicio.dir;
    }
    if (POS_INICIAL && ponto(POS_INICIAL)) Object.assign(this.jogador, ponto(POS_INICIAL));
    Object.assign(this.jogador, { sentado: false, elevar: 0, nadando: false });
    this.levarJoaoParaCasa();
    this.aplicarRevelacao(this.revelado);
  }

  dadosSalvos() {
    return { ...this.estado.toJSON(), x: Math.round(this.jogador.x), y: Math.round(this.jogador.y), dir: this.jogador.dir };
  }

  visivel(n) {
    return !n.def?.oculto || this.revelado || this.estado.flags.has("joao_apareceu");
  }

  get npcsVisiveis() {
    return this.npcs.filter((n) => this.visivel(n));
  }

  get revelado() {
    return this.estado.flags.has("tema_revelado");
  }

  pistasEncontradas() {
    return PISTAS.filter((p) => this.estado.flags.has(p.flag)).length;
  }

  // ---------- laço ----------
  atualizar(dt) {
    this.tempo += dt;
    const ent = this.entrada;
    if (this.modo === "explorar") this.atualizarExplorar(dt);
    else if (this.modo === "cena") this.atualizarCena(dt);
    else if (this.modo === "toboagua") this.atualizarToboagua(dt);
    else if (this.modo === "chegada") this.atualizarChegada(dt);
    else if (this.modo === "titulo") {
      this.camTitulo += dt;
      const k = this.camTitulo * 0.05;
      this.cam.x = px(-6) + Math.sin(k) * 160;
      this.cam.y = py(-20) + Math.cos(k * 0.7) * 70;
    }
    for (const n of this.npcsVisiveis) this.atualizarNPC(n, dt);
    this.atualizarParticulas(dt);
    this.atualizarBola(dt);
    if (this.clarear) { this.anoitecer = Math.max(0, (this.anoitecer || 0) - dt / 3); if (!this.anoitecer) this.clarear = false; }
    if (this.modo !== "explorar") ent.limpar();
  }

  atualizarExplorar(dt) {
    const ent = this.entrada;
    const j = this.jogador;
    j.t += dt;
    if (ent.acao("pausa")) return this.ui.pausar();
    if (ent.acao("diario")) return this.ui.abrirDiario();
    if (ent.acao("camarim")) return this.ui.abrirCamarim("camarim");
    if (ent.acao("mapa")) return this.ui.abrirMapa();
    const eixo = ent.eixo();
    const mexendo = Math.hypot(eixo.x, eixo.y) > 0.05;
    if (ent.acao("acenar")) { j.acenarAte = this.tempo + 1.2; j.sentado = false; }
    if (j.sentado && mexendo) { j.sentado = false; j.elevar = 0; }
    if (j.sentado) {
      j.pose = "sentado";
      j.dir = "baixo";
    } else if (mexendo) {
      const vel = VELOCIDADE_JOGADOR * (ent.corrida() ? FATOR_CORRIDA : 1) * Math.min(1, Math.hypot(eixo.x, eixo.y) * 1.3);
      this.mover(j, eixo.x * vel * dt, eixo.y * vel * dt);
      if (Math.abs(eixo.x) > Math.abs(eixo.y) * 1.1) j.dir = eixo.x < 0 ? "esq" : "dir";
      else j.dir = eixo.y < 0 ? "cima" : "baixo";
      j.pose = "andar";
      this.passoT -= dt * (ent.corrida() ? 1.6 : 1);
      if (this.passoT <= 0) {
        this.passoT = 0.32;
        this.audio.passo(this.cen.pisoEm(j.x, j.y));
      }
      j.acenarAte = 0;
    } else j.pose = j.acenarAte > this.tempo ? "acenar" : "parado";

    // tensão da música perto das lonas
    if (!this.revelado) {
      const d = Math.hypot(j.x - px(MAPA.letreiro.x), j.y - py(MAPA.letreiro.z));
      this.audio.tensao(Math.max(0, 1 - d / 260) * 0.85);
    } else this.audio.tensao(0);

    // alvo de interação
    const alvo = this.alvoProximo();
    this.alvo = alvo;
    this.ui.prompt(alvo ? alvo.rotulo : null);
    if (ent.acao("interagir") && alvo) this.interagir(alvo);
    this.seguirCamera(dt);
  }

  mover(a, dx, dy) {
    const caixa = (x, y) => {
      const pts = [[x - 5, y - 4], [x + 5, y - 4], [x - 5, y], [x + 5, y]];
      if (pts.some(([qx, qy]) => this.cen.solidoEm(qx, qy))) return true;
      for (const n of this.npcs) if (n !== a && this.visivel(n) && Math.abs(n.x - x) < (n.bebe ? 6 : 9) && Math.abs(n.y - y) < 5) return true;
      if (a !== this.jogador && Math.abs(this.jogador.x - x) < 9 && Math.abs(this.jogador.y - y) < 5) return true;
      return false;
    };
    // se já estiver preso dentro de algo (ex.: depois de sentar), deixa sair
    if (caixa(a.x, a.y)) { a.x += dx; a.y += dy; return false; }
    const passos = Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 2) || 1;
    const sx = dx / passos;
    const sy = dy / passos;
    let bloqueou = false;
    for (let i = 0; i < passos; i++) {
      if (!caixa(a.x + sx, a.y)) a.x += sx;
      else bloqueou = true;
      if (!caixa(a.x, a.y + sy)) a.y += sy;
      else bloqueou = true;
    }
    return bloqueou;
  }

  seguirCamera(dt, alvo) {
    const j = alvo || this.jogador;
    const tx = j.x;
    const ty = j.y - 14;
    const k = alvo ? Math.min(1, dt * 2.2) : 1;
    this.cam.x += (tx - this.cam.x) * k;
    this.cam.y += (ty - this.cam.y) * k;
  }

  // ---------- NPCs ----------
  atualizarNPC(n, dt) {
    n.t += dt;
    const c = n.def.comportamento || {};
    if (n.conversando) {
      if (c.tipo !== "sentar") {
        const dx = this.jogador.x - n.x;
        const dy = this.jogador.y - n.y;
        n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "esq" : "dir") : dy < 0 ? "cima" : "baixo";
        n.pose = n.acenarAte > this.tempo ? "acenar" : "parado";
      }
      return;
    }
    if (n.acenarAte > this.tempo && c.tipo !== "sentar") { n.pose = "acenar"; return; }
    if (c.tipo === "sentar") { n.pose = "sentado"; n.dir = c.dir || "baixo"; return; }
    if (c.tipo === "dancar") {
      const b = Math.floor(n.t * 2.4) % 8;
      n.dir = ["baixo", "baixo", "esq", "baixo", "dir", "baixo", "cima", "baixo"][b];
      n.pose = b % 2 ? "acenar" : "parado";
      return;
    }
    let alvo = null;
    let vel = 30;
    if (c.tipo === "passear") {
      if (!n.alvo) {
        n.espera -= dt;
        n.pose = "parado";
        if (c.par) {
          // conversando com o par: vira para ele e gesticula de vez em quando
          const p = this.npcs.find((o) => o.id === c.par);
          if (p) {
            const dx = p.x - n.x;
            const dy = p.y - n.y;
            n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "esq" : "dir") : dy < 0 ? "cima" : "baixo";
            if (Math.random() < dt * 0.35) n.acenarAte = this.tempo + 0.8;
          }
        }
        if (n.espera <= 0) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * m(c.raio || 3);
          n.alvo = { x: n.casa.x + Math.cos(a) * r, y: n.casa.y + Math.sin(a) * r * 0.6 };
        }
      }
      alvo = n.alvo;
      if (c.lento) vel = 14;
    } else if (c.tipo === "patrulha") {
      alvo = n.pontos[n.indice];
      vel = c.lento ? 22 : 36;
    }
    if (!alvo) return;
    const dx = alvo.x - n.x;
    const dy = alvo.y - n.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) {
      if (c.tipo === "patrulha") {
        if (!n.pausa) n.pausa = 1.5 + Math.random() * 1.5;
        n.pausa -= dt;
        n.pose = "parado";
        n.dir = "baixo";
        if (n.pausa <= 0) { n.pausa = 0; n.indice = (n.indice + 1) % n.pontos.length; }
      } else { n.alvo = null; n.espera = 1.5 + Math.random() * 3; }
      return;
    }
    const bloqueou = this.mover(n, (dx / d) * vel * dt, (dy / d) * vel * dt);
    n.pose = "andar";
    n.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "esq" : "dir") : dy < 0 ? "cima" : "baixo";
    if (bloqueou) {
      n.travado = (n.travado || 0) + dt;
      if (n.travado > 1.2) { n.travado = 0; if (c.tipo === "passear") n.alvo = null; else n.indice = (n.indice + 1) % n.pontos.length; }
    } else n.travado = 0;
  }

  // ---------- interação ----------
  alvoProximo() {
    const j = this.jogador;
    const frente = { baixo: [0, 8], cima: [0, -10], esq: [-9, -2], dir: [9, -2] }[j.dir];
    const fx = j.x + frente[0];
    const fy = j.y + frente[1];
    let melhor = null;
    let md = Infinity;
    for (const n of this.npcsVisiveis) {
      const d = Math.hypot(n.x - fx, (n.y - fy) * 1.2);
      if (d < 22 && d < md) { md = d; melhor = { tipo: "npc", npc: n, rotulo: `Conversar com ${n.def.nome}` }; }
    }
    {
      const b = this.bola;
      const d = Math.hypot(b.x - fx, b.y - fy);
      if (!b.arremesso && b.alt < 4 && d < 16 && d < md) { md = d; melhor = { tipo: "bola", rotulo: "Arremessar a bola 🏀" }; }
    }
    for (const it of MAPA.interativos) {
      const d = Math.hypot(px(it.x) - fx, py(it.z) - fy);
      if (d < m(it.r) && d < md) {
        if (it.acao === "sentar" && j.sentado) continue;
        let rotulo = it.rotulo;
        if (it.id === "letreiro" && this.revelado) rotulo = "Admirar o letreiro";
        md = d;
        melhor = { tipo: "item", item: it, rotulo };
      }
    }
    return melhor;
  }

  interagir(alvo) {
    const j = this.jogador;
    if (alvo.tipo === "npc") {
      const n = alvo.npc;
      n.conversando = true;
      j.pose = "parado";
      const dx = n.x - j.x;
      const dy = n.y - j.y;
      j.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "esq" : "dir") : dy < 0 ? "cima" : "baixo";
      const conv = new Conversa(n.def, this.estado, j.ap);
      this.modo = "dialogo";
      this.ui.prompt(null);
      this.ui.dialogo({
        conversa: conv,
        npc: n,
        jogador: j,
        aoEscolher: (res) => this.aposEscolha(n, res),
        aoFim: () => {
          n.conversando = false;
          this.modo = "explorar";
          this.ui.salvar();
          if (this.revelarDepois) { this.revelarDepois = false; this.iniciarRevelacao(); }
        },
      });
      return;
    }
    if (alvo.tipo === "bola") return this.arremessar();
    const it = alvo.item;
    if (it.acao === "sentar") {
      j.sentado = true;
      j.x = px(it.x);
      j.y = py(MAPA.murinho.z) + 8;
      j.elevar = 9;
      return;
    }
    if (it.acao === "camarim") return this.ui.abrirCamarim("camarim");
    if (it.acao === "toboagua") return this.iniciarToboagua();
    if (it.acao === "sino") {
      this.audio.sfx("sino");
      const t = this.npcs.find((n) => n.id === "thais_grande");
      if (t) t.acenarAte = this.tempo + 2.5;
      return this.ui.mensagem("Sino do refeitório", "DÉM! DÉM! DÉM! …Em três segundos já tem fila no refeitório.");
    }
    if (it.acao === "letreiro") return this.examinarLetreiro();
    if (it.acao === "musica") {
      ["C5", "E5", "G5", "C6"].forEach((n, k) => setTimeout(() => this.audio.sfx("clique"), k * 120));
      this.audio.sfx("escolha");
      j.acenarAte = this.tempo + 1.5;
    }
    const extras = { palha: "extra_palha", quiosque: "extra_quiosque", casa_porta: "extra_casa" };
    if (extras[it.id] && !this.estado.flags.has(extras[it.id]) && !this.revelado) {
      this.estado.flags.add(extras[it.id]);
      this.audio.sfx("pista");
      this.ui.mensagem(it.rotulo, it.texto, { pistaExtra: true });
      this.ui.salvar();
      return;
    }
    this.ui.mensagem(it.rotulo, it.texto);
  }

  aposEscolha(n, res) {
    if (res.acao === "acenar") { n.acenarAte = this.tempo + 1.6; this.jogador.acenarAte = this.tempo + 1.6; }
    if (res.acao === "dancar") { n.acenarAte = this.tempo + 2; this.jogador.acenarAte = this.tempo + 2; }
    if (res.acao === "camarim") this.ui.abrirCamarim("camarim");
    if (res.acao === "revelar") this.revelarDepois = true;
    if (res.set && res.set.startsWith("pista_")) {
      this.audio.sfx("pista");
      const k = this.pistasEncontradas();
      this.ui.novaPista(TEXTO_PISTAS[res.set], k, PISTAS.length);
    }
  }

  examinarLetreiro() {
    if (this.revelado) return this.ui.mensagem("O letreiro", "H-O-L-L-Y-W-O-O-D. Nove letras brancas gigantes no morro da chácara. O acampamento virou tapete vermelho! ★");
    const k = this.pistasEncontradas();
    this.ui.enigma({
      pistas: k,
      total: PISTAS.length,
      dicaH: this.estado.flags.has("pista_samuel_pitt"),
      aoAcertar: () => this.iniciarRevelacao(),
      aoNaoSaber: () => this.chamarJoao(),
    });
  }

  // ---------- abertura: chegando de ônibus ----------
  iniciarChegada(aoFim) {
    const j = this.jogador;
    this.modo = "chegada";
    this.ui.prompt(null);
    this.chegada = { fase: "dentro", t: 0, aoFim };
    if (!this.passageiros) {
      const aps = [
        { ...aparenciaPadrao("f"), vestido: "nenhum", cima: "listrada", baixo: "jeans", cabelo: "cachos_longos", corCabelo: "#2e1c12", pele: "#a86f47" },
        { ...aparenciaPadrao("m"), casaco: "nenhum", cima: "havaiana", baixo: "bermuda", pescoco: "nenhum", cabelo: "black", pele: "#6b3f24", calcado: "tenis" },
        { ...aparenciaPadrao("m"), casaco: "jaqueta_jeans", cima: "camiseta", baixo: "jeans", pescoco: "nenhum", cabelo: "curto", corCabelo: "#d6b37a", pele: "#f6d7c3", chapeu: "bone" },
      ];
      this.passageiros = aps.map((ap) => gerarFolha(ap));
    }
    const nome = j.ap.nome || "Você";
    this.ui.fala({
      nome,
      retrato: j.retrato,
      textos: [
        "(O ônibus do acampamento balança pela estrada de terra. Lá fora passam pastos, palmeiras e um céu azul enorme.)",
        "Finalmente! Acampamento na chácara… Dá pra sentir que esse fim de semana vai ser especial.",
        "Senhor, eu tô indo de coração aberto. Tô ansioso(a) pra ver o que o Senhor tem preparado pra mim lá.",
        "E esse TEMA? Ninguém quer contar! Todo mundo só fala \"você vai ver…\" e dá risada.",
        "Já sei: vou conversar com todo mundo até alguém deixar escapar uma pista. Olha… o portão! Chegamos!",
      ],
      aoFim: () => {
        const c = this.chegada;
        c.fase = "chegando";
        c.t = 0;
        c.bx = -60;
        c.parada = px(MAPA.portao.x) + 3 - 34; // porta do ônibus na frente do caminho
        this.ui.esconderHud(false);
        j.oculto = true;
        j.x = px(MAPA.portao.x) + 3;
        j.y = py(97.2);
        this.cam.x = px(MAPA.portao.x);
        this.cam.y = py(92);
      },
    });
  }

  atualizarChegada(dt) {
    const c = this.chegada;
    const j = this.jogador;
    c.t += dt;
    const yOnibus = py(98.8);
    if (c.fase === "dentro") return;
    if (c.fase === "chegando") {
      const alvo = c.parada;
      c.bx += Math.max(8, (alvo - c.bx) * 1.8) * dt;
      if (c.bx >= alvo - 0.5) { c.bx = alvo; c.fase = "descer"; c.t = 0; this.audio.sfx("abrir"); }
    } else if (c.fase === "descer") {
      if (c.t > 0.5 && j.oculto) { j.oculto = false; j.dir = "cima"; }
      if (!j.oculto) {
        j.pose = "andar";
        j.t += dt;
        j.y -= 40 * dt;
        if (j.y <= py(MAPA.inicio.z)) { j.y = py(MAPA.inicio.z); c.fase = "partindo"; c.t = 0; }
      }
    } else if (c.fase === "partindo") {
      j.pose = "parado";
      j.dir = "baixo";
      c.bx += (30 + c.t * 90) * dt;
      if (c.t > 0.6 && !c.acenou) { c.acenou = true; j.acenarAte = this.tempo + 1.5; }
      if (j.acenarAte > this.tempo) j.pose = "acenar";
      if (c.bx > c.parada + this.tela.w * 0.7 + 60) {
        this.chegada = null;
        this.modo = "explorar";
        j.dir = "cima";
        this.entrada.limpar();
        c.aoFim?.();
      }
    }
    c.y = yOnibus;
    this.seguirCamera(dt, { x: px(MAPA.portao.x), y: py(93) });
  }

  desenharInteriorOnibus() {
    const ctx = this.ctx;
    const W = this.tela.w;
    const H = this.tela.h;
    const t = this.tempo;
    const bob = Math.round(Math.sin(t * 9) * 0.6 + Math.sin(t * 2.3) * 0.5);
    ctx.save();
    ctx.translate(0, bob);
    interiorOnibus(ctx, W, H, t);
    // passageiros e o jogador sentados nos bancos (em escala 2x)
    const banco = (k) => Math.round(W * 0.04 + k * (W * 0.25) + W * 0.1);
    const yb = Math.round(H * 0.5) + 8;
    const q = (folha) => ctx.drawImage(folha.canvas, 7 * LARG, 0, LARG, ALT, -LARG, -ALT * 2 + 10, LARG * 2, ALT * 2);
    const sentar = (folha, k) => { ctx.save(); ctx.translate(banco(k), yb); q(folha); ctx.restore(); };
    ctx.imageSmoothingEnabled = false;
    sentar(this.passageiros[0], 0);
    sentar(this.jogador.folha, 1);
    sentar(this.passageiros[1], 2);
    sentar(this.passageiros[2], 3);
    ctx.restore();
  }

  // ---------- toboágua ----------
  iniciarToboagua() {
    const tb = this.cen.toboagua;
    const j = this.jogador;
    this.modo = "toboagua";
    this.ui.prompt(null);
    this.ui.rotuloNpc(null);
    j.sentado = false;
    this.tobo = { fase: "subir", t: 0 };
    j.x = tb.torre.x;
    j.y = tb.torre.y;
    j.dir = "cima";
    j.elevar = 0;
    j.frente = true;
  }

  atualizarToboagua(dt) {
    const tb = this.cen.toboagua;
    const j = this.jogador;
    const T = this.tobo;
    T.t += dt;
    j.t += dt;
    const pi = this.cen.piscina;
    if (T.fase === "subir") {
      j.pose = "andar";
      j.dir = "cima";
      j.elevar = Math.min(1, T.t / 1.3) * (tb.torre.y - tb.trilho[0][1] - 4);
      if (T.t > 1.5) { T.fase = "descer"; T.t = 0; this.audio.sfx("escolha"); }
    } else if (T.fase === "descer") {
      const k = Math.min(1, T.t / 1.8);
      const e = k * k * (3 - 2 * k);
      const i = Math.min(tb.trilho.length - 1, Math.floor(e * (tb.trilho.length - 1)));
      const [x, y] = tb.trilho[i];
      j.x = x;
      j.y = tb.fim.y + 1;
      j.elevar = j.y - y - 4;
      j.pose = "sentado";
      j.dir = "baixo";
      if (k >= 1) {
        T.fase = "nadar";
        T.t = 0;
        j.elevar = 0;
        j.frente = false;
        j.nadando = true;
        j.y = tb.fim.y;
        this.audio.sfx("splash");
        for (let n = 0; n < 40; n++) this.particulas.push({ tipo: "confete", x: j.x + (Math.random() - 0.5) * 10, y: j.y - 2, vx: (Math.random() - 0.5) * 70, vy: -40 - Math.random() * 50, vida: 0.7 + Math.random() * 0.4, cor: Math.random() > 0.4 ? "#ffffff" : "#9ad8f8" });
        const t = this.npcs.find((n) => n.id === "taylor_frisso");
        if (t) t.acenarAte = this.tempo + 3;
      }
    } else if (T.fase === "nadar") {
      // nada um pouquinho em direção à borda de baixo da piscina
      j.pose = "andar";
      const alvoX = pi.x0 + (pi.x1 - pi.x0) * 0.35;
      const alvoY = pi.y1 - 6;
      const dx = alvoX - j.x;
      const dy = alvoY - j.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) { j.x += (dx / d) * 26 * dt; j.y += (dy / d) * 26 * dt; }
      j.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "esq" : "dir") : "baixo";
      if (T.t > 0.3 && Math.random() < dt * 6) this.particulas.push({ tipo: "pano", x: j.x + (Math.random() - 0.5) * 12, y: j.y + 1, vx: 0, vy: -6, vida: 0.4, cor: "#ffffff" });
      if (T.t > 4.2 || d < 2) {
        j.nadando = false;
        j.y = pi.y1 + 10;
        j.dir = "baixo";
        j.pose = "parado";
        this.modo = "explorar";
        this.tobo = null;
        this.entrada.limpar();
        this.ui.aviso("💦 <b>Splash!</b> Que descida de estrela!", 2400);
      }
    }
    this.seguirCamera(dt, { x: j.x, y: j.y - (j.elevar || 0) });
  }

  // ---------- bebê João ----------
  chamarJoao() {
    const joao = this.npcs.find((n) => n.id === "joao");
    if (!joao) return this.iniciarRevelacao();
    this.estado.flags.add("joao_apareceu");
    const j = this.jogador;
    joao.x = j.x + 22;
    joao.y = j.y + 2;
    joao.dir = "esq";
    joao.casa = { x: joao.x, y: joao.y };
    joao.alvo = null;
    joao.espera = 99;
    this.audio.sfx("pista");
    for (let k = 0; k < 30; k++) this.particulas.push({ tipo: "confete", x: joao.x + (Math.random() - 0.5) * 16, y: joao.y - 10 - Math.random() * 10, vx: (Math.random() - 0.5) * 40, vy: -30 - Math.random() * 30, vida: 0.9, cor: ["#ffd84a", "#ffffff", "#f08aa8"][k % 3] });
    j.dir = "dir";
    setTimeout(() => {
      this.ui.mensagem("Ué… quem é esse?", "Um bebê moreninho de cachinhos aparece engatinhando, todo sorridente. É o João, filho da Thais e do Davi!", {
        aoFim: () => this.interagir({ tipo: "npc", npc: joao }),
      });
    }, 500);
  }

  // Depois da revelação o João fica com a mãe, perto do refeitório.
  levarJoaoParaCasa() {
    const joao = this.npcs.find((n) => n.id === "joao");
    if (!joao) return;
    const p = { x: px(joao.def.local.x), y: py(joao.def.local.z) };
    Object.assign(joao, { x: p.x, y: p.y, casa: p, alvo: null, espera: 1 });
  }

  // ---------- revelação ----------
  aplicarRevelacao(sim) {
    for (const l of this.cen.letras) {
      l.mostrandoLetra = sim;
      l.voando = 0;
    }
  }

  iniciarRevelacao() {
    this.modo = "cena";
    this.cena = { t: 0, proxFogo: 0, lonasFora: 0, mostrouTexto: false };
    this.ui.prompt(null);
    this.ui.limparAvisos();
    this.ui.esconderHud(true);
    this.audio.parar(1.5);
    this.audio.tensao(0);
  }

  atualizarCena(dt) {
    const c = this.cena;
    c.t += dt;
    this.anoitecer = Math.min(1, c.t / 2.5);
    const foco = { x: px(MAPA.letreiro.x), y: py(MAPA.letreiro.z) - 10 };
    this.seguirCamera(dt, foco);
    const letras = this.cen.letras;
    // lonas saem voando uma a uma
    const t0 = 2.2;
    while (c.lonasFora < letras.length && c.t > t0 + c.lonasFora * 0.42) {
      const l = letras[c.lonasFora];
      l.mostrandoLetra = true;
      this.audio.sfx("lona");
      for (let k = 0; k < 26; k++) this.particulas.push({ tipo: "pano", x: l.x + (Math.random() - 0.5) * 30, y: l.y - 20 - Math.random() * 30, vx: (Math.random() - 0.3) * 60, vy: -40 - Math.random() * 60, vida: 1.4 + Math.random(), cor: Math.random() > 0.5 ? "#f4f2ea" : "#d8d4c8" });
      c.lonasFora++;
    }
    const tFim = t0 + letras.length * 0.42;
    if (c.t > tFim && !c.revelou) {
      c.revelou = true;
      this.estado.flags.add("tema_revelado");
      this.audio.sfx("revelar");
      this.audio.tocar("revelacao", 0.4);
    }
    if (c.revelou && c.t < tFim + 14 && c.t > c.proxFogo) {
      c.proxFogo = c.t + 0.35 + Math.random() * 0.4;
      this.fogos(foco.x + (Math.random() - 0.5) * 300, foco.y - 70 - Math.random() * 50);
    }
    if (c.revelou && !c.mostrouTexto && c.t > tFim + 1.6) {
      c.mostrouTexto = true;
      this.ui.revelacao(() => this.encerrarRevelacao());
    }
  }

  encerrarRevelacao() {
    this.modo = "explorar";
    this.levarJoaoParaCasa();
    this.clarear = true;
    this.cena = null;
    this.ui.esconderHud(false);
    this.audio.tocar("chacara");
    this.ui.salvar();
    this.ui.aposRevelacao();
  }

  fogos(x, y) {
    this.audio.sfx("fogos");
    const cores = ["#ffd23f", "#ff6f59", "#ffffff", "#e05a9c", "#7fd1ff", "#b48cff"];
    const cor = cores[Math.floor(Math.random() * cores.length)];
    const cor2 = cores[Math.floor(Math.random() * cores.length)];
    for (let k = 0; k < 46; k++) {
      const a = (k / 46) * Math.PI * 2;
      const v = 40 + Math.random() * 30;
      this.particulas.push({ tipo: "fogo", x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vida: 1.2 + Math.random() * 0.6, cor: k % 3 ? cor : cor2 });
    }
  }

  atualizarParticulas(dt) {
    for (const p of this.particulas) {
      p.vida -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.tipo === "fogo") { p.vy += 30 * dt; p.vx *= 0.985; p.vy *= 0.985; }
      if (p.tipo === "pano") { p.vy += 20 * dt; p.vx += Math.sin(p.vida * 6) * 10 * dt; }
      if (p.tipo === "confete") { p.vy += 40 * dt; }
    }
    this.particulas = this.particulas.filter((p) => p.vida > 0);
    if (this.revelado && this.modo === "explorar" && Math.random() < dt * 0.5) {
      const L = { x: px(MAPA.letreiro.x), y: py(MAPA.letreiro.z) };
      if (Math.hypot(this.jogador.x - L.x, this.jogador.y - L.y) < 300) this.fogos(L.x + (Math.random() - 0.5) * 280, L.y - 90 - Math.random() * 40);
    }
  }

  // Tapete vermelho + estrelas da calçada (aparecem depois da revelação).
  pintarTapete() {
    const x0 = px(-1.6);
    const x1 = px(1.6);
    const y0 = py(-32);
    const y1 = py(2);
    const c = criarCanvas(x1 - x0 + 16, y1 - y0 + 4);
    const g = c.getContext("2d");
    for (let y = 0; y < c.height; y++) {
      g.fillStyle = "#e2b13c";
      g.fillRect(6, y, 2, 1);
      g.fillRect(c.width - 8, y, 2, 1);
      g.fillStyle = y % 6 === 0 ? "#9a0e1a" : "#b8121f";
      g.fillRect(8, y, c.width - 16, 1);
    }
    // estrelas da calçada (no pátio)
    const estrelas = criarCanvas(px(6) - px(-6), 18);
    const e = estrelas.getContext("2d");
    for (let k = 0; k < 6; k++) {
      const cx = 8 + k * 16;
      e.fillStyle = "#d86a7a";
      e.fillRect(cx - 6, 2, 13, 13);
      e.fillStyle = "#e2b13c";
      for (const [dx, dy] of [[0, -4], [-1, -3], [0, -3], [1, -3], [-4, -1], [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1], [4, -1], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [-2, 1], [-1, 1], [1, 1], [2, 1], [-3, 2], [-2, 2], [2, 2], [3, 2], [0, 1]]) e.fillRect(cx + dx, 8 + dy, 1, 1);
    }
    return { img: c, x: x0 - 8, y: y0, estrelas, ex: px(-6) + 2, ey: py(7) };
  }

  // ---------- desenho ----------
  desenhar() {
    if (this.chegada?.fase === "dentro") return this.desenharInteriorOnibus();
    const ctx = this.ctx;
    const W = this.tela.w;
    const H = this.tela.h;
    const cen = this.cen;
    let cx = Math.round(this.cam.x - W / 2);
    let cy = Math.round(this.cam.y - H / 2);
    cx = Math.max(0, Math.min(cen.W - W, cx));
    cy = Math.max(0, Math.min(cen.H - H, cy));
    if (cen.W < W) cx = Math.round((cen.W - W) / 2);
    if (cen.H < H) cy = Math.round((cen.H - H) / 2);
    this.camPx = { x: cx, y: cy };
    ctx.fillStyle = "#24502a";
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(cen.chao, cx, cy, W, H, 0, 0, W, H);
    const t = this.tempo;
    // brilhos na água
    for (const [x, y, k] of cen.brilhos) {
      if (x < cx || y < cy || x >= cx + W || y >= cy + H) continue;
      const f = (t * (k === 2 ? 0.9 : 0.6) + hash(x, y, 3) * 10) % 1;
      if (f < 0.16) {
        ctx.fillStyle = k === 0 ? "#9ac8b0" : "#ffffff";
        ctx.fillRect(x - cx, y - cy, f < 0.08 ? 2 : 1, 1);
      }
    }
    // ondinhas da piscina
    const pi = cen.piscina;
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (let k = 0; k < 6; k++) {
      const yy = pi.y0 + 6 + ((k * 11 + t * 6) % (pi.y1 - pi.y0 - 10));
      const xx = pi.x0 + ((k * 37 + t * 9) % (pi.x1 - pi.x0 - 20));
      ctx.fillRect(xx - cx, Math.floor(yy) - cy, 10, 1);
    }
    if (this.revelado) {
      const tp = this.tapete;
      ctx.drawImage(tp.img, tp.x - cx, tp.y - cy);
      ctx.drawImage(tp.estrelas, tp.ex - cx, tp.ey - cy);
    }
    // objetos e personagens em ordem de profundidade
    const lista = [];
    for (const o of cen.objetos) {
      const x0 = o.x - o.ox;
      const y0 = o.y - o.oy;
      if (x0 > cx + W || y0 > cy + H || x0 + o.w < cx || y0 + o.h < cy + -0) continue;
      lista.push(o);
    }
    const atores = [...(this.jogador.oculto ? [] : [this.jogador]), ...this.npcsVisiveis];
    if (this.chegada && this.chegada.fase !== "dentro") {
      const c = this.chegada;
      const spr = onibus(Math.floor(this.tempo * 10) % 2, c.fase === "descer");
      lista.push({ ...spr, x: Math.round(c.bx), y: c.y, opaco: true });
    }
    for (const a of atores) if (Math.abs(a.x - this.cam.x) < W && Math.abs(a.y - this.cam.y) < H) lista.push(a);
    const prof = (o) => (o.chao ? -1e9 : o.frente ? 1e9 : o.y);
    lista.sort((a, b) => prof(a) - prof(b));
    const j = this.jogador;
    const letrasVis = [];
    for (const o of lista) {
      if (o instanceof Ator) { this.desenharAtor(o, cx, cy); continue; }
      let img = o.img;
      let ox = o.ox;
      let oy = o.oy;
      if (o.quadros) img = o.quadros[Math.floor(t * 8) % o.quadros.length].img;
      if (o.tipo === "lona" && o.mostrandoLetra) {
        const l = this.revelado && Math.sin(t * 3 + o.i) > 0.3 ? o.letraBrilho : o.letra;
        img = l.img; ox = l.ox; oy = l.oy;
        letrasVis.push([l, o]);
      }
      // fica translúcido se estiver na frente do jogador
      let alfa = 1;
      if (!o.opaco && o.h > 34 && j.y < o.y - 2 && j.y > o.y - oy && Math.abs(j.x - o.x) < (o.ox + 4) && j.x > o.x - ox && j.x < o.x - ox + o.w) alfa = 0.55;
      if (alfa < 1) ctx.globalAlpha = alfa;
      ctx.drawImage(img, Math.round(o.x - ox - cx), Math.round(o.y - oy - cy));
      ctx.globalAlpha = 1;
      if (o.fogo) this.desenharFogo(o.x - cx, o.y - cy - 8);
    }
    this.desenharBola(cx, cy);
    // indicadores sobre os NPCs
    for (const n of this.npcsVisiveis) {
      if (n.bebe || n.def.extra) continue;
      const sx = Math.round(n.x - cx);
      const sy = Math.round(n.y - cy - ALT - 6 + Math.sin(t * 4) * 1.5);
      const temPista = !this.estado.flags.has(`pista_${n.id}`) && !this.revelado;
      if (temPista && !n.conversando) this.balao(sx, sy, "!", "#ffd84a");
    }
    if (!this.revelado && this.pistasEncontradas() >= PISTAS.length) {
      const L = { x: px(MAPA.letreiro.x) - cx, y: py(MAPA.letreiro.z) - cy - 62 + Math.sin(t * 3) * 2 };
      this.balao(Math.round(L.x), Math.round(L.y), "?", "#ffd84a");
    }
    // anoitecer da cena de revelação
    if (this.anoitecer > 0) {
      ctx.fillStyle = `rgba(24,12,56,${0.55 * this.anoitecer})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = this.anoitecer * 0.85;
      for (const [l, o] of letrasVis) ctx.drawImage(o.letraBrilho.img, Math.round(o.x - l.ox - cx), Math.round(o.y - l.oy - cy));
      ctx.globalAlpha = 1;
    }
    // partículas
    for (const p of this.particulas) {
      ctx.globalAlpha = Math.min(1, p.vida * 1.5);
      ctx.fillStyle = p.cor;
      const x = Math.round(p.x - cx);
      const y = Math.round(p.y - cy);
      if (p.tipo === "fogo") {
        ctx.fillRect(x, y, 2, 2);
        ctx.globalAlpha *= 0.35;
        ctx.fillRect(x - 1, y - 1, 4, 4);
      } else ctx.fillRect(x, y, p.tipo === "pano" ? 3 : 1, p.tipo === "pano" ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    // holofotes de estreia
    if (this.revelado || this.cena?.revelou) this.holofotes(cx, cy);
    // nome do NPC próximo
    if (this.alvo?.tipo === "npc" && this.modo === "explorar") {
      const n = this.alvo.npc;
      const alto = n.bebe ? 20 : ALT;
      const temBalao = !n.bebe && !n.def.extra && !this.estado.flags.has(`pista_${n.id}`) && !this.revelado;
      this.ui.rotuloNpc(n.def.nome, n.x - cx, n.y - cy - alto - (temBalao ? 12 : 2));
    } else this.ui.rotuloNpc(null);
  }

  desenharAtor(a, cx, cy) {
    const ctx = this.ctx;
    const x = Math.round(a.x - cx);
    const y = Math.round(a.y - cy);
    if (!a.nadando && !a.elevar) {
      ctx.fillStyle = "rgba(10,30,14,0.32)";
      ctx.beginPath();
      ctx.ellipse(x, y - 1, a.bebe ? 5 : 7, a.bebe ? 2 : 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const q = quadroDe(a.dir, a.pose, a.t);
    const bob = a.def?.comportamento?.tipo === "dancar" && !a.conversando ? (Math.floor(a.t * 4.8) % 2) : 0;
    const el = Math.round(a.elevar || 0);
    if (a.nadando) {
      // só cabeça e ombros para fora da água, com ondinhas em volta
      const corte = 20;
      ctx.drawImage(a.folha.canvas, q.sx, q.sy, LARG, corte, x - (LARG >> 1), y - corte + 2 + Math.round(Math.sin(this.tempo * 5)), LARG, corte);
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 9 + Math.sin(this.tempo * 4) * 1.5, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    ctx.drawImage(a.folha.canvas, q.sx, q.sy, LARG, ALT, x - (LARG >> 1), y - ALT + 2 - bob - el, LARG, ALT);
  }

  desenharFogo(x, y) {
    const ctx = this.ctx;
    const t = this.tempo;
    for (let k = 0; k < 14; k++) {
      const f = (t * 1.6 + k * 0.37) % 1;
      const dx = Math.sin(k * 1.7 + t * 3) * (3 - f * 2);
      ctx.fillStyle = f < 0.3 ? "#fff3a0" : f < 0.6 ? "#ffb030" : "#e0482a";
      ctx.fillRect(Math.round(x + dx), Math.round(y - f * 14), f < 0.5 ? 2 : 1, 2);
    }
  }

  balao(x, y, ch, cor) {
    const ctx = this.ctx;
    ctx.fillStyle = "#1a1228";
    ctx.fillRect(x - 4, y - 6, 9, 10);
    ctx.fillRect(x - 1, y + 4, 3, 2);
    ctx.fillStyle = cor;
    ctx.fillRect(x - 3, y - 5, 7, 8);
    ctx.fillStyle = "#1a1228";
    if (ch === "!") { ctx.fillRect(x, y - 4, 1, 4); ctx.fillRect(x, y + 1, 1, 1); }
    else { ctx.fillRect(x - 1, y - 4, 3, 1); ctx.fillRect(x + 1, y - 3, 1, 2); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x, y + 1, 1, 1); }
  }

  rotulo(txt, x, y) {
    const ctx = this.ctx;
    ctx.font = "8px 'Pixelify Sans', monospace";
    const w = Math.ceil(ctx.measureText(txt).width) + 6;
    ctx.fillStyle = "rgba(20,12,36,0.8)";
    ctx.fillRect(x - (w >> 1), y - 9, w, 10);
    ctx.fillStyle = "#ffe9a8";
    ctx.textBaseline = "bottom";
    ctx.fillText(txt, x - (w >> 1) + 3, y);
  }

  holofotes(cx, cy) {
    const ctx = this.ctx;
    const L = { x: px(MAPA.letreiro.x) - cx, y: py(MAPA.letreiro.z) - cy };
    if (L.x < -400 || L.x > this.tela.w + 400 || L.y < -300 || L.y > this.tela.h + 400) return;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const s of [-1, 1]) {
      const bx = L.x + s * 210;
      const by = L.y + 10;
      const a = -Math.PI / 2 + s * 0.35 + Math.sin(this.tempo * 0.7 + s) * 0.35;
      const comp = 300;
      const g = ctx.createLinearGradient(bx, by, bx + Math.cos(a) * comp, by + Math.sin(a) * comp);
      g.addColorStop(0, "rgba(255,240,190,0.22)");
      g.addColorStop(1, "rgba(255,240,190,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + Math.cos(a - 0.08) * comp, by + Math.sin(a - 0.08) * comp);
      ctx.lineTo(bx + Math.cos(a + 0.08) * comp, by + Math.sin(a + 0.08) * comp);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Mapa completo (para a tela de mapa)
  desenharMapa(canvas) {
    const c = canvas.getContext("2d");
    const k = Math.min(canvas.width / this.cen.W, canvas.height / this.cen.H);
    c.imageSmoothingEnabled = true;
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.drawImage(this.cen.chao, 0, 0, this.cen.W * k, this.cen.H * k);
    for (const o of this.cen.objetos) {
      if (o.h < 30 && !o.chao) continue;
      c.drawImage(o.img, (o.x - o.ox) * k, (o.y - o.oy) * k, o.w * k, o.h * k);
    }
    return k;
  }
}
