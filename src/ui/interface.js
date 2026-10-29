// Interface (HTML por cima do canvas): HUD, diálogos, avisos, diário, enigma, revelação, mapa e menus.
import { TEMA } from "../config.js";
import { PISTAS, TEXTO_PISTAS, PISTAS_EXTRAS } from "../jogo.js";
import { MAPA, px, py } from "../dados/mapa.js";

export const $ = (id) => document.getElementById(id);
const VEL_TEXTO = 46; // letras por segundo

export class Interface {
  constructor(app) {
    this.app = app;
    this.dlg = null;
    this.avisos = [];
    // fechar painéis
    document.querySelectorAll("[data-fechar]").forEach((b) => {
      b.addEventListener("click", () => this.fecharPainel(b.closest(".painel-tela")));
    });
    $("dialogo").addEventListener("click", (e) => {
      if (e.target.closest(".opcoes button")) return;
      this.avancarDialogo();
    });
    window.addEventListener("keydown", (e) => this.teclaDialogo(e));
    window.addEventListener("keydown", (e) => {
      if (e.code === "Escape") {
        const aberto = [...document.querySelectorAll(".painel-tela")].find((p) => !p.hidden && p.id !== "confirmar");
        if (aberto && aberto.id !== "pausa") { e.stopPropagation(); this.fecharPainel(aberto); }
        else if (aberto?.id === "pausa") this.fecharPainel(aberto);
      }
      if (e.code === "KeyJ" && !$("diario").hidden) this.fecharPainel($("diario"));
      if (e.code === "KeyM" && !$("mapa").hidden && !(e.target instanceof HTMLInputElement)) this.fecharPainel($("mapa"));
    }, true);
    $("btn-diario-hud").onclick = () => this.app.jogo.modo === "explorar" && this.abrirDiario();
    $("btn-camarim-hud").onclick = () => this.app.jogo.modo === "explorar" && this.abrirCamarim("camarim");
    $("btn-mapa-hud").onclick = () => this.app.jogo.modo === "explorar" && this.abrirMapa();
    $("btn-pausa").onclick = () => this.app.jogo.modo === "explorar" && this.pausar();
    $("btn-som").onclick = () => this.app.alternarSom();
    $("hud-eu").onclick = () => this.app.jogo.modo === "explorar" && this.abrirCamarim("camarim");
    $("pausa").addEventListener("click", (e) => {
      const b = e.target.closest("[data-acao]");
      if (!b) return;
      const a = b.dataset.acao;
      this.app.audio.sfx("clique");
      if (a === "voltar") return this.fecharPainel($("pausa"));
      if (a === "camarim") { this.fecharPainel($("pausa")); return this.abrirCamarim("camarim"); }
      if (a === "diario") { $("pausa").hidden = true; return this.abrirDiario(true); }
      if (a === "mapa") { $("pausa").hidden = true; return this.abrirMapa(true); }
      if (a === "config") return this.app.abrirConfig();
      if (a === "tela-cheia") return this.app.telaCheia();
      if (a === "menu") { $("pausa").hidden = true; return this.app.irParaTitulo(); }
    });
    $("enigma-entrada").addEventListener("input", () => this.atualizarCaixas());
    $("enigma-entrada").addEventListener("keydown", (e) => { if (e.key === "Enter") this.tentarEnigma(); });
    $("enigma-ok").onclick = () => this.tentarEnigma();
    $("rev-ok").onclick = () => {
      $("revelacao").hidden = true;
      this.aoFimRevelacao?.();
    };
  }

  // ---------- painéis ----------
  abrirPainel(el, modo = "painel") {
    this.voltarModo = this.app.jogo.modo === "painel" ? this.voltarModo : this.app.jogo.modo;
    this.app.jogo.modo = modo;
    el.hidden = false;
    this.prompt(null);
  }
  fecharPainel(el) {
    if (!el || el.hidden) return;
    el.hidden = true;
    this.app.entrada.limpar();
    if (el.id === "config" || el.id === "creditos") { this.app.aoFecharConfig?.(el.id); return; }
    if (el.id === "modal-camera") { this.app.camarim?.fecharCamera(); return; }
    if (el.id === "confirmar") return;
    if (this.voltarPausa && (el.id === "diario" || el.id === "mapa")) { this.voltarPausa = false; $("pausa").hidden = false; return; }
    if (this.app.jogo.modo === "painel") this.app.jogo.modo = this.voltarModo === "dialogo" ? "explorar" : this.voltarModo || "explorar";
  }

