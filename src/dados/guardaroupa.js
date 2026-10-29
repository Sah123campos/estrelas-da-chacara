// ============================================================================
// CATÁLOGO DO CAMARIM — roupas, cabelos, rosto e acessórios.
// Para adicionar uma peça, inclua um objeto na lista do slot correspondente.
//
// Campos comuns:
//   id, nome, cor, padrao (ver PADROES), cor2 (cor do padrão), grupo (aba de filtro)
//   segredo: true -> só libera depois que o tema do acampamento é descoberto.
// Toda peça aceita troca de cor e de padrão no camarim.
// ============================================================================

export const PADROES = [
  { id: "liso", nome: "Liso" },
  { id: "cetim", nome: "Cetim" },
  { id: "veludo", nome: "Veludo" },
  { id: "lantejoula", nome: "Lantejoula" },
  { id: "metalico", nome: "Metálico" },
  { id: "listras", nome: "Listras" },
  { id: "riscagiz", nome: "Risca de giz" },
  { id: "xadrez", nome: "Xadrez" },
  { id: "poa", nome: "Poá" },
  { id: "jeans", nome: "Jeans" },
  { id: "couro", nome: "Couro" },
  { id: "trico", nome: "Tricô" },
  { id: "oncinha", nome: "Oncinha" },
  { id: "floral", nome: "Floral" },
  { id: "estrelas", nome: "Estrelinhas", segredo: true },
];

export const PALETA = [
  "#f7f4ec", "#d9d4c7", "#9a9a9f", "#4a4a52", "#16161a",
  "#e8d6b0", "#c9a14a", "#8a6a2a", "#7a4a24", "#3e2616",
  "#ffd0dc", "#f08aa8", "#e05a9c", "#b0121f", "#6d1a2c",
  "#ffb070", "#e86a2a", "#f2d544", "#9ccf6a", "#2f7a46",
  "#0f5a43", "#7fd1e8", "#2a9dce", "#2c4a9c", "#131b36",
  "#c7a6ef", "#7a3fb0", "#3c1f5e", "#c9ccd3", "#e2b13c",
];

export const TONS_PELE = ["#fbe3d4", "#f6d7c3", "#efc3a4", "#e0ac83", "#d29a6e", "#c98e62", "#a86f47", "#8a5634", "#6b3f24", "#4a2a17"];
export const CORES_CABELO = ["#141010", "#2e1c12", "#4a2e1b", "#7a4b2a", "#a8743f", "#d6b37a", "#efdcae", "#f4f0e6", "#b33a24", "#e07a3a", "#8c8c8c", "#e05a9c", "#7a3fb0", "#3a6fd8", "#2f9a7a"];
export const CORES_OLHOS = ["#4a2e1b", "#2a1a10", "#6a4a24", "#3b6b3a", "#3d6ea8", "#6a8aa0", "#7b6a3a", "#5b5b5b"];
export const CORES_BATOM = ["nenhum", "#c0485a", "#b0121f", "#6d1a2c", "#e88aa0", "#c97a6a", "#7a3fb0", "#2a1a1a"];
export const CORES_SOMBRA = ["nenhuma", "#c9a14a", "#b07ab0", "#6a8acf", "#8a5a3a", "#2f7a46", "#3a2a3a"];

export const CORPO = {
  genero: [{ id: "f", nome: "Feminino" }, { id: "m", nome: "Masculino" }],
  altura: [{ id: 0, nome: "Baixa" }, { id: 1, nome: "Média" }, { id: 2, nome: "Alta" }],
  porte: [{ id: 0, nome: "Magro" }, { id: 1, nome: "Médio" }, { id: 2, nome: "Forte" }],
};

