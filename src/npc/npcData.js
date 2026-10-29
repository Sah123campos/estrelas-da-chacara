// ============================================================================
// CADASTRO DE PERSONAGENS (NPCs) — edite só este arquivo para adicionar pessoas.
//
// Campos:
//   id          identificador único (sem espaços)
//   name        nome exibido
//   location    nome de um ponto do mapa (ver builders.js: 'banco_lago', 'piscina_borda',
//               'cozinha', 'patio', 'quadra', 'fogueira_0'...) ou { x, z }
//   appearance  igual ao do jogador (ver wardrobe.js -> defaultAppearance). Campos omitidos usam o padrão.
//   behavior    { type: 'idle' | 'wander' | 'patrol' | 'sit' | 'dance', radius, points, seatHeight }
//   personality texto curto (usado só como referência para quem escreve diálogos)
//   dialogue    { entry: [ {if, node} ... ], nodes: { id: { text, options: [ {label, next|end, set, if, action} ] } } }
//
// Condições (if): { flag: 'x' } | { notFlag: 'x' } | { outfitTag: 'gala' } | { visits: 2 } (a partir da 2ª conversa)
// Ações (action): 'wave' | 'dance' | 'wardrobe' | 'bell'
// Texto: string ou lista de strings (uma é sorteada). Use {jogador} para o nome do jogador.
//
// Personagens fictícios de uma experiência humorística. Não representam as celebridades reais.
// ============================================================================

