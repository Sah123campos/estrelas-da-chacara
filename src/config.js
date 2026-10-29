// Configurações gerais de "Estrelas da Chácara".

// ---------- Motor ----------
export const TILE = 16;
// Pixels de arte por metro do mapa real (as posições de src/dados/mapa.js estão em metros).
export const PX_POR_METRO = 8;

// Altura aproximada da tela "interna" em pixels de arte. A imagem é ampliada
// por um fator inteiro para os pixels ficarem nítidos em qualquer tela.
// "perto" deixa os personagens (e o seu rosto) maiores.
export const ALTURAS = { perto: 168, normal: 216, longe: 270 };

export const VELOCIDADE_JOGADOR = 78; // pixels de arte por segundo
export const FATOR_CORRIDA = 1.75;

const params = new URLSearchParams(location.search);
export const DEBUG = params.has("debug");
// ?debug&pos=piscina começa direto num ponto do mapa (ver PONTOS em mapa.js).
export const POS_INICIAL = params.get("pos");

// Palavra secreta (o tema do acampamento).
export const TEMA = "HOLLYWOOD";
