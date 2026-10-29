// ============================================================================
// MAPA DA CHÁCARA — dados centralizados (vista de cima, pixel art).
// Coordenadas em METROS, iguais às medidas tiradas das fotos de drone.
// x = leste, z = sul (o "norte" do mapa fica em cima na tela).
// Origem (0,0) = plataforma de concreto azul de onde as fotos DJI_0336..0339 foram tiradas.
//
// Campo `fonte` em cada elemento:
//   'foto'        -> visto nas referências (DJI_0336, DJI_0337, DJI_0338, DJI_0339)
//   'estimado'    -> visto nas fotos, mas posição/medida estimada a olho
//   'provisorio'  -> NÃO aparece nas referências; criado só para esta versão.
//                    Substitua quando houver fotos dessas áreas.
// ============================================================================
import { PX_POR_METRO } from "../config.js";

export const LIMITES = { x0: -116, x1: 100, z0: -142, z1: 100 };
export const LARGURA_PX = (LIMITES.x1 - LIMITES.x0) * PX_POR_METRO;
export const ALTURA_PX = (LIMITES.z1 - LIMITES.z0) * PX_POR_METRO;

// metros → pixels do mapa
export const px = (x) => Math.round((x - LIMITES.x0) * PX_POR_METRO);
export const py = (z) => Math.round((z - LIMITES.z0) * PX_POR_METRO);
export const m = (v) => v * PX_POR_METRO;