export const NPCS = [
  {
    id: 'davi_dicaprio',
    name: 'Davi Dicaprio',
    location: 'banco_lago',
    behavior: { type: 'sit', seatHeight: 0.47, faceAngle: 3.64 },
    personality: 'Romântico dramático, acha que o lago da chácara é o Atlântico Norte.',
    appearance: {
      gender: 'm', skin: '#efc3a4', hair: 'lateral', hairColor: '#b88a4a', faceVariant: 2,
      top: 'camisa_branca', outer: 'smoking_preto', neck: 'gravata_borboleta', bottom: 'calca_smoking', shoes: 'oxford', jewelry: 'relogio_ouro',
    },
    dialogue: {
      entry: [{ if: { visits: 2 }, node: 'denovo' }, { node: 'start' }],
      nodes: {
        start: {
          text: ['Shhh… olha esse lago, {jogador}. Imenso. Gelado. Perigoso.', 'Você também sente? Esse lago tem a energia de um transatlântico.'],
          options: [
            { label: 'É um laguinho de chácara, Davi.', next: 'laguinho' },
            { label: 'Quer que eu abra os braços na ponta do píer?', next: 'pier' },
            { label: 'Belo smoking!', next: 'smoking', if: { outfitTag: 'gala' } },
            { label: 'Tchau!', end: true },
          ],
        },
        laguinho: {
          text: 'Laguinho pra você. Pra mim é o Atlântico Norte. Até o sapo ali tem cara de iceberg.',
          options: [{ label: 'Tá bom, capitão.', next: 'porta' }, { label: 'Vou ali.', end: true }],
        },
        pier: {
          text: 'NÃO tem píer! Já pedi pro caseiro. Ele disse que tem uma tábua. Eu aceito a tábua.',
          options: [{ label: 'A tábua cabe nós dois?', next: 'porta' }, { label: 'Hahaha. Até mais!', end: true }],
        },
        porta: {
          text: 'Cabia. Sempre cabia. Essa discussão me persegue há anos. Vai lá, aproveita o acampamento!',
          options: [{ label: 'Vou!', end: true, set: 'davi_porta' }],
        },
        smoking: {
          text: 'Notou? Esse é o meu smoking de "rei do mundo". Uso até pra pegar fila do café da manhã.',
          options: [{ label: 'Respeito.', next: 'start' }, { label: 'Tchau, rei!', end: true, action: 'wave' }],
        },
        denovo: {
          text: ['Você voltou! Igual a maré. Igual o arrependimento de não ter dividido aquela porta.', 'De novo por aqui? O lago chama, né?'],
          options: [
            { label: 'Já falou com a Thais na cozinha?', next: 'thais' },
            { label: 'Me conta de novo do Atlântico.', next: 'start' },
            { label: 'Fui!', end: true },
          ],
        },
        thais: { text: 'A Thais? Ela me deu um pão de queijo tão grande que eu precisei de bote salva-vidas.', options: [{ label: 'Hahaha!', end: true }] },
      },
    },
  },
  {
    id: 'taylor_frisso',
    name: 'Taylor Frisso',
    location: 'piscina_borda',
    behavior: { type: 'dance', radius: 0 },
    personality: 'Estrela pop que transforma qualquer lugar em palco e compõe música sobre tudo.',
    appearance: {
      gender: 'f', skin: '#f6d7c3', hair: 'ondas', hairColor: '#efdcae', faceVariant: 1, eyeColor: '#3d6ea8',
      dress: 'sereia_lantejoula', shoes: 'salto_dourado', jewelry: 'brincos', glasses: 'gatinho',
    },
    dialogue: {
      entry: [{ if: { flag: 'taylor_musica' }, node: 'fan' }, { node: 'start' }],
      nodes: {
        start: {
          text: ['Oiii! Você chegou bem na hora do meu show de beira de piscina!', 'Shhh, tô compondo! Rima com "toboágua"… "mágoa"! Perfeito.'],
          options: [
            { label: 'Que música é essa?', next: 'musica' },
            { label: 'Você vai entrar na piscina de lantejoula?', next: 'piscina' },
            { label: 'Dança comigo!', next: 'danca', action: 'dance' },
            { label: 'Tchau!', end: true },
          ],
        },
        musica: {
          text: 'Chama "Shake It Off do Toboágua". Fala de um ex que ficou com medo da descida. Era o caseiro.',
          options: [{ label: 'Quero ouvir o refrão!', next: 'refrao' }, { label: 'Pesado. Até mais.', end: true }],
        },
        refrao: {
          text: '♪ Os haters vão hater, hater, hater… e o toboágua vai descer, descer, descer! ♪',
          options: [{ label: 'HIT!', end: true, set: 'taylor_musica', action: 'wave' }],
        },
        piscina: {
          text: 'Claro que não, querida. Lantejoula molhada pesa 40 quilos. Eu só faço pose na borda.',
          options: [{ label: 'Faz sentido.', next: 'start' }, { label: 'Tchau!', end: true }],
        },
        danca: {
          text: 'ISSO! Olha esse passinho! A chácara inteira tá assistindo, eu sinto!',
          options: [{ label: '(continuar dançando)', next: 'start' }, { label: 'Cansei, tchau!', end: true }],
        },
        fan: {
          text: 'Minha fã número um voltou! Já tô na versão acústica da música do toboágua.',
          options: [{ label: 'Me dá um autógrafo?', next: 'autografo' }, { label: 'Depois eu volto!', end: true }],
        },
        autografo: { text: 'Assinei na sua alma. É mais fácil que achar caneta aqui na chácara.', options: [{ label: 'Valeu!', end: true }] },
      },
    },
  },
  {
    id: 'thais_grande',
    name: 'Thais Grande',
    location: 'cozinha',
    behavior: { type: 'wander', radius: 3 },
    personality: 'Diva da cozinha do acampamento; canta notas altíssimas enquanto mexe a panela.',
    appearance: {
      gender: 'f', skin: '#c98e62', hair: 'rabo', hairColor: '#2e1c12', faceVariant: 3,
      top: 'blusa_seda', outer: 'nenhum', bottom: 'saia_midi', shoes: 'tenis_branco', jewelry: 'colar_perolas',
    },
    dialogue: {
      entry: [{ if: { visits: 2 }, node: 'denovo' }, { node: 'start' }],
      nodes: {
        start: {
          text: ['Aaaaah♪! Desculpa, eu sempre solto um agudo quando o feijão ferve.', 'Bem-vindo ao refeitório! Aqui a gente canta, cozinha e não deixa ninguém repetir sobremesa. Mentira, deixa sim.'],
          options: [
            { label: 'O que tem pro almoço?', next: 'almoco' },
            { label: 'Canta aquela nota bem alta!', next: 'nota' },
            { label: 'Posso tocar o sino?', next: 'sino' },
            { label: 'Tchau!', end: true },
          ],
        },
        almoco: {
          text: 'Arroz, feijão, frango e uma salada que eu chamo de "7 Saladas". Obrigada, próxima.',
          options: [{ label: 'Kkkkk, perfeito.', next: 'start' }, { label: 'Vou guardar lugar!', end: true }],
        },
        nota: {
          text: 'AAAAAAAAAAAH♪♪♪ … Pronto. Três copos racharam e um passarinho pediu música no Fantástico.',
          options: [{ label: 'Bravo!', end: true, set: 'thais_nota' }],
        },
        sino: {
          text: 'Pode! O sino fica do lado de fora do refeitório. Mas se tocar fora de hora, a fila se forma em 3 segundos.',
          options: [{ label: 'Vou tocar mesmo assim.', end: true }],
        },
        denovo: {
          text: 'Voltou com fome, né? Eu conheço essa cara.',
          options: [
            { label: 'O Davi disse que seu pão de queijo é enorme.', next: 'pao' },
            { label: 'Só vim dar oi!', end: true, action: 'wave' },
          ],
        },
        pao: { text: 'Grande é meu sobrenome, meu bem. Literalmente.', options: [{ label: 'Hahaha!', end: true }] },
      },
    },
  },
  {
    id: 'samuel_pitt',
    name: 'Samuel Pitt',
    location: { x: 3, z: -8 },
    behavior: { type: 'patrol', points: [[0, -6], [-8, -18], [6, -24], [16, -6]] },
    personality: 'Galã descolado que faz tudo em câmera lenta e se acha o protagonista do acampamento.',
    appearance: {
      gender: 'm', skin: '#e0ac83', hair: 'topete', hairColor: '#7a4b2a', faceVariant: 0, beard: 'cavanhaque',
      top: 'camiseta_branca', outer: 'couro', neck: 'nenhum', bottom: 'jeans_escuro', shoes: 'tenis_branco', glasses: 'aviador', jewelry: 'corrente_ouro',
    },
    dialogue: {
      entry: [{ if: { outfitTag: 'tema' }, node: 'tema' }, { node: 'start' }],
      nodes: {
        start: {
          text: ['E aí… (vira em câmera lenta) …beleza?', 'Tô treinando minha caminhada de cena de filme entre as palmeiras. Fica comigo no enquadramento.'],
          options: [
            { label: 'Por que você anda tão devagar?', next: 'devagar' },
            { label: 'Quantas palmeiras tem aqui?', next: 'palmeiras' },
            { label: 'Me ensina a pose de galã.', next: 'pose', action: 'wave' },
            { label: 'Tchau!', end: true },
          ],
        },
        devagar: {
          text: 'Tem um drone filmando a chácara. Se ele passar, eu quero estar no meu melhor ângulo.',
          options: [{ label: 'O drone já passou faz tempo.', next: 'drone' }, { label: 'Justo. Até mais.', end: true }],
        },
        drone: { text: '…Então eu ando assim por estilo mesmo. Ninguém precisa saber.', options: [{ label: 'Seu segredo tá seguro.', end: true }] },
        palmeiras: {
          text: 'Contei umas doze. Dei nome pra todas. Aquela torta ali é a Jennifer. Não pergunta.',
          options: [{ label: 'Não vou perguntar.', next: 'start' }, { label: 'Tchau!', end: true }],
        },
        pose: {
          text: 'Mão no bolso, olhar no horizonte, sorriso de canto. Agora finge que tem vento. Isso! Hollywood.',
          options: [{ label: 'Me senti numa estreia.', end: true, set: 'samuel_pose' }],
        },
        tema: {
          text: 'Olha esse look temático! Com essa roupa você rouba a cena até do toboágua.',
          options: [{ label: 'Eu sei.', next: 'start' }, { label: 'Fui!', end: true }],
        },
      },
    },
  },
];
