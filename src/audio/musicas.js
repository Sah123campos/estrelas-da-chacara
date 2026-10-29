// Trilha sonora original, composta em código (mesmo esquema de "O Maior Amor").
// Cada música tem uma camada "base" e uma camada de "tensão" que o jogo
// aumenta perto do mistério (as lonas no morro).
// Grade: 16 passos por compasso (semicolcheias).

function melodia(compassos) {
  const mapa = {};
  compassos.forEach((linha, c) => {
    linha.trim().split(/\s+/).forEach((tok, i) => {
      if (tok !== ".") mapa[c * 16 + i] = tok;
    });
  });
  return mapa;
}

function duracoes(mapa, total) {
  const passos = Object.keys(mapa).map(Number).sort((a, b) => a - b);
  const d = {};
  passos.forEach((p, i) => (d[p] = (passos[i + 1] ?? total) - p));
  return d;
}

// ---------- Tela inicial: misteriosa e elegante (cheiro de estreia, sem contar o quê) ----------
const melTitulo = melodia([
  "E4 . . . G4 . . . B4 . . . . . A4 .",
  "G4 . . . . . . . E4 . . . . . . .",
  "F#4 . . . A4 . . . C5 . . . . . B4 .",
  "A4 . . . . . . . . . . . . . . .",
  "E4 . . . G4 . . . B4 . . . E5 . . .",
  "D#5 . . . . . . . B4 . . . . . . .",
  "C5 . . . B4 . . . A4 . . . F#4 . . .",
  "G4 . . . . . . . . . . . . . . .",
]);
const durTitulo = duracoes(melTitulo, 128);
const acTitulo = [["E3", "G3", "B3", "D4"], ["E3", "G3", "B3", "D4"], ["D3", "F#3", "A3", "C4"], ["D3", "F#3", "A3", "C4"], ["C3", "E3", "G3", "B3"], ["B2", "D#3", "F#3", "A3"], ["A2", "C3", "E3", "G3"], ["B2", "D#3", "F#3", "B3"]];

const titulo = {
  bpm: 76,
  passos: 128,
  volume: 0.85,
  passo(m, s, i, t) {
    const seg = 60 / this.bpm / 4;
    const c = (i / 16) | 0;
    if (i % 16 === 0) m.pad(acTitulo[c], t, seg * 16, s.base, { vol: 0.035, brilho: 900 });
    if (melTitulo[i]) m.flauta(melTitulo[i], t, Math.min(durTitulo[i], 10) * seg, s.base, { vol: 0.07 });
    if (i % 16 === 0) m.baixo(acTitulo[c][0].replace(/\d/, (n) => n - 1), t, seg * 6, s.base, { vol: 0.12 });
    if (i % 16 === 10) m.baixo(acTitulo[c][2].replace(/\d/, (n) => n - 1), t, seg * 4, s.base, { vol: 0.08 });
    if (i % 4 === 2) m.riq(t, s.base, 0.025);
    if (i % 8 === 4) m.tek(t, s.base, 0.03);
    if (i % 32 === 28) m.sino("B5", t, s.tensao, { vol: 0.03, dur: 3 });
  },
};

// ---------- Exploração: tarde ensolarada na chácara (violão dedilhado + flauta) ----------
const melChacara = melodia([
  "G4 . A4 . B4 . . D5 . . B4 . A4 . G4 .",
  "E4 . . . . . G4 . A4 . . . . . . .",
  "C5 . B4 . A4 . . G4 . . E4 . G4 . A4 .",
  "B4 . . . . . . . . . . . . . . .",
  "G4 . A4 . B4 . . D5 . . E5 . D5 . B4 .",
  "C5 . . . B4 . A4 . G4 . . . E4 . . .",
  "A4 . . . B4 . . . A4 . G4 . F#4 . . .",
  "G4 . . . . . . . . . . . . . . .",
]);
const durChacara = duracoes(melChacara, 128);
const acChacara = [["G2", "D3", "G3", "B3"], ["E2", "B2", "E3", "G3"], ["C3", "G3", "C4", "E4"], ["D3", "A3", "D4", "F#4"], ["G2", "D3", "G3", "B3"], ["C3", "G3", "C4", "E4"], ["A2", "E3", "A3", "C4"], ["D3", "A3", "D4", "F#4"]];