  pausar() {
    this.abrirPainel($("pausa"));
    this.app.salvar();
  }

  esconderHud(sim) {
    $("hud").hidden = sim;
    $("toque").hidden = sim || !this.app.toqueAtivo;
  }

  prompt(txt) {
    const p = $("prompt");
    const b = $("btn-interagir");
    if (!txt) { p.hidden = true; b.classList.remove("disponivel"); return; }
    $("prompt-texto").textContent = txt;
    p.hidden = false;
    b.classList.add("disponivel");
  }

  limparAvisos() {
    this.avisos = [];
    clearTimeout(this.tAviso);
    $("aviso").hidden = true;
  }

  aviso(html, ms = 3200) {
    const a = $("aviso");
    this.avisos.push([html, ms]);
    if (this.avisos.length > 1) return;
    const prox = () => {
      if (!this.avisos.length) { a.hidden = true; return; }
      const [h, t] = this.avisos[0];
      a.innerHTML = h;
      a.hidden = false;
      a.style.animation = "none";
      void a.offsetWidth;
      a.style.animation = "";
      clearTimeout(this.tAviso);
      this.tAviso = setTimeout(() => { this.avisos.shift(); prox(); }, this.avisos.length > 1 ? Math.min(t, 1800) : t);
    };
    prox();
  }

  // ---------- HUD ----------
  atualizarHud() {
    const j = this.app.jogo;
    const c = $("hud-retrato");
    const x = c.getContext("2d");
    x.clearRect(0, 0, 64, 64);
    x.imageSmoothingEnabled = false;
    x.drawImage(j.jogador.retrato, 0, 0);
    $("hud-nome").textContent = j.jogador.ap.nome || "Você";
    this.atualizarObjetivo();
  }

  atualizarObjetivo(novo = false) {
    const j = this.app.jogo;
    const k = j.pistasEncontradas();
    let t;
    if (j.revelado) t = "O tema é HOLLYWOOD! Monte seu look de estrela no camarim e desfile no tapete vermelho do gramado.";
    else if (k >= PISTAS.length) t = "Você tem todas as pistas! Vá até as lonas brancas no morro, ao lado da casa amarela.";
    else t = "Converse com todo mundo e descubra o tema secreto do acampamento.";
    $("objetivo-texto").textContent = t;
    $("objetivo-pistas").innerHTML = j.revelado ? "" : PISTAS.map((p) => `<i class="${j.estado.flags.has(p.flag) ? "sim" : ""}"></i>`).join("");
    if (novo) {
      const o = $("objetivo");
      o.classList.remove("novo");
      void o.offsetWidth;
      o.classList.add("novo");
    }
  }

  novaPista(texto, k, total) {
    this.aviso(`★ <b>Nova pista (${k}/${total})</b><br>${texto}`, 4200);
    this.atualizarObjetivo(true);
    if (k >= total) setTimeout(() => this.aviso("Você juntou todas as pistas! <b>Vá até as lonas no morro</b>, perto da casa amarela.", 4600), 300);
  }

  // ---------- diálogo ----------
  dialogo({ conversa, npc, jogador, aoEscolher, aoFim }) {
    this.dlg = { conversa, npc, jogador, aoEscolher, aoFim, tipo: "npc" };
    $("dialogo").classList.remove("sem-retrato");
    this.desenharRetrato("dlg-retrato", npc.retrato);
    this.desenharRetrato("dlg-eu", jogador.retrato);
    $("dlg-nome").textContent = npc.def.nome;
    $("dialogo").hidden = false;
    this.app.audio.sfx("abrir");
    this.escrever(conversa.texto(jogador.ap.nome));
  }

