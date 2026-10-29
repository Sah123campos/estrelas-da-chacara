// Catálogo do guarda-roupa — inspirado em looks de tapete vermelho, estreias e festas de gala.
// Para adicionar uma peça nova, basta incluir um objeto na lista do slot correspondente.
//
// Campos comuns: id, name, color, pattern ('solid'|'pinstripe'|'sequin'|'velvet'|'satin'|'denim'|
//   'plaid'|'floral'|'knit'|'houndstooth'|'stripes'|'leopard'|'leather'|'metallic'),
//   patternColor, tags (categorias exibidas), g ('m'|'f'|'u' = sugestão, nunca bloqueia).

export const SKIN_TONES = ['#f6d7c3', '#efc3a4', '#e0ac83', '#c98e62', '#a86f47', '#8a5634', '#6b3f24', '#4a2a17'];
export const HAIR_COLORS = ['#141010', '#2e1c12', '#4a2e1b', '#7a4b2a', '#a8743f', '#d6b37a', '#efdcae', '#b33a24', '#8c8c8c', '#e8e8e8', '#e05a9c', '#3a6fd8'];
export const EYE_COLORS = ['#5a3b22', '#2e1a0e', '#3b6b3a', '#3d6ea8', '#7b6a3a', '#5b5b5b'];

export const HAIR_STYLES = [
  { id: 'curto', name: 'Curto clássico', g: 'm' },
  { id: 'topete', name: 'Topete', g: 'm' },
  { id: 'lateral', name: 'Repartido de gala', g: 'm' },
  { id: 'raspado', name: 'Raspado', g: 'm' },
  { id: 'cacheado', name: 'Cacheado', g: 'u' },
  { id: 'coque_m', name: 'Coque', g: 'm' },
  { id: 'careca', name: 'Careca', g: 'm' },
  { id: 'longo', name: 'Longo liso', g: 'f' },
  { id: 'ondas', name: 'Ondas Hollywood', g: 'f' },
  { id: 'rabo', name: 'Rabo de cavalo', g: 'f' },
  { id: 'coque', name: 'Coque alto', g: 'f' },
  { id: 'chanel', name: 'Chanel', g: 'f' },
  { id: 'black', name: 'Black power', g: 'u' },
];

export const BEARDS = [
  { id: 'nenhuma', name: 'Nenhuma' },
  { id: 'bigode', name: 'Bigode' },
  { id: 'cavanhaque', name: 'Cavanhaque' },
  { id: 'cheia', name: 'Barba cheia' },
];