export const MAPA = {
  // O jogador chega pelo portão de entrada e sobe o caminho até a chácara.
  inicio: { x: 0, z: 88.5, dir: "cima" },

  // Lago (visto à esquerda nas fotos, mais baixo que o gramado).
  lago: { x: -46, z: -42, rx: 30, rz: 13, fonte: "foto" },
  // Riacho da cachoeira até o lago (provisório).
  riacho: { pts: [[-87, -44.5], [-81, -45.2], [-75, -43]], largura: 3, fonte: "provisorio" },
  // Colina da casa amarela (o terreno sobe a partir daqui).
  colina: { z: -93, fonte: "foto" },

  // Plataforma de concreto azul (de onde as fotos foram tiradas). O murinho azul é a borda
  // norte dela, virada para o gramado das palmeiras; nas laterais o murinho dobra um pouco.
  patio: { x: 0, z: 7.4, w: 20, d: 10, fonte: "estimado" },
  murinho: { x: 0, z: 2.4, w: 20, lateral: 4, fonte: "foto" },

  // Terraço da piscina (mais alto que o gramado, com balaustrada branca).
  terraco: { x: 40, z: -30, w: 36, d: 26, fonte: "estimado" },
  piscina: { x: 42, z: -31, w: 16, d: 8, fonte: "estimado" },
  // Torre do toboágua no canto da piscina; o tubo desce até a água.
  toboagua: { x: 55, z: -38.5, fim: { x: 48.5, z: -32 }, fonte: "foto" },
  quiosque: { x: 55, z: -22, w: 7, d: 6, fonte: "foto" },

  casa: { x: -58, z: -108, w: 20, d: 11, fonte: "foto" },
  // Cachoeira virada para o lago (a água cai para o leste e corre pelo riacho até o lago).
  cachoeira: { x: -94, z: -44, fonte: "provisorio" },

  // Áreas provisórias (não aparecem nas fotos)
  refeitorio: { x: -30, z: 40, w: 18, d: 11, fonte: "provisorio" },
  quadra: { x: 30, z: 44, w: 28, d: 16, fonte: "provisorio" },
  fogueira: { x: -6, z: 30, fonte: "provisorio" },
  alojamento: { x: -2, z: 65, w: 26, d: 8, fonte: "provisorio" }, // ponto central entre os dois quartos
  // Alojamentos separados (vistos "sem teto", com camas e objetos pessoais) — provisórios.
  quartoMeninas: { x: -28, z: 65, w: 24, d: 10, cor: "#d8b8e8", fonte: "provisorio" },
  quartoMeninos: { x: 24, z: 65, w: 24, d: 10, cor: "#a8c8e8", fonte: "provisorio" },
  // Área coberta do refeitório, com mesas, cadeiras e comida.
  refeitorioArea: { x: -30, z: 52.5, w: 24, d: 9, fonte: "provisorio" },
  // Espaço musical (palco do louvor) perto da fogueira.
  palco: { x: 15, z: 29, w: 14, d: 6, fonte: "provisorio" },
  // Estacionamento ao lado do portão.
  estacionamento: { x: -42, z: 85, w: 36, d: 12, fonte: "provisorio" },
  // Cantinho da Palavra: púlpito com a Bíblia aberta, ao lado da fogueira.
  biblia: { x: -14, z: 27, fonte: "provisorio" },
  // Árvore com a corda molhada.
  arvoreCorda: { x: -52, z: 6, fonte: "provisorio" },
  portao: { x: 0, z: 92, fonte: "provisorio" },

  // O mistério: nove formas enormes cobertas por lonas no morro, ao lado da casa amarela.
  letreiro: { x: -6, z: -121, espaco: 6.2, fonte: "provisorio" },

  caminhos: [
    { pts: [[0, 96], [0, 70], [2, 52], [0, 34], [0, 12.6]], largura: 3.2, tipo: "terra", fonte: "provisorio" },
    { pts: [[0, 34], [-14, 37], [-30, 42]], largura: 2.4, tipo: "terra", fonte: "provisorio" },
    { pts: [[2, 40], [16, 44]], largura: 2.4, tipo: "terra", fonte: "provisorio" },
    { pts: [[0, 66], [-16, 66]], largura: 2.2, tipo: "terra", fonte: "provisorio" },
    { pts: [[0, 66], [12, 66]], largura: 2.2, tipo: "terra", fonte: "provisorio" },
    { pts: [[0, 46], [-18, 52]], largura: 2.2, tipo: "terra", fonte: "provisorio" },
    { pts: [[0, 30], [8, 31]], largura: 2, tipo: "terra", fonte: "provisorio" },
    { pts: [[-41, 91], [-41, 96]], largura: 4, tipo: "terra", fonte: "provisorio" },
    { pts: [[6, 2], [16, -8], [22, -16]], largura: 2.0, tipo: "terra", fonte: "estimado" },
    // subida da colina até a casa e o morro
    { pts: [[-14, -26], [-6, -56], [-14, -84], [-30, -96], [-50, -100]], largura: 2.6, tipo: "terra", fonte: "estimado" },
    { pts: [[-30, -96], [-18, -110], [-10, -116]], largura: 2.2, tipo: "terra", fonte: "provisorio" },
    { pts: [[-62, -44], [-74, -40], [-82, -42]], largura: 1.8, tipo: "terra", fonte: "provisorio" },
  ],

  arvores: [
    // palmeiras-reais (troncos altos e lisos) — gramado das fotos
    { tipo: "palmeira", x: -9, z: -13, s: 1.0, fonte: "foto" },
    { tipo: "palmeira", x: 5, z: -21, s: 1.1, fonte: "foto" },
    { tipo: "palmeira", x: 13, z: -10, s: 0.9, fonte: "foto" },
    { tipo: "palmeira", x: 19, z: -24, s: 1.15, fonte: "foto" },
    { tipo: "palmeira", x: 24, z: -13, s: 1.0, fonte: "foto" },
    { tipo: "palmeira", x: -24, z: -20, s: 0.95, fonte: "foto" },
    { tipo: "palmeira", x: -32, z: -28, s: 1.05, fonte: "foto" },
    { tipo: "palmeira", x: 28, z: -6, s: 0.85, fonte: "estimado" },
    { tipo: "palmeira", x: -4, z: -32, s: 1.2, fonte: "estimado" },
    { tipo: "palmeira", x: 33, z: -46, s: 1.1, fonte: "estimado" },
    { tipo: "palmeira", x: 62, z: -12, s: 1.0, fonte: "estimado" },
    { tipo: "touceira", x: 18, z: -17, s: 1.0, fonte: "foto" },
    { tipo: "touceira", x: 9, z: -29, s: 0.8, fonte: "estimado" },
    // arbustos e árvores baixas no talude do lago
    { tipo: "copa", x: -16, z: -30, s: 0.8, fonte: "foto" },
    { tipo: "copa", x: -30, z: -60, s: 1.0, fonte: "foto" },
    { tipo: "copa", x: -46, z: -62, s: 0.9, fonte: "foto" },
    { tipo: "copa", x: -62, z: -60, s: 1.1, fonte: "foto" },
    { tipo: "copa", x: -20, z: -64, s: 0.7, fonte: "foto" },
    { tipo: "copa", x: -72, z: -76, s: 0.9, fonte: "estimado" },
    { tipo: "arbusto", x: -38, z: -70, s: 1.0, fonte: "foto" },
    { tipo: "arbusto", x: -10, z: -66, s: 0.9, fonte: "foto" },
    { tipo: "arbusto", x: -28, z: -82, s: 1.0, fonte: "estimado" },
    { tipo: "ipe", x: -40, z: -98, s: 1.0, fonte: "foto" },
    { tipo: "ipe", x: -80, z: -104, s: 0.9, fonte: "estimado" },
    { tipo: "tronco", x: -22, z: -36, s: 1.0, fonte: "foto" },
    // mata densa de pinheiros/eucaliptos atrás da casa
    ...Array.from({ length: 34 }, (_, i) => ({ tipo: i % 3 ? "pinheiro" : "eucalipto", x: -114 + i * 6.2 + ((i * 37) % 5), z: -131 - ((i * 53) % 9), s: 0.9 + ((i * 17) % 5) / 10, fonte: "estimado" })),
    // vegetação de borda (provisória)
    ...Array.from({ length: 18 }, (_, i) => ({ tipo: "copa", x: -112 + ((i * 41) % 26), z: -4 + i * 6, s: 0.8 + ((i * 13) % 6) / 10, fonte: "provisorio" })),
    ...Array.from({ length: 16 }, (_, i) => ({ tipo: i % 2 ? "mangueira" : "copa", x: 82 + ((i * 29) % 14), z: -10 + i * 7, s: 0.9 + ((i * 7) % 5) / 10, fonte: "provisorio" })),
    ...Array.from({ length: 9 }, (_, i) => ({ tipo: "pinheiro", x: 76 + ((i * 23) % 18), z: -120 + i * 9, s: 0.9, fonte: "provisorio" })),
    { tipo: "mangueira", x: -40, z: 20, s: 1.2, fonte: "provisorio" },
    { tipo: "mangueira", x: -52, z: 6, s: 1.2, fonte: "provisorio" },
    { tipo: "copa", x: -10, z: 76, s: 0.8, fonte: "provisorio" },
    { tipo: "copa", x: 10, z: 76, s: 0.8, fonte: "provisorio" },
    { tipo: "arbusto", x: -22, z: 74, s: 0.9, fonte: "provisorio" },
    { tipo: "arbusto", x: 30, z: 74, s: 0.9, fonte: "provisorio" },
    { tipo: "ipe", x: -60, z: 70, s: 0.9, fonte: "provisorio" },
    { tipo: "copa", x: 50, z: 30, s: 1.0, fonte: "provisorio" },
    { tipo: "arbusto", x: 46, z: 16, s: 1.0, fonte: "provisorio" },
    { tipo: "copa", x: -62, z: 30, s: 1.0, fonte: "provisorio" },
    { tipo: "arbusto", x: -56, z: 44, s: 1.0, fonte: "provisorio" },
    { tipo: "copa", x: 60, z: 60, s: 1.0, fonte: "provisorio" },
    { tipo: "arbusto", x: 52, z: 80, s: 1.0, fonte: "provisorio" },
    { tipo: "mangueira", x: 14, z: 24, s: 1.1, fonte: "provisorio" },
    { tipo: "mangueira", x: -18, z: 52, s: 1.0, fonte: "provisorio" },
    { tipo: "palmeira", x: -8, z: 86, s: 1.0, fonte: "provisorio" },
    { tipo: "palmeira", x: 8, z: 86, s: 1.0, fonte: "provisorio" },
  ],

  // Postes de madeira com luminária (vistos nas fotos).
  postes: [
    { x: -12, z: -6, fonte: "foto" }, { x: 34, z: -12, fonte: "foto" }, { x: -26, z: -12, fonte: "foto" },
    { x: 4, z: 22, fonte: "provisorio" }, { x: -4, z: 52, fonte: "provisorio" },
  ],

  bancos: [
    { id: "banco_lago", x: -30, z: -33, fonte: "provisorio" },
    { id: "banco_fogueira", x: -10, z: 33, fonte: "provisorio" },
  ],

  // Monte de palha seca de palmeira (no gramado, à esquerda do murinho, foto DJI_0336).
  palha: [{ x: -7, z: -0.5, fonte: "foto" }],

  // Pontos com nome (para NPCs e para o parâmetro ?pos=)
  pontos: {
    patio: { x: 0, z: 4 },
    banco_lago: { x: -30, z: -32.2 },
    piscina_borda: { x: 34, z: -25 },
    piscina: { x: 34, z: -25 },
    cozinha: { x: -30, z: 47.5 },
    quadra: { x: 30, z: 44 },
    fogueira: { x: -6, z: 34 },
    casa: { x: -58, z: -98 },
    cachoeira: { x: -86, z: -40.5 },
    morro: { x: -6, z: -113 },
    lago: { x: -14, z: -40 },
    portao: { x: 0, z: 88 },
    alojamento: { x: -2, z: 70 },
    quarto_meninas: { x: -28, z: 67 },
    quarto_meninos: { x: 24, z: 67 },
    palco: { x: 15, z: 33.5 },
    estacionamento: { x: -40, z: 92.5 },
    refeitorio: { x: -30, z: 56 },
  },

  // Objetos interativos (além dos NPCs).
  interativos: [
    { id: "placa_entrada", x: 4, z: 90, r: 3, rotulo: "Ler a placa", texto: "Bem-vindo ao Acampamento das Estrelas! O tema deste ano é segredo… (Placa provisória: envie fotos do portão real para reproduzi-lo.)" },
    { id: "sino", x: -21, z: 46, r: 2.5, rotulo: "Tocar o sino", acao: "sino" },
    { id: "espelho", x: -2, z: 69, r: 2.6, rotulo: "Abrir o camarim", acao: "camarim" },
    { id: "lago_beira", x: -16, z: -38, r: 4, rotulo: "Olhar o lago", texto: "A água está calma. Um sapo te encara como se você devesse dinheiro a ele." },
    { id: "cachoeira", x: -86, z: -41, r: 5.5, rotulo: "Admirar a cachoeira", texto: "Que lugar lindo! A água cai das pedras, espuma lá embaixo e corre pelo riacho até o lago. O barulho é tão gostoso que dá vontade de ficar aqui a tarde toda." },
    { id: "toboagua", x: 55, z: -37.2, r: 3.2, rotulo: "Descer no toboágua!", acao: "toboagua" },
    { id: "palha", x: -7, z: -0.8, r: 2.5, rotulo: "Mexer na palha", texto: "Um montinho de palha seca de palmeira. Lá no fundo tem um papel: “ensaio geral às 19h — não contem pra ninguém”." },
    { id: "murinho", x: 3, z: 3.6, r: 2.4, rotulo: "Sentar no murinho azul", acao: "sentar" },
    { id: "casa_porta", x: -58, z: -101.5, r: 3, rotulo: "Bater na porta", texto: "Ninguém atende. Pela janela dá para ver araras cheias de roupas brilhantes e um cartaz enrolado. Que mistério…" },
    { id: "letreiro", x: -6, z: -114.5, r: 9, rotulo: "Examinar as lonas", acao: "letreiro" },
    { id: "biblia", x: -14, z: 28.2, r: 2.4, rotulo: "Ler a Bíblia", texto: "A Bíblia está aberta em Jeremias 29:11: “Porque eu bem sei os planos que tenho para vocês, diz o Senhor; planos de paz e não de mal, para dar a vocês esperança e um futuro.” Que promessa pra esse acampamento!" },
    { id: "corda", x: -50, z: 8.2, r: 3.2, rotulo: "Olhar a corda", texto: "Nossa, parece que amarraram e jogaram água em alguém aqui... por que será?" },
    { id: "bombinhas", x: 33, z: 61.6, r: 2.2, rotulo: "Mexer na caixinha", texto: "Uma caixa de bombinhas escondida embaixo do criado-mudo… A madrugada vai ser boa!" },
    { id: "bateria", x: 13, z: 28, r: 2.4, rotulo: "Tocar a bateria", acao: "musica", texto: "TU-DUM-TSSS! Você manda uma virada na bateria e o Pedro faz sinal de joinha lá do microfone." },
    { id: "violao", x: 19, z: 27.6, r: 2, rotulo: "Tocar o violão", acao: "musica", texto: "Você dedilha uns acordes no violão. Até os passarinhos param pra ouvir." },
    { id: "microfone", x: 16.5, z: 30.4, r: 1.8, rotulo: "Falar no microfone", texto: "“Alô, alô, chácara!” — sua voz ecoa nas caixas de som. Do refeitório alguém grita: “TÁ ALTO!”" },
    { id: "buffet", x: -30, z: 49.6, r: 3.2, rotulo: "Ver a comida", texto: "Arroz soltinho, feijão, frango assado, salada e um bolo de fubá que tá cheirando de longe. A Thais caprichou!" },
    { id: "cama_meninas", x: -34, z: 62.5, r: 2.4, rotulo: "Olhar as camas", texto: "Camas arrumadinhas, ursinho de pelúcia, necessaire de maquiagem e um pôster escrito “Estrelas da Chácara ★”." },
    { id: "cama_meninos", x: 18, z: 62.5, r: 2.4, rotulo: "Olhar as camas", texto: "Uma cama arrumada e cinco bagunçadas. Tem tênis pra todo lado e um travesseiro com cheiro de protetor solar." },
    { id: "carros", x: -40, z: 90.6, r: 4, rotulo: "Olhar o estacionamento", texto: "Carros de todo mundo que veio ajudar, e o ônibus do acampamento descansando à sombra. Alguém esqueceu o pisca-alerta ligado…" },
    { id: "quiosque", x: 55, z: -18.5, r: 3, rotulo: "Espiar o quiosque", texto: "Tem caixas e mais caixas de milho de pipoca empilhadas aqui. Pra que tanto?!" },
  ],
};

export function ponto(nome) {
  const p = MAPA.pontos[nome];
  return p ? { x: px(p.x), y: py(p.z) } : null;
}
