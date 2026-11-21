// Venom: svart symbiot som patrullerar, jagar spelaren och gör långa språng mot hen.
// Hoppar man på huvudet dör den. Den hoppar också över hinder när den jagar.
// Gömmer sig spelaren i ett hus tappar Venom intresset.
class Venom extends Enemy {
  static W = 24;
  static H = 54;
  static SPRITE_OFFSET = 6;
  static SPEED = 0.5;
  static CHASE_SPEED = 1.1;
  static SIGHT = 112;
  static POUNCE_RANGE = 64;
  static POUNCE_SPEED = 2.4;
  static HOP_SPEED = 1.2;
  static LEAP = -4.2;
  static COOLDOWN = 80;
  static STOMP_MARGIN = 10;

  constructor(x, groundY) {
    super(x, groundY - Venom.H, Venom.W, Venom.H);
    this.facing = -1;
    this.vx = 0;
    this.vy = 0;
    this.onGround = true;
    this.cooldown = 30;
    this.walkDist = 0;
    this.dead = false;
    this.deadTimer = 0;
  }

  update(player) {
    if (this.dead) {
      if (++this.deadTimer > 90) this.removed = true;
      return;
    }

    const V = Venom;
    const dx = player.x + player.w / 2 - (this.x + this.w / 2);
    const dy = player.y + player.h - (this.y + this.h);
    const hunting = player.alive && !player.dying && !player.hidden && !player.captured &&
      Math.abs(dx) < V.SIGHT && Math.abs(dy) < 64;
    if (this.cooldown > 0) this.cooldown--;

    if (this.onGround) {
      if (hunting) this.facing = Math.sign(dx) || this.facing;
      if (hunting && this.cooldown === 0 && Math.abs(dx) < V.POUNCE_RANGE) {
        this.leap(V.POUNCE_SPEED);
      } else if (this.blocked()) {
        this.vx = 0;
        if (!hunting) this.facing = -this.facing;
        else if (this.cooldown === 0) this.leap(V.HOP_SPEED);
      } else {
        this.vx = this.facing * (hunting ? V.CHASE_SPEED : V.SPEED);
      }
    }

    const g = Level.physics;
    this.vy = Math.min(this.vy + g.GRAVITY, g.MAX_FALL);
    this.moveX();
    this.moveY();
    if (this.onGround) this.walkDist += Math.abs(this.vx);

    if (this.stompCheck(player, V.STOMP_MARGIN)) this.die();
  }

  leap(speed) {
    this.vx = this.facing * speed;
    this.vy = Venom.LEAP;
    this.onGround = false;
    this.cooldown = Venom.COOLDOWN;
    Sound.growl();
  }

  moveX() {
    const T = CONFIG.TILE;
    this.x += this.vx;
    if (this.vx === 0) return;
    const col = Math.floor((this.vx > 0 ? this.x + this.w - 0.001 : this.x) / T);
    const top = Math.floor(this.y / T);
    const bottom = Math.floor((this.y + this.h - 0.001) / T);
    for (let row = top; row <= bottom; row++) {
      if (Level.isSolid(col, row)) {
        this.x = this.vx > 0 ? col * T - this.w : (col + 1) * T;
        this.vx = 0;
        return;
      }
    }
  }

  moveY() {
    const T = CONFIG.TILE;
    this.y += this.vy;
    this.onGround = false;
    const row = Math.floor((this.vy > 0 ? this.y + this.h - 0.001 : this.y) / T);
    const left = Math.floor(this.x / T);
    const right = Math.floor((this.x + this.w - 0.001) / T);
    for (let col = left; col <= right; col++) {
      if (Level.isSolid(col, row)) {
        if (this.vy > 0) {
          this.y = row * T - this.h;
          this.onGround = true;
        } else {
          this.y = (row + 1) * T;
        }
        this.vy = 0;
        return;
      }
    }
  }

  draw(ctx, camX) {
    if (this.dead && this.deadTimer > 60 && this.deadTimer % 6 < 3) return;

    let frame = 'idle';
    if (this.dead) frame = 'dead';
    else if (!this.onGround || Math.floor(this.walkDist / 8) % 2) frame = 'walk';

    const img = Sprites.venom[frame][this.facing > 0 ? 'right' : 'left'];
    const offset = this.facing > 0 ? Venom.SPRITE_OFFSET : img.width - Venom.SPRITE_OFFSET - this.w;
    ctx.drawImage(img, Math.round(this.x - offset - camX), Math.round(this.y + this.h - img.height));
  }
}

Enemy.register('venom', Venom);
