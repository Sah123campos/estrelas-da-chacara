// Estrelas da Chácara — inicialização, estados (título, camarim, jogo) e laço principal.
import { Tela } from "./motor/tela.js";
import { Entrada } from "./motor/entrada.js";
import { MotorAudio } from "./audio/motor.js";
import { Jogo } from "./jogo.js";
import { Interface, $ } from "./ui/interface.js";
import { Camarim } from "./ui/camarim.js";
import { ControlesToque } from "./ui/toque.js";
import { aparenciaPadrao } from "./dados/guardaroupa.js";
import { processarFoto } from "./rosto/rosto.js";
import { blobToCanvas, canvasToBlob, detectLandmarks } from "./rosto/captura.js";
import { carregarJogo, salvarJogo, carregarConfig, salvarConfig, salvarFoto, carregarFoto, apagarFoto, apagarTudo } from "./salvar.js";
import { DEBUG, ALTURAS } from "./config.js";
import { contarVisita } from "./contador.js";

const espera = () => new Promise((r) => setTimeout(r, 0));

class App {
  async iniciar() {
    this.config = { zoom: "normal", som: true, vibracao: true, dicas: true, ...(carregarConfig() || {}) };
    const progresso = (p, t) => { $("barra-carga").style.width = `${Math.round(p * 100)}%`; if (t) $("texto-carga").textContent = t; };
    progresso(0.1);
    try { await document.fonts.load("16px 'Pixelify Sans'"); } catch { /* segue */ }
    this.tela = new Tela($("tela"));
    this.tela.zoom = this.config.zoom;
    this.tela.ajustar();
    this.entrada = new Entrada();
    this.audio = new MotorAudio();
    this.audio.definirLigado(this.config.som);
    this.ui = new Interface(this);
    progresso(0.3, "Plantando as palmeiras-reais…");
    await espera();
    this.jogo = new Jogo(this.tela, this.entrada, this.audio, this.ui);
    progresso(0.75, "Enchendo a piscina…");
    await espera();
    this.camarim = new Camarim(this);
    this.toque = new ControlesToque(this);
    this.toqueAtivo = this.entrada.dispositivo === "toque";
    this.entrada.aoMudarDispositivo((d) => this.definirToque(d === "toque"));
    this.definirToque(this.toqueAtivo);
    document.body.classList.toggle("sem-dicas", !this.config.dicas);

    // dados salvos e foto
    this.salvo = carregarJogo();
    this.ap = { ...aparenciaPadrao("f"), ...(this.salvo?.ap || {}) };
    if (this.salvo?.nome && !this.ap.nome) this.ap.nome = this.salvo.nome;
    const blob = await carregarFoto();
    if (blob) {
      try {
        const canvas = await blobToCanvas(blob);
        const marcos = this.ap.foto?.marcos || (await detectLandmarks(canvas));
        this.foto = { canvas, marcos };
        this.reprocessarFoto(this.ap);
      } catch (e) { console.warn("foto salva ilegível", e); }
    }
    this.jogo.carregar(this.salvo);
    this.jogo.definirAparencia(this.ap, this.extraFoto(this.ap));
    progresso(1, "Pronto!");

    // som liberado no primeiro toque/tecla
    const liberar = () => { this.audio.iniciar(); window.removeEventListener("pointerdown", liberar); window.removeEventListener("keydown", liberar); };
    window.addEventListener("pointerdown", liberar);
    window.addEventListener("keydown", liberar);

    $("menu-titulo").addEventListener("click", (e) => {
      const b = e.target.closest("[data-acao]");
      if (b) { this.audio.iniciar(); this.audio.sfx("clique"); this.acaoTitulo(b.dataset.acao); }
    });
    this.ligarConfig();
    this.mostrarContador();
    $("carregando").hidden = true;
    this.irParaTitulo();
    if (DEBUG) window.__app = this;
    window.__jogo = this;

    let ultimo = performance.now();
    const laco = (agora) => {
      const dt = Math.min(0.05, (agora - ultimo) / 1000);
      ultimo = agora;
      if ($("camarim").hidden) {
        this.jogo.atualizar(dt);
        this.jogo.desenhar();
      }
      this.autoSalvar(dt);
      requestAnimationFrame(laco);
    };
    requestAnimationFrame(laco);
  }

  definirToque(sim) {
    this.toqueAtivo = sim;
    $("app").classList.toggle("toque-ativo", sim);
    $("toque").hidden = !sim || $("hud").hidden;
  }

