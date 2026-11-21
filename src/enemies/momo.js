// Momo smyger fram när man vänder ryggen till och fryser till is när man tittar på henne.
// Hoppar man på henne dör hon, men nuddar man henne annars dör man.
// Gömmer sig spelaren i ett hus vandrar hon planlöst omkring.
class Momo extends Enemy {
  static W = 14;
  static H = 28;
  static SPRITE_OFFSET = 5;
  static SPEED = 1.3;
  static WANDER = 0.25;
  static SIGHT = 160;
  static STOMP_MARGIN = 8;

  constructor(x, groundY) {
    super(x + 1, groundY - Momo.H, Momo.W, Momo.H);
    this.facing = -1;
    this.walkDist = 0;
    this.frozen = false;
    this.noticed = false;
    this.dead = false;
    this.deadTimer = 0;
  }

  update(player) {
    if (this.dead) {
      if (++this.deadTimer > 60) this.removed = true;
      return;
    }

    const M = Momo;
    const dx = player.x + player.w / 2 - (this.x + this.w / 2);
    const dy = player.y + player.h - (this.y + this.h);
    const hunting = player.alive && !player.dying && !player.hidden && !player.captured &&
      Math.abs(dx) < M.SIGHT && Math.abs(dy) < 64;

    this.frozen = false;
    if (hunting) {
      if (!this.noticed) {
        this.noticed = true;
        Sound.giggle();
      }
      this.facing = Math.sign(dx) || this.facing;
      this.frozen = player.facing === -this.facing; // spelaren tittar mot henne
      if (!this.frozen && !this.blocked()) this.step(M.SPEED);
    } else {
      this.noticed = false;
      if (this.blocked()) this.facing = -this.facing;
      else this.step(M.WANDER);
    }

    if (this.stompCheck(player, M.STOMP_MARGIN)) this.die();
  }

  step(speed) {
    this.x += this.facing * speed;
    this.walkDist += speed;
  }

  draw(ctx, camX) {
    if (this.dead && this.deadTimer > 30 && this.deadTimer % 6 < 3) return;

    let frame = 'idle';
    if (this.dead) frame = 'dead';
    else if (!this.frozen && Math.floor(this.walkDist / 6) % 2) frame = 'walk';

    const img = Sprites.momo[frame][this.facing > 0 ? 'right' : 'left'];
    const offset = this.facing > 0 ? Momo.SPRITE_OFFSET : img.width - Momo.SPRITE_OFFSET - this.w;
    const tremble = this.frozen ? Math.round(Math.random() * 2 - 1) : 0;
    ctx.drawImage(img, Math.round(this.x - offset - camX) + tremble, Math.round(this.y + this.h - img.height));
  }
}

Enemy.register('momo', Momo);