export const TOPS = [
  { id: 'camisa_branca', name: 'Camisa social branca', color: '#f4f4f0', neck: 'collar', sleeves: 'long', tags: ['social'], g: 'u' },
  { id: 'camisa_preta', name: 'Camisa preta acetinada', color: '#151517', pattern: 'satin', neck: 'collar', sleeves: 'long', tags: ['social', 'celeb'], g: 'u' },
  { id: 'gola_alta', name: 'Gola alta tricô', color: '#1d1d22', pattern: 'knit', neck: 'turtle', sleeves: 'long', tags: ['celeb', 'casual'], g: 'u' },
  { id: 'gola_alta_creme', name: 'Gola alta creme', color: '#e8dcc6', pattern: 'knit', neck: 'turtle', sleeves: 'long', tags: ['celeb', 'casual'], g: 'u' },
  { id: 'camiseta_branca', name: 'Camiseta premium branca', color: '#f7f7f7', neck: 'crew', sleeves: 'short', tags: ['camisetas', 'casual'], g: 'u' },
  { id: 'camiseta_preta', name: 'Camiseta preta oversized', color: '#18181a', neck: 'crew', sleeves: 'short', tags: ['camisetas', 'casual'], g: 'u' },
  { id: 'camiseta_listrada', name: 'Listrada marinheiro', color: '#ffffff', pattern: 'stripes', patternColor: '#1d3557', neck: 'crew', sleeves: 'short', tags: ['camisetas', 'casual'], g: 'u' },
  { id: 'camiseta_estrela', name: 'Camiseta "Estrela"', color: '#e9c46a', neck: 'crew', sleeves: 'short', print: '★', tags: ['camisetas', 'tema'], g: 'u' },
  { id: 'blusa_seda', name: 'Blusa de seda champanhe', color: '#e6cfa7', pattern: 'satin', neck: 'v', sleeves: 'long', tags: ['social', 'celeb'], g: 'f' },
  { id: 'top_cetim', name: 'Top de cetim vinho', color: '#6d1a2c', pattern: 'satin', neck: 'strapless', sleeves: 'none', tags: ['celeb', 'tapete'], g: 'f' },
  { id: 'body_brilho', name: 'Body brilhante prata', color: '#c9ccd3', pattern: 'sequin', neck: 'halter', sleeves: 'none', tags: ['celeb', 'tapete'], g: 'f' },
  { id: 'regata', name: 'Regata canelada', color: '#f1ece2', neck: 'scoop', sleeves: 'none', tags: ['camisetas', 'casual'], g: 'u' },
  { id: 'havaiana', name: 'Camisa havaiana', color: '#0f6e8c', pattern: 'floral', neck: 'collar', sleeves: 'short', tags: ['tema', 'casual'], g: 'u' },
  { id: 'xadrez', name: 'Camisa xadrez caipira', color: '#b22222', pattern: 'plaid', patternColor: '#1f2a44', neck: 'collar', sleeves: 'long', tags: ['tema', 'casual'], g: 'u' },
  { id: 'polo', name: 'Polo de clube', color: '#2a4d3a', neck: 'collar', sleeves: 'short', tags: ['casual'], g: 'u' },
];

export const OUTERS = [
  { id: 'nenhum', name: 'Sem casaco' },
  { id: 'smoking_preto', name: 'Smoking preto (lapela cetim)', color: '#0e0e10', lapel: 'peak', lapelColor: '#1b1b1f', lapelSatin: true, length: 'hip', tags: ['smoking', 'gala'], g: 'm' },
  { id: 'smoking_branco', name: 'Smoking branco (dinner jacket)', color: '#f2efe6', lapel: 'shawl', lapelColor: '#f8f6ef', lapelSatin: true, length: 'hip', tags: ['smoking', 'gala'], g: 'm' },
  { id: 'smoking_veludo', name: 'Smoking de veludo bordô', color: '#5b0f22', pattern: 'velvet', lapel: 'shawl', lapelColor: '#111', lapelSatin: true, length: 'hip', tags: ['smoking', 'gala', 'celeb'], g: 'u' },
  { id: 'smoking_azul', name: 'Smoking azul-meia-noite', color: '#131b36', pattern: 'velvet', lapel: 'peak', lapelColor: '#0a0f20', lapelSatin: true, length: 'hip', tags: ['smoking', 'gala'], g: 'u' },
  { id: 'terno_cinza', name: 'Terno risca de giz', color: '#3b3f46', pattern: 'pinstripe', patternColor: '#c8c8c8', lapel: 'notch', length: 'hip', tags: ['ternos', 'social'], g: 'm' },
  { id: 'terno_marinho', name: 'Terno azul-marinho', color: '#1b2a4a', lapel: 'notch', length: 'hip', tags: ['ternos', 'social'], g: 'u' },
  { id: 'terno_bege', name: 'Terno bege de linho', color: '#d8c7a3', lapel: 'notch', length: 'hip', tags: ['ternos', 'casual'], g: 'u' },
  { id: 'blazer_lantejoula', name: 'Blazer de lantejoula dourada', color: '#c9a14a', pattern: 'sequin', lapel: 'peak', lapelColor: '#b08a36', length: 'hip', tags: ['celeb', 'tapete'], g: 'u' },
  { id: 'blazer_rosa', name: 'Blazer rosa estreia', color: '#e38aa8', lapel: 'peak', length: 'hip', tags: ['celeb', 'tapete'], g: 'u' },
  { id: 'blazer_pied', name: 'Blazer pied-de-poule', color: '#eeeeee', pattern: 'houndstooth', lapel: 'notch', length: 'hip', tags: ['celeb', 'social'], g: 'u' },
  { id: 'couro', name: 'Jaqueta de couro', color: '#1a1716', pattern: 'leather', lapel: 'notch', lapelColor: '#141110', length: 'waist', tags: ['jaquetas', 'casual'], g: 'u' },
  { id: 'jeans', name: 'Jaqueta jeans', color: '#4a6c99', pattern: 'denim', lapel: 'none', length: 'waist', tags: ['jaquetas', 'casual'], g: 'u' },
  { id: 'bomber', name: 'Bomber de cetim verde', color: '#2f5a3e', pattern: 'satin', lapel: 'none', length: 'waist', tags: ['jaquetas', 'celeb'], g: 'u' },
  { id: 'trench', name: 'Trench coat caramelo', color: '#b78a52', lapel: 'notch', length: 'knee', tags: ['jaquetas', 'celeb'], g: 'u' },
  { id: 'casaco_pele', name: 'Casaco felpudo de estrela', color: '#f1ede6', pattern: 'velvet', lapel: 'shawl', length: 'knee', tags: ['jaquetas', 'tapete'], g: 'f' },
];

