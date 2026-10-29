// ============================================================================
// CADASTRO DE PERSONAGENS (NPCs) — edite só este arquivo para adicionar pessoas.
//
// Campos:
//   id            identificador único (sem espaços)
//   nome          nome exibido
//   local         nome de um ponto do mapa (ver MAPA.pontos em mapa.js) ou { x, z } em metros
//   comportamento { tipo: 'parado' | 'passear' | 'patrulha' | 'sentar' | 'dancar', raio, pontos, lento, dir }
//   aparencia     igual à do jogador (ver guardaroupa.js -> aparenciaPadrao). Campos omitidos usam o padrão.
//   dialogo       { entry: [ {if, node} ... ], nodes: { id: { text, options: [ {label, next|end, set, if, action} ] } } }
//
// Condições (if): { flag } | { notFlag } | { visits: 2 } (a partir da 2ª conversa) | { outfitTag: 'gala' } (grupo de peça vestida)
// Ações (action): 'acenar' | 'dancar' | 'camarim' | 'sino'
// Texto: string ou lista de strings (uma é sorteada). Use {jogador} para o nome do jogador.
// A flag 'tema_revelado' é ligada quando o jogador descobre o tema.
//
// Personagens fictícios de uma experiência humorística. Não representam as celebridades reais.
// ============================================================================

const POS = { flag: "tema_revelado" };

