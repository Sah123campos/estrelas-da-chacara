// Camarim: criação e personalização do personagem com prova em tempo real.
// Tudo em pixel art: retrato grande (com a foto do jogador, se houver) e o boneco nas 4 direções.
import { $ } from "./interface.js";
import { gerarFolha, LARG, ALT, QUADROS } from "../arte/personagem.js";
import { desenharRetrato } from "../arte/retrato.js";
import { corTecido } from "../arte/tecido.js";
import {
  SLOTS, NOMES_SLOT, OPCIONAIS, PADROES, PALETA, TONS_PELE, CORES_CABELO, CORES_OLHOS, CORES_BATOM, CORES_SOMBRA,
  CORPO, ROSTO, CABELOS, LOOKS, item, pecaDe, aparenciaPadrao,
} from "../dados/guardaroupa.js";
import { criarCanvas } from "../arte/pixel.js";
import { fileToCanvas, detectLandmarks, startCamera, stopCamera, captureFrame } from "../rosto/captura.js";
import { AjusteFoto } from "./ajusteFoto.js";

const ABAS = [
  { id: "foto", nome: "📷 Seu rosto" },
  { id: "corpo", nome: "Corpo" },
  { id: "rosto", nome: "Rosto" },
  { id: "cabelo", nome: "Cabelo" },
  { id: "roupas", nome: "Roupas" },
  { id: "acessorios", nome: "Acessórios" },
  { id: "looks", nome: "Looks prontos" },
  { id: "nome", nome: "Nome" },
];
const ROUPAS = ["cima", "casaco", "baixo", "vestido", "meia", "calcado"];
const ACESSORIOS = ["chapeu", "oculos", "pescoco", "brinco", "pulso", "luvas", "mao"];
const NOMES_ESTRELA = ["Leo Di Chácara", "Meryl Fogueira", "Brad Pitanga", "Angelina Jolinha", "Will Smithão", "Keanu Rifas", "Emma Pedra", "Zendaia do Lago", "Tom Cruzeiro", "Anne Rathaway", "Morgan Freemanga", "Julia Roberta", "Nicole Kidmansa", "Johnny Deppósito"];
const BAIXO_NO_BONECO = new Set(["baixo", "meia", "calcado"]);

export class Camarim {
  constructor(app) {
    this.app = app;
    this.aba = "corpo";
    this.sub = { roupas: "cima", acessorios: "chapeu" };
    this.dirs = ["baixo", "esq", "dir", "cima"];
    this.anim = "parado";
    this.giro = false;
    this.cacheMini = new Map();
    $("cam-voltar").onclick = () => this.voltar();
    $("cam-pronto").onclick = () => this.pronto();
    $("cam-nome").addEventListener("input", (e) => { this.ap.nome = e.target.value; e.target.classList.remove("falta"); });
    $("cam-girar").onclick = () => { this.giro = !this.giro; this.botoes(); };
    $("cam-andar").onclick = () => { this.anim = this.anim === "andar" ? "parado" : "andar"; this.botoes(); };
    $("cam-acenar").onclick = () => { this.anim = this.anim === "acenar" ? "parado" : "acenar"; this.botoes(); };
    $("arquivo-foto").addEventListener("change", (e) => { this.receberArquivo(e.target.files[0]); e.target.value = ""; });
    $("arquivo-camera").addEventListener("change", (e) => { this.receberArquivo(e.target.files[0]); e.target.value = ""; });
    this.ajuste = new AjusteFoto(app);
    $("cam-nativa").onclick = () => { this.fecharCamera(); $("arquivo-camera").click(); };
    $("cam-clique").onclick = () => this.tirarFoto();
    $("cam-cancelar").onclick = () => this.fecharCamera();
    $("cam-palco-foto").onclick = () => this.abrirCamera();
    $("cam-palco-galeria").onclick = () => { this.app.audio.sfx("clique"); $("arquivo-foto").click(); };
  }