  // ---------- contador de acessos ----------
  async mostrarContador() {
    const r = await contarVisita();
    const fmt = (n) => (typeof n === "number" ? n.toLocaleString("pt-BR") : "—");
    const txt = r ? `👀 ${fmt(r.pessoas)} pessoas já jogaram · ${fmt(r.acessos)} acessos` : "";
    $("contador-titulo").textContent = txt;
    $("contador-creditos").textContent = r
      ? `Pessoas diferentes que jogaram: ${fmt(r.pessoas)} · Vezes que o jogo foi aberto: ${fmt(r.acessos)}`
      : "O contador de acessos funciona quando o jogo é aberto pelo site (GitHub Pages).";
  }

  // ---------- título ----------
  irParaTitulo() {
    this.salvar();
    this.jogo.modo = "titulo";
    $("hud").hidden = true;
    $("toque").hidden = true;
    $("dialogo").hidden = true;
    $("titulo").hidden = false;
    $("btn-continuar").hidden = !this.salvo?.ap;
    this.atualizarTitulo();
    this.audio.tocar("titulo");
  }

  atualizarTitulo() {
    if (this.jogo.revelado) $("titulo-sub").innerHTML = "O tema foi revelado: <b>HOLLYWOOD</b>! ★<br>Continue explorando com seus looks de estrela.";
  }

  acaoTitulo(a) {
    if (a === "continuar") return this.comecar();
    if (a === "novo") {
      const novo = () => {
        this.salvo = null;
        this.jogo.carregar(null);
        // mantém o visual que a pessoa já montou no camarim (não volta ao padrão)
        const ap = structuredClone(this.ap);
        $("titulo").hidden = true;
        this.audio.tocar("camarim");
        this.camarim.abrir("novo", ap, {
          aoPronto: (ap2) => { this.aplicarAparencia(ap2); this.comecar(); },
          aoVoltar: () => this.irParaTitulo(),
        });
      };
      if (this.salvo?.ap) return this.ui.confirmar("Novo jogo", "Começar de novo? As pistas descobertas serão perdidas (seu visual e sua foto ficam salvos no camarim).", novo);
      return novo();
    }
    if (a === "camarim") {
      $("titulo").hidden = true;
      this.audio.tocar("camarim");
      return this.camarim.abrir(this.salvo?.ap ? "camarim" : "novo", this.ap, {
        aoPronto: (ap) => { this.aplicarAparencia(ap); this.salvar(); this.salvo = carregarJogo(); this.irParaTitulo(); },
        aoVoltar: (orig) => { this.reprocessarFoto(orig); this.irParaTitulo(); },
      });
    }
    if (a === "config") return this.abrirConfig();
    if (a === "creditos") { $("creditos").hidden = false; }
  }

  comecar() {
    $("titulo").hidden = true;
    $("hud").hidden = false;
    $("toque").hidden = !this.toqueAtivo;
    this.jogo.modo = "explorar";
    this.jogo.cam.x = this.jogo.jogador.x;
    this.jogo.cam.y = this.jogo.jogador.y;
    this.ui.atualizarHud();
    this.audio.tocar("chacara");
    this.salvar();
    this.salvo = carregarJogo();
    if (!this.jogo.estado.flags.has("intro_vista")) {
      this.jogo.estado.flags.add("intro_vista");
      setTimeout(() => this.ui.mensagem("Bem-vindo(a) à chácara!", `Oi, ${this.ap.nome || "estrela"}! Você acabou de chegar pelo portão da chácara. O acampamento tem um TEMA SECRETO e ninguém conta qual é… Suba o caminho, converse com quem tem ! sobre a cabeça, junte as pistas e descubra o mistério.`), 600);
    }
  }

  // ---------- aparência e foto ----------
  aplicarAparencia(ap) {
    this.ap = ap;
    if (this.foto) this.ap.foto = { ...this.ap.foto, marcos: this.foto.marcos };
    this.reprocessarFoto(this.ap);
    this.jogo.definirAparencia(this.ap, this.extraFoto(this.ap));
    this.ui.atualizarHud();
  }

  extraFoto(ap) {
    if (!this.foto?.proc || !ap.foto?.usar) return undefined;
    return { fotoRetrato: this.foto.proc.retrato, fotoSprite: ap.foto.noBoneco ? this.foto.proc.sprite : null };
  }

  reprocessarFoto(ap) {
    if (!this.foto) return;
    this.foto.proc = processarFoto(this.foto.canvas, this.foto.marcos, ap.foto || {}, ap.formato);
  }

