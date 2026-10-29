# Estrelas da Chácara — RPG social 3D (primeira versão jogável)

Jogo web 3D em terceira pessoa ambientado na chácara do acampamento. Você cria um personagem
com a foto do próprio rosto, escolhe looks de tapete vermelho e explora a chácara conversando
com personagens divertidos.

## Como rodar

O jogo é feito de arquivos estáticos (HTML + JavaScript). Não precisa instalar nada além de
um servidor web simples, porque o navegador não carrega módulos JavaScript abrindo o arquivo direto.

```bash
cd chacara-rpg
python3 -m http.server 8080
```

Depois abra `http://localhost:8080` no Chrome (ou outro navegador moderno).
Para testar no celular na mesma rede Wi-Fi, use `http://IP-DO-COMPUTADOR:8080`.

> A **câmera** do navegador só funciona em `https://` ou em `localhost`. Em outro endereço
> sem HTTPS, use a opção **Galeria** (no celular ela também oferece tirar foto).

Para publicar na internet, basta enviar a pasta inteira para qualquer hospedagem de site estático
(GitHub Pages, Netlify, Vercel, etc.).

## Controles

| Computador | Celular |
|---|---|
| **WASD** / setas: andar | Joystick (canto inferior esquerdo) |
| **Shift**: correr | Botão 🏃 (ou empurrar o joystick até o fim) |
| **Arrastar o mouse**: girar a câmera | Arrastar o dedo na tela |
| **Roda do mouse**: zoom | Pinça com dois dedos |
| **E**: interagir / conversar | Botão 💬 |
| **R**: guarda-roupa | Botão 👗 |
| **Esc**: menu | Botão ☰ |
| **1–4** / setas + Enter: escolher respostas | Tocar na resposta |

## Onde editar

| O quê | Arquivo |
|---|---|
| **Personagens (NPCs)**: nomes, local, roupa, comportamento e diálogos | `src/npc/npcData.js` |
| **Mapa**: posições de construções, árvores, caminhos, áreas e objetos | `src/world/mapData.js` |
| **Guarda-roupa**: roupas, looks prontos, cabelos e cores | `src/character/wardrobe.js` |

Para adicionar uma pessoa nova, copie um bloco de `NPCS` em `npcData.js`, troque `id`, `name`,
`location` e as falas. Nenhum outro arquivo precisa mudar.

## Organização do código

```
src/main.js                 inicialização, estados do jogo e laço principal
src/core/                   renderização/configurações, câmera, entrada, colisões, áudio, jogador
src/world/                  mapa (dados), terreno, construções, vegetação, texturas procedurais
src/character/character.js  montagem do personagem (corpo, alfaiataria, lapelas 3D, botões, barras) e animação
src/character/materials.js  biblioteca PBR: mapas de relevo/rugosidade/cor por tipo de tecido e material (cacheados)
src/character/hair.js       cabelos montados com mechas, cachos em espiral e coques
src/character/accessories.js chapéus, óculos, joias, gravatas, sapatos e mãos com geometria própria
src/character/garments.js   pintura das roupas no tronco + relevo de costuras, pences e lapelas
src/character/face.js       foto/rosto projetado na cabeça 3D
src/npc/                    cadastro dos NPCs, gerenciador e motor de diálogos
src/ui/                     telas: criação, estúdio 3D, diálogo, HUD, configurações
src/save/storage.js         salvamento (localStorage + IndexedDB para a foto)
vendor/three/               three.js r185 (MIT), incluído localmente
```

## Versão em arquivo único

`python3 build-artifact.py` (depois de `npm install`) gera `dist/estrelas-da-chacara.html`, com tudo
embutido (código, estilos e three.js). É a versão publicada como página no claude.ai.

## Referências usadas no mapa

- **Analisadas:** fotos de drone DJI_0336, DJI_0337, DJI_0338 e DJI_0339 (pasta "FAZENDA").
  Mostram: gramado em declive com palmeiras-reais e uma touceira de palmeiras finas, o lago, a casa amarela
  de telhado escuro na colina, o pátio e a mureta de concreto azul, a piscina com balaústre branco e pilares
  vermelhos, o toboágua branco/azul, um quiosque de telha e os postes de luz.
- **Não analisados:** 25 vídeos DJI (DJI_0311 a DJI_0335, de 120 MB a 1,4 GB). O conector do Google Drive
  só baixa arquivos de até 10 MB.
- Em `src/world/mapData.js`, cada elemento tem `fonte: 'foto' | 'estimado' | 'provisorio'`.
  Refeitório, quadra, fogueira, alojamento e portão são **provisórios**; a cachoeira existe (informação do usuário),
  mas a **posição é provisória**.

## A revelação do tema

O tema do acampamento começa em segredo. Cada um dos 4 personagens dá uma pista quando você pergunta
sobre o tema. Com as 4 pistas, o letreiro **HOLLYWOOD** sobe na colina ao lado da casa amarela,
com fogos e holofotes. O progresso fica salvo no aparelho.
