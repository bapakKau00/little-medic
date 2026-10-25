// Pixel-art sprites drawn from text grids. Each character maps to a colour in PALETTE; '.' is transparent.
const PALETTE = {
  K: '#1a1033', // outline
  W: '#ffffff', // white
  R: '#ff3b5c', // red
  D: '#c21f45', // dark red
  L: '#ff8fa3', // light red highlight
  Y: '#f5c88f', // bandage tan
  O: '#c98a4b', // bandage dots
  P: '#fff6e0', // bandage pad
  B: '#3ec5ff', // blue
  S: '#bfeaff', // light blue highlight
  G: '#9a93b8', // mouse grey
};

const SPRITES = {
  kit: [
    '....KKKKKK....',
    '....K....K....',
    'KKKKKKKKKKKKKK',
    'KLRRRRRRRRRRRK',
    'KRRRRRWWRRRRRK',
    'KRRRRRWWRRRRRK',
    'KRRRWWWWWWRRRK',
    'KRRRWWWWWWRRRK',
    'KRRRRRWWRRRRRK',
    'KRRRRRWWRRRRRK',
    'KDDDDDDDDDDDDK',
    'KKKKKKKKKKKKKK',
  ],
  heart: [
    '.KK...KK.',
    'KRRK.KRRK',
    'KRWRKRRRK',
    'KRRRRRRRK',
    '.KRRRRRK.',
    '..KRRRK..',
    '...KRK...',
    '....K....',
  ],
  bandage: [
    '.KKKKKKKKKKKK.',
    'KYYYYKPPKYYYYK',
    'KYOYYKPPKYYOYK',
    'KYYOYKPPKYOYYK',
    'KYYYYKPPKYYYYK',
    '.KKKKKKKKKKKK.',
  ],
  thermo: [
    '.KKK.',
    '.KWK.',
    '.KWK.',
    '.KWK.',
    '.KRK.',
    '.KRK.',
    '.KRK.',
    '.KRK.',
    '.KRK.',
    'KKRKK',
    'KRRRK',
    'KRWRK',
    'KRRRK',
    '.KKK.',
  ],
  pill: [
    '.KKKKKKKK.',
    'KSBBBWWWWK',
    'KBBBBWWWWK',
    'KBBBBWWWWK',
    '.KKKKKKKK.',
  ],
  mouse: [
    '.KK......KK.',
    'KLLK....KLLK',
    'KLLKKKKKKLLK',
    '.KKGGGGGGKK.',
    '.KGGGGGGGGK.',
    'KGGKWGGKWGGK',
    'KGGKKGGKKGGK',
    'KGGGGLLGGGGK',
    '.KGGGWWGGGK.',
    '..KGGGGGGK..',
    '...KKKKKK...',
  ],
};

// Returns a PNG data URL of the sprite, each grid cell drawn as a scale x scale block.
function spriteURL(name, scale) {
  const grid = SPRITES[name];
  const canvas = document.createElement('canvas');
  canvas.width = grid[0].length * scale;
  canvas.height = grid.length * scale;
  const ctx = canvas.getContext('2d');
  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = PALETTE[ch];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    });
  });
  return canvas.toDataURL();
}
