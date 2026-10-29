// Controles de toque: joystick que aparece onde o polegar encosta (lado
// esquerdo) e botões grandes à direita. Suporta vários dedos ao mesmo tempo.
const $ = (id) => document.getElementById(id);

export class ControlesToque {
  constructor(jogo) {
    this.jogo = jogo;
    this.raiz = $("toque");
    this.zona = $("zona-joystick");
    this.base = $("joystick");
    this.pino = $("joystick-pino");
    this.ponteiro = null;
    this.centro = { x: 0, y: 0 };
    this.raio = 50;

    this.zona.addEventListener("pointerdown", (e) => this.inicio(e));
    window.addEventListener("pointermove", (e) => this.mover(e), { passive: false });
    window.addEventListener("pointerup", (e) => this.fim(e));
    window.addEventListener("pointercancel", (e) => this.fim(e));

    const botao = (id, acao) => {
      const b = $(id);
      b.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        e.stopPropagation();
        b.classList.add("pressionado");
        if (acao === "interagir" && this.jogo.ui?.dlg) this.jogo.ui.avancarDialogo();
        else this.jogo.entrada.disparar(acao);
        this.vibrar(8);
      });
      const soltar = () => b.classList.remove("pressionado");
      b.addEventListener("pointerup", soltar);
      b.addEventListener("pointerleave", soltar);
      b.addEventListener("contextmenu", (e) => e.preventDefault());
    };
    botao("btn-interagir", "interagir");
    botao("btn-diario", "diario");
    botao("btn-camarim", "camarim");
    const correr = $("btn-correr");
    correr.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const e2 = this.jogo.entrada;
      e2.correrToque = !e2.correrToque;
      correr.classList.toggle("ativo", e2.correrToque);
      this.vibrar(8);
    });

    // Qualquer toque ativa o modo celular (mostra os botões).
    window.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType === "touch") this.jogo.entrada.mudarDispositivo("toque");
      },
      true,
    );
  }

  vibrar(ms) {
    if (this.jogo.config.vibracao && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch {
        /* sem vibração */
      }
    }
  }

  inicio(e) {
    if (this.ponteiro !== null) return;
    e.preventDefault();
    this.ponteiro = e.pointerId;
    this.centro = { x: e.clientX, y: e.clientY };
    this.base.style.left = `${e.clientX}px`;
    this.base.style.top = `${e.clientY}px`;
    this.base.hidden = false;
    this.pino.style.transform = "translate(0,0)";
    try {
      this.zona.setPointerCapture(e.pointerId);
    } catch {
      /* ok */
    }
  }

  mover(e) {
    if (e.pointerId !== this.ponteiro) return;
    e.preventDefault();
    let dx = e.clientX - this.centro.x;
    let dy = e.clientY - this.centro.y;
    const d = Math.hypot(dx, dy);
    // Se o dedo vai longe, a base acompanha (joystick "flutuante").
    if (d > this.raio * 1.6) {
      const excesso = d - this.raio * 1.6;
      this.centro.x += (dx / d) * excesso;
      this.centro.y += (dy / d) * excesso;
      this.base.style.left = `${this.centro.x}px`;
      this.base.style.top = `${this.centro.y}px`;
      dx = e.clientX - this.centro.x;
      dy = e.clientY - this.centro.y;
    }
    const lim = Math.min(1, this.raio / Math.max(1, Math.hypot(dx, dy)));
    this.pino.style.transform = `translate(${dx * lim}px, ${dy * lim}px)`;
    this.jogo.entrada.toque.x = Math.max(-1, Math.min(1, dx / this.raio));
    this.jogo.entrada.toque.y = Math.max(-1, Math.min(1, dy / this.raio));
  }

  fim(e) {
    if (e.pointerId !== this.ponteiro) return;
    this.ponteiro = null;
    this.base.hidden = true;
    this.jogo.entrada.toque.x = 0;
    this.jogo.entrada.toque.y = 0;
  }

  soltar() {
    this.ponteiro = null;
    this.base.hidden = true;
    this.jogo.entrada.toque.x = 0;
    this.jogo.entrada.toque.y = 0;
  }
}
