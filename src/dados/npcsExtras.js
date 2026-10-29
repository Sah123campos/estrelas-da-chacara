// ============================================================================
// PESSOAS DO ACAMPAMENTO (sem pistas do mistério) — conversam, andam e interagem.
// Mesmo formato de npcs.js; use npc() para escrever rápido:
//   falas: lista de frases de abertura (uma é sorteada)
//   opcoes: [{ label, texto, acao? , depois? }]  (depois = mais uma resposta)
//   pos: frases depois que o tema é revelado (opcional)
//   par: id de quem anda junto (eles se viram um para o outro e conversam)
// ============================================================================
const POS = { flag: "tema_revelado" };
const MORENO = "#8a5634"; // mesmo tom de pele do Davi

function npc({ id, nome, local, comp, ap, falas, opcoes = [], pos }) {
  const nodes = { start: { text: falas, options: [] } };
  opcoes.forEach((o, i) => {
    const k = `o${i}`;
    nodes[k] = { text: o.texto, options: o.depois ? [{ label: o.depois.label, next: `${k}b`, action: o.depois.acao }] : [{ label: o.fim || "Hahaha, valeu!", end: true, action: o.acaoFim }] };
    if (o.depois) nodes[`${k}b`] = { text: o.depois.texto, options: [{ label: o.depois.fim || "Hahaha!", end: true }] };
    nodes.start.options.push({ label: o.label, next: k, action: o.acao });
  });
  nodes.start.options.push({ label: "Tchau!", end: true, action: "acenar" });
  const entry = [{ node: "start" }];
  if (pos) {
    nodes.pos = { text: pos, options: [...nodes.start.options] };
    entry.unshift({ if: POS, node: "pos" });
  }
  return { id, nome, extra: true, local, comportamento: comp, aparencia: { vestido: "nenhum", ...ap }, dialogo: { entry, nodes } };
}