export const NPCS = [
  {
    id: "davi_dicaprio",
    nome: "Davi Dicaprio",
    local: "banco_lago",
    comportamento: { tipo: "sentar", dir: "baixo" },
    aparencia: {
      genero: "m", pele: "#8a5634", cabelo: "cacheado", corCabelo: "#141010", corOlhos: "#3a2414", olhos: "amendoa", boca: "canto", formato: "quadrado", sobrancelha: "grossa",
      cima: "camisa_branca", casaco: "smoking_preto", pescoco: "borboleta", baixo: "calca_smoking", calcado: "oxford", pulso: "relogio_ouro", vestido: "nenhum",
    },
    dialogo: {
      entry: [{ if: POS, node: "pos" }, { if: { visits: 2 }, node: "denovo" }, { node: "start" }],
      nodes: {
        pista: { text: "Ninguém me contou… mas mandaram eu decorar falas e ensaiar meu melhor ângulo. Isso é coisa de CINEMA, {jogador}.", options: [{ label: "Pista: cinema!", end: true, set: "pista_davi_dicaprio" }] },
        start: {
          text: ["Shhh… olha esse lago, {jogador}. Imenso. Gelado. Perigoso.", "Você também sente? Esse lago tem a energia de um transatlântico."],
          options: [
            { label: "Qual é o tema do acampamento?", next: "pista", if: { notFlag: "pista_davi_dicaprio" } },
            { label: "É um laguinho de chácara, Davi.", next: "laguinho" },
            { label: "Quer que eu abra os braços na ponta do píer?", next: "pier" },
            { label: "Belo smoking!", next: "smoking", if: { outfitTag: "gala" } },
            { label: "Tchau!", end: true },
          ],
        },
        laguinho: { text: "Laguinho pra você. Pra mim é o Atlântico Norte. Até o sapo ali tem cara de iceberg.", options: [{ label: "Tá bom, capitão.", next: "porta" }, { label: "Vou ali.", end: true }] },
        pier: { text: "NÃO tem píer! Já pedi pro caseiro. Ele disse que tem uma tábua. Eu aceito a tábua.", options: [{ label: "A tábua cabe nós dois?", next: "porta" }, { label: "Hahaha. Até mais!", end: true }] },
        porta: { text: "Cabia. Sempre cabia. Essa discussão me persegue há anos. Vai lá, aproveita o acampamento!", options: [{ label: "Vou!", end: true, set: "davi_porta" }] },
        smoking: { text: "Notou? Esse é o meu smoking de \"rei do mundo\". Uso até pra pegar fila do café da manhã.", options: [{ label: "Respeito.", next: "start" }, { label: "Tchau, rei!", end: true, action: "acenar" }] },
        denovo: {
          text: ["Você voltou! Igual a maré. Igual o arrependimento de não ter dividido aquela porta.", "De novo por aqui? O lago chama, né?"],
          options: [
            { label: "Qual é o tema do acampamento?", next: "pista", if: { notFlag: "pista_davi_dicaprio" } },
            { label: "Já falou com a Thais na cozinha?", next: "thais" },
            { label: "Me conta de novo do Atlântico.", next: "start" },
            { label: "Fui!", end: true },
          ],
        },
        thais: { text: "A Thais? Ela me deu um pão de queijo tão grande que eu precisei de bote salva-vidas.", options: [{ label: "Hahaha!", end: true }] },
        pos: {
          text: ["HOLLYWOOD, {jogador}! Eu sabia! Agora só falta me darem a estatueta. Depois de tantos anos…", "Viu o letreiro no morro? Eu chorei. Igual no final daquele filme do navio."],
          options: [
            { label: "Você merece a estatueta!", next: "estatueta" },
            { label: "Que filme vamos gravar no lago?", next: "filme" },
            { label: "E o João?", next: "joao" },
            { label: "Tchau, astro!", end: true, action: "acenar" },
          ],
        },
        estatueta: { text: "Obrigado, obrigado. Eu gostaria de agradecer ao lago, ao sapo e à tábua que quase coube nós dois.", options: [{ label: "*aplausos*", end: true, action: "acenar" }] },
        filme: { text: "\"Titanic 2: O Laguinho\". Classificação livre. O iceberg vai ser aquele sapo.", options: [{ label: "Sucesso garantido.", end: true }] },
        joao: { text: "Meu filhão! Puxou o pai: já nasceu sabendo o nome do lugar mais famoso do cinema. Tá com a mãe dele, lá no refeitório.", options: [{ label: "Que fofo!", end: true }] },
      },
    },
  },
  {
    id: "taylor_frisso",
    nome: "Taylor Frisso",
    local: "piscina_borda",
    comportamento: { tipo: "dancar" },
    aparencia: {
      genero: "f", pele: "#f6d7c3", cabelo: "ondas", corCabelo: "#efdcae", corOlhos: "#3d6ea8", olhos: "grande", marcas: ["cilios", "delineado"], batom: "#b0121f",
      vestido: "sereia_dourado", calcado: "salto_dourado", brinco: "brilhante", oculos: "gatinho",
    },
    dialogo: {
      entry: [{ if: POS, node: "pos" }, { if: { flag: "taylor_musica" }, node: "fan" }, { node: "start" }],
      nodes: {
        pista: { text: "Pista número um: tapete VERMELHO. Pista número dois: estrelas… na calçada. Faz sentido pra você?", options: [{ label: "Tapete vermelho e estrelas na calçada…", end: true, set: "pista_taylor_frisso" }] },
        start: {
          text: ["Oiii! Você chegou bem na hora do meu show de beira de piscina!", "Shhh, tô compondo! Rima com \"toboágua\"… \"mágoa\"! Perfeito."],
          options: [
            { label: "Você sabe o tema do acampamento?", next: "pista", if: { notFlag: "pista_taylor_frisso" } },
            { label: "Que música é essa?", next: "musica" },
            { label: "Você vai entrar na piscina de lantejoula?", next: "piscina" },
            { label: "Dança comigo!", next: "danca", action: "dancar" },
            { label: "Tchau!", end: true },
          ],
        },
        musica: { text: "Chama \"Shake It Off do Toboágua\". Fala de um ex que ficou com medo da descida. Era o caseiro.", options: [{ label: "Quero ouvir o refrão!", next: "refrao" }, { label: "Pesado. Até mais.", end: true }] },
        refrao: { text: "♪ Os haters vão hater, hater, hater… e o toboágua vai descer, descer, descer! ♪", options: [{ label: "HIT!", end: true, set: "taylor_musica", action: "acenar" }] },
        piscina: { text: "Claro que não, querida. Lantejoula molhada pesa 40 quilos. Eu só faço pose na borda.", options: [{ label: "Faz sentido.", next: "start" }, { label: "Tchau!", end: true }] },
        danca: { text: "ISSO! Olha esse passinho! A chácara inteira tá assistindo, eu sinto!", options: [{ label: "(continuar dançando)", next: "start" }, { label: "Cansei, tchau!", end: true }] },
        fan: {
          text: "Minha fã número um voltou! Já tô na versão acústica da música do toboágua.",
          options: [
            { label: "Você sabe o tema do acampamento?", next: "pista", if: { notFlag: "pista_taylor_frisso" } },
            { label: "Me dá um autógrafo?", next: "autografo" },
            { label: "Depois eu volto!", end: true },
          ],
        },
        autografo: { text: "Assinei na sua alma. É mais fácil que achar caneta aqui na chácara.", options: [{ label: "Valeu!", end: true }] },
        pos: {
          text: ["HOLLYWOOD! Eu já tô compondo o hino: ♪ Le-trei-ro no mor-ro, eu cor-ro, eu cor-ro ♪", "Tapete vermelho, estrelas, letreiro… eu falei, não falei? Eu SEMPRE falo."],
          options: [
            { label: "Canta mais!", next: "hino", action: "dancar" },
            { label: "Qual é o seu look pra estreia?", next: "look" },
            { label: "Tchau, estrela!", end: true, action: "acenar" },
          ],
        },
        hino: { text: "♪ Chá-ca-ra das es-tre-las, até o sapo vai pro ta-pe-te! ♪ …Ainda tô ajustando a letra.", options: [{ label: "Já é um clássico.", end: true }] },
        look: { text: "Lantejoula, claro. Mas agora o camarim liberou peças NOVAS. Corre lá antes que eu pegue todas!", options: [{ label: "Corri!", end: true }] },
      },
    },
  },
  {
    id: "thais_grande",
    nome: "Thais Grande",
    local: "cozinha",
    comportamento: { tipo: "passear", raio: 4 },
    aparencia: {
      genero: "f", pele: "#c98e62", cabelo: "rabo", corCabelo: "#2e1c12", olhos: "amendoa", marcas: ["delineado", "blush"], batom: "#c0485a", formato: "coracao",
      cima: "blusa_seda", baixo: "saia_midi", calcado: "tenis", pescoco: "perolas", brinco: "argola", vestido: "nenhum",
    },
    dialogo: {
      entry: [{ if: POS, node: "pos" }, { if: { visits: 2 }, node: "denovo" }, { node: "start" }],
      nodes: {
        pista: { text: "Encomendaram pipoca para trezentas pessoas e um telão. Pensa num lugar famoso por pipoca, telão e estreia…", options: [{ label: "Pipoca e telão. Anotado!", end: true, set: "pista_thais_grande" }] },
        start: {
          text: ["Aaaaah♪! Desculpa, eu sempre solto um agudo quando o feijão ferve.", "Bem-vindo ao refeitório! Aqui a gente canta, cozinha e não deixa ninguém repetir sobremesa. Mentira, deixa sim."],
          options: [
            { label: "Qual é o tema do acampamento?", next: "pista", if: { notFlag: "pista_thais_grande" } },
            { label: "O que tem pro almoço?", next: "almoco" },
            { label: "Canta aquela nota bem alta!", next: "nota" },
            { label: "Posso tocar o sino?", next: "sino" },
            { label: "Tchau!", end: true },
          ],
        },
        almoco: { text: "Arroz, feijão, frango e uma salada que eu chamo de \"7 Saladas\". Obrigada, próxima.", options: [{ label: "Kkkkk, perfeito.", next: "start" }, { label: "Vou guardar lugar!", end: true }] },
        nota: { text: "AAAAAAAAAAAH♪♪♪ … Pronto. Três copos racharam e um passarinho pediu bis.", options: [{ label: "Bravo!", end: true, set: "thais_nota" }] },
        sino: { text: "Pode! O sino fica do lado do refeitório. Mas se tocar fora de hora, a fila se forma em 3 segundos.", options: [{ label: "Vou tocar mesmo assim.", end: true }] },
        denovo: {
          text: "Voltou com fome, né? Eu conheço essa cara.",
          options: [
            { label: "Qual é o tema do acampamento?", next: "pista", if: { notFlag: "pista_thais_grande" } },
            { label: "O Davi disse que seu pão de queijo é enorme.", next: "pao" },
            { label: "Só vim dar oi!", end: true, action: "acenar" },
          ],
        },
        pao: { text: "Grande é meu sobrenome, meu bem. Literalmente.", options: [{ label: "Hahaha!", end: true }] },
        pos: {
          text: ["Agora você entendeu a pipoca, né? Trezentas pessoas, um telão e eu cantando o hino na estreia!", "HOLLYWOOD, meu bem! Já fiz pipoca doce, salgada e uma de feijão. Essa última foi um erro."],
          options: [
            { label: "Me vê uma pipoca!", next: "pipoca" },
            { label: "Canta a nota da estreia!", next: "nota" },
            { label: "O João é muito esperto!", next: "joao" },
            { label: "Tchau, diva!", end: true, action: "acenar" },
          ],
        },
        joao: { text: "Né?! A primeira palavra dele foi \"pipoca\". A segunda foi \"Hollywood\". Com essa mãe e esse pai, o que você esperava?", options: [{ label: "Família de estrelas!", end: true }] },
        pipoca: { text: "Toma! (Ela te entrega um balde imaginário.) O de verdade tá no camarim, junto com as peças novas.", options: [{ label: "Valeu!", end: true }] },
      },
    },
  },
  {
    id: "samuel_pitt",
    nome: "Samuel Pitt",
    local: { x: 3, z: -8 },
    comportamento: { tipo: "patrulha", pontos: [[0, -6], [-8, -18], [6, -24], [16, -6]], lento: true },
    aparencia: {
      genero: "m", pele: "#e0ac83", cabelo: "topete", corCabelo: "#7a4b2a", barba: "cavanhaque", boca: "canto", sobrancelha: "grossa",
      cima: "camiseta", casaco: "couro", pescoco: "corrente", baixo: "jeans", calcado: "tenis", oculos: "aviador", vestido: "nenhum",
    },
    dialogo: {
      entry: [{ if: POS, node: "pos" }, { if: { outfitTag: "estrela" }, node: "tema" }, { node: "start" }],
      nodes: {
        pista: { text: "Vi uns caras subindo o morro do lado da casa amarela com letras brancas GIGANTES. Nove letras. A primeira é H.", options: [{ label: "Nove letras… começa com H!", end: true, set: "pista_samuel_pitt" }] },
        start: {
          text: ["E aí… (vira em câmera lenta) …beleza?", "Tô treinando minha caminhada de cena de filme entre as palmeiras. Fica comigo no enquadramento."],
          options: [
            { label: "Viu algo estranho por aqui?", next: "pista", if: { notFlag: "pista_samuel_pitt" } },
            { label: "Por que você anda tão devagar?", next: "devagar" },
            { label: "Quantas palmeiras tem aqui?", next: "palmeiras" },
            { label: "Me ensina a pose de galã.", next: "pose", action: "acenar" },
            { label: "Tchau!", end: true },
          ],
        },
        devagar: { text: "Tem um drone filmando a chácara. Se ele passar, eu quero estar no meu melhor ângulo.", options: [{ label: "O drone já passou faz tempo.", next: "drone" }, { label: "Justo. Até mais.", end: true }] },
        drone: { text: "…Então eu ando assim por estilo mesmo. Ninguém precisa saber.", options: [{ label: "Seu segredo tá seguro.", end: true }] },
        palmeiras: { text: "Contei umas doze. Dei nome pra todas. Aquela torta ali é a Jennifer. Não pergunta.", options: [{ label: "Não vou perguntar.", next: "start" }, { label: "Tchau!", end: true }] },
        pose: { text: "Mão no bolso, olhar no horizonte, sorriso de canto. Agora finge que tem vento. Isso! Pose de estrela.", options: [{ label: "Me senti numa estreia.", end: true, set: "samuel_pose" }] },
        tema: { text: "Olha esse look temático! Com essa roupa você rouba a cena até do toboágua.", options: [{ label: "Eu sei.", next: "start" }, { label: "Fui!", end: true }] },
        pos: {
          text: ["H-O-L-L-Y-W-O-O-D. Eu contei as letras umas trinta vezes. Nove. Eu tava certo.", "Agora que é oficial, eu posso andar em câmera lenta o dia todo. É temático."],
          options: [
            { label: "Me ensina a andar no tapete vermelho.", next: "tapete" },
            { label: "E a Jennifer, a palmeira?", next: "jennifer" },
            { label: "Tchau, galã!", end: true, action: "acenar" },
          ],
        },
        tapete: { text: "Passo lento, aceno pra direita, aceno pra esquerda, finge que tem flash. Pronto, você é uma estrela.", options: [{ label: "*acena*", end: true, action: "acenar" }] },
        jennifer: { text: "Ela vai ser figurante. Palmeira também sonha, sabia?", options: [{ label: "Lindo.", end: true }] },
      },
    },
  },
  {
    // Bebê João: filho da Thais e do Davi. Aparece quando o jogador já tem todas as pistas
    // e mesmo assim não sabe a palavra (botão "Não sei…" ou dois erros nas lonas).
    id: "joao",
    nome: "Bebê João",
    bebe: true,
    oculto: true, // só aparece depois de chamado (flag 'joao_apareceu') ou depois da revelação
    local: { x: -27, z: 48.5 },
    comportamento: { tipo: "passear", raio: 2.2, lento: true },
    aparencia: { genero: "m", pele: "#a86a42", cabelo: "cacheado", corCabelo: "#1a1010", corOlhos: "#2a1a10", cima: "camiseta", vestido: "nenhum" },
    dialogo: {
      entry: [{ if: POS, node: "pos" }, { node: "chamado" }],
      nodes: {
        chamado: {
          text: "Gugu… dadá… (o bebê João aponta para as lonas no morro) …HÓ-LI-UUD! HOLLYWOOD!",
          options: [{ label: "O quê?! Fala de novo, João!", next: "denovo" }],
        },
        denovo: {
          text: "HOLLYWOOD! HOLLYWOOD! (ele bate palminhas e dá uma risada de neném)",
          options: [{ label: "O João descobriu o tema!", end: true, action: "revelar" }],
        },
        pos: {
          text: ["Ho-li-ud! (o João te dá um abraço apertado)", "Pipoca! Papai! Mamãe! HOLLYWOOD! (ele sai engatinhando rindo)"],
          options: [{ label: "Toca aqui, João!", end: true, action: "acenar" }, { label: "Tchau, pequeno!", end: true }],
        },
      },
    },
  },
];
