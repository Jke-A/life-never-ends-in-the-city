class Player {
  static STROKE = 20; // bildrutor som simtagsanimationen varar

  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 12; // hitbox, spriten är 16 bred
    this.h = 16;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.jumping = false;
    this.facing = 1;
    this.animTime = 0;
    this.alive = true;
    this.captured = false; // styrs av en fiende, t.ex. när Sirenhead håller spelaren
    this.visible = true;
    this.scale = 1;
    this.launched = false; // skjuts upp ur bild av studsmattan
    this.dying = false; // dödshopp innan "DU DOG"
    this.hidden = false; // gömmer sig i ett hus
    this.inWater = false;
    this.stroke = 0; // > 0 medan ett simtag animeras
    this.bullets = []; // helikopterns skott
    this.heli = Level.current.vehicle === 'helicopter';
    if (this.heli) {
      this.w = 26;
      this.h = 12;
      this.fireCooldown = 0;
    }
  }

  update() {
    if (this.captured) return;
    if (this.launched) {
      this.y += this.vy;
      return;
    }
    if (this.dying) {
      this.vy += Level.physics.GRAVITY;
      this.x += this.vx;
      this.y += this.vy;
      if (this.y > CONFIG.HEIGHT) this.alive = false;
      return;
    }
    if (this.heli) {
      this.updateHeli();
      return;
    }
    const waterY = Level.waterY;
    if (this.stroke > 0) this.stroke--;
    const inWater = waterY !== null && this.y + this.h / 2 > waterY;
    if (inWater !== this.inWater) {
      if (Math.abs(this.vy) > 2) {
        Effects.splash(this.x + this.w / 2, waterY);
        Sound.splash();
      }
      this.inWater = inWater;
    }
    const c = inWater ? Level.waterPhysics : Level.physics;
    const dir = (Input.right() ? 1 : 0) - (Input.left() ? 1 : 0);
    const grip = this.onGround || inWater; // i vattnet styr man lika bra hela tiden

    // Horisontell rörelse
    if (dir !== 0) {
      this.vx += dir * (grip ? c.WALK_ACCEL : c.AIR_ACCEL);
      this.facing = dir;
    } else if (grip) {
      if (Math.abs(this.vx) <= c.FRICTION) this.vx = 0;
      else this.vx -= Math.sign(this.vx) * c.FRICTION;
    }
    this.vx = Math.max(-c.MAX_WALK, Math.min(c.MAX_WALK, this.vx));

    // Hopp. I vattnet blir det ett simtag, eller ett hopp upp ur vattnet om huvudet är ovanför ytan.
    if (inWater) {
      if (Input.jumpPressed()) {
        const atSurface = this.y < waterY;
        this.vy = atSurface ? Level.physics.JUMP_SPEED : c.SWIM_SPEED;
        this.jumping = atSurface;
        if (!atSurface) {
          Sound.swim();
          this.stroke = Player.STROKE;
        }
      }
    } else {
      if (Input.jumpPressed() && this.onGround) {
        this.vy = c.JUMP_SPEED;
        this.jumping = true;
      }
      if (this.jumping && !Input.jump() && this.vy < 0) {
        this.vy *= c.JUMP_CUT;
        this.jumping = false;
      }
    }

    this.vy = Math.min(this.vy + c.GRAVITY, c.MAX_FALL);

    this.moveX();
    this.moveY();

    if (this.onGround) this.jumping = false;
    this.animTime += Math.abs(this.vx);
  }

  // Helikopter: flyger fritt med pilarna och skjuter med mellanslag/X åt det håll den tittar.
  updateHeli() {
    const ACCEL = 0.15;
    const MAX = 2.2;
    const DRAG = 0.08;
    if (!this.rotor) this.rotor = Sound.rotor();

    const dx = (Input.right() ? 1 : 0) - (Input.left() ? 1 : 0);
    const dy = (Input.down() ? 1 : 0) - (Input.up() ? 1 : 0);
    if (dx) this.facing = dx;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    this.vx = clamp(dx ? this.vx + dx * ACCEL : this.vx * (1 - DRAG), -MAX, MAX);
    this.vy = clamp(dy ? this.vy + dy * ACCEL : this.vy * (1 - DRAG), -MAX, MAX);
    this.x = clamp(this.x + this.vx, 0, Level.WIDTH - this.w);
    this.y = clamp(this.y + this.vy, 16, Level.GROUND_Y - this.h);

    if (this.fireCooldown > 0) this.fireCooldown--;
    if (Input.fire() && this.fireCooldown === 0) {
      this.bullets.push({
        x: this.facing > 0 ? this.x + this.w + 2 : this.x - 2,
        y: this.y + this.h / 2 + 2,
        vx: this.facing * 5,
        done: false,
      });
      this.fireCooldown = 7;
      Sound.shoot();
    }
    for (const b of this.bullets) b.x += b.vx;
    this.bullets = this.bullets.filter((b) => !b.done && b.x > -8 && b.x < Level.WIDTH + 8);
  }

  // Fiende träffar spelaren: litet hopp upp och sedan faller spelaren ut ur bild.
  // pushX ger en knuff i sidled, t.ex. när ett tåg träffar.
  kill(pushX = 0) {
    if (this.dying || !this.alive) return;
    this.dying = true;
    this.vx = pushX;
    this.vy = -4;
    this.rotor?.stop(0.4);
  }

  // Studs efter att ha hoppat på en fiende. Håller man in hopp blir studsen högre.
  bounce() {
    this.vy = Level.physics.JUMP_SPEED * 0.8;
    this.jumping = true;
    this.onGround = false;
  }

  launch() {
    this.launched = true;
    this.onGround = false;
    this.vx = 0;
    this.vy = -9;
    Level.squashTrampoline();
    Sound.boing();
  }

  moveX() {
    const T = CONFIG.TILE;
    this.x += this.vx;
    const top = Math.floor(this.y / T);
    const bottom = Math.floor((this.y + this.h - 0.001) / T);

    if (this.vx > 0) {
      const col = Math.floor((this.x + this.w - 0.001) / T);
      for (let row = top; row <= bottom; row++) {
        if (Level.isSolid(col, row)) {
          this.x = col * T - this.w;
          this.vx = 0;
          break;
        }
      }
    } else if (this.vx < 0) {
      const col = Math.floor(this.x / T);
      for (let row = top; row <= bottom; row++) {
        if (Level.isSolid(col, row)) {
          this.x = (col + 1) * T;
          this.vx = 0;
          break;
        }
      }
    }
  }

  moveY() {
    const T = CONFIG.TILE;
    this.y += this.vy;
    this.onGround = false;
    const left = Math.floor(this.x / T);
    const right = Math.floor((this.x + this.w - 0.001) / T);

    if (this.vy > 0) {
      const row = Math.floor((this.y + this.h - 0.001) / T);
      for (let col = left; col <= right; col++) {
        if (Level.isSolid(col, row)) {
          this.y = row * T - this.h;
          this.vy = 0;
          this.onGround = true;
          break;
        }
      }
      if (this.onGround && (Level.isTrampoline(left, row) || Level.isTrampoline(right, row))) {
        this.launch();
      }
    } else if (this.vy < 0) {
      const row = Math.floor(this.y / T);
      for (let col = left; col <= right; col++) {
        if (Level.isSolid(col, row)) {
          this.y = (row + 1) * T;
          this.vy = 0;
          break;
        }
      }
    }
  }

  draw(ctx, camX) {
    if (!this.visible) return;
    if (this.heli) {
      this.drawHeli(ctx, camX);
      return;
    }
    let frame = 'idle';
    if (!this.onGround) frame = 'jump';
    else if (this.vx !== 0 && Math.floor(this.animTime / 6) % 2 === 1) frame = 'walk';

    const dir = this.facing > 0 ? 'right' : 'left';
    if (this.inWater && this.stroke > 0 && !this.dying) {
      this.drawStroke(ctx, camX, dir);
      return;
    }
    let sprite = Sprites.player[Level.current.outfit][frame][dir];
    let bob = 0;
    let tilt = 0;

    // Goofy gång: fyra bildrutor med sparkar, guppande kropp och vaggande lutning
    if (Level.current.walkStyle === 'goofy' && (!this.onGround || this.vx !== 0)) {
      const i = this.onGround ? Math.floor(this.animTime / 7) % 4 : 0;
      sprite = Sprites.goofyWalk[i][dir];
      if (this.onGround) {
        bob = i % 2 === 0 ? -2 : 0;
        tilt = i === 1 ? 0.15 : i === 3 ? -0.15 : 0;
      }
    }

    const size = 16 * this.scale;
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2 + bob;
    if (tilt) {
      ctx.save();
      ctx.translate(Math.round(cx - camX), Math.round(this.y + this.h));
      ctx.rotate(tilt);
      ctx.drawImage(sprite, -size / 2, -size, size, size);
      ctx.restore();
      return;
    }
    ctx.drawImage(sprite, Math.round(cx - size / 2 - camX), Math.round(cy - size / 2), size, size);
  }

  // Simtag: armarna ut och sedan en benspark, kroppen lutar framåt och sträcks ut,
  // och några bubblor lossnar från fötterna.
  drawStroke(ctx, camX, dir) {
    const k = this.stroke / Player.STROKE; // 1 i början av simtaget, 0 i slutet
    const push = Math.sin(k * Math.PI);
    const sprite = Sprites.player[Level.current.outfit][k > 0.5 ? 'jump' : 'walk'][dir];
    const cx = Math.round(this.x + this.w / 2 - camX);
    const cy = Math.round(this.y + this.h / 2);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.facing * 0.6 * push);
    ctx.scale(1 - 0.1 * push, 1 + 0.15 * push);
    ctx.drawImage(sprite, -8, -8);
    ctx.restore();

    ctx.globalAlpha = k;
    ctx.fillStyle = '#d0e8a8';
    for (let i = 0; i < 3; i++) {
      const size = i === 1 ? 2 : 1;
      const bx = cx - this.facing * 4 + (i - 1) * 3;
      const by = cy + 9 + (1 - k) * 8 + i * 3;
      ctx.fillRect(Math.round(bx), Math.round(by), size, size);
    }
    ctx.globalAlpha = 1;
  }

  drawHeli(ctx, camX) {
    ctx.fillStyle = '#f8d838';
    for (const b of this.bullets) ctx.fillRect(Math.round(b.x - 2 - camX), Math.round(b.y), 4, 1);

    const now = performance.now();
    const frame = Sprites.helicopter[Math.floor(now / 50) % 2][this.facing > 0 ? 'right' : 'left'];
    ctx.save();
    ctx.translate(Math.round(this.x + this.w / 2 - camX), Math.round(this.y + this.h / 2));
    ctx.rotate(this.dying ? now / 60 : this.vx * 0.06); // lutar i färdriktningen, snurrar när den störtar
    ctx.drawImage(frame, -16, -8);
    ctx.restore();
  }
}
