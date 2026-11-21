// Piraya i kloakvattnet. Simmar fram och tillbaka och jagar spelaren när hen kommer nära.
// Den går inte att döda, och biter den spelaren dör hen. Den kan inte lämna vattnet.
class Piranha extends Enemy {
  static W = 14;
  static H = 8;
  static SPRITE_OFFSET = 1;
  static SPEED = 0.4;
  static CHASE_SPEED = 1.0;
  static SIGHT = 96;
  static PATROL = 64; // hur långt från startpunkten den patrullerar

  constructor(x, groundY) {
    super(x, groundY - Piranha.H, Piranha.W, Piranha.H);
    this.homeX = x;
    this.facing = -1;
    this.timer = Math.floor(Math.random() * 60);
    this.chasing = false;
  }

  update(player) {
    const P = Piranha;
    this.timer++;
    const dx = player.x + player.w / 2 - (this.x + this.w / 2);
    const dy = player.y + player.h / 2 - (this.y + this.h / 2);
    this.chasing = player.alive && !player.dying && !player.captured && player.inWater &&
      Math.hypot(dx, dy) < P.SIGHT;

    if (this.chasing) {
      const d = Math.hypot(dx, dy) || 1;
      this.facing = Math.sign(dx) || this.facing;
      this.move((dx / d) * P.CHASE_SPEED, (dy / d) * P.CHASE_SPEED);
    } else {
      if (Math.abs(this.x - this.homeX) > P.PATROL) this.facing = Math.sign(this.homeX - this.x);
      if (!this.move(this.facing * P.SPEED, Math.sin(this.timer / 20) * 0.2)) this.facing = -this.facing;
    }

    if (!player.dying && !player.captured && player.alive && this.overlaps(player)) {
      player.kill();
      Sound.hit();
    }
  }

  // Flyttar fisken om den inte krockar med väggar eller hamnar utanför vattnet.
  // Returnerar false om den inte kunde simma i sidled.
  move(vx, vy) {
    const top = Level.waterY + 4;
    const bottom = Level.GROUND_Y - this.h;
    const nx = this.x + vx;
    const movedX = !this.solidAt(nx, this.y);
    if (movedX) this.x = nx;
    const ny = Math.max(top, Math.min(bottom, this.y + vy));
    if (!this.solidAt(this.x, ny)) this.y = ny;
    return movedX;
  }

  solidAt(x, y) {
    const T = CONFIG.TILE;
    if (x < 0 || x + this.w > Level.WIDTH) return true;
    for (const [cx, cy] of [[x, y], [x + this.w - 1, y], [x, y + this.h - 1], [x + this.w - 1, y + this.h - 1]]) {
      if (Level.isSolid(Math.floor(cx / T), Math.floor(cy / T))) return true;
    }
    return false;
  }

  draw(ctx, camX) {
    const bite = Math.floor(this.timer / (this.chasing ? 6 : 16)) % 2;
    const img = Sprites.piranha[bite ? 'open' : 'closed'][this.facing > 0 ? 'right' : 'left'];
    const offset = this.facing > 0 ? Piranha.SPRITE_OFFSET : img.width - Piranha.SPRITE_OFFSET - this.w;
    ctx.drawImage(img, Math.round(this.x - offset - camX), Math.round(this.y - 1));
  }
}

Enemy.register('piranha', Piranha);