const chacara = {
  bpm: 92,
  passos: 128,
  volume: 0.8,
  passo(m, s, i, t) {
    const seg = 60 / this.bpm / 4;
    const c = (i / 16) | 0;
    const ac = acChacara[c];
    // dedilhado tipo bossa
    const padrao = { 0: 0, 3: 2, 6: 1, 8: 3, 10: 2, 13: 1 };
    if (padrao[i % 16] !== undefined) m.corda(ac[padrao[i % 16]], t, s.base, { vol: 0.13, brilho: 2200, dur: 1.4 });
    if (i % 16 === 0) m.baixo(ac[0], t, seg * 7, s.base, { vol: 0.12 });
    if (i % 16 === 8) m.baixo(ac[1], t, seg * 5, s.base, { vol: 0.08 });
    if (melChacara[i]) m.flauta(melChacara[i], t, Math.min(durChacara[i], 8) * seg, s.base, { vol: 0.055 });
    if (i % 4 === 0) m.riq(t, s.base, 0.02);
    if (i % 16 === 4 || i % 16 === 12) m.tek(t, s.base, 0.035);
    // camada misteriosa: notas agudas espaçadas
    if (i % 16 === 14) m.sino(["E5", "D#5", "C5", "B4"][c % 4], t, s.tensao, { vol: 0.035, dur: 2.5 });
    if (i % 64 === 0) m.pad(["E3", "G3", "B3"], t, seg * 64, s.tensao, { vol: 0.03, brilho: 700 });
  },
};

// ---------- Camarim: lounge de bastidor ----------
const melCamarim = melodia([
  "A4 . . C5 . . E5 . . . D5 . C5 . . .",
  "B4 . . . . . G4 . . . . . . . . .",
  "F4 . . A4 . . C5 . . . B4 . A4 . . .",
  "G#4 . . . . . E4 . . . . . . . . .",
]);
const durCamarim = duracoes(melCamarim, 64);
const acCamarim = [["A2", "C3", "E3", "G3"], ["E2", "G#2", "B2", "D3"], ["F2", "A2", "C3", "E3"], ["E2", "G#2", "B2", "D3"]];
const camarim = {
  bpm: 84,
  passos: 64,
  volume: 0.75,
  passo(m, s, i, t) {
    const seg = 60 / this.bpm / 4;
    const c = (i / 16) | 0;
    if (i % 16 === 0) m.pad(acCamarim[c].slice(1), t, seg * 16, s.base, { vol: 0.03, brilho: 1300, onda: "triangle" });
    if (i % 4 === 0) m.baixo(acCamarim[c][[0, 2, 1, 2][(i / 4) % 4]], t, seg * 3, s.base, { vol: 0.1 });
    if (melCamarim[i]) m.sino(melCamarim[i], t, s.base, { vol: 0.045, dur: Math.min(durCamarim[i], 6) * seg * 2 });
    if (i % 4 === 2) m.riq(t, s.base, 0.03);
    if (i % 8 === 4) m.tek(t, s.base, 0.04);
  },
};

// ---------- Revelação: fanfarra de estreia ----------
const melRev = melodia([
  "C5 . . . G4 . C5 . E5 . . . . . . .",
  "D5 . . . A4 . D5 . F5 . . . . . . .",
  "E5 . . . C5 . E5 . G5 . . . A5 . G5 .",
  "F5 . E5 . D5 . . . C5 . . . . . . .",
]);
const durRev = duracoes(melRev, 64);
const acRev = [["C3", "E3", "G3", "C4"], ["D3", "F3", "A3", "D4"], ["C3", "E3", "G3", "C4"], ["F3", "A3", "C4", "F4"]];
const revelacao = {
  bpm: 112,
  passos: 64,
  volume: 0.95,
  passo(m, s, i, t) {
    const seg = 60 / this.bpm / 4;
    const c = (i / 16) | 0;
    if (i % 16 === 0) m.pad(acRev[c], t, seg * 16, s.base, { vol: 0.05, brilho: 2200 });
    if (melRev[i]) {
      m.tom(melRev[i], t, Math.min(durRev[i], 6) * seg, s.base, { onda: "square", vol: 0.035 });
      m.tom(melRev[i], t, Math.min(durRev[i], 6) * seg, s.base, { onda: "sawtooth", vol: 0.02 });
    }
    if (i % 4 === 0) m.baixo(acRev[c][0], t, seg * 2, s.base, { vol: 0.13 });
    if (i % 8 === 0) m.doum(t, s.base, 0.25);
    if (i % 8 === 4) m.tek(t, s.base, 0.08);
    if (i % 2 === 1) m.riq(t, s.base, 0.03);
  },
};

export const MUSICAS = { titulo, chacara, camarim, revelacao };