  mensagem(titulo, texto, { pistaExtra = false } = {}) {
    const j = this.app.jogo;
    const modo = j.modo;
    j.modo = "dialogo";
    this.dlg = { tipo: "msg", aoFim: () => { j.modo = modo === "dialogo" ? "explorar" : modo; } };
    $("dialogo").classList.add("sem-retrato");
    $("dlg-eu-caixa").hidden = true;
    $("dlg-nome").textContent = titulo;
    $("dialogo").hidden = false;
    this.prompt(null);
    this.escrever(texto);
    if (pistaExtra) setTimeout(() => this.aviso("✎ <b>Achado anotado no diário de pistas</b>", 2600), 400);
  }

  desenharRetrato(id, img) {
    const c = $(id);
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, 64, 64);
    x.drawImage(img, 0, 0);
  }

  escrever(texto) {
    const d = this.dlg;
    d.texto = texto;
    d.mostrado = 0;
    d.completo = false;
    $("dlg-opcoes").innerHTML = "";
    $("dlg-eu-caixa").hidden = true;
    $("dialogo").classList.remove("completo");
    const el = $("dlg-texto");
    el.textContent = "";
    clearInterval(this.timer);
    let ultimo = performance.now();
    let acum = 0;
    this.timer = setInterval(() => {
      const agora = performance.now();
      acum += ((agora - ultimo) / 1000) * VEL_TEXTO;
      ultimo = agora;
      const n = Math.floor(acum);
      if (n <= 0) return;
      acum -= n;
      const antes = d.mostrado;
      d.mostrado = Math.min(texto.length, d.mostrado + n);
      el.textContent = texto.slice(0, d.mostrado);
      if (d.tipo === "npc" && /\S/.test(texto.slice(antes, d.mostrado)) && antes % 2 === 0) this.app.audio.blip(d.npc.id);
      if (d.mostrado >= texto.length) this.completar();
    }, 16);
  }

  completar() {
    const d = this.dlg;
    if (!d || d.completo) return;
    clearInterval(this.timer);
    d.completo = true;
    $("dlg-texto").textContent = d.texto;
    $("dialogo").classList.add("completo");
    if (d.tipo === "npc") this.mostrarOpcoes();
  }

  mostrarOpcoes() {
    const d = this.dlg;
    const box = $("dlg-opcoes");
    box.innerHTML = "";
    $("dlg-eu-caixa").hidden = false;
    d.opcoes = d.conversa.opcoes();
    d.foco = 0;
    d.opcoes.forEach((op, i) => {
      const b = document.createElement("button");
      b.innerHTML = `<span class="num">${i + 1}.</span>`;
      b.append(document.createTextNode(op.label));
      if (op.set?.startsWith("pista_") || op.next === "pista") b.classList.add("pista");
      b.onclick = (e) => { e.stopPropagation(); this.escolher(i); };
      b.onmouseenter = () => { d.foco = i; this.focarOpcao(); };
      box.append(b);
    });
    this.focarOpcao();
    $("dialogo").classList.remove("completo");
  }

  focarOpcao() {
    const d = this.dlg;
    [...$("dlg-opcoes").children].forEach((b, i) => b.classList.toggle("foco", i === d.foco));
  }

  escolher(i) {
    const d = this.dlg;
    const op = d.opcoes?.[i];
    if (!op) return;
    this.app.audio.sfx("escolha");
    const res = d.conversa.escolher(op);
    d.aoEscolher?.(res);
    if (res.fim) return this.fecharDialogo();
    this.escrever(d.conversa.texto(d.jogador.ap.nome));
  }

  avancarDialogo() {
    const d = this.dlg;
    if (!d) return;
    if (!d.completo) return this.completar();
    if (d.tipo === "msg") this.fecharDialogo();
  }

  fecharDialogo() {
    const d = this.dlg;
    clearInterval(this.timer);
    $("dialogo").hidden = true;
    this.dlg = null;
    this.app.entrada.limpar();
    this.app.audio.sfx("fechar");
    d?.aoFim?.();
    this.atualizarObjetivo();
  }

  teclaDialogo(e) {
    const d = this.dlg;
    if (!d || $("dialogo").hidden) return;
    if (e.target instanceof HTMLInputElement) return;
    const k = e.code;
    if (["Space", "Enter", "KeyE", "NumpadEnter"].includes(k)) {
      e.preventDefault();
      if (e.repeat) return;
      if (d.completo && d.opcoes && d.tipo === "npc") return this.escolher(d.foco);
      return this.avancarDialogo();
    }
    if (d.tipo === "npc" && d.completo && d.opcoes) {
      if (k === "ArrowDown" || k === "KeyS") { d.foco = (d.foco + 1) % d.opcoes.length; this.focarOpcao(); e.preventDefault(); }
      if (k === "ArrowUp" || k === "KeyW") { d.foco = (d.foco - 1 + d.opcoes.length) % d.opcoes.length; this.focarOpcao(); e.preventDefault(); }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= d.opcoes.length) this.escolher(n - 1);
    }
    if (k === "Escape") {
      e.preventDefault();
      if (d.tipo === "msg") return this.fecharDialogo();
      const tchau = d.opcoes?.findIndex((o) => o.end);
      if (tchau >= 0 && d.completo) this.escolher(tchau);
    }
  }

  // ---------- diário ----------
  abrirDiario(daPausa = false) {
    const j = this.app.jogo;
    this.voltarPausa = daPausa;
    const lista = $("lista-pistas");
    lista.innerHTML = "";
    for (const p of PISTAS) {
      const tem = j.estado.flags.has(p.flag);
      const li = document.createElement("li");
      li.className = tem ? "sim" : "nao";
      const c = document.createElement("canvas");
      c.width = 64; c.height = 64;
      const npc = j.npcs.find((n) => n.id === p.id);
      const x = c.getContext("2d");
      if (tem && npc) x.drawImage(npc.retrato, 0, 0);
      else { x.fillStyle = "#3a2c56"; x.fillRect(0, 0, 64, 64); x.fillStyle = "#8a7aa8"; x.font = "40px monospace"; x.fillText("?", 20, 46); }
      li.append(c);
      const s = document.createElement("span");
      s.textContent = tem ? TEXTO_PISTAS[p.flag] : `??? — Converse com ${p.nome}.`;
      li.append(s);
      lista.append(li);
    }
    const ex = $("lista-extras");
    ex.innerHTML = "";
    const achados = Object.entries(PISTAS_EXTRAS).filter(([f]) => j.estado.flags.has(f));
    if (!achados.length) ex.innerHTML = `<li class="nao">Nada ainda. Fuçe a chácara: a palha do pátio, o quiosque, a casa amarela…</li>`;
    for (const [, t] of achados) { const li = document.createElement("li"); li.className = "sim"; li.textContent = t; ex.append(li); }
    const k = j.pistasEncontradas();
    $("diario-dica").textContent = j.revelado ? "Mistério resolvido: o tema é HOLLYWOOD! ★" : k >= PISTAS.length ? "Todas as pistas! Vá até as lonas no morro e diga qual é a palavra." : `Pistas: ${k}/${PISTAS.length}. As pessoas com ! sobre a cabeça têm algo a contar.`;
    this.abrirPainel($("diario"));
    this.app.audio.sfx("abrir");
  }

  // ---------- enigma ----------
  enigma({ pistas, total, dicaH, aoAcertar }) {
    this.enigmaDados = { aoAcertar, dicaH, erros: 0 };
    let t = "Nove formas enormes cobertas por lonas brancas, amarradas com cordas, viradas para a chácara inteira. Alguma coisa vai ser revelada aqui…";
    if (pistas < total) t += ` Você tem ${pistas} de ${total} pistas. Se ainda não souber, converse com mais gente — mas pode arriscar!`;
    else t += " Você juntou todas as pistas. Qual é a palavra escrita embaixo das lonas?";
    $("enigma-texto").textContent = t;
    const ent = $("enigma-entrada");
    ent.value = "";
    $("enigma-retorno").textContent = dicaH ? "Dica do Samuel: começa com H." : "";
    $("enigma-retorno").className = "retorno";
    this.atualizarCaixas();
    this.abrirPainel($("enigma"));
    this.app.audio.sfx("abrir");
    setTimeout(() => ent.focus(), 60);
  }

  atualizarCaixas() {
    const ent = $("enigma-entrada");
    const v = normalizar(ent.value);
    const box = $("enigma-caixas");
    box.innerHTML = "";
    for (let i = 0; i < TEMA.length; i++) {
      const s = document.createElement("span");
      s.textContent = v[i] || (i === 0 && this.enigmaDados?.dicaH ? "" : "");
      if (i === v.length) s.className = "atual";
      box.append(s);
    }
  }

  tentarEnigma() {
    const v = normalizar($("enigma-entrada").value);
    const r = $("enigma-retorno");
    const d = this.enigmaDados;
    if (v === TEMA) {
      r.textContent = "É isso!!!";
      r.className = "retorno ok";
      this.app.audio.sfx("pista");
      setTimeout(() => {
        $("enigma").hidden = true;
        this.app.jogo.modo = "explorar";
        d.aoAcertar();
      }, 500);
      return;
    }
    d.erros++;
    this.app.audio.sfx("erro");
    const caixa = $("enigma-caixas");
    caixa.classList.remove("tremer");
    void caixa.offsetWidth;
    caixa.classList.add("tremer");
    const dicas = [
      v.length !== TEMA.length ? `São ${TEMA.length} letras.` : "Hmm, não é isso. As lonas nem se mexeram.",
      "Pense em cinema, tapete vermelho, estrelas na calçada, pipoca e estreia…",
      "Um letreiro famoso num morro, com letras brancas gigantes. Começa com H.",
      "H _ _ _ Y W _ _ D",
    ];
    r.textContent = dicas[Math.min(d.erros - 1, dicas.length - 1)];
    r.className = "retorno";
  }

  // ---------- revelação ----------
  revelacao(aoFim) {
    this.aoFimRevelacao = aoFim;
    $("revelacao").hidden = false;
    setTimeout(() => $("rev-ok").focus(), 100);
  }

  aposRevelacao() {
    this.atualizarObjetivo(true);
    this.aviso("★ <b>Coleção Calçada da Fama liberada!</b><br>Smoking de estrelas, vestido da grande estreia, estatueta, claquete e pipoca no camarim.", 5200);
    this.app.atualizarTitulo();
  }

  // ---------- mapa ----------
  abrirMapa(daPausa = false) {
    this.voltarPausa = daPausa;
    const j = this.app.jogo;
    const c = $("mapa-canvas");
    j.desenharMapa(c);
    const rot = $("mapa-rotulos");
    rot.innerHTML = "";
    const W = j.cen.W;
    const H = j.cen.H;
    const marca = (x, y, txt, cls = "") => {
      const s = document.createElement("span");
      s.textContent = txt;
      s.className = cls;
      s.style.left = `${(x / W) * 100}%`;
      s.style.top = `${(y / H) * 100}%`;
      rot.append(s);
    };
    const areas = [
      ["patio", "Pátio azul"], ["lago", "Lago"], ["terraco", "Piscina"], ["casa", "Casa amarela"], ["cachoeira", "Cachoeira*"],
      ["refeitorio", "Refeitório*"], ["quadra", "Quadra*"], ["fogueira", "Fogueira*"], ["alojamento", "Alojamento e camarim*"], ["portao", "Portão*"],
    ];
    for (const [k, nome] of areas) { const a = MAPA[k]; marca(px(a.x), py(a.z) + (k === "casa" ? 30 : 0), nome); }
    marca(px(MAPA.letreiro.x), py(MAPA.letreiro.z) - 20, j.revelado ? "Letreiro HOLLYWOOD" : "Lonas misteriosas");
    for (const n of j.npcs) marca(n.x, n.y, n.def.nome.split(" ")[0], "npc");
    marca(j.jogador.x, j.jogador.y, "Você", "voce");
    this.abrirPainel($("mapa"));
    this.app.audio.sfx("abrir");
  }

  abrirCamarim(modo) {
    this.app.abrirCamarim(modo);
  }

  salvar() {
    this.app.salvar();
  }

  confirmar(titulo, texto, sim) {
    $("conf-titulo").textContent = titulo;
    $("conf-texto").textContent = texto;
    $("confirmar").hidden = false;
    $("conf-sim").onclick = () => { $("confirmar").hidden = true; sim(); };
    $("conf-nao").onclick = () => { $("confirmar").hidden = true; };
  }
}

export function normalizar(s) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
}
