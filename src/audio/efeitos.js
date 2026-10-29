// Efeitos sonoros sintetizados. Cada efeito recebe (motor, tempo, opções).
const aleat = (a, b) => a + Math.random() * (b - a);

export const EFEITOS = {
  passo(m, t, { terreno = "grama" }) {
    const d = m.busSfx;
    if (terreno === "pedra") {
      m.ruidoFiltrado(t, 0.045, d, { f: aleat(1400, 2200), q: 2.5, vol: 0.05 });
      m.tom(aleat(130, 170), t, 0.04, d, { vol: 0.03, onda: "triangle" });
    } else if (terreno === "terra") {
      m.ruidoFiltrado(t, 0.07, d, { tipo: "lowpass", f: aleat(700, 1000), vol: 0.06 });
    } else if (terreno === "madeira") {
      m.tom(aleat(170, 210), t, 0.07, d, { vol: 0.06, onda: "triangle" });
      m.ruidoFiltrado(t, 0.03, d, { f: 900, q: 2, vol: 0.035 });
    } else if (terreno === "molhado") {
      m.ruidoFiltrado(t, 0.08, d, { f: aleat(900, 1300), q: 1.2, vol: 0.05 });
      m.tom(aleat(900, 1300), t + 0.02, 0.05, d, { vol: 0.02, f2: 500 });
    } else {
      m.ruidoFiltrado(t, 0.09, d, { tipo: "highpass", f: aleat(2500, 3600), vol: 0.03, ataque: 0.02 });
      m.ruidoFiltrado(t, 0.05, d, { tipo: "lowpass", f: 600, vol: 0.025 });
    }
  },
  clique(m, t) {
    m.tom(1200, t, 0.03, m.busSfx, { onda: "square", vol: 0.03 });
  },
  escolha(m, t) {
    m.tom(880, t, 0.04, m.busSfx, { onda: "square", vol: 0.03 });
    m.tom(1320, t + 0.05, 0.06, m.busSfx, { onda: "square", vol: 0.03 });
  },
  abrir(m, t) {
    ["C5", "E5", "G5"].forEach((n, i) => m.tom(n, t + i * 0.05, 0.08, m.busSfx, { onda: "triangle", vol: 0.05 }));
  },
  fechar(m, t) {
    ["G5", "E5", "C5"].forEach((n, i) => m.tom(n, t + i * 0.05, 0.08, m.busSfx, { onda: "triangle", vol: 0.04 }));
  },
  pista(m, t) {
    ["E5", "G#5", "B5", "E6"].forEach((n, i) => m.sino(n, t + i * 0.09, m.busSfx, { vol: 0.06, dur: 1.8 }));
  },
  erro(m, t) {
    m.tom(220, t, 0.18, m.busSfx, { onda: "square", vol: 0.04, f2: 160 });
  },
  foto(m, t) {
    m.ruidoFiltrado(t, 0.06, m.busSfx, { f: 3000, q: 0.8, vol: 0.12 });
    m.tom(2400, t + 0.02, 0.05, m.busSfx, { onda: "square", vol: 0.02 });
  },
  sino(m, t) {
    [0, 0.5, 1.0].forEach((d) => m.sino("A5", t + d, m.busSfx, { vol: 0.12, dur: 2.5 }));
  },
  splash(m, t) {
    m.ruidoFiltrado(t, 0.5, m.busSfx, { f: 1400, f2: 400, q: 0.7, vol: 0.12 });
  },
  fogos(m, t) {
    m.ruidoFiltrado(t, 0.6, m.busSfx, { tipo: "lowpass", f: 700, f2: 120, vol: 0.18 });
    for (let k = 0; k < 6; k++) m.ruidoFiltrado(t + 0.1 + k * 0.07, 0.05, m.busSfx, { f: aleat(2500, 5000), q: 3, vol: 0.04 });
  },
  lona(m, t) {
    m.ruidoFiltrado(t, 0.7, m.busSfx, { f: 900, f2: 300, q: 0.6, vol: 0.1, ataque: 0.05 });
  },
  revelar(m, t) {
    m.tom(55, t, 2.4, m.busSfx, { vol: 0.2, f2: 110, ataque: 0.6 });
    ["C4", "G4", "C5", "E5", "G5", "C6"].forEach((n, i) => m.sino(n, t + 0.6 + i * 0.16, m.busSfx, { vol: 0.07, dur: 3.5 }));
  },
};

// Timbre dos "bips" de fala.
export const VOZES = {
  padrao: { f: 300, onda: "triangle", vol: 0.04 },
  jogador: { f: 340, onda: "triangle", vol: 0.035 },
  davi_dicaprio: { f: 240, onda: "triangle" },
  taylor_frisso: { f: 520, onda: "triangle", vol: 0.035 },
  thais_grande: { f: 460, onda: "sine", vol: 0.05 },
  samuel_pitt: { f: 210, onda: "triangle" },
  narrador: { f: 260, onda: "sine", vol: 0.03 },
};