export const BOTTOMS = [
  { id: 'calca_preta', name: 'Calça social preta', kind: 'pants', color: '#121214', tags: ['calcas', 'social'], g: 'u' },
  { id: 'calca_smoking', name: 'Calça de smoking (faixa cetim)', kind: 'pants', color: '#0e0e10', stripe: '#2a2a30', tags: ['calcas', 'gala'], g: 'u' },
  { id: 'calca_branca', name: 'Calça branca de alfaiataria', kind: 'pants', color: '#f2efe6', tags: ['calcas', 'social'], g: 'u' },
  { id: 'calca_cinza', name: 'Calça risca de giz', kind: 'pants', color: '#3b3f46', pattern: 'pinstripe', patternColor: '#c8c8c8', tags: ['calcas', 'social'], g: 'm' },
  { id: 'calca_marinho', name: 'Calça azul-marinho', kind: 'pants', color: '#1b2a4a', tags: ['calcas', 'social'], g: 'u' },
  { id: 'jeans_escuro', name: 'Jeans escuro', kind: 'pants', color: '#2c3e5c', pattern: 'denim', tags: ['calcas', 'casual'], g: 'u' },
  { id: 'jeans_claro', name: 'Jeans claro', kind: 'pants', color: '#7d9cc4', pattern: 'denim', tags: ['calcas', 'casual'], g: 'u' },
  { id: 'pantalona', name: 'Pantalona de cetim', kind: 'pants', wide: true, color: '#e6cfa7', pattern: 'satin', tags: ['calcas', 'celeb'], g: 'f' },
  { id: 'couro_calca', name: 'Calça de couro', kind: 'pants', color: '#141110', pattern: 'leather', tags: ['calcas', 'celeb'], g: 'u' },
  { id: 'bermuda', name: 'Bermuda de linho', kind: 'shorts', color: '#d8c7a3', tags: ['calcas', 'casual', 'tema'], g: 'u' },
  { id: 'saia_lapis', name: 'Saia lápis preta', kind: 'skirt', length: 0.55, flare: 0.0, color: '#121214', tags: ['saias', 'social'], g: 'f' },
  { id: 'saia_midi', name: 'Saia midi plissada', kind: 'skirt', length: 0.62, flare: 0.09, color: '#c9a14a', pattern: 'satin', tags: ['saias', 'celeb'], g: 'f' },
  { id: 'mini_couro', name: 'Minissaia de couro', kind: 'skirt', length: 0.3, flare: 0.03, color: '#141110', pattern: 'leather', tags: ['saias', 'casual'], g: 'f' },
  { id: 'saia_tule', name: 'Saia de tule rosa', kind: 'skirt', length: 0.72, flare: 0.22, color: '#f4b6c8', tags: ['saias', 'tapete'], g: 'f' },
];