export const ROSTO = {
  formato: [{ id: "oval", nome: "Oval" }, { id: "redondo", nome: "Redondo" }, { id: "quadrado", nome: "Quadrado" }, { id: "coracao", nome: "Coração" }],
  olhos: [{ id: "redondo", nome: "Redondos" }, { id: "amendoa", nome: "Amendoados" }, { id: "sorridente", nome: "Sorridentes" }, { id: "sonolento", nome: "Sonolentos" }, { id: "grande", nome: "Grandes" }],
  sobrancelha: [{ id: "natural", nome: "Natural" }, { id: "grossa", nome: "Grossa" }, { id: "fina", nome: "Fina" }, { id: "arqueada", nome: "Arqueada" }],
  nariz: [{ id: "pequeno", nome: "Pequeno" }, { id: "medio", nome: "Médio" }, { id: "largo", nome: "Largo" }],
  boca: [{ id: "sorriso", nome: "Sorriso" }, { id: "neutra", nome: "Neutra" }, { id: "risada", nome: "Risada" }, { id: "biquinho", nome: "Biquinho" }, { id: "canto", nome: "Sorriso de canto" }],
  barba: [{ id: "nenhuma", nome: "Nenhuma" }, { id: "porfazer", nome: "Por fazer" }, { id: "bigode", nome: "Bigode" }, { id: "cavanhaque", nome: "Cavanhaque" }, { id: "cheia", nome: "Barba cheia" }, { id: "costeleta", nome: "Costeletas" }],
  marcas: [{ id: "sardas", nome: "Sardas" }, { id: "blush", nome: "Blush" }, { id: "pinta", nome: "Pinta de diva" }, { id: "cilios", nome: "Cílios marcados" }, { id: "delineado", nome: "Delineado" }],
};

export const CABELOS = [
  { id: "curto", nome: "Curto clássico" },
  { id: "topete", nome: "Topete" },
  { id: "lateral", nome: "Repartido de lado" },
  { id: "raspado", nome: "Raspado" },
  { id: "careca", nome: "Careca" },
  { id: "cacheado", nome: "Cacheado curto" },
  { id: "black", nome: "Black power" },
  { id: "dreads", nome: "Dreads" },
  { id: "chanel", nome: "Chanel" },
  { id: "longo", nome: "Longo liso" },
  { id: "ondas", nome: "Ondas retrô" },
  { id: "cachos_longos", nome: "Cachos longos" },
  { id: "rabo", nome: "Rabo de cavalo" },
  { id: "coque", nome: "Coque alto" },
  { id: "tranca", nome: "Trança lateral" },
  { id: "maria", nome: "Maria-chiquinha" },
  { id: "pixie", nome: "Pixie" },
  { id: "moicano", nome: "Moicano" },
];

// ---------- Roupas ----------
// gola: redonda | v | social | alta | tomara | frenteunica | canoa | polo
// manga: nenhuma | curta | longa
export const PARTE_CIMA = [
  { id: "camisa_branca", nome: "Camisa social branca", cor: "#f4f4f0", gola: "social", manga: "longa", grupo: "gala" },
  { id: "camisa_preta", nome: "Camisa preta de cetim", cor: "#18181c", padrao: "cetim", gola: "social", manga: "longa", grupo: "gala" },
  { id: "gola_alta", nome: "Gola alta de tricô", cor: "#1d1d22", padrao: "trico", gola: "alta", manga: "longa", grupo: "casual" },
  { id: "camiseta", nome: "Camiseta básica", cor: "#f7f7f7", gola: "redonda", manga: "curta", grupo: "casual" },
  { id: "camiseta_preta", nome: "Camiseta preta", cor: "#1a1a1e", gola: "redonda", manga: "curta", grupo: "casual" },
  { id: "listrada", nome: "Listrada marinheiro", cor: "#ffffff", padrao: "listras", cor2: "#1d3557", gola: "canoa", manga: "longa", grupo: "casual" },
  { id: "blusa_seda", nome: "Blusa de seda", cor: "#e6cfa7", padrao: "cetim", gola: "v", manga: "longa", grupo: "gala" },
  { id: "top_tomara", nome: "Top tomara que caia", cor: "#6d1a2c", padrao: "cetim", gola: "tomara", manga: "nenhuma", grupo: "festa" },
  { id: "body_brilho", nome: "Body de brilho", cor: "#c9ccd3", padrao: "lantejoula", gola: "frenteunica", manga: "nenhuma", grupo: "festa" },
  { id: "regata", nome: "Regata canelada", cor: "#f1ece2", gola: "redonda", manga: "nenhuma", grupo: "casual" },
  { id: "havaiana", nome: "Camisa havaiana", cor: "#0f6e8c", padrao: "floral", cor2: "#f2d544", gola: "social", manga: "curta", grupo: "casual" },
  { id: "xadrez", nome: "Camisa xadrez caipira", cor: "#b22222", padrao: "xadrez", cor2: "#1f2a44", gola: "social", manga: "longa", grupo: "caipira" },
  { id: "polo", nome: "Polo", cor: "#2a4d3a", gola: "polo", manga: "curta", grupo: "casual" },
  { id: "cropped", nome: "Cropped de poá", cor: "#f6f3ea", padrao: "poa", cor2: "#16161a", gola: "canoa", manga: "curta", grupo: "festa" },
  { id: "camiseta_estrela", nome: "Camiseta Calçada da Fama", cor: "#16161a", padrao: "estrelas", cor2: "#e2b13c", gola: "redonda", manga: "curta", grupo: "estrela", segredo: true },
];

