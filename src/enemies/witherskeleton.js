// Wither-skelett: mörkt skelett med svärd som patrullerar fram och tillbaka och går
// mot spelaren när det får syn på hen. Hoppar man på huvudet dör det, annars dör spelaren.
class WitherSkeleton extends Enemy {
  static W = 10;
  static H = 28;
  static SPRITE_OFFSET = 3; // hitboxens x-position i spriten (ritad åt höger)
  static SPEED = 0.4;
  static CHASE_SPEED = 0.75;
  static SIGHT = 96;
  static STOMP_MARGIN = 6;

  constructor(x, groundY) {
    super(x + 3, groundY - WitherSkeleton.H, WitherSkeleton.W, WitherSkeleton.H);
    this.facing = -1;
    this.walkDist = 0;
    this.dead = false;
    this.deadTimer = 0;
  }

  update(player) {
    if (this.dead) {
      if (++this.deadTimer > 60) this.removed = true;
      return;
    }

    const S = WitherSkeleton;
    const dx = player.x + player.w / 2 - (this.x + this.w / 2);
    const dy = player.y + player.h - (this.y + this.h);
    const chasing = player.alive && !player.dying && Math.abs(dx) < S.SIGHT && Math.abs(dy) < 40;
    if (chasing) this.facing = Math.sign(dx) || this.facing;

    if (this.blocked()) {
      if (!chasing) this.facing = -this.facing;
    } else {
      const speed = chasing ? S.CHASE_SPEED : S.SPEED;
      this.x += this.facing * speed;
      this.walkDist += speed;
    }

    if (this.stompCheck(player, S.STOMP_MARGIN)) this.die();
  }

  draw(ctx, camX) {
    if (this.dead && this.deadTimer > 30 && this.deadTimer % 6 < 3) return; // blinkar innan den försvinner

    let frame = 'idle';
    if (this.dead) frame = 'dead';
    else if (Math.floor(this.walkDist / 8) % 2) frame = 'walk';

    const img = Sprites.witherSkeleton[frame][this.facing > 0 ? 'right' : 'left'];
    const offset = this.facing > 0 ? WitherSkeleton.SPRITE_OFFSET : img.width - WitherSkeleton.SPRITE_OFFSET - this.w;
    ctx.drawImage(img, Math.round(this.x - offset - camX), Math.round(this.y + this.h - img.height));
  }
}

Enemy.register('wither', WitherSkeleton);