// Vestidos e macacões substituem parte de cima + parte de baixo.
export const DRESSES = [
  { id: 'nenhum', name: 'Sem vestido' },
  { id: 'sereia_lantejoula', name: 'Sereia de lantejoula dourada', color: '#c9a14a', pattern: 'sequin', neck: 'deepv', sleeves: 'none', shape: 'mermaid', length: 1.0, tags: ['vestidos', 'tapete'], g: 'f' },
  { id: 'baile_vermelho', name: 'Vestido de baile vermelho', color: '#a3101d', pattern: 'satin', neck: 'off', sleeves: 'none', shape: 'ballgown', length: 1.0, tags: ['vestidos', 'gala'], g: 'f' },
  { id: 'cetim_esmeralda', name: 'Longo de cetim esmeralda', color: '#0f5a43', pattern: 'satin', neck: 'halter', sleeves: 'none', shape: 'column', length: 1.0, tags: ['vestidos', 'tapete'], g: 'f' },
  { id: 'pretinho', name: 'Pretinho básico', color: '#0e0e10', neck: 'scoop', sleeves: 'none', shape: 'aline', length: 0.42, tags: ['vestidos', 'celeb'], g: 'f' },
  { id: 'veludo_azul', name: 'Veludo azul-noite', color: '#18224a', pattern: 'velvet', neck: 'v', sleeves: 'long', shape: 'column', length: 1.0, tags: ['vestidos', 'gala'], g: 'f' },
  { id: 'metalico', name: 'Metálico prata futurista', color: '#c9ccd3', pattern: 'metallic', neck: 'strapless', sleeves: 'none', shape: 'mermaid', length: 1.0, tags: ['vestidos', 'tapete'], g: 'f' },
  { id: 'rosa_tule', name: 'Princesa de tule rosa', color: '#f4b6c8', neck: 'strapless', sleeves: 'none', shape: 'ballgown', length: 1.0, tags: ['vestidos', 'tapete'], g: 'f' },
  { id: 'branco_grego', name: 'Branco estilo deusa grega', color: '#f6f3ea', pattern: 'satin', neck: 'off', sleeves: 'none', shape: 'aline', length: 1.0, tags: ['vestidos', 'gala'], g: 'f' },
  { id: 'onca', name: 'Midi de oncinha', color: '#d9a35a', pattern: 'leopard', neck: 'v', sleeves: 'short', shape: 'aline', length: 0.6, tags: ['vestidos', 'tema'], g: 'f' },
  { id: 'macacao_preto', name: 'Macacão de gala preto', color: '#101012', pattern: 'satin', neck: 'deepv', sleeves: 'long', shape: 'jumpsuit', length: 1.0, tags: ['vestidos', 'celeb'], g: 'u' },
  { id: 'macacao_branco', name: 'Macacão branco com strass', color: '#f2f2f5', pattern: 'sequin', neck: 'v', sleeves: 'none', shape: 'jumpsuit', length: 1.0, tags: ['vestidos', 'tema', 'celeb'], g: 'u' },
];

export const NECKWEAR = [
  { id: 'nenhum', name: 'Nada no pescoço' },
  { id: 'gravata_borboleta', name: 'Gravata-borboleta preta', kind: 'bowtie', color: '#0a0a0c', tags: ['gala'] },
  { id: 'borboleta_veludo', name: 'Borboleta de veludo vinho', kind: 'bowtie', color: '#5b0f22', tags: ['gala'] },
  { id: 'gravata_preta', name: 'Gravata fina preta', kind: 'tie', color: '#0d0d10', tags: ['social'] },
  { id: 'gravata_vinho', name: 'Gravata vinho', kind: 'tie', color: '#6d1a2c', tags: ['social'] },
  { id: 'gravata_dourada', name: 'Gravata dourada', kind: 'tie', color: '#c9a14a', pattern: 'satin', tags: ['celeb'] },
];