// lapela: nenhuma | entalhada | pico | xale   comprimento: cintura | quadril | joelho
export const CASACOS = [
  { id: "nenhum", nome: "Sem casaco" },
  { id: "smoking_preto", nome: "Smoking preto", cor: "#0e0e10", lapela: "pico", lapelaCor: "#26262c", comprimento: "quadril", grupo: "gala" },
  { id: "smoking_branco", nome: "Smoking branco", cor: "#f2efe6", lapela: "xale", lapelaCor: "#fbf8f0", comprimento: "quadril", grupo: "gala" },
  { id: "smoking_veludo", nome: "Smoking de veludo", cor: "#5b0f22", padrao: "veludo", lapela: "xale", lapelaCor: "#141014", comprimento: "quadril", grupo: "gala" },
  { id: "terno_giz", nome: "Terno risca de giz", cor: "#3b3f46", padrao: "riscagiz", cor2: "#c8c8c8", lapela: "entalhada", comprimento: "quadril", grupo: "gala" },
  { id: "terno_marinho", nome: "Terno azul-marinho", cor: "#1b2a4a", lapela: "entalhada", comprimento: "quadril", grupo: "gala" },
  { id: "blazer_dourado", nome: "Blazer de lantejoula", cor: "#c9a14a", padrao: "lantejoula", lapela: "pico", comprimento: "quadril", grupo: "festa" },
  { id: "blazer_rosa", nome: "Blazer rosa", cor: "#e38aa8", lapela: "pico", comprimento: "quadril", grupo: "festa" },
  { id: "couro", nome: "Jaqueta de couro", cor: "#1a1716", padrao: "couro", lapela: "entalhada", comprimento: "cintura", grupo: "casual" },
  { id: "jaqueta_jeans", nome: "Jaqueta jeans", cor: "#4a6c99", padrao: "jeans", lapela: "nenhuma", comprimento: "cintura", grupo: "casual" },
  { id: "bomber", nome: "Bomber de cetim", cor: "#2f5a3e", padrao: "cetim", lapela: "nenhuma", comprimento: "cintura", grupo: "casual" },
  { id: "trench", nome: "Trench coat", cor: "#b78a52", lapela: "entalhada", comprimento: "joelho", grupo: "gala" },
  { id: "casaco_pelo", nome: "Casaco felpudo", cor: "#f1ede6", padrao: "veludo", lapela: "xale", comprimento: "joelho", grupo: "festa" },
  { id: "colete", nome: "Colete xadrez", cor: "#7a4a24", padrao: "xadrez", cor2: "#3e2616", lapela: "nenhuma", comprimento: "cintura", semMangas: true, grupo: "caipira" },
  { id: "smoking_estrela", nome: "Smoking Calçada da Fama", cor: "#16161a", padrao: "estrelas", cor2: "#e2b13c", lapela: "pico", lapelaCor: "#c9a14a", comprimento: "quadril", grupo: "estrela", segredo: true },
];