  get revelado() {
    return this.app.jogo.revelado;
  }

  abrir(modo, ap, { aoPronto, aoVoltar } = {}) {
    this.modo = modo;
    this.ap = structuredClone(ap);
    this.original = structuredClone(ap);
    this.aoPronto = aoPronto;
    this.aoVoltar = aoVoltar;
    this.aba = modo === "novo" || !this.app.foto ? "foto" : "roupas";
    $("cam-titulo").textContent = modo === "novo" ? "Crie seu personagem" : "Camarim";
    $("cam-pronto").textContent = modo === "novo" ? "Começar!" : "Pronto!";
    $("camarim").hidden = false;
    $("cam-nome").value = this.ap.nome || "";
    if (modo === "novo" && !this.ap.nome) setTimeout(() => $("cam-nome").focus(), 300);
    this.cacheMini.clear();
    this.atualizarPersonagem();
    this.desenharAbas();
    this.desenharCorpo();
    this.botoes();
    this.rodando = true;
    this.t = 0;
    const laco = (ts) => {
      if (!this.rodando) return;
      this.t = ts / 1000;
      this.desenharBoneco();
      requestAnimationFrame(laco);
    };
    requestAnimationFrame(laco);
  }

  fechar() {
    this.rodando = false;
    $("camarim").hidden = true;
    this.fecharCamera();
  }

  voltar() {
    this.app.audio.sfx("clique");
    this.fechar();
    this.aoVoltar?.(this.original);
  }

  pronto() {
    if (!this.ap.nome?.trim()) {
      const n = $("cam-nome");
      n.classList.remove("falta"); void n.offsetWidth; n.classList.add("falta");
      n.focus();
      this.app.ui.aviso("✍️ <b>Digite o seu nome</b> lá em cima antes de começar!", 2600);
      return;
    }
    this.app.audio.sfx("escolha");
    this.fechar();
    this.aoPronto?.(this.ap);
  }

  botoes() {
    $("cam-girar").classList.toggle("ativo", this.giro);
    $("cam-andar").classList.toggle("ativo", this.anim === "andar");
    $("cam-acenar").classList.toggle("ativo", this.anim === "acenar");
  }

  // ---------- prévia ----------
  extra() {
    return this.app.extraFoto(this.ap);
  }

  atualizarPersonagem() {
    if (this.pendente) return;
    this.pendente = true;
    requestAnimationFrame(() => {
      this.pendente = false;
      const ex = this.extra();
      this.folha = gerarFolha(this.ap, ex);
      const r = desenharRetrato(this.ap, ex);
      const c = $("cam-retrato").getContext("2d");
      c.clearRect(0, 0, 64, 64);
      c.putImageData(new ImageData(r.d, 64, 64), 0, 0);
    });
  }