export const SHOES = [
  { id: 'oxford', name: 'Oxford preto envernizado', kind: 'dress', color: '#0b0b0c', gloss: true, tags: ['calcados'] },
  { id: 'mocassim', name: 'Mocassim caramelo', kind: 'dress', color: '#7a4a24', tags: ['calcados'] },
  { id: 'tenis_branco', name: 'Tênis branco minimalista', kind: 'sneaker', color: '#f4f4f4', sole: '#ffffff', tags: ['calcados'] },
  { id: 'tenis_retro', name: 'Tênis retrô colorido', kind: 'sneaker', color: '#d94b3d', sole: '#f2efe6', accent: '#1d3557', tags: ['calcados'] },
  { id: 'salto_preto', name: 'Scarpin preto', kind: 'heel', color: '#0b0b0c', gloss: true, tags: ['calcados'] },
  { id: 'salto_dourado', name: 'Sandália dourada de salto', kind: 'heel', color: '#c9a14a', gloss: true, metal: true, tags: ['calcados'] },
  { id: 'salto_vermelho', name: 'Salto vermelho de estreia', kind: 'heel', color: '#b0121f', gloss: true, tags: ['calcados'] },
  { id: 'bota_cowboy', name: 'Bota de cowboy', kind: 'boot', color: '#6b3f1e', tags: ['calcados', 'tema'] },
  { id: 'chinelo', name: 'Chinelo de dedo (clássico da chácara)', kind: 'flipflop', color: '#2a9d8f', tags: ['calcados', 'tema'] },
];

export const GLASSES = [
  { id: 'nenhum', name: 'Sem óculos' },
  { id: 'aviador', name: 'Aviador dourado', frame: '#c9a14a', lens: '#2b3a2f', shape: 'aviator' },
  { id: 'wayfarer', name: 'Wayfarer preto', frame: '#111111', lens: '#141414', shape: 'square' },
  { id: 'redondo', name: 'Redondo vintage', frame: '#3a2a1a', lens: '#5a4632', shape: 'round' },
  { id: 'gatinho', name: 'Gatinho de diva', frame: '#0b0b0c', lens: '#2b1d2a', shape: 'cat' },
  { id: 'grau', name: 'Armação transparente', frame: '#dcdcdc', lens: null, shape: 'square' },
  { id: 'coracao', name: 'Coração rosa (divertido)', frame: '#e05a9c', lens: '#7a1f4d', shape: 'heart' },
  { id: 'estrela', name: 'Estrela de festa (divertido)', frame: '#e9c46a', lens: '#5a2a8a', shape: 'star' },
];

export const HATS = [
  { id: 'nenhum', name: 'Sem chapéu' },
  { id: 'fedora', name: 'Fedora preto', kind: 'fedora', color: '#1a1a1d', band: '#7a1f2c' },
  { id: 'cartola', name: 'Cartola de gala', kind: 'tophat', color: '#0d0d0f', band: '#2a2a30' },
  { id: 'palha', name: 'Chapéu de palha', kind: 'straw', color: '#d9b96a', band: '#8a3a1d' },
  { id: 'cowboy', name: 'Chapéu de cowboy', kind: 'cowboy', color: '#7a4a24', band: '#3b2312' },
  { id: 'bone', name: 'Boné do acampamento', kind: 'cap', color: '#1d3557', band: '#e9c46a' },
  { id: 'coroa', name: 'Coroa de rei/rainha da chácara', kind: 'crown', color: '#e2b13c' },
];

export const JEWELRY = [
  { id: 'nenhum', name: 'Sem joias' },
  { id: 'relogio_ouro', name: 'Relógio de ouro', kind: 'watch', color: '#d4af37' },
  { id: 'relogio_prata', name: 'Relógio prata', kind: 'watch', color: '#cfd3d8' },
  { id: 'colar_perolas', name: 'Colar de pérolas', kind: 'pearls', color: '#f4efe6' },
  { id: 'corrente_ouro', name: 'Corrente de ouro', kind: 'chain', color: '#d4af37' },
  { id: 'gargantilha', name: 'Gargantilha de diamantes', kind: 'choker', color: '#e8f1ff' },
  { id: 'brincos', name: 'Brincos de brilhante', kind: 'earrings', color: '#e8f1ff' },
  { id: 'colar_flores', name: 'Colar havaiano de flores', kind: 'lei', color: '#ff6f59' },
];