// tipo: calca | bermuda | saia   corte: reta | larga | justa   comprimento (saia): mini | midi | longa
export const PARTE_BAIXO = [
  { id: "calca_preta", nome: "Calça social preta", tipo: "calca", cor: "#121214", grupo: "gala" },
  { id: "calca_smoking", nome: "Calça de smoking", tipo: "calca", cor: "#0e0e10", faixa: "#2c2c34", grupo: "gala" },
  { id: "calca_branca", nome: "Calça branca", tipo: "calca", cor: "#f2efe6", grupo: "gala" },
  { id: "jeans", nome: "Jeans", tipo: "calca", cor: "#2c4a7c", padrao: "jeans", grupo: "casual" },
  { id: "jeans_claro", nome: "Jeans claro", tipo: "calca", cor: "#7d9cc4", padrao: "jeans", grupo: "casual" },
  { id: "pantalona", nome: "Pantalona de cetim", tipo: "calca", corte: "larga", cor: "#e6cfa7", padrao: "cetim", grupo: "festa" },
  { id: "calca_couro", nome: "Calça de couro", tipo: "calca", corte: "justa", cor: "#141110", padrao: "couro", grupo: "festa" },
  { id: "bermuda", nome: "Bermuda", tipo: "bermuda", cor: "#d8c7a3", grupo: "casual" },
  { id: "bermuda_jeans", nome: "Bermuda jeans", tipo: "bermuda", cor: "#4a6c99", padrao: "jeans", grupo: "casual" },
  { id: "saia_lapis", nome: "Saia lápis", tipo: "saia", comprimento: "midi", forma: "reta", cor: "#121214", grupo: "gala" },
  { id: "saia_midi", nome: "Saia midi plissada", tipo: "saia", comprimento: "midi", forma: "evase", cor: "#c9a14a", padrao: "cetim", grupo: "festa" },
  { id: "mini_couro", nome: "Minissaia de couro", tipo: "saia", comprimento: "mini", forma: "reta", cor: "#141110", padrao: "couro", grupo: "festa" },
  { id: "saia_tule", nome: "Saia de tule", tipo: "saia", comprimento: "longa", forma: "baile", cor: "#f4b6c8", grupo: "festa" },
  { id: "saia_xadrez", nome: "Saia xadrez caipira", tipo: "saia", comprimento: "midi", forma: "evase", cor: "#b22222", padrao: "xadrez", cor2: "#f2efe6", grupo: "caipira" },
];

