# Estrelas da Chácara — RPG em pixel art

Jogo web em 2D (pixel art, vista de cima) na chácara do acampamento. Você cria o seu personagem
com **a foto do seu próprio rosto**, monta o look no camarim e explora a chácara conversando com
todo mundo para descobrir **o tema secreto do acampamento**.

O estilo e o motor seguem os outros jogos do mesmo autor (como *O Maior Amor*): tela em baixa
resolução ampliada por fator inteiro, fonte Pixelify Sans, molduras pixeladas, música e sons
sintetizados no navegador e controles de toque.

## Como rodar

São só arquivos estáticos. Use qualquer servidor web simples (o navegador não carrega módulos
JavaScript abrindo o arquivo direto):

```bash
cd chacara-rpg
python3 -m http.server 8080
```

Abra `http://localhost:8080`. No GitHub Pages basta publicar a pasta (raiz do repositório).

> A **câmera** ao vivo só funciona em `https://` ou em `localhost`. Fora disso use
> **Escolher da galeria** ou **Câmera do aparelho** (no celular abre o app de câmera).

## Controles

| Computador | Celular |
|---|---|
| **WASD** / setas: andar | Joystick (aparece onde o polegar encosta, lado esquerdo) |
| **Shift**: correr | Botão de correr (ou empurrar o joystick até o fim) |
| **E** / Espaço / Enter: interagir, avançar diálogo | Botão de balão |
| **1–9** ou setas + Enter: escolher resposta | Tocar na resposta |
| **Q**: acenar | — |
| **J**: diário de pistas | Botão de diário |
| **R**: camarim | Botão de cabide |
| **M**: mapa | Pausa → Mapa |
| **Esc**: pausa | Botão de pausa |

## O seu rosto no jogo

Na aba **Sua foto** do camarim, escolha uma foto ou tire uma na hora (o jogo pede permissão antes
de abrir a câmera). O jogo encontra olhos e boca, alinha o rosto e o transforma em pixel art:

- **Retrato grande** (64×64) nos diálogos, no camarim e no canto da tela: o rosto da foto com o
  cabelo, chapéu, óculos, brincos e roupa desenhados por cima.
- **Boneco** (22×38) andando pelo mapa: o rosto da foto reduzido e realçado.
- Ajustes de aproximação, posição e brilho, e o botão "usar o tom de pele da foto".
- Dá para usar a foto só no retrato, nos dois, ou desligar.

**Privacidade:** a foto fica só no aparelho (IndexedDB do navegador), nunca é enviada para a
internet, e pode ser apagada a qualquer momento (aba Sua foto, ou Configurações → Apagar dados).

## Camarim (personalização)

- **Corpo:** feminino/masculino, 3 alturas, 3 portes, 10 tons de pele + qualquer cor.
- **Rosto:** 4 formatos, 5 tipos de olhos e cor dos olhos, sobrancelhas, nariz, boca, barba/bigode
  (6), sardas, blush, pinta, cílios, delineado, batom e sombra.
- **Cabelo:** 18 penteados, qualquer cor e mechas/luzes.
- **Roupas:** parte de cima, casaco, parte de baixo, vestido/macacão, meias e calçado. Cada peça
  aceita **qualquer cor** e **14 padrões de tecido** (cetim, veludo, lantejoula, metálico, listras,
  risca de giz, xadrez, poá, jeans, couro, tricô, oncinha, floral…).
- **Acessórios:** chapéus, óculos, pescoço (gravatas, colares, estola), brincos, pulso, luvas e item na mão.
- **Looks prontos** e **nome** (com sorteio de "nomes de estrela").
- As miniaturas mostram cada peça **em você** (com o seu rosto).
- Peças e looks **secretos** (Coleção Calçada da Fama) aparecem como `???` até o tema ser descoberto.

## Na chácara

- Você chega pelo **portão** e sobe o caminho até a chácara.
- Dá para **sentar no murinho azul** (borda da plataforma de concreto azul das fotos).
- O **toboágua** desce até a piscina: aperte E na escadinha, escorregue, caia na água e nade um pouco.
- A **cachoeira** fica virada para o lago: a água cai no poço e corre pelo riacho até o lago.

## O mistério do tema

