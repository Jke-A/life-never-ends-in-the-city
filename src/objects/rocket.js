// Raket i slutet av rymdbanan. Spelaren kliver in, motorn tänds, raketen lyfter
// och spelet går vidare till nästa bana.
class Rocket extends Enemy {
  static W = 32;
  static H = 60;
  static COUNTDOWN = 70; // bildrutor från att man klivit in tills raketen lyfter

  constructor(x, groundY) {
    super(x, groundY - Rocket.H, Rocket.W, Rocket.H);
    this.groundY = groundY;
    this.state = 'idle';
    this.timer = 0;
    this.vy = 0;
    this.smoke = [];
    this.levelDone = false;
  }

  update(player) {
    this.timer++;

    if (this.state === 'idle') {
      const px = player.x + player.w / 2;
      const inside = px > this.x + 6 && px < this.x + this.w - 6 && player.y + player.h > this.y + 20;
      if (inside && player.alive && !player.dying && !player.captured) {
        player.captured = true;
        player.visible = false;
        player.vx = 0;
        player.vy = 0;
        this.state = 'countdown';
        this.timer = 0;
        this.sound = Sound.rumble(5);
      }
    } else if (this.state === 'countdown') {
      this.shake = 1;
      this.puff();
      if (this.timer >= Rocket.COUNTDOWN) {
        this.state = 'liftoff';
        this.timer = 0;
      }
    } else if (this.state === 'liftoff') {
      this.vy = Math.max(this.vy - 0.06, -6);
      this.y += this.vy;
      this.shake = Math.max(0, 2 - this.timer / 40);
      this.puff();
      if (this.y + this.h < -20) this.levelDone = true;
    }

    for (const p of this.smoke) {
      p.x += p.vx;
      p.y -= 0.2;
      p.r += 0.15;
      p.life--;
    }
    this.smoke = this.smoke.filter((p) => p.life > 0);
  }

  puff() {
    if (this.timer % 3) return;
    const y = Math.min(this.y + this.h + 4, this.groundY - 2);
    for (const dir of [-1, 1]) {
      this.smoke.push({ x: this.x + this.w / 2, y, vx: dir * (0.5 + Math.random()), r: 2, life: 40 });
    }
  }

  draw(ctx, camX) {
    for (const p of this.smoke) {
      ctx.fillStyle = `rgba(200, 200, 210, ${p.life / 60})`;
      const r = Math.round(p.r);
      ctx.fillRect(Math.round(p.x - r - camX), Math.round(p.y - r), r * 2, r * 2);
    }

    const x = Math.round(this.x - camX) + (this.state === 'countdown' ? Math.round(Math.random() * 2 - 1) : 0);
    const y = Math.round(this.y);

    if (['countdown', 'liftoff', 'landing'].includes(this.state)) {
      const big = this.state !== 'countdown';
      const cx = x + this.w / 2;
      const outer = (big ? 12 : 4) + Math.random() * 6;
      const inner = outer * 0.6;
      ctx.fillStyle = '#f87800';
      ctx.fillRect(cx - 4, y + this.h, 8, outer);
      ctx.fillStyle = '#f8d838';
      ctx.fillRect(cx - 2, y + this.h, 4, inner);
    }

    ctx.drawImage(Sprites.rocket, x, y);
  }
}

Enemy.register('rocket', Rocket);

// Samma raket som landar i början av en bana med spelaren ombord och släpper ut hen.
// Banan måste ha arriveByRocket: true så att spelaren börjar inuti raketen.
class LandingRocket extends Rocket {
  static START_Y = -120;
  static EXIT_DELAY = 40;

  constructor(x, groundY) {
    super(x, groundY);
    this.state = 'landing';
    this.y = LandingRocket.START_Y;
  }

  update(player) {
    super.update(player);
    if (this.state === 'landing') {
      if (!this.sound) this.sound = Sound.rumble(4);
      const target = this.groundY - this.h;
      this.vy = Math.max(0.6, Math.min(4, (target - this.y) * 0.04));
      this.y = Math.min(target, this.y + this.vy);
      this.shake = 1;
      if (target - this.y < 48) this.puff();
      if (this.y === target) {
        this.state = 'landed';
        this.timer = 0;
        this.shake = 2;
        this.sound.stop(0.4);
      }
    } else if (this.state === 'landed') {
      this.shake = Math.max(0, this.shake - 0.1);
      if (this.timer >= LandingRocket.EXIT_DELAY) {
        player.captured = false;
        player.visible = true;
        player.facing = 1;
        player.x = this.x + this.w / 2 - player.w / 2;
        player.y = this.groundY - player.h;
        player.vx = 0;
        player.vy = 0;
        this.state = 'parked';
      }
    }
  }
}

Enemy.register('landingRocket', LandingRocket);