export const EXTRAS = [
  // ---------- casal no lago ----------
  npc({
    id: "renan", nome: "Renan", local: { x: -11, z: -46.5 }, comp: { tipo: "passear", raio: 1.6, par: "jaque", lento: true },
    ap: { genero: "m", altura: 2, pele: "#d29a6e", cabelo: "curto", corCabelo: "#2e1c12", barba: "porfazer", cima: "polo", baixo: "bermuda_jeans", calcado: "tenis", pulso: "relogio_prata" },
    falas: ["Eu e a Jaque estamos contando quantos sapos tem no lago. Já são catorze!", "Psiu… tô planejando uma surpresa pra Jaque. Não conta pra ela!"],
    opcoes: [
      { label: "Vocês formam um casal lindo!", texto: "Ela que me escolheu, eu só aceitei bem rapidinho antes que ela mudasse de ideia." },
      { label: "Cadê a Jaque?", texto: "Do meu lado! É que ela é baixinha, às vezes some no meio do capim." },
    ],
    pos: "Hollywood! Já combinei com a Jaque: a gente vai desfilar de mãos dadas no tapete vermelho.",
  }),
  npc({
    id: "jaque", nome: "Jaque", local: { x: -12.6, z: -45.8 }, comp: { tipo: "passear", raio: 1.6, par: "renan", lento: true },
    ap: { genero: "f", altura: 0, pele: "#e0ac83", cabelo: "rabo", corCabelo: "#4a2e1b", marcas: ["blush", "cilios"], batom: "#e88aa0", cima: "cropped", baixo: "saia_midi", calcado: "rasteira", brinco: "perola", chapeu: "laco" },
    falas: ["Oi! Eu sou a Jaque. Sim, eu sei, sou baixinha. Mas o Renan diz que as melhores coisas vêm em frasco pequeno.", "O Renan tá estranho hoje… muito carinhoso. Ele tá aprontando alguma!"],
    opcoes: [
      { label: "Você e o Renan…", texto: "Namorando! Ele carrega minha mochila e eu carrego o juízo dele." },
      { label: "Tá alcançando a pia do refeitório?", texto: "Com um banquinho e muita fé! Hahaha." },
    ],
  }),
  // ---------- piscina ----------
  npc({
    id: "nathaly", nome: "Nathaly", local: { x: 30, z: -21.5 }, comp: { tipo: "passear", raio: 3, par: "gaby" },
    ap: { genero: "f", pele: "#c98e62", cabelo: "longo", corCabelo: "#2e1c12", corMechas: "#a8743f", cima: "regata", baixo: "bermuda_jeans", calcado: "chinelo", oculos: "wayfarer" },
    falas: ["Já desceu no toboágua? Eu desci três vezes e ainda tô com água no ouvido!", "A Gaby jura que vai descer o toboágua de costas. Eu tô aqui só pra filmar!"],
    opcoes: [{ label: "Bora descer junto?", texto: "Bora! A escadinha fica ali do lado da piscina. Quem gritar mais alto ganha!" }],
  }),
  npc({
    id: "gaby", nome: "Gaby", local: { x: 32, z: -20.5 }, comp: { tipo: "passear", raio: 3, par: "nathaly" },
    ap: { genero: "f", pele: "#f6d7c3", cabelo: "coque", corCabelo: "#d6b37a", cima: "listrada", baixo: "bermuda", calcado: "chinelo", oculos: "coracao", mao: "suco" },
    falas: ["A Nathaly me desafiou a descer o toboágua de costas. Torce por mim!", "Trouxe protetor solar fator 70. Ninguém vai sair vermelho daqui!"],
    opcoes: [{ label: "Você vai mesmo descer de costas?", texto: "Vou! Se eu não voltar, fala pra minha mãe que eu fui corajosa." }],
  }),
  // ---------- alojamento das meninas ----------
  npc({
    id: "izabelle", nome: "Izabelle", local: { x: -28, z: 66.5 }, comp: { tipo: "passear", raio: 4 },
    ap: { genero: "f", pele: "#a86f47", cabelo: "tranca", corCabelo: "#141010", cima: "blusa_seda", baixo: "calca_branca", calcado: "tenis", brinco: "argola", marcas: ["delineado"], batom: "#c97a6a" },
    falas: ["Trouxe três malas pra dois dias. Uma só de roupa pra noite do tema!", "Bem-vindo(a) ao quarto das meninas! Repara não na bagunça… mentira, tá tudo arrumadinho."],
    opcoes: [{ label: "Você sabe qual é o tema?", texto: "Não! E isso tá me matando. Separei looks pra TODOS os temas possíveis." }],
    pos: "Hollywood!!! Eu sabia que a mala do brilho ia ser útil!",
  }),
  npc({
    id: "lara", nome: "Lara", local: { x: -22, z: 73.5 }, comp: { tipo: "passear", raio: 3 },
    ap: { genero: "f", altura: 0, pele: "#fbe3d4", cabelo: "cachos_longos", corCabelo: "#b33a24", marcas: ["sardas", "blush"], corOlhos: "#3b6b3a", cima: "camiseta", baixo: "jeans_claro", calcado: "tenis_retro" },
    falas: ["Oi! Eu sou a Lara. Meu cabelo não aguenta essa umidade da chácara, olha esses cachos!", "É meu primeiro acampamento! Tô um pouquinho nervosa, mas muito feliz."],
    opcoes: [
      { label: "Seu cabelo é lindo!", texto: "Obrigada! Ruivo e cacheado: combo raro, tipo figurinha dourada do álbum." },
      { label: "Primeiro acampamento? Vai ser incrível!", texto: "Todo mundo fala isso! E falam que Deus faz coisas grandes aqui. Tô esperando de coração aberto." },
    ],
  }),
  // ---------- alojamento dos meninos ----------
  npc({
    id: "mj", nome: "MJ", local: { x: 24, z: 66.5 }, comp: { tipo: "passear", raio: 4 },
    ap: { genero: "m", pele: "#e0ac83", cabelo: "cacheado", corCabelo: "#2e1c12", barba: "cheia", cima: "camiseta_preta", baixo: "jeans", calcado: "tenis" },
    falas: ["Eu sou o MJ. Não o Michael Jackson, mas meu moonwalk é respeitado no alojamento!", "Alguém roubou meu travesseiro. Se você vir um travesseiro azul com cara de culpado, me avisa."],
    opcoes: [{ label: "Mostra o moonwalk!", texto: "(O MJ desliza pra trás no piso do quarto e quase derruba uma mala.) Viu? Lenda.", acao: "dancar" }],
  }),
  // ---------- quadra ----------
  npc({
    id: "brayan", nome: "Brayan", local: { x: 24, z: 42 }, comp: { tipo: "patrulha", pontos: [[22, 40], [38, 40], [38, 48], [22, 48]] },
    ap: { genero: "m", pele: "#c98e62", cabelo: "raspado", corCabelo: "#141010", cima: "regata", baixo: "bermuda", calcado: "tenis_retro", chapeu: "bone", meia: "soquete" },
    falas: ["Bora um 21 depois do almoço? Eu e o Kenedy contra qualquer dupla!", "Aquecendo! O jogo de hoje vale o último pedaço de bolo."],
    opcoes: [{ label: "Eu sei arremessar!", texto: "Então prova! Pega a bola ali no meio da quadra e manda uma cesta." }],
  }),
  npc({
    id: "kenedy", nome: "Kenedy", local: { x: 34, z: 50.5 }, comp: { tipo: "passear", raio: 2.5, par: "brayan" },
    ap: { genero: "m", pele: "#a86f47", cabelo: "curto", corCabelo: "#141010", barba: "cavanhaque", boca: "risada", oculos: "grau", cima: "camiseta", baixo: "bermuda_jeans", calcado: "tenis" },
    falas: ["O Brayan acha que ganha de mim no basquete. Coitado.", "Sorria! Aqui na chácara não tem tempo ruim!"],
    opcoes: [{ label: "Quem joga melhor, você ou o Brayan?", texto: "Eu, claro. Mas fala baixo, ele é sensível." }],
  }),
  // ---------- refeitório ----------
  npc({
    id: "thama", nome: "Thama", local: { x: -24, z: 55 }, comp: { tipo: "passear", raio: 3, par: "debora" },
    ap: { genero: "f", pele: "#d29a6e", cabelo: "longo", corCabelo: "#2e1c12", corMechas: "#8a5a2a", chapeu: "bone", oculos: "aviador", batom: "#b0121f", cima: "camiseta_preta", baixo: "jeans", calcado: "tenis" },
    falas: ["Organizei a escala da louça. Adivinha quem tá na lista? Você! Brincadeira… ou não.", "Já pegou seu prato? A fila do bolo anda rápido, hein!"],
    opcoes: [{ label: "Me tira da escala da louça?", texto: "Só se você me trouxer um pedaço de bolo de fubá. Negócio é negócio." }],
  }),
  npc({
    id: "debora", nome: "Débora", local: { x: -36, z: 55 }, comp: { tipo: "passear", raio: 3, par: "thama" },
    ap: { genero: "f", pele: "#a86f47", cabelo: "chanel", corCabelo: "#141010", oculos: "grau", cima: "gola_alta", baixo: "jeans", calcado: "tenis" },
    falas: ["Já tomou café? A Thais fez bolo de fubá e eu já comi dois pedaços. Shhh.", "Tô anotando os pedidos de oração do pessoal. Quer deixar o seu?"],
    opcoes: [
      { label: "Quero deixar um pedido de oração.", texto: "Anotado com carinho. A gente vai orar por isso na fogueira hoje à noite. ♥" },
      { label: "Guarda um pedaço de bolo pra mim?", texto: "Guardo! Mas não conta pra Thama, senão ela me põe na escala da louça." },
    ],
  }),
  // ---------- fogueira: os três ----------
  npc({
    id: "douglas", nome: "Douglas", local: { x: -11, z: 31 }, comp: { tipo: "passear", raio: 1.6, par: "julio" },
    ap: { genero: "m", pele: MORENO, cabelo: "curto", corCabelo: "#141010", barba: "bigode", cima: "xadrez", baixo: "jeans", calcado: "bota" },
    falas: ["A gente tá cuidando da lenha da fogueira de hoje à noite. Vai ficar linda!", "Quem trouxe marshmallow? A fogueira sem marshmallow é só… fogo."],
    opcoes: [{ label: "Posso ajudar com a lenha?", texto: "Pode! Pega aqueles gravetos secos perto das mangueiras. Só não pega a corda molhada da árvore… aquilo tem história." }],
  }),
  npc({
    id: "julio", nome: "Julio", local: { x: -2, z: 33.5 }, comp: { tipo: "passear", raio: 1.6, par: "vinicius" },
    ap: { genero: "m", pele: MORENO, cabelo: "cacheado", corCabelo: "#141010", barba: "cavanhaque", cima: "camiseta", baixo: "calca_preta", calcado: "tenis", pescoco: "corrente" },
    falas: ["Já pensou no louvor em volta da fogueira? Eu arrepio só de pensar.", "O Pedro falou que o som vai ficar pronto pro culto. Tô confiando!"],
    opcoes: [{ label: "Qual música vai ter?", texto: "Segredo do ministério de louvor! Mas posso dizer que vai ter muita gente chorando de alegria." }],
  }),
  npc({
    id: "vinicius", nome: "Vinicius", local: { x: -6, z: 25.5 }, comp: { tipo: "passear", raio: 1.8, par: "douglas" },
    ap: { genero: "m", altura: 2, pele: MORENO, cabelo: "black", corCabelo: "#141010", barba: "porfazer", cima: "polo", baixo: "jeans", calcado: "mocassim" },
    falas: ["Você já ouviu a palavra da EMU?"],
    opcoes: [
      { label: "O que é EMU?", texto: "Ahhh… isso é coisa que só se entende vivendo! Fica perto da gente que você vai descobrir." },
      { label: "Já ouvi!", texto: "Então você é dos nossos! Toca aqui!", acaoFim: "acenar" },
    ],
  }),
  // ---------- mídia e música ----------
  npc({
    id: "pedro", nome: "Pedro", local: { x: 15.5, z: 31.8 }, comp: { tipo: "passear", raio: 2.2 },
    ap: { genero: "m", altura: 2, porte: 0, pele: "#efc3a4", cabelo: "lateral", corCabelo: "#4a2e1b", oculos: "grau", cima: "camiseta_preta", baixo: "calca_preta", calcado: "tenis", luvas: "nenhuma", mao: "microfone", chapeu: "headphone" },
    falas: ["Som… som… testando! Um, dois! Calma que eu tô ajustando os microfones pro louvor.", "Esse cabo tá com mau contato… achei! Mídia é tudo no detalhe."],
    opcoes: [
      { label: "Posso ajudar?", texto: "Segura esse cabo e não pisa nele, por favor. Se pisar, a bateria some do som." },
      { label: "Vai ter transmissão?", texto: "Vai sim! Câmera, telão e microfone, tudo pronto pro grande dia. Pode falar no microfone ali, ele tá ligado!" },
    ],
    pos: "Agora entendi pra que tanta câmera e telão: é noite de estreia em Hollywood!",
  }),
  npc({
    id: "almerao", nome: "Almerão", local: { x: 4, z: 14 }, comp: { tipo: "patrulha", pontos: [[4, 14], [12, 2], [6, -12], [-8, -6], [-4, 16]] },
    ap: { genero: "m", porte: 2, pele: MORENO, cabelo: "raspado", corCabelo: "#141010", barba: "cheia", cima: "camiseta", baixo: "jeans", calcado: "tenis", mao: "camera", pescoco: "corrente" },
    falas: ["Gravando! Sorria que você tá no vídeo do acampamento!", "Essa luz da tarde tá perfeita pra gravação. Fica parado aí… isso!"],
    opcoes: [
      { label: "Canta uma música!", texto: "♪ Salte da cama, salte dessa cama, salte da camaaaa! ♪", depois: { label: "Canta outra!", texto: "♪ BORA ACORDARRR! ♪", fim: "Hahaha, acordei!" } },
      { label: "O que você tá gravando?", texto: "Tudo! Cada abraço, cada risada… e uns tombos também, que esses rendem mais visualização." },
    ],
    pos: "Minhas gravações vão passar no telão da estreia! Hollywood, aqui vou eu!",
  }),
  // ---------- JV ----------
  npc({
    id: "mylena", nome: "Mylena", local: { x: 9, z: 42 }, comp: { tipo: "passear", raio: 2.2, par: "dener" },
    ap: { genero: "f", pele: "#c98e62", cabelo: "cachos_longos", corCabelo: "#2e1c12", cima: "camiseta", baixo: "jeans", calcado: "tenis", brinco: "argola" },
    falas: ["Tá preparado para o Canibal?"],
    opcoes: [
      { label: "O que é o Canibal?!", texto: "É a brincadeira mais esperada do acampamento! Prepara o fôlego… e o tênis." },
      { label: "Tô pronto!", texto: "Isso! O JV não brinca em serviço… quer dizer, brinca sim!" },
    ],
  }),
  npc({
    id: "dener", nome: "Dener", local: { x: 10.6, z: 42.8 }, comp: { tipo: "passear", raio: 2.2, par: "mylena" },
    ap: { genero: "m", pele: "#d29a6e", cabelo: "topete", corCabelo: "#2e1c12", cima: "camiseta", baixo: "bermuda_jeans", calcado: "tenis_retro", oculos: "wayfarer" },
    falas: ["Tá preparado para o Canibal?"],
    opcoes: [
      { label: "Canibal? Que medo!", texto: "Hahaha! Calma, é só o nome da brincadeira. Ninguém come ninguém. Mas todo mundo corre!" },
      { label: "Vocês dois estão sempre juntos!", texto: "Eu e a Mylena? JV unido jamais será vencido!" },
    ],
  }),
];