// Vestidos e macacões substituem parte de cima + parte de baixo.
// forma: reto | evase | sereia | baile | macacao
export const VESTIDOS = [
  { id: "nenhum", nome: "Sem vestido" },
  { id: "sereia_dourado", nome: "Sereia de lantejoula", cor: "#c9a14a", padrao: "lantejoula", gola: "v", manga: "nenhuma", forma: "sereia", comprimento: "longa", grupo: "gala" },
  { id: "baile_vermelho", nome: "Vestido de baile vermelho", cor: "#a3101d", padrao: "cetim", gola: "tomara", manga: "nenhuma", forma: "baile", comprimento: "longa", grupo: "gala" },
  { id: "esmeralda", nome: "Longo de cetim esmeralda", cor: "#0f5a43", padrao: "cetim", gola: "frenteunica", manga: "nenhuma", forma: "reto", comprimento: "longa", grupo: "gala" },
  { id: "pretinho", nome: "Pretinho básico", cor: "#0e0e10", gola: "redonda", manga: "nenhuma", forma: "evase", comprimento: "mini", grupo: "festa" },
  { id: "veludo_azul", nome: "Veludo azul-noite", cor: "#18224a", padrao: "veludo", gola: "v", manga: "longa", forma: "reto", comprimento: "longa", grupo: "gala" },
  { id: "metalico", nome: "Metálico prata", cor: "#c9ccd3", padrao: "metalico", gola: "tomara", manga: "nenhuma", forma: "sereia", comprimento: "longa", grupo: "festa" },
  { id: "princesa", nome: "Princesa de tule rosa", cor: "#f4b6c8", gola: "tomara", manga: "nenhuma", forma: "baile", comprimento: "longa", grupo: "festa" },
  { id: "deusa", nome: "Branco de deusa grega", cor: "#f6f3ea", padrao: "cetim", gola: "canoa", manga: "nenhuma", forma: "evase", comprimento: "longa", grupo: "gala" },
  { id: "oncinha", nome: "Midi de oncinha", cor: "#d9a35a", padrao: "oncinha", cor2: "#3e2616", gola: "v", manga: "curta", forma: "evase", comprimento: "midi", grupo: "festa" },
  { id: "floral", nome: "Vestido floral de chita", cor: "#e05a3a", padrao: "floral", cor2: "#f2d544", gola: "redonda", manga: "curta", forma: "evase", comprimento: "midi", grupo: "caipira" },
  { id: "listrado", nome: "Listrado de verão", cor: "#f6f3ea", padrao: "listras", cor2: "#b0485a", gola: "v", manga: "curta", forma: "evase", comprimento: "midi", grupo: "casual" },
  { id: "macacao_preto", nome: "Macacão de gala", cor: "#101012", padrao: "cetim", gola: "v", manga: "longa", forma: "macacao", comprimento: "longa", grupo: "gala" },
  { id: "macacao_branco", nome: "Macacão com strass", cor: "#f2f2f5", padrao: "lantejoula", gola: "v", manga: "nenhuma", forma: "macacao", comprimento: "longa", grupo: "festa" },
  { id: "tapete_vermelho", nome: "Vestido da grande estreia", cor: "#b0121f", padrao: "estrelas", cor2: "#ffd84a", gola: "v", manga: "nenhuma", forma: "sereia", comprimento: "longa", grupo: "estrela", segredo: true },
];

export const MEIAS = [
  { id: "nenhuma", nome: "Sem meia" },
  { id: "meia_calca", nome: "Meia-calça fina", cor: "#2a2224" },
  { id: "meia_nude", nome: "Meia-calça nude", cor: "#d8a888" },
  { id: "arrastao", nome: "Arrastão", cor: "#141414", padrao: "xadrez" },
  { id: "soquete", nome: "Soquete branca", cor: "#f4f4f4", curta: true },
  { id: "meia_listrada", nome: "Meião listrado", cor: "#f4f4f4", padrao: "listras", cor2: "#b0121f" },
];

// tipo: social | tenis | salto | bota | chinelo | sandalia
export const CALCADOS = [
  { id: "oxford", nome: "Oxford envernizado", tipo: "social", cor: "#0b0b0c" },
  { id: "mocassim", nome: "Mocassim caramelo", tipo: "social", cor: "#7a4a24" },
  { id: "tenis", nome: "Tênis branco", tipo: "tenis", cor: "#f4f4f4", sola: "#ffffff" },
  { id: "tenis_retro", nome: "Tênis retrô", tipo: "tenis", cor: "#d94b3d", sola: "#f2efe6" },
  { id: "scarpin", nome: "Scarpin preto", tipo: "salto", cor: "#0b0b0c" },
  { id: "salto_dourado", nome: "Sandália dourada", tipo: "salto", cor: "#c9a14a" },
  { id: "salto_vermelho", nome: "Salto vermelho", tipo: "salto", cor: "#b0121f" },
  { id: "bota", nome: "Bota de cowboy", tipo: "bota", cor: "#6b3f1e" },
  { id: "coturno", nome: "Coturno", tipo: "bota", cor: "#1a1716" },
  { id: "chinelo", nome: "Chinelo de dedo", tipo: "chinelo", cor: "#2a9d8f" },
  { id: "rasteira", nome: "Rasteirinha", tipo: "sandalia", cor: "#c9a14a" },
];

