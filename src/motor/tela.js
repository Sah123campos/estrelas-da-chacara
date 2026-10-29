// Tela: o jogo é desenhado numa resolução baixa ("pixels de arte") e ampliado
// por um fator inteiro, para os pixels ficarem nítidos em qualquer aparelho.
import { ALTURAS } from "../config.js";

export class Tela {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.w = 384;
    this.h = 216;
    this.escala = 1;
    this.zoom = "normal";
    this.ouvintes = [];
    this.ajustar();
    const reajustar = () => requestAnimationFrame(() => this.ajustar());
    window.addEventListener("resize", reajustar);
    window.addEventListener("orientationchange", reajustar);
  }

  aoRedimensionar(fn) {
    this.ouvintes.push(fn);
  }

  ajustar() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    // modo "girado": celular em pé, mas o jogo é desenhado deitado (90°)
    const girado = document.body.classList.contains("girado");
    const vw = girado ? window.innerHeight : window.innerWidth;
    const vh = girado ? window.innerWidth : window.innerHeight;
    const pw = Math.round(vw * dpr);
    const ph = Math.round(vh * dpr);
    let escala = Math.max(1, Math.round(ph / (ALTURAS[this.zoom] || ALTURAS.normal)));
    // Em telas estreitas (celular na vertical) garante uma largura mínima.
    while (escala > 1 && pw / escala < 280) escala--;
    const w = Math.ceil(pw / escala);
    const h = Math.ceil(ph / escala);
    if (w === this.w && h === this.h && escala === this.escala && this.canvas.width === w && this.girado === girado) return;
    this.girado = girado;
    this.escala = escala;
    this.dpr = dpr;
    this.w = w;
    this.h = h;
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${(w * escala) / dpr}px`;
    this.canvas.style.height = `${(h * escala) / dpr}px`;
    this.ctx.imageSmoothingEnabled = false;
    for (const f of this.ouvintes) f(w, h);
  }
}
