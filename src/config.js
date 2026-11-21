// Grundinställningar. Upplösning som NES (256x240), 16x16-tiles.
// Alla hastigheter är i pixlar per uppdatering (60 uppdateringar/sekund).
const CONFIG = {
  WIDTH: 256,
  HEIGHT: 240,
  TILE: 16,

  GRAVITY: 0.32,
  MAX_FALL: 6,

  WALK_ACCEL: 0.12,
  AIR_ACCEL: 0.08,
  FRICTION: 0.1,
  MAX_WALK: 1.75,

  JUMP_SPEED: -6.2,
  JUMP_CUT: 0.5, // släpper man hoppknappen tidigt blir hoppet lägre

  SKY_COLOR: '#5c94fc',
};