// ---------- Acessórios ----------
export const CHAPEUS = [
  { id: "nenhum", nome: "Sem chapéu" },
  { id: "fedora", nome: "Fedora", tipo: "fedora", cor: "#1a1a1d", cor2: "#7a1f2c" },
  { id: "cartola", nome: "Cartola", tipo: "cartola", cor: "#0d0d0f", cor2: "#3a3a44" },
  { id: "palha", nome: "Chapéu de palha", tipo: "palha", cor: "#d9b96a", cor2: "#8a3a1d" },
  { id: "cowboy", nome: "Chapéu de cowboy", tipo: "cowboy", cor: "#7a4a24", cor2: "#3b2312" },
  { id: "bone", nome: "Boné", tipo: "bone", cor: "#1d3557", cor2: "#e9c46a" },
  { id: "boina", nome: "Boina francesa", tipo: "boina", cor: "#2a1a1a" },
  { id: "pamela", nome: "Chapéu pamela", tipo: "pamela", cor: "#f2e6cc", cor2: "#16161a" },
  { id: "tiara", nome: "Tiara de brilhantes", tipo: "tiara", cor: "#dfe6ee" },
  { id: "coroa", nome: "Coroa", tipo: "coroa", cor: "#e2b13c" },
  { id: "laco", nome: "Laço de cabelo", tipo: "laco", cor: "#e05a9c" },
  { id: "flor", nome: "Flor no cabelo", tipo: "flor", cor: "#e05a3a" },
  { id: "headphone", nome: "Fone de ouvido", tipo: "fone", cor: "#16161a" },
  { id: "boina_diretor", nome: "Boina de diretor", tipo: "boina", cor: "#16161a", segredo: true },
];

export const OCULOS = [
  { id: "nenhum", nome: "Sem óculos" },
  { id: "aviador", nome: "Aviador", tipo: "aviador", cor: "#c9a14a", lente: "#2b3a2f" },
  { id: "wayfarer", nome: "Wayfarer", tipo: "quadrado", cor: "#111111", lente: "#141414" },
  { id: "redondo", nome: "Redondo vintage", tipo: "redondo", cor: "#3a2a1a", lente: "#5a4632" },
  { id: "gatinho", nome: "Gatinho", tipo: "gatinho", cor: "#0b0b0c", lente: "#2b1d2a" },
  { id: "grau", nome: "Óculos de grau", tipo: "quadrado", cor: "#6a4a2a", lente: null },
  { id: "coracao", nome: "Coração", tipo: "coracao", cor: "#e05a9c", lente: "#7a1f4d" },
  { id: "estrela", nome: "Óculos de estrela", tipo: "estrela", cor: "#e9c46a", lente: "#5a2a8a", segredo: true },
];

export const PESCOCO = [
  { id: "nenhum", nome: "Nada" },
  { id: "borboleta", nome: "Gravata-borboleta", tipo: "borboleta", cor: "#0a0a0c" },
  { id: "borboleta_vinho", nome: "Borboleta vinho", tipo: "borboleta", cor: "#6d1a2c" },
  { id: "gravata", nome: "Gravata fina", tipo: "gravata", cor: "#0d0d10" },
  { id: "gravata_dourada", nome: "Gravata dourada", tipo: "gravata", cor: "#c9a14a" },
  { id: "lenco", nome: "Lenço de seda", tipo: "lenco", cor: "#e05a3a" },
  { id: "perolas", nome: "Colar de pérolas", tipo: "perolas", cor: "#f3efe6" },
  { id: "corrente", nome: "Corrente dourada", tipo: "corrente", cor: "#e2b13c" },
  { id: "gargantilha", nome: "Gargantilha", tipo: "gargantilha", cor: "#16161a" },
  { id: "estola", nome: "Estola de plumas", tipo: "estola", cor: "#f6f2ea" },
  { id: "medalha", nome: "Medalha de estrela", tipo: "medalha", cor: "#e2b13c", segredo: true },
];