  async definirFoto(canvas, marcos, ap) {
    this.foto = { canvas, marcos };
    ap.foto = { ...(ap.foto || {}), marcos };
    this.reprocessarFoto(ap);
    const blob = await canvasToBlob(canvas);
    if (blob) await salvarFoto(blob);
  }

  async removerFoto() {
    await apagarFoto();
    this.foto = null;
    if (this.camarim.ap) this.camarim.ap.foto = { ...this.camarim.ap.foto, usar: false, marcos: null };
    this.ap.foto = { ...this.ap.foto, usar: false, marcos: null };
    this.jogo.definirAparencia(this.ap, undefined);
    this.salvar();
  }

  abrirCamarim(modo) {
    const j = this.jogo;
    if (j.modo !== "explorar" && j.modo !== "painel" && j.modo !== "dialogo") return;
    const voltar = j.modo === "dialogo" ? "explorar" : "explorar";
    j.modo = "camarim";
    $("hud").hidden = true;
    $("toque").hidden = true;
    this.audio.tocar("camarim");
    this.camarim.abrir(modo, this.ap, {
      aoPronto: (ap) => { this.aplicarAparencia(ap); this.voltarAoJogo(voltar); this.ui.aviso("Visual salvo! ★", 1800); },
      aoVoltar: (orig) => { this.reprocessarFoto(orig); this.voltarAoJogo(voltar); },
    });
  }

  voltarAoJogo(modo) {
    $("hud").hidden = false;
    $("toque").hidden = !this.toqueAtivo;
    this.jogo.modo = modo;
    this.entrada.limpar();
    this.audio.tocar("chacara");
    this.salvar();
  }

  // ---------- salvar ----------
  salvar() {
    if (!this.jogo) return;
    if (this.jogo.modo === "titulo" && !this.salvo?.ap && !this.jogo.estado.flags.size) return;
    const ap = { ...this.ap, foto: { ...(this.ap.foto || {}), marcos: this.foto?.marcos || null } };
    salvarJogo({ ap, ...this.jogo.dadosSalvos() });
  }

  autoSalvar(dt) {
    if (this.jogo.modo !== "explorar") return;
    this.tSalvar = (this.tSalvar || 0) + dt;
    if (this.tSalvar > 15) { this.tSalvar = 0; this.salvar(); }
  }

  // ---------- configurações ----------
  ligarConfig() {
    $("cfg-som").onclick = () => this.alternarSom();
    $("cfg-vibra").onclick = () => { this.config.vibracao = !this.config.vibracao; this.gravarConfig(); };
    $("cfg-dicas").onclick = () => { this.config.dicas = !this.config.dicas; document.body.classList.toggle("sem-dicas", !this.config.dicas); this.gravarConfig(); };
    $("cfg-apagar").onclick = () => this.ui.confirmar("Apagar tudo", "Apagar o progresso, o visual e a foto salvos neste aparelho? Não dá para desfazer.", async () => {
      await apagarTudo();
      location.reload();
    });
  }

  abrirConfig() {
    this.desenharConfig();
    $("config").hidden = false;
  }

  aoFecharConfig() {}

  desenharConfig() {
    const z = $("cfg-zoom");
    z.innerHTML = "";
    for (const [id, nome] of [["perto", "Perto"], ["normal", "Normal"], ["longe", "Longe"]]) {
      const b = document.createElement("button");
      b.className = "chip" + (this.config.zoom === id ? " ativo" : "");
      b.textContent = nome;
      b.onclick = () => { this.config.zoom = id; this.tela.zoom = id; this.tela.ajustar(); this.gravarConfig(); };
      z.append(b);
    }
    const lig = (el, v) => { el.textContent = v ? "Ligado" : "Desligado"; el.classList.toggle("ativo", v); };
    lig($("cfg-som"), this.config.som);
    lig($("cfg-vibra"), this.config.vibracao);
    lig($("cfg-dicas"), this.config.dicas);
  }

  gravarConfig() {
    salvarConfig(this.config);
    this.desenharConfig();
  }

  alternarSom() {
    this.config.som = !this.config.som;
    this.audio.iniciar();
    this.audio.definirLigado(this.config.som);
    $("btn-som").innerHTML = `<span class="ico ${this.config.som ? "ico-som" : "ico-mudo"}"></span>`;
    this.gravarConfig();
  }

  telaCheia() {
    const d = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else d.requestFullscreen?.().catch(() => this.ui.aviso("Tela cheia indisponível neste navegador."));
  }
}

new App().iniciar().catch((e) => {
  console.error(e);
  $("texto-carga").textContent = "Ops! Algo deu errado ao carregar. Recarregue a página.";
});
