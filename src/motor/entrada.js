// Entrada: teclado e controles de toque alimentam o mesmo estado.
// Ações de "um toque" (interagir, lanterna...) ficam numa fila até serem lidas.

const TECLAS = {
  ArrowUp: "cima",
  KeyW: "cima",
  ArrowDown: "baixo",
  KeyS: "baixo",
  ArrowLeft: "esq",
  KeyA: "esq",
  ArrowRight: "dir",
  KeyD: "dir",
};

const ACOES = {
  KeyE: "interagir",
  Enter: "interagir",
  Space: "interagir",
  NumpadEnter: "interagir",
  KeyJ: "diario",
  KeyR: "camarim",
  KeyM: "mapa",
  KeyQ: "acenar",
  Escape: "pausa",
  KeyP: "pausa",
};

export class Entrada {
  constructor() {
    this.direcoes = new Set();
    this.fila = new Set();
    this.toque = { x: 0, y: 0 };
    this.correndo = false;
    this.correrToque = false;
    this.dispositivo = matchMedia("(pointer: coarse)").matches ? "toque" : "teclado";
    this.ouvintes = [];

    window.addEventListener("keydown", (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      const d = TECLAS[e.code];
      const a = ACOES[e.code];
      if (d || a) e.preventDefault();
      if (d) this.direcoes.add(d);
      if (e.key === "Shift") this.correndo = true;
      if (a && !e.repeat) this.disparar(a);
      this.mudarDispositivo("teclado");
    });
    window.addEventListener("keyup", (e) => {
      const d = TECLAS[e.code];
      if (d) this.direcoes.delete(d);
      if (e.key === "Shift") this.correndo = false;
    });
    window.addEventListener("blur", () => {
      this.direcoes.clear();
      this.correndo = false;
      this.toque.x = 0;
      this.toque.y = 0;
    });
  }

  mudarDispositivo(d) {
    if (this.dispositivo === d) return;
    this.dispositivo = d;
    for (const f of this.ouvintes) f(d);
  }

  aoMudarDispositivo(fn) {
    this.ouvintes.push(fn);
  }

  disparar(acao) {
    this.fila.add(acao);
  }

  // Lê (e consome) uma ação.
  acao(nome) {
    if (this.fila.has(nome)) {
      this.fila.delete(nome);
      return true;
    }
    return false;
  }

  limpar() {
    this.fila.clear();
  }

  // Correndo? (Shift no teclado; no celular, joystick empurrado até o fim ou botão de correr.)
  corrida() {
    if (this.correndo || this.correrToque) return true;
    return Math.hypot(this.toque.x, this.toque.y) > 0.98;
  }

  // Vetor de movimento (comprimento até 1).
  eixo() {
    let x = 0;
    let y = 0;
    if (this.direcoes.has("esq")) x -= 1;
    if (this.direcoes.has("dir")) x += 1;
    if (this.direcoes.has("cima")) y -= 1;
    if (this.direcoes.has("baixo")) y += 1;
    if (x || y) {
      const l = Math.hypot(x, y);
      return { x: x / l, y: y / l };
    }
    const tl = Math.hypot(this.toque.x, this.toque.y);
    if (tl > 0.12) {
      const m = Math.min(1, (tl - 0.12) / 0.7);
      return { x: (this.toque.x / tl) * m, y: (this.toque.y / tl) * m };
    }
    return { x: 0, y: 0 };
  }
}
