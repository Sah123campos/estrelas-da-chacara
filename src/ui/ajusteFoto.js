// Tela de posicionamento do rosto: a pessoa arrasta, aproxima e gira a foto até
// encaixar os olhos nas bolinhas e a boca na linha do molde. Mostra a prévia em pixel art ao vivo.
// Funciona igual para foto da câmera e da galeria. Tudo acontece no aparelho.
import { $ } from "./interface.js";
import { processarFoto, CANON } from "../rosto/rosto.js";
import { desenharRetrato } from "../arte/retrato.js";

const V = 300; // tamanho lógico do quadro
const DIST_OLHOS = 70; // distância entre as bolinhas dos olhos no molde
const G = DIST_OLHOS / (CANON.olhoD.x - CANON.olhoE.x); // px do molde por px do retrato
const OLHO_Y = V * 0.43;
const MOLDE = {
  olhoE: { x: V / 2 - DIST_OLHOS / 2, y: OLHO_Y },
  olhoD: { x: V / 2 + DIST_OLHOS / 2, y: OLHO_Y },
  boca: { x: V / 2, y: OLHO_Y + (CANON.boca.y - CANON.olhoE.y) * G },
  rosto: { x: V / 2, y: OLHO_Y + (29 - CANON.olhoE.y) * G, rx: 15.5 * G, ry: 17.5 * G },
};

export class AjusteFoto {
  constructor(app) {
    this.app = app;
    this.canvas = $("aj-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.ponteiros = new Map();
    const c = this.canvas;
    c.addEventListener("pointerdown", (e) => {
      c.setPointerCapture(e.pointerId);
      this.ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      e.preventDefault();
    });
    c.addEventListener("pointermove", (e) => {
      if (!this.ponteiros.has(e.pointerId)) return;
      e.preventDefault();
      const antes = [...this.ponteiros.values()].map((p) => ({ ...p }));
      this.ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const depois = [...this.ponteiros.values()];
      const esc = V / c.getBoundingClientRect().width;
      if (depois.length === 1) {
        this.mover((depois[0].x - antes[0].x) * esc, (depois[0].y - antes[0].y) * esc);
      } else if (depois.length >= 2) {
        // pinça: aproxima e gira com dois dedos
        const d0 = Math.hypot(antes[1].x - antes[0].x, antes[1].y - antes[0].y);
        const d1 = Math.hypot(depois[1].x - depois[0].x, depois[1].y - depois[0].y);
        const a0 = Math.atan2(antes[1].y - antes[0].y, antes[1].x - antes[0].x);
        const a1 = Math.atan2(depois[1].y - depois[0].y, depois[1].x - depois[0].x);
        if (d0 > 10) this.zoomPor(d1 / d0);
        this.girar(a1 - a0);
      }
    });
    const solta = (e) => this.ponteiros.delete(e.pointerId);
    c.addEventListener("pointerup", solta);
    c.addEventListener("pointercancel", solta);
    c.addEventListener("wheel", (e) => { e.preventDefault(); this.zoomPor(e.deltaY < 0 ? 1.06 : 1 / 1.06); }, { passive: false });
    $("aj-zoom").oninput = (e) => { this.t.k = this.kBase * parseFloat(e.target.value); this.mudou(); };
    $("aj-giro").oninput = (e) => { this.t.th = (parseFloat(e.target.value) * Math.PI) / 180; this.mudou(); };
    $("aj-brilho").oninput = (e) => { this.brilho = parseFloat(e.target.value); this.mudou(); };
    $("aj-ok").onclick = () => this.confirmar();
    $("aj-cancelar").onclick = () => this.fechar(true);
    $("aj-auto").onclick = () => { this.iniciarTransformacao(this.marcosIniciais); this.mudou(); };
  }

  // foto: canvas; marcos: { eyeL, eyeR, mouth } normalizados; ap: aparência em edição
  abrir(foto, marcos, ap, { aoConfirmar, aoCancelar } = {}) {
    this.foto = foto;
    this.ap = ap;
    this.aoConfirmar = aoConfirmar;
    this.aoCancelar = aoCancelar;
    this.brilho = ap.foto?.brilho || 0;
    this.marcosIniciais = marcos;
    this.iniciarTransformacao(marcos);
    $("aj-brilho").value = this.brilho;
    $("modal-ajuste").hidden = false;
    this.mudou();
  }

  fechar(cancelou) {
    $("modal-ajuste").hidden = true;
    this.ponteiros.clear();
    if (cancelou) this.aoCancelar?.();
  }

  // ---------- transformação foto → quadro ----------
  // S = R(th)·(P − T)·k + C   (C = centro do quadro)
  iniciarTransformacao(m) {
    const W = this.foto.width;
    const H = this.foto.height;
    const l = { x: m.eyeL.x * W, y: m.eyeL.y * H };
    const r = { x: m.eyeR.x * W, y: m.eyeR.y * H };
    const dist = Math.max(8, Math.hypot(r.x - l.x, r.y - l.y));
    const th = -Math.atan2(r.y - l.y, r.x - l.x);
    const k = DIST_OLHOS / dist;
    this.kBase = k;
    const meio = { x: (l.x + r.x) / 2, y: (l.y + r.y) / 2 };
    // meio dos olhos deve cair em (V/2, OLHO_Y)
    const d = this.girarVetor({ x: 0, y: OLHO_Y - V / 2 }, -th);
    this.t = { k, th, T: { x: meio.x - d.x / k, y: meio.y - d.y / k } };
    $("aj-zoom").value = 1;
    $("aj-giro").value = Math.round((th * 180) / Math.PI);
  }

  girarVetor(v, a) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
  }