// Looks prontos (combinações completas).
export const LOOKS = [
  { id: 'look_oscar', name: 'Noite do Oscar', g: 'm', set: { top: 'camisa_branca', outer: 'smoking_preto', neck: 'gravata_borboleta', bottom: 'calca_smoking', dress: 'nenhum', shoes: 'oxford', jewelry: 'relogio_ouro', glasses: 'nenhum', hat: 'nenhum' } },
  { id: 'look_veludo', name: 'Veludo de estreia', g: 'm', set: { top: 'camisa_preta', outer: 'smoking_veludo', neck: 'nenhum', bottom: 'calca_preta', dress: 'nenhum', shoes: 'oxford', jewelry: 'relogio_prata', glasses: 'nenhum', hat: 'nenhum' } },
  { id: 'look_cannes', name: 'Riviera de Cannes', g: 'm', set: { top: 'gola_alta_creme', outer: 'terno_bege', neck: 'nenhum', bottom: 'calca_branca', dress: 'nenhum', shoes: 'mocassim', jewelry: 'relogio_ouro', glasses: 'aviador', hat: 'nenhum' } },
  { id: 'look_rockstar', name: 'Rockstar no after', g: 'u', set: { top: 'camiseta_preta', outer: 'couro', neck: 'nenhum', bottom: 'jeans_escuro', dress: 'nenhum', shoes: 'tenis_branco', jewelry: 'corrente_ouro', glasses: 'wayfarer', hat: 'nenhum' } },
  { id: 'look_sereia', name: 'Diva dourada', g: 'f', set: { dress: 'sereia_lantejoula', outer: 'nenhum', neck: 'nenhum', shoes: 'salto_dourado', jewelry: 'brincos', glasses: 'nenhum', hat: 'nenhum' } },
  { id: 'look_baile', name: 'Baile de gala', g: 'f', set: { dress: 'baile_vermelho', outer: 'nenhum', neck: 'nenhum', shoes: 'salto_vermelho', jewelry: 'gargantilha', glasses: 'nenhum', hat: 'nenhum' } },
  { id: 'look_esmeralda', name: 'Tapete esmeralda', g: 'f', set: { dress: 'cetim_esmeralda', outer: 'nenhum', neck: 'nenhum', shoes: 'salto_dourado', jewelry: 'brincos', glasses: 'gatinho', hat: 'nenhum' } },
  { id: 'look_power', name: 'Power suit rosa', g: 'f', set: { top: 'top_cetim', outer: 'blazer_rosa', neck: 'nenhum', bottom: 'pantalona', dress: 'nenhum', shoes: 'salto_preto', jewelry: 'colar_perolas', glasses: 'nenhum', hat: 'nenhum' } },
  { id: 'look_turista', name: 'Turista da chácara', g: 'u', set: { top: 'havaiana', outer: 'nenhum', neck: 'nenhum', bottom: 'bermuda', dress: 'nenhum', shoes: 'chinelo', jewelry: 'colar_flores', glasses: 'coracao', hat: 'palha' } },
  { id: 'look_caipira', name: 'Cowboy do arraiá', g: 'u', set: { top: 'xadrez', outer: 'nenhum', neck: 'nenhum', bottom: 'jeans_claro', dress: 'nenhum', shoes: 'bota_cowboy', jewelry: 'nenhum', glasses: 'nenhum', hat: 'cowboy' } },
  { id: 'look_realeza', name: 'Realeza do acampamento', g: 'u', set: { top: 'camiseta_estrela', outer: 'smoking_azul', neck: 'nenhum', bottom: 'jeans_escuro', dress: 'nenhum', shoes: 'tenis_retro', jewelry: 'corrente_ouro', glasses: 'estrela', hat: 'coroa' } },
  { id: 'look_macacao', name: 'Macacão de estreia', g: 'u', set: { dress: 'macacao_preto', outer: 'nenhum', neck: 'nenhum', shoes: 'salto_preto', jewelry: 'gargantilha', glasses: 'nenhum', hat: 'nenhum' } },
];

export const SLOTS = {
  top: TOPS, outer: OUTERS, bottom: BOTTOMS, dress: DRESSES, neck: NECKWEAR,
  shoes: SHOES, glasses: GLASSES, hat: HATS, jewelry: JEWELRY,
};