1. Quatro personagens têm um **!** sobre a cabeça: cada um conta uma pista quando você pergunta.
2. Há achados extras pela chácara (a palha perto do murinho azul, o quiosque da piscina, a porta
   da casa amarela).
3. No morro ao lado da casa amarela há **nove formas cobertas por lonas**. Com as pistas, vá até lá
   e digite a palavra.
   Se mesmo com todas as pistas a pessoa não souber (botão **Não sei…** ou dois erros), aparece o
   **bebê João**, filho da Thais e do Davi, que aponta para as lonas e fala "HOLLYWOOD!".
4. Acertou: as lonas voam, o letreiro **HOLLYWOOD** aparece com fogos e holofotes, o tapete vermelho
   surge no gramado, as estrelas da calçada aparecem no pátio, os personagens ganham falas novas e o
   camarim libera a coleção secreta.

## Onde editar

| O quê | Arquivo |
|---|---|
| **Personagens (NPCs)**: nome, local, roupa, comportamento e diálogos | `src/dados/npcs.js` |
| **Mapa**: posições (em metros) de construções, árvores, caminhos e objetos | `src/dados/mapa.js` |
| **Camarim**: roupas, cabelos, cores, padrões e looks | `src/dados/guardaroupa.js` |
| **Palavra secreta**, velocidade, zoom | `src/config.js` |

Para adicionar uma pessoa, copie um bloco de `NPCS` em `npcs.js` e troque `id`, `nome`, `local`,
`aparencia` e as falas.

## Organização do código

```
src/main.js            inicialização, título, camarim, salvar, configurações, laço principal
src/jogo.js            mundo, jogador, NPCs, câmera, interações, pistas e a cena da revelação
src/arte/pixel.js      ferramentas de pixel art (cores, ruído, Pixmap) — as mesmas de O Maior Amor
src/arte/personagem.js boneco em camadas: corpo, roupas, cabelo, chapéu, óculos, rosto/foto (4 direções)
src/arte/retrato.js    retrato 64×64 com a foto do jogador ou rosto desenhado
src/arte/tecido.js     padrões de tecido
src/arte/cenario.js    pinta o chão da chácara, colisões e a lista de objetos
src/arte/objetos.js    palmeiras, casa amarela, toboágua, balaustrada, cachoeira, lonas e letras…
src/rosto/             foto: leitura, detecção aproximada do rosto, câmera e conversão para pixel art
src/motor/             tela (escala inteira), entrada (teclado/toque), motor de diálogos
src/audio/             sintetizador (de O Maior Amor) + músicas e efeitos próprios
src/ui/                interface (HUD, diálogos, diário, enigma, mapa), camarim e controles de toque
src/salvar.js          salvamento local (localStorage + IndexedDB para a foto)
```

Teste rápido: `?debug&pos=piscina` começa o jogo direto num ponto do mapa (`patio`, `lago`,
`piscina`, `casa`, `cachoeira`, `morro`, `cozinha`, `quadra`, `fogueira`, `alojamento`, `portao`).

## Versão em arquivo único

`npm install && python3 build-artifact.py` gera `dist/estrelas-da-chacara.html`, com tudo
embutido (código, estilos e fonte).

## Referências usadas no mapa

- **Analisadas:** fotos de drone DJI_0336 a DJI_0339 (pasta "FAZENDA"): gramado com palmeiras-reais e
  uma touceira de palmeiras finas, o lago, a casa amarela na colina, o pátio e o murinho de concreto azul,
  o monte de palha seca, o terraço da piscina com balaustrada branca e pilares rosados, o toboágua azul,
  o quiosque de telha e os postes de madeira.
- **Não analisados:** os vídeos DJI (de 120 MB a 1,4 GB) — o conector do Google Drive só baixa arquivos de até 10 MB.
- Em `src/dados/mapa.js`, cada elemento tem `fonte: 'foto' | 'estimado' | 'provisorio'`.
  Refeitório, quadra, fogueira, alojamento, portão e o local das lonas são **provisórios** (no mapa do jogo
  têm `*`). A cachoeira existe (informação do usuário); a posição dela é estimada.

## Versão 3D anterior

A versão 3D (three.js) continua no histórico do Git, no commit `0fd1e34`.
