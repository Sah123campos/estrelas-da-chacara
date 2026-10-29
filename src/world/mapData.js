// ============================================================================
// MAPA DA CHÁCARA — dados centralizados.
// Coordenadas em metros. x = leste, z = sul (o "norte" do mapa é -z).
// Origem (0,0) = plataforma de concreto azul de onde as fotos DJI_0336..0339 foram tiradas.
//
// Campo `fonte` em cada elemento:
//   'foto'        -> visto nas referências acessíveis (DJI_0336, DJI_0337, DJI_0338, DJI_0339)
//   'estimado'    -> visto nas fotos, mas posição/medida estimada a olho
//   'provisorio'  -> NÃO aparece nas referências acessíveis; criado só para a 1ª versão jogável.
//                    Deve ser substituído quando os vídeos/fotos dessas áreas forem enviados.
// ============================================================================

export const MAP = {
  size: 260,
  spawn: { x: 0, z: 4, rotY: Math.PI },          // de frente para o gramado (norte)
  menuCamera: { pos: [14, 6, 16], target: [-6, 1.5, -22] },

  lake: { x: -46, z: -42, rx: 30, rz: 13, level: -2.05, fonte: 'foto' },

  // Morros extras do relevo. A cachoeira existe (informada pelo usuário), mas a posição é provisória.
  mounds: [
    { id: 'morro_cachoeira', x: -96, z: -44, r: 22, h: 9, fonte: 'provisorio' },
  ],

  // Platôs (áreas niveladas). blend = largura do talude.
  pads: [
    { id: 'plataforma', x: 0, z: 6, w: 14, d: 8, h: 0, blend: 6, fonte: 'foto' },
    { id: 'terraco_piscina', x: 40, z: -30, w: 36, d: 26, h: 2.6, blend: 5, fonte: 'estimado' },
    { id: 'casa_amarela', x: -58, z: -108, w: 30, d: 20, h: 7.5, blend: 10, fonte: 'estimado' },
    { id: 'area_provisoria', x: 0, z: 46, w: 110, d: 50, h: 0.4, blend: 14, fonte: 'provisorio' },
  ],

  zones: [
    { id: 'gramado', name: 'Gramado das palmeiras', x: 2, z: -18, r: 20, fonte: 'foto' },
    { id: 'lago', name: 'Lago', x: -46, z: -42, r: 30, fonte: 'foto' },
    { id: 'piscina', name: 'Piscina e toboágua', x: 40, z: -30, r: 18, fonte: 'foto' },
    { id: 'cachoeira', name: 'Cachoeira (posição provisória)', x: -82, z: -44, r: 14, fonte: 'provisorio' },
    { id: 'casa', name: 'Casa amarela da colina', x: -58, z: -108, r: 16, fonte: 'foto' },
    { id: 'plataforma', name: 'Pátio azul', x: 0, z: 6, r: 8, fonte: 'foto' },
    { id: 'refeitorio', name: 'Refeitório (provisório)', x: -30, z: 40, r: 12, fonte: 'provisorio' },
    { id: 'quadra', name: 'Quadra (provisória)', x: 30, z: 44, r: 16, fonte: 'provisorio' },
    { id: 'fogueira', name: 'Roda de fogueira (provisória)', x: -6, z: 30, r: 7, fonte: 'provisorio' },
    { id: 'alojamento', name: 'Alojamento (provisório)', x: -2, z: 62, r: 14, fonte: 'provisorio' },
    { id: 'entrada', name: 'Portão de entrada (provisório)', x: 0, z: 92, r: 8, fonte: 'provisorio' },
  ],

  structures: [
    // --- vistos nas fotos ---
    { type: 'bluePlatform', x: 0, z: 6, w: 12, d: 7, curbSide: 'north', fonte: 'foto' },
    { type: 'poolTerrace', x: 40, z: -30, w: 36, d: 26, pool: { w: 16, d: 8, dx: 2, dz: 0 }, fonte: 'estimado' },
    { type: 'waterSlide', x: 52, z: -38, fonte: 'foto' },
    { type: 'kiosk', x: 55, z: -22, w: 7, d: 6, roof: 'telha', fonte: 'foto' },
    { type: 'waterfall', x: -84, z: -44, rotY: Math.PI / 2, fonte: 'provisorio' },
    { type: 'yellowHouse', x: -58, z: -108, w: 20, d: 11, rotY: 0.06, fonte: 'foto' },
    // --- provisórios (não aparecem nas referências acessíveis) ---
    { type: 'diningHall', x: -30, z: 40, w: 18, d: 11, fonte: 'provisorio' },
    { type: 'court', x: 30, z: 44, w: 28, d: 16, fonte: 'provisorio' },
    { type: 'campfire', x: -6, z: 30, fonte: 'provisorio' },
    { type: 'dorm', x: -2, z: 64, w: 26, d: 8, fonte: 'provisorio' },
    { type: 'gate', x: 0, z: 92, fonte: 'provisorio' },
  ],

  // Caminhos de terra/cascalho [x,z] (provisórios, exceto o trecho até a piscina).
  paths: [
    { pts: [[0, 92], [0, 70], [2, 52], [0, 34], [0, 12]], width: 3.2, kind: 'dirt', fonte: 'provisorio' },
    { pts: [[0, 34], [-14, 37], [-30, 40]], width: 2.4, kind: 'dirt', fonte: 'provisorio' },
    { pts: [[2, 40], [16, 44], [16, 44]], width: 2.4, kind: 'dirt', fonte: 'provisorio' },
    { pts: [[6, 2], [16, -8], [22, -16]], width: 2.0, kind: 'dirt', fonte: 'estimado' },
  ],

  // Árvores e palmeiras. As palmeiras-reais e o tufo de palmeiras finas aparecem nas fotos.
  trees: [
    // palmeiras-reais (troncos altos e lisos)
    { kind: 'royalPalm', x: -9, z: -13, s: 1.0, fonte: 'foto' },
    { kind: 'royalPalm', x: 5, z: -21, s: 1.1, fonte: 'foto' },
    { kind: 'royalPalm', x: 13, z: -10, s: 0.9, fonte: 'foto' },
    { kind: 'royalPalm', x: 19, z: -24, s: 1.15, fonte: 'foto' },
    { kind: 'royalPalm', x: 24, z: -13, s: 1.0, fonte: 'foto' },
    { kind: 'royalPalm', x: -24, z: -20, s: 0.95, fonte: 'foto' },
    { kind: 'royalPalm', x: -32, z: -28, s: 1.05, fonte: 'foto' },
    { kind: 'royalPalm', x: 28, z: -6, s: 0.85, fonte: 'estimado' },
    { kind: 'royalPalm', x: -4, z: -32, s: 1.2, fonte: 'estimado' },
    { kind: 'royalPalm', x: 33, z: -46, s: 1.1, fonte: 'estimado' },
    { kind: 'royalPalm', x: 59, z: -12, s: 1.0, fonte: 'estimado' },
    { kind: 'clusterPalm', x: 18, z: -16, s: 1.0, fonte: 'foto' },
    { kind: 'clusterPalm', x: 9, z: -28, s: 0.8, fonte: 'estimado' },
    // arbustos e árvores baixas no talude do lago
    { kind: 'roundTree', x: -16, z: -30, s: 0.8, fonte: 'foto' },
    { kind: 'roundTree', x: -30, z: -58, s: 1.0, fonte: 'foto' },
    { kind: 'roundTree', x: -46, z: -62, s: 0.9, fonte: 'foto' },
    { kind: 'roundTree', x: -62, z: -60, s: 1.1, fonte: 'foto' },
    { kind: 'roundTree', x: -20, z: -64, s: 0.7, fonte: 'foto' },
    { kind: 'roundTree', x: -72, z: -76, s: 0.9, fonte: 'estimado' },
    { kind: 'smallTree', x: -38, z: -70, s: 1.0, fonte: 'foto' },
    { kind: 'smallTree', x: -10, z: -60, s: 0.9, fonte: 'foto' },
    { kind: 'smallTree', x: -28, z: -82, s: 1.0, fonte: 'estimado' },
    { kind: 'flowerTree', x: -40, z: -98, s: 1.0, fonte: 'foto' },
    { kind: 'flowerTree', x: -78, z: -104, s: 0.9, fonte: 'estimado' },
    { kind: 'deadTrunk', x: -22, z: -36, s: 1.0, fonte: 'foto' },
    // mata densa de pinheiros/eucaliptos atrás da casa
    ...Array.from({ length: 34 }, (_, i) => ({ kind: i % 3 ? 'pine' : 'eucalyptus', x: -120 + i * 6.2 + ((i * 37) % 5), z: -128 - ((i * 53) % 14), s: 0.9 + ((i * 17) % 5) / 10, fonte: 'estimado' })),
    // vegetação de borda (provisória)
    ...Array.from({ length: 18 }, (_, i) => ({ kind: 'roundTree', x: -110 + ((i * 41) % 30), z: 0 + i * 7, s: 0.8 + ((i * 13) % 6) / 10, fonte: 'provisorio' })),
    ...Array.from({ length: 16 }, (_, i) => ({ kind: i % 2 ? 'mango' : 'roundTree', x: 80 + ((i * 29) % 24), z: -10 + i * 8, s: 0.9 + ((i * 7) % 5) / 10, fonte: 'provisorio' })),
    { kind: 'mango', x: -40, z: 20, s: 1.2, fonte: 'provisorio' },
    { kind: 'mango', x: 12, z: 26, s: 1.1, fonte: 'provisorio' },
    { kind: 'mango', x: -18, z: 52, s: 1.0, fonte: 'provisorio' },
    { kind: 'royalPalm', x: -8, z: 86, s: 1.0, fonte: 'provisorio' },
    { kind: 'royalPalm', x: 8, z: 86, s: 1.0, fonte: 'provisorio' },
  ],

  // Postes de madeira/concreto com luminária (vistos nas fotos).
  poles: [
    { x: -12, z: -6, fonte: 'foto' }, { x: 34, z: -12, fonte: 'foto' }, { x: -26, z: -12, fonte: 'foto' },
    { x: 4, z: 22, fonte: 'provisorio' }, { x: -4, z: 52, fonte: 'provisorio' },
  ],

  // Objetos interativos (além dos NPCs).
  interactables: [
    { id: 'placa_entrada', x: 3.5, z: 92, r: 3, label: 'Ler a placa', text: 'Bem-vindo ao Acampamento! (Placa provisória — envie fotos do portal real para reproduzi-lo.)' },
    { id: 'sino', x: -21, z: 40, r: 2.5, label: 'Tocar o sino do refeitório', action: 'bell' },
    { id: 'espelho', x: -2, z: 59.6, r: 2.5, label: 'Abrir o guarda-roupa', action: 'wardrobe' },
    { id: 'lago_banco', x: -30, z: -34, r: 3, label: 'Observar o lago', text: 'A água está calma. Um sapo te encara como se você devesse dinheiro a ele.' },
    { id: 'cachoeira', x: -78, z: -42, r: 4, label: 'Admirar a cachoeira', text: 'O barulho da água é tão bom que dá vontade de cochilar. (A posição da cachoeira é provisória — envie fotos dela para reproduzi-la fielmente.)' },
    { id: 'toboagua', x: 50, z: -35, r: 3, label: 'Olhar o toboágua', text: 'O toboágua está fechado para manutenção… ou para gente de terno. Volte de bermuda!' },
  ],
};