export function findItem(slot, id) {
  const list = SLOTS[slot];
  return (list && list.find(i => i.id === id)) || null;
}

// Categorias exibidas no guarda-roupa: cada uma lista itens por slot + tag.
export const WARDROBE_CATEGORIES = [
  { id: 'looks', name: 'Looks prontos', icon: '✦' },
  { id: 'gala', name: 'Smokings & gala', icon: '🎩', filter: [['outer', 'smoking'], ['outer', 'gala'], ['neck', 'gala'], ['bottom', 'gala']] },
  { id: 'ternos', name: 'Ternos', icon: '👔', filter: [['outer', 'ternos'], ['neck', 'social']] },
  { id: 'vestidos', name: 'Vestidos', icon: '👗', filter: [['dress', 'vestidos']] },
  { id: 'tapete', name: 'Tapete vermelho', icon: '🌟', filter: [['dress', 'tapete'], ['outer', 'tapete'], ['top', 'tapete'], ['bottom', 'tapete']] },
  { id: 'celeb', name: 'Looks de celebridade', icon: '📸', filter: [['top', 'celeb'], ['outer', 'celeb'], ['bottom', 'celeb'], ['dress', 'celeb'], ['neck', 'celeb']] },
  { id: 'social', name: 'Social', icon: '🤵', filter: [['top', 'social'], ['bottom', 'social'], ['outer', 'social']] },
  { id: 'casual', name: 'Casual chique', icon: '🧥', filter: [['top', 'casual'], ['bottom', 'casual'], ['outer', 'casual']] },
  { id: 'jaquetas', name: 'Jaquetas & casacos', icon: '🧥', filter: [['outer', 'jaquetas']] },
  { id: 'camisetas', name: 'Camisetas', icon: '👕', filter: [['top', 'camisetas']] },
  { id: 'calcas', name: 'Calças & saias', icon: '👖', filter: [['bottom', 'calcas'], ['bottom', 'saias']] },
  { id: 'calcados', name: 'Calçados', icon: '👠', filter: [['shoes', 'calcados']] },
  { id: 'tema', name: 'Temáticos & engraçados', icon: '🤠', filter: [['top', 'tema'], ['bottom', 'tema'], ['dress', 'tema'], ['shoes', 'tema']] },
];

export const ACCESSORY_CATEGORIES = [
  { id: 'glasses', name: 'Óculos', slot: 'glasses' },
  { id: 'hat', name: 'Chapéus', slot: 'hat' },
  { id: 'jewelry', name: 'Relógios & joias', slot: 'jewelry' },
  { id: 'neck', name: 'Gravatas', slot: 'neck' },
];

export function itemsForCategory(cat) {
  if (!cat.filter) return [];
  const out = [];
  const seen = new Set();
  for (const [slot, tag] of cat.filter) {
    for (const it of SLOTS[slot]) {
      if (it.tags && it.tags.includes(tag) && !seen.has(slot + it.id)) { seen.add(slot + it.id); out.push({ slot, item: it }); }
    }
  }
  return out;
}

export function defaultAppearance(gender = 'm') {
  const m = gender === 'm';
  return {
    name: '',
    gender,
    skin: SKIN_TONES[2],
    eyeColor: EYE_COLORS[0],
    faceMode: 'default',     // 'default' | 'photo'
    faceVariant: m ? 0 : 3,
    faceAdjust: null,
    hair: m ? 'curto' : 'ondas',
    hairColor: HAIR_COLORS[m ? 1 : 3],
    beard: 'nenhuma',
    top: m ? 'camisa_branca' : 'top_cetim',
    outer: m ? 'smoking_preto' : 'nenhum',
    neck: m ? 'gravata_borboleta' : 'nenhum',
    bottom: m ? 'calca_smoking' : 'calca_preta',
    dress: m ? 'nenhum' : 'baile_vermelho',
    shoes: m ? 'oxford' : 'salto_vermelho',
    glasses: 'nenhum',
    hat: 'nenhum',
    jewelry: m ? 'relogio_ouro' : 'brincos',
  };
}