  desenharBoneco() {
    if (!this.folha) return;
    const c = $("cam-boneco");
    const x = c.getContext("2d");
    x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, c.width, c.height);
    const lista = QUADROS[this.anim];
    const vel = this.anim === "andar" ? 8 : this.anim === "parado" ? 1.4 : 1;
    const q = lista[Math.floor(this.t * vel) % lista.length];
    const giro = this.giro ? Math.floor(this.t * 1.2) : 0;
    for (let i = 0; i < 4; i++) {
      const d = ["baixo", "dir", "cima", "esq"][(i + giro) % 4];
      const j = ["baixo", "esq", "dir", "cima"].indexOf(d);
      x.drawImage(this.folha.canvas, q * LARG, j * ALT, LARG, ALT, i * LARG, 4, LARG, ALT);
    }
  }

  // ---------- abas ----------
  desenharAbas() {
    const nav = $("cam-abas");
    nav.innerHTML = "";
    for (const a of ABAS) {
      const b = document.createElement("button");
      b.textContent = a.nome;
      b.className = a.id === this.aba ? "ativo" : "";
      b.setAttribute("role", "tab");
      b.onclick = () => { this.aba = a.id; this.app.audio.sfx("clique"); this.desenharAbas(); this.desenharCorpo(); };
      nav.append(b);
    }
  }

  mudar(alt, { redesenhar = true } = {}) {
    Object.assign(this.ap, alt);
    this.cacheMini.clear();
    this.atualizarPersonagem();
    if (redesenhar) this.desenharCorpo();
  }

  desenharCorpo() {
    const box = $("cam-corpo");
    const rolagem = box.scrollTop;
    box.innerHTML = "";
    const f = {
      corpo: () => this.abaCorpo(box),
      rosto: () => this.abaRosto(box),
      foto: () => this.abaFoto(box),
      cabelo: () => this.abaCabelo(box),
      roupas: () => this.abaSlots(box, ROUPAS, "roupas"),
      acessorios: () => this.abaSlots(box, ACESSORIOS, "acessorios"),
      looks: () => this.abaLooks(box),
      nome: () => this.abaNome(box),
    }[this.aba];
    f?.();
    box.scrollTop = rolagem;
  }

  secao(box, titulo) {
    const s = document.createElement("div");
    s.className = "secao";
    if (titulo) {
      const h = document.createElement("h4");
      h.textContent = titulo;
      s.append(h);
    }
    box.append(s);
    return s;
  }

  chips(sec, lista, atual, aoClicar, { multi = false } = {}) {
    const g = document.createElement("div");
    g.className = "grupo-chips";
    for (const o of lista) {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = o.nome;
      const ativo = multi ? atual.includes(o.id) : atual === o.id;
      b.setAttribute("aria-pressed", ativo ? "true" : "false");
      b.onclick = () => { this.app.audio.sfx("clique"); aoClicar(o.id); };
      g.append(b);
    }
    sec.append(g);
  }

  amostras(sec, cores, atual, aoEscolher, { livre = true, nenhum = null } = {}) {
    const g = document.createElement("div");
    g.className = "amostras";
    for (const c of cores) {
      const b = document.createElement("button");
      const vazio = c === "nenhum" || c === "nenhuma" || c === null;
      b.className = "amostra" + (vazio ? " nenhum" : "") + ((atual || "").toLowerCase() === (c || "").toLowerCase() || (vazio && (!atual || atual === c)) ? " ativo" : "");
      if (!vazio) b.style.background = c;
      b.title = vazio ? nenhum || "Nenhum" : c;
      b.setAttribute("aria-label", b.title);
      b.onclick = () => { this.app.audio.sfx("clique"); aoEscolher(c); };
      g.append(b);
    }
    if (livre) {
      const i = document.createElement("input");
      i.type = "color";
      i.value = /^#[0-9a-f]{6}$/i.test(atual || "") ? atual : "#888888";
      i.title = "Escolher qualquer cor";
      i.oninput = () => aoEscolher(i.value, true);
      i.onchange = () => this.desenharCorpo();
      g.append(i);
    }
    sec.append(g);
  }

  // ---------- Corpo ----------
  abaCorpo(box) {
    const ap = this.ap;
    this.chips(this.secao(box, "Corpo"), CORPO.genero, ap.genero, (v) => this.trocarGenero(v));
    this.chips(this.secao(box, "Altura"), CORPO.altura, ap.altura, (v) => this.mudar({ altura: v }));
    this.chips(this.secao(box, "Porte"), CORPO.porte, ap.porte, (v) => this.mudar({ porte: v }));
    const s = this.secao(box, "Tom de pele");
    this.amostras(s, TONS_PELE, ap.pele, (c, ao) => this.mudar({ pele: c }, { redesenhar: !ao }));
    if (this.app.foto?.proc) {
      const b = document.createElement("button");
      b.className = "btn pequeno";
      b.style.marginTop = "6px";
      b.textContent = "Usar o tom de pele da minha foto";
      b.onclick = () => this.mudar({ pele: this.app.foto.proc.pele });
      s.append(b);
    }
  }

  // Trocar o corpo também troca rosto, cabelo, maquiagem e roupa para o padrão daquele corpo.
  // Pele, olhos, cor do cabelo, altura, porte, nome e foto continuam.
  trocarGenero(v) {
    if (v === this.ap.genero) return;
    const ap = this.ap;
    const fica = { nome: ap.nome, pele: ap.pele, corOlhos: ap.corOlhos, corCabelo: ap.corCabelo, corMechas: ap.corMechas, altura: ap.altura, porte: ap.porte, foto: ap.foto, ajustes: ap.ajustes };
    this.mudar({ ...aparenciaPadrao(v), ...fica, genero: v });
  }

  // ---------- Rosto ----------
  abaRosto(box) {
    const ap = this.ap;
    if (this.app.foto && ap.foto?.usar) {
      const p = document.createElement("p");
      p.className = "aviso-foto";
      p.textContent = "Você está usando a sua foto no rosto. Formato do rosto, barba e maquiagem desenhados aparecem quando a foto está desligada (aba Sua foto).";
      box.append(p);
    }
    this.chips(this.secao(box, "Formato do rosto"), ROSTO.formato, ap.formato, (v) => { this.mudar({ formato: v }); this.app.reprocessarFoto(this.ap); this.atualizarPersonagem(); });
    this.chips(this.secao(box, "Olhos"), ROSTO.olhos, ap.olhos, (v) => this.mudar({ olhos: v }));
    this.amostras(this.secao(box, "Cor dos olhos"), CORES_OLHOS, ap.corOlhos, (c, ao) => this.mudar({ corOlhos: c }, { redesenhar: !ao }));
    this.chips(this.secao(box, "Sobrancelhas"), ROSTO.sobrancelha, ap.sobrancelha, (v) => this.mudar({ sobrancelha: v }));
    this.chips(this.secao(box, "Nariz"), ROSTO.nariz, ap.nariz, (v) => this.mudar({ nariz: v }));
    this.chips(this.secao(box, "Boca"), ROSTO.boca, ap.boca, (v) => this.mudar({ boca: v }));
    this.chips(this.secao(box, "Barba e bigode"), ROSTO.barba, ap.barba, (v) => this.mudar({ barba: v }));
    this.chips(this.secao(box, "Detalhes"), ROSTO.marcas, ap.marcas || [], (v) => {
      const m = new Set(ap.marcas || []);
      if (m.has(v)) m.delete(v); else m.add(v);
      this.mudar({ marcas: [...m] });
    }, { multi: true });
    this.amostras(this.secao(box, "Batom"), CORES_BATOM, ap.batom, (c, ao) => this.mudar({ batom: c }, { redesenhar: !ao }), { nenhum: "Sem batom" });
    this.amostras(this.secao(box, "Sombra"), CORES_SOMBRA, ap.sombra, (c, ao) => this.mudar({ sombra: c }, { redesenhar: !ao }), { nenhum: "Sem sombra" });
  }

  // ---------- Foto ----------
  abaFoto(box) {
    const ap = this.ap;
    const foto = this.app.foto;
    const s = this.secao(box, "O seu rosto no jogo");
    const p = document.createElement("p");
    p.className = "aviso-foto";
    p.innerHTML = "Escolha uma foto de rosto (de frente, com boa luz). Ela vira pixel art no retrato e no boneco.<br><b>Privacidade:</b> a foto fica só neste aparelho e nunca é enviada para a internet. Você pode apagar quando quiser.";
    s.append(p);
    const acoes = document.createElement("div");
    acoes.className = "foto-acoes";
    const b1 = document.createElement("button");
    b1.className = "btn";
    b1.textContent = "Escolher da galeria";
    b1.onclick = () => $("arquivo-foto").click();
    const b2 = document.createElement("button");
    b2.className = "btn";
    b2.textContent = "Tirar foto agora";
    b2.onclick = () => this.abrirCamera();
    acoes.append(b1, b2);
    if (foto) {
      const b3 = document.createElement("button");
      b3.className = "btn perigo";
      b3.textContent = "Apagar foto";
      b3.onclick = () => this.app.ui.confirmar("Apagar foto", "A foto do seu rosto será apagada deste aparelho. Continuar?", async () => {
        await this.app.removerFoto();
        this.atualizarPersonagem();
        this.desenharCorpo();
      });
      acoes.append(b3);
    }
    s.append(acoes);
    if (!foto) return;
    const pv = document.createElement("div");
    pv.className = "foto-previa";
    const c1 = criarCanvas(96, 96);
    const k = Math.max(foto.canvas.width, foto.canvas.height);
    c1.getContext("2d").drawImage(foto.canvas, 0, 0, (foto.canvas.width / k) * 96, (foto.canvas.height / k) * 96);
    const c2 = criarCanvas(64, 64);
    if (foto.proc) c2.getContext("2d").putImageData(new ImageData(foto.proc.retrato.d, 64, 64), 0, 0);
    const legenda = document.createElement("span");
    legenda.className = "aviso-foto";
    legenda.textContent = "Original → pixel art. Se não ficou certinho, toque em Ajustar a posição do rosto.";
    pv.append(c1, c2, legenda);
    s.append(pv);
    const s2 = this.secao(box, "Onde usar a foto");
    this.chips(s2, [{ id: "usar", nome: "No retrato e no boneco" }, { id: "retrato", nome: "Só no retrato" }, { id: "nao", nome: "Não usar" }],
      !ap.foto.usar ? "nao" : ap.foto.noBoneco ? "usar" : "retrato",
      (v) => this.mudar({ foto: { ...ap.foto, usar: v !== "nao", noBoneco: v === "usar" } }));
    const s3 = this.secao(box, "Encaixar o rosto");
    const aj = document.createElement("button");
    aj.className = "btn principal";
    aj.textContent = "✋ Ajustar a posição do rosto";
    aj.onclick = () => this.posicionar(foto.canvas, foto.marcos, false);
    s3.append(aj);
    const b = document.createElement("button");
    b.className = "btn pequeno";
    b.style.marginTop = "8px";
    b.textContent = "Usar o tom de pele da foto no corpo";
    b.onclick = () => this.mudar({ pele: this.app.foto.proc.pele });
    s3.append(b);
  }

  async receberArquivo(arquivo) {
    if (!arquivo) return;
    try {
      const canvas = await fileToCanvas(arquivo);
      await this.usarCanvasFoto(canvas);
    } catch (e) {
      console.warn(e);
      this.app.ui.aviso("Não consegui abrir essa imagem. Tente outra foto.");
    }
  }

  // Toda foto nova (câmera ou galeria) passa pela tela de posicionar o rosto.
  async usarCanvasFoto(canvas) {
    const marcos = await detectLandmarks(canvas);
    this.posicionar(canvas, marcos, true);
  }

  posicionar(canvas, marcos, nova) {
    this.ajuste.abrir(canvas, marcos, this.ap, {
      aoConfirmar: async (m, brilho) => {
        this.ap.foto = { noBoneco: true, ...(this.ap.foto || {}), usar: true, zoom: 1, dx: 0, dy: 0, brilho };
        if (nova) await this.app.definirFoto(canvas, m, this.ap);
        else { this.app.foto.marcos = m; this.ap.foto.marcos = m; this.app.reprocessarFoto(this.ap); }
        if (nova) this.ap.pele = this.app.foto.proc.pele;
        this.app.audio.sfx("foto");
        this.app.ui.aviso(nova ? "Foto aplicada! O tom de pele do corpo foi ajustado pela foto." : "Posição do rosto ajustada!", 3000);
        this.cacheMini.clear();
        this.atualizarPersonagem();
        this.aba = "foto";
        this.desenharAbas();
        this.desenharCorpo();
      },
    });
  }

  // Câmera ao vivo só funciona em página segura e quando o navegador deixa (em algumas
  // páginas incorporadas, como a prévia do claude.ai, ela é bloqueada).
  podeAoVivo() {
    if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) return false;
    const fp = document.featurePolicy || document.permissionsPolicy;
    if (fp?.allowsFeature && !fp.allowsFeature("camera")) return false;
    return true;
  }

  abrirCamera() {
    const toque = this.app.toqueAtivo || matchMedia("(pointer: coarse)").matches;
    if (!this.podeAoVivo()) {
      // no celular, abre direto o app de câmera do aparelho
      if (toque) { $("arquivo-camera").click(); return; }
      this.mostrarErroCamera("Este navegador (ou esta página incorporada) não deixa usar a câmera ao vivo. Abra o jogo pelo site (GitHub Pages) para usar a câmera, ou escolha uma foto da galeria.");
      $("modal-camera").hidden = false;
      return;
    }
    $("cam-erro").hidden = true;
    $("cam-ao-vivo").hidden = false;
    $("cam-clique").hidden = false;
    $("cam-nativa").textContent = toque ? "Abrir a câmera do aparelho" : "Escolher da galeria";
    $("modal-camera").hidden = false;
    this.ligarCamera();
  }

  mostrarErroCamera(txt) {
    $("cam-ao-vivo").hidden = true;
    $("cam-clique").hidden = true;
    $("cam-erro").hidden = false;
    $("cam-erro").textContent = txt;
    const toque = this.app.toqueAtivo || matchMedia("(pointer: coarse)").matches;
    $("cam-nativa").textContent = toque ? "Abrir a câmera do aparelho" : "Escolher da galeria";
  }

  async ligarCamera() {
    try {
      await startCamera($("cam-video"));
    } catch (e) {
      console.warn(e);
      const negou = e && (e.name === "NotAllowedError" || e.name === "SecurityError");
      this.mostrarErroCamera(negou
        ? "A câmera foi bloqueada. Toque no cadeado/ícone ao lado do endereço do site e permita a câmera, ou use o botão abaixo."
        : "Não encontrei uma câmera disponível. Use o botão abaixo para escolher uma foto.");
    }
  }

  async tirarFoto() {
    const v = $("cam-video");
    if (!v.videoWidth) return;
    const c = captureFrame(v);
    this.fecharCamera();
    await this.usarCanvasFoto(c);
  }

  fecharCamera() {
    stopCamera($("cam-video"));
    $("modal-camera").hidden = true;
  }

  // ---------- Cabelo ----------
  abaCabelo(box) {
    const ap = this.ap;
    const s = this.secao(box, "Penteado");
    const g = document.createElement("div");
    g.className = "grade-itens";
    for (const c of CABELOS) g.append(this.cartao(c.nome, () => this.miniRetrato({ ...ap, cabelo: c.id }), ap.cabelo === c.id, () => this.mudar({ cabelo: c.id })));
    s.append(g);
    this.amostras(this.secao(box, "Cor do cabelo"), CORES_CABELO, ap.corCabelo, (c, ao) => this.mudar({ corCabelo: c }, { redesenhar: !ao }));
    this.amostras(this.secao(box, "Mechas / luzes"), [null, ...CORES_CABELO.slice(4, 12)], ap.corMechas, (c, ao) => this.mudar({ corMechas: c }, { redesenhar: !ao }), { nenhum: "Sem mechas" });
  }

  // ---------- Roupas e acessórios ----------
  abaSlots(box, slots, chave) {
    const ap = this.ap;
    const sub = this.sub[chave];
    const sa = document.createElement("div");
    sa.className = "subabas";
    for (const sl of slots) {
      const b = document.createElement("button");
      b.className = "chip" + (sl === sub ? " ativo" : "");
      b.textContent = NOMES_SLOT[sl];
      b.onclick = () => { this.sub[chave] = sl; this.app.audio.sfx("clique"); this.desenharCorpo(); };
      sa.append(b);
    }
    box.append(sa);
    if ((sub === "cima" || sub === "baixo") && ap.vestido !== "nenhum") {
      const p = document.createElement("p");
      p.className = "aviso-foto";
      p.textContent = "Você está de vestido/macacão. Escolher uma peça aqui tira o vestido.";
      box.append(p);
    }
    const s = this.secao(box, NOMES_SLOT[sub]);
    const g = document.createElement("div");
    g.className = "grade-itens";
    for (const it of SLOTS[sub]) {
      const trancado = it.segredo && !this.revelado;
      const alt = { [sub]: it.id };
      if (sub === "cima" || sub === "baixo") alt.vestido = "nenhum";
      const ativo = ap[sub] === it.id && !((sub === "cima" || sub === "baixo") && ap.vestido !== "nenhum");
      g.append(this.cartao(trancado ? "??? (segredo)" : it.nome, () => (BAIXO_NO_BONECO.has(sub) ? this.miniBoneco({ ...ap, ...alt }) : this.miniRetrato({ ...ap, ...alt })), ativo, () => {
        if (trancado) return this.app.ui.aviso("🔒 <b>Peça secreta!</b> Descubra o tema do acampamento para liberar.", 2600);
        this.mudar(alt);
      }, trancado));
    }
    s.append(g);
    // cor e padrão da peça escolhida
    const peca = pecaDe(ap, sub);
    if (!peca || ((sub === "cima" || sub === "baixo") && ap.vestido !== "nenhum")) return;
    const ajuste = (ap.ajustes[sub] ||= {});
    const aj = (ajuste[peca.id] ||= {});
    const aplicar = (mud, ao) => {
      Object.assign(aj, mud);
      this.cacheMini.clear();
      this.atualizarPersonagem();
      if (!ao) this.desenharCorpo();
    };
    if (peca.cor) this.amostras(this.secao(box, `Cor: ${peca.nome}`), PALETA, peca.cor, (c, ao) => aplicar({ cor: c }, ao));
    if (["cima", "casaco", "baixo", "vestido", "meia", "luvas"].includes(sub)) {
      const sp = this.secao(box, "Padrão do tecido");
      const lista = PADROES.map((p) => ({ ...p, nome: p.segredo && !this.revelado ? "???" : p.nome }));
      this.chips(sp, lista, peca.padrao || "liso", (v) => {
        const p = PADROES.find((q) => q.id === v);
        if (p?.segredo && !this.revelado) return this.app.ui.aviso("🔒 Padrão secreto! Descubra o tema para liberar.", 2400);
        aplicar({ padrao: v === "liso" ? undefined : v });
      });
      if (peca.padrao && !["liso", "cetim", "veludo", "lantejoula", "metalico", "jeans", "couro", "trico"].includes(peca.padrao)) {
        this.amostras(this.secao(box, "Cor do padrão"), PALETA, peca.cor2 || "#16161a", (c, ao) => aplicar({ cor2: c }, ao));
      }
      const r = document.createElement("button");
      r.className = "btn pequeno fraco";
      r.textContent = "Voltar à cor original";
      r.onclick = () => { delete ajuste[peca.id]; this.cacheMini.clear(); this.atualizarPersonagem(); this.desenharCorpo(); };
      box.append(r);
    }
  }

  // ---------- Looks ----------
  abaLooks(box) {
    const s = this.secao(box, "Looks prontos (você pode mexer em tudo depois)");
    const g = document.createElement("div");
    g.className = "grade-itens";
    for (const L of LOOKS) {
      const trancado = L.segredo && !this.revelado;
      g.append(this.cartao(trancado ? "??? (segredo)" : L.nome, () => this.miniRetrato(this.comLook(this.ap, L)), false, () => {
        if (trancado) return this.app.ui.aviso("🔒 <b>Look secreto!</b> Descubra o tema do acampamento para liberar.", 2600);
        this.mudar(this.comLook(this.ap, L));
      }, trancado));
    }
    s.append(g);
  }

  comLook(ap, L) {
    const limpo = { casaco: "nenhum", vestido: "nenhum", meia: "nenhuma", chapeu: "nenhum", oculos: "nenhum", pescoco: "nenhum", brinco: "nenhum", pulso: "nenhum", luvas: "nenhuma", mao: "nada" };
    return { ...ap, ...limpo, ...L.ap };
  }

  // ---------- Nome ----------
  abaNome(box) {
    const s = this.secao(box, "Como você quer ser chamado(a)?");
    const i = document.createElement("input");
    i.className = "campo-nome";
    i.maxLength = 22;
    i.value = this.ap.nome || "";
    i.placeholder = "Seu nome";
    i.oninput = () => { this.ap.nome = i.value; $("cam-nome").value = i.value; };
    s.append(i);
    const av = document.createElement("p");
    av.className = "aviso-foto";
    av.textContent = "O nome que você escolher é enviado ao organizador do acampamento, só para saber quem jogou. A foto nunca sai do aparelho.";
    s.append(av);
    const b = document.createElement("button");
    b.className = "btn";
    b.style.marginTop = "8px";
    b.textContent = "★ Sortear um nome de estrela";
    b.onclick = () => { this.ap.nome = NOMES_ESTRELA[Math.floor(Math.random() * NOMES_ESTRELA.length)]; i.value = this.ap.nome; $("cam-nome").value = this.ap.nome; };
    s.append(b);
    if (this.modo !== "novo") {
      const s2 = this.secao(box, "Recomeçar o visual");
      const r = document.createElement("button");
      r.className = "btn fraco";
      r.textContent = "Voltar ao visual padrão";
      r.onclick = () => this.mudar({ ...aparenciaPadrao(this.ap.genero), nome: this.ap.nome, foto: this.ap.foto, pele: this.ap.pele });
      s2.append(r);
    }
  }

  // ---------- miniaturas ----------
  cartao(nome, desenhar, ativo, aoClicar, trancado = false) {
    const b = document.createElement("button");
    b.className = "item" + (ativo ? " ativo" : "") + (trancado ? " trancado" : "");
    const c = criarCanvas(64, 64);
    b.append(c);
    const t = document.createElement("span");
    t.textContent = nome;
    b.append(t);
    b.onclick = () => { this.app.audio.sfx("clique"); aoClicar(); };
    // desenha depois (não trava a tela)
    requestAnimationFrame(() => {
      const img = desenhar();
      if (img) c.getContext("2d").drawImage(img, 0, 0);
    });
    return b;
  }

  miniRetrato(ap) {
    const k = "r" + JSON.stringify(ap);
    if (!this.cacheMini.has(k)) this.cacheMini.set(k, desenharRetrato(ap, this.extra()).paraCanvas());
    return this.cacheMini.get(k);
  }

  miniBoneco(ap) {
    const k = "b" + JSON.stringify(ap);
    if (!this.cacheMini.has(k)) {
      const f = gerarFolha(ap, this.extra());
      const c = criarCanvas(64, 64);
      const x = c.getContext("2d");
      x.imageSmoothingEnabled = false;
      x.drawImage(f.canvas, 0, 14, LARG, 24, 4, 4, LARG * 2.5, 24 * 2.5);
      this.cacheMini.set(k, c);
    }
    return this.cacheMini.get(k);
  }
}

export function amostraTecido(peca) {
  const c = criarCanvas(16, 16);
  const x = c.getContext("2d");
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    const cor = corTecido(peca, i, j, 2);
    x.fillStyle = `rgb(${cor[0]},${cor[1]},${cor[2]})`;
    x.fillRect(i, j, 1, 1);
  }
  return c;
}