export const BRINCOS = [
  { id: "nenhum", nome: "Sem brincos" },
  { id: "argola", nome: "Argola dourada", tipo: "argola", cor: "#e2b13c" },
  { id: "perola", nome: "Pérola", tipo: "ponto", cor: "#f3efe6" },
  { id: "brilhante", nome: "Brilhante", tipo: "ponto", cor: "#dff4ff" },
  { id: "pendente", nome: "Pendente longo", tipo: "pendente", cor: "#c9ccd3" },
];

export const PULSO = [
  { id: "nenhum", nome: "Nada" },
  { id: "relogio_ouro", nome: "Relógio de ouro", cor: "#d4af37" },
  { id: "relogio_prata", nome: "Relógio prata", cor: "#cfd3d8" },
  { id: "pulseiras", nome: "Pulseiras coloridas", cor: "#e05a9c" },
];

export const LUVAS = [
  { id: "nenhuma", nome: "Sem luvas" },
  { id: "luva_curta", nome: "Luvas curtas", cor: "#f4f4f0" },
  { id: "luva_longa", nome: "Luvas longas de gala", cor: "#16161a", longa: true },
  { id: "luva_cetim", nome: "Luvas de cetim", cor: "#f4f0e8", longa: true, padrao: "cetim" },
];

// Item na mão (aparece no boneco e no retrato).
export const NA_MAO = [
  { id: "nada", nome: "Mãos livres" },
  { id: "bolsa", nome: "Bolsa clutch", tipo: "bolsa", cor: "#c9a14a" },
  { id: "leque", nome: "Leque", tipo: "leque", cor: "#b0121f" },
  { id: "buque", nome: "Buquê de flores", tipo: "buque", cor: "#e05a9c" },
  { id: "violao", nome: "Violão", tipo: "violao", cor: "#a86a2a" },
  { id: "suco", nome: "Copo de suco", tipo: "copo", cor: "#f29a2a" },
  { id: "estatueta", nome: "Estatueta dourada", tipo: "estatueta", cor: "#e2b13c", segredo: true },
  { id: "claquete", nome: "Claquete", tipo: "claquete", cor: "#16161a", segredo: true },
  { id: "pipoca", nome: "Balde de pipoca", tipo: "pipoca", cor: "#c41e2a", segredo: true },
];

export const SLOTS = {
  cima: PARTE_CIMA, casaco: CASACOS, baixo: PARTE_BAIXO, vestido: VESTIDOS, meia: MEIAS, calcado: CALCADOS,
  chapeu: CHAPEUS, oculos: OCULOS, pescoco: PESCOCO, brinco: BRINCOS, pulso: PULSO, luvas: LUVAS, mao: NA_MAO,
};
export const NOMES_SLOT = {
  cima: "Parte de cima", casaco: "Casaco", baixo: "Parte de baixo", vestido: "Vestido / macacão", meia: "Meias", calcado: "Calçado",
  chapeu: "Cabeça", oculos: "Óculos", pescoco: "Pescoço", brinco: "Brincos", pulso: "Pulso", luvas: "Luvas", mao: "Na mão",
};
// Slots que podem ficar vazios.
export const OPCIONAIS = new Set(["casaco", "vestido", "meia", "chapeu", "oculos", "pescoco", "brinco", "pulso", "luvas", "mao"]);

export function item(slot, id) {
  const lista = SLOTS[slot];
  if (!lista) return null;
  return lista.find((i) => i.id === id) || null;
}

// Peça como ela aparece no personagem: catálogo + cor/padrão escolhidos.
export function pecaDe(ap, slot) {
  const base = item(slot, ap[slot]);
  if (!base || base.id === "nenhum" || base.id === "nenhuma" || base.id === "nada") return null;
  const ajuste = ap.ajustes?.[slot]?.[base.id] || {};
  return { ...base, ...ajuste, slot };
}