  paraFoto(S) {
    const { k, th, T } = this.t;
    const v = this.girarVetor({ x: (S.x - V / 2) / k, y: (S.y - V / 2) / k }, -th);
    return { x: v.x + T.x, y: v.y + T.y };
  }

  mover(dx, dy) {
    const { k, th } = this.t;
    const v = this.girarVetor({ x: dx / k, y: dy / k }, -th);
    this.t.T.x -= v.x;
    this.t.T.y -= v.y;
    this.mudou();
  }

  zoomPor(f) {
    this.t.k = Math.max(this.kBase * 0.3, Math.min(this.kBase * 4, this.t.k * f));
    $("aj-zoom").value = (this.t.k / this.kBase).toFixed(2);
    this.mudou();
  }

  girar(da) {
    this.t.th += da;
    $("aj-giro").value = Math.round((this.t.th * 180) / Math.PI);
    this.mudou();
  }

  marcos() {
    const W = this.foto.width;
    const H = this.foto.height;
    const n = (p) => ({ x: p.x / W, y: p.y / H });
    return { eyeL: n(this.paraFoto(MOLDE.olhoE)), eyeR: n(this.paraFoto(MOLDE.olhoD)), mouth: n(this.paraFoto(MOLDE.boca)), method: "manual" };
  }

  // ---------- desenho ----------
  mudou() {
    if (this.pendente) return;
    this.pendente = true;
    requestAnimationFrame(() => {
      this.pendente = false;
      this.previa();
      this.desenhar();
    });
  }

  desenhar() {
    const x = this.ctx;
    const { k, th, T } = this.t;
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = "#0c0716";
    x.fillRect(0, 0, V, V);
    x.save();
    x.translate(V / 2, V / 2);
    x.rotate(th);
    x.scale(k, k);
    x.translate(-T.x, -T.y);
    x.imageSmoothingEnabled = true;
    x.drawImage(this.foto, 0, 0);
    x.restore();
    // escurece tudo o que NÃO vai aparecer no personagem (o que fica claro é exatamente
    // a parte da foto que vira o rosto; o resto é coberto pelo cabelo/roupa desenhados)
    const ox = V / 2 - 32 * G;
    const oy = OLHO_Y - CANON.olhoE.y * G;
    x.save();
    x.fillStyle = "rgba(8,4,16,0.62)";
    x.fillRect(0, 0, V, Math.max(0, oy));
    x.fillRect(0, oy + 64 * G, V, V);
    x.fillRect(0, oy, Math.max(0, ox), 64 * G);
    x.fillRect(ox + 64 * G, oy, V, 64 * G);
    if (this.mascara) {
      x.imageSmoothingEnabled = false;
      x.drawImage(this.mascara, ox, oy, 64 * G, 64 * G);
    }
    x.restore();
    for (const o of [MOLDE.olhoE, MOLDE.olhoD]) {
      x.beginPath();
      x.arc(o.x, o.y, 7, 0, Math.PI * 2);
      x.strokeStyle = "#ffffff";
      x.lineWidth = 2;
      x.stroke();
      x.fillStyle = "rgba(242,193,78,0.35)";
      x.fill();
    }
    x.beginPath();
    x.moveTo(MOLDE.boca.x - 16, MOLDE.boca.y);
    x.lineTo(MOLDE.boca.x + 16, MOLDE.boca.y);
    x.strokeStyle = "#ffffff";
    x.lineWidth = 3;
    x.stroke();
    x.font = "13px 'Pixelify Sans', sans-serif";
    x.fillStyle = "#fff6dc";
    x.textAlign = "center";
    x.fillText("olhos", MOLDE.olhoE.x, MOLDE.olhoE.y - 12);
    x.fillText("olhos", MOLDE.olhoD.x, MOLDE.olhoD.y - 12);
    x.fillText("boca", MOLDE.boca.x, MOLDE.boca.y + 18);
  }

  previa() {
    const ap = { ...this.ap, foto: { ...(this.ap.foto || {}), usar: true, zoom: 1, dx: 0, dy: 0, brilho: this.brilho } };
    this.proc = processarFoto(this.foto, this.marcos(), ap.foto, ap.formato);
    ap.pele = this.proc.pele;
    const r = desenharRetrato(ap, { fotoRetrato: this.proc.retrato });
    // máscara: onde a foto aparece de verdade no retrato final
    if (!this.mascara) { this.mascara = document.createElement("canvas"); this.mascara.width = 64; this.mascara.height = 64; }
    const mc = this.mascara.getContext("2d");
    const md = mc.createImageData(64, 64);
    for (let y = 0; y < 64; y++) for (let xx = 0; xx < 64; xx++) {
      const f = this.proc.retrato.get(xx, y);
      const q = r.get(xx, y);
      const visivel = f && q && f[0] === q[0] && f[1] === q[1] && f[2] === q[2];
      const i = (y * 64 + xx) * 4;
      if (!visivel) { md.data[i] = 8; md.data[i + 1] = 4; md.data[i + 2] = 16; md.data[i + 3] = 158; }
    }
    mc.putImageData(md, 0, 0);
    const c = $("aj-previa").getContext("2d");
    c.clearRect(0, 0, 64, 64);
    c.putImageData(new ImageData(r.d, 64, 64), 0, 0);
  }

  confirmar() {
    const marcos = this.marcos();
    this.fechar(false);
    this.aoConfirmar?.(marcos, this.brilho);
  }
}