// ---------- Looks prontos ----------
export const LOOKS = [
  { id: "gala_smoking", nome: "Smoking de gala", ap: { cima: "camisa_branca", casaco: "smoking_preto", baixo: "calca_smoking", vestido: "nenhum", pescoco: "borboleta", calcado: "oxford", pulso: "relogio_ouro" } },
  { id: "baile", nome: "Noite de baile", ap: { vestido: "baile_vermelho", calcado: "salto_vermelho", brinco: "brilhante", pescoco: "perolas", luvas: "luva_longa", mao: "bolsa" } },
  { id: "sereia", nome: "Sereia dourada", ap: { vestido: "sereia_dourado", calcado: "salto_dourado", brinco: "argola", oculos: "gatinho", mao: "bolsa" } },
  { id: "galã", nome: "Galã de jaqueta", ap: { cima: "camiseta", casaco: "couro", baixo: "jeans", vestido: "nenhum", calcado: "tenis", oculos: "aviador", pescoco: "corrente" } },
  { id: "rock", nome: "Rock star", ap: { cima: "camiseta_preta", casaco: "couro", baixo: "calca_couro", vestido: "nenhum", calcado: "coturno", oculos: "redondo", pulso: "pulseiras", mao: "violao" } },
  { id: "diva_retro", nome: "Diva retrô", ap: { vestido: "pretinho", calcado: "scarpin", luvas: "luva_cetim", pescoco: "perolas", oculos: "gatinho", chapeu: "pamela" } },
  { id: "caipira", nome: "Arraiá da chácara", ap: { cima: "xadrez", casaco: "colete", baixo: "jeans", vestido: "nenhum", calcado: "bota", chapeu: "palha", pescoco: "lenco" } },
  { id: "piscina", nome: "Dia de piscina", ap: { cima: "havaiana", casaco: "nenhum", baixo: "bermuda", vestido: "nenhum", calcado: "chinelo", oculos: "wayfarer", chapeu: "bone", mao: "suco" } },
  { id: "estreia", nome: "Grande estreia", segredo: true, ap: { vestido: "tapete_vermelho", calcado: "salto_dourado", brinco: "brilhante", luvas: "luva_longa", mao: "estatueta", oculos: "estrela" } },
  { id: "diretor", nome: "Diretor de cena", segredo: true, ap: { cima: "gola_alta", casaco: "smoking_estrela", baixo: "calca_preta", vestido: "nenhum", calcado: "oxford", chapeu: "boina_diretor", mao: "claquete", oculos: "redondo" } },
];

export function aparenciaPadrao(genero = "f") {
  const base = {
    nome: "", genero, altura: 1, porte: 1, pele: "#e0ac83",
    formato: "oval", olhos: "redondo", corOlhos: "#4a2e1b", sobrancelha: "natural", nariz: "pequeno", boca: "sorriso",
    barba: "nenhuma", marcas: [], batom: "nenhum", sombra: "nenhuma",
    cabelo: genero === "f" ? "ondas" : "curto", corCabelo: "#2e1c12", corMechas: null,
    cima: "camisa_branca", casaco: "nenhum", baixo: "calca_preta", vestido: "nenhum", meia: "nenhuma", calcado: "oxford",
    chapeu: "nenhum", oculos: "nenhum", pescoco: "nenhum", brinco: "nenhum", pulso: "nenhum", luvas: "nenhuma", mao: "nada",
    ajustes: {},
    foto: { usar: true, noBoneco: true, zoom: 1, dx: 0, dy: 0, brilho: 0 },
  };
  if (genero === "f") Object.assign(base, { vestido: "sereia_dourado", calcado: "salto_dourado", brinco: "argola", marcas: ["cilios"], batom: "#c0485a" });
  else Object.assign(base, { casaco: "smoking_preto", baixo: "calca_smoking", pescoco: "borboleta", formato: "quadrado", sobrancelha: "grossa", boca: "canto" });
  return base;
}
