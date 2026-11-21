// Tunnelbanetåg som rusar in från höger. Den som står på spåret när fronten kommer dör,
// så man måste hoppa upp på taket och stå kvar tills tåget har passerat under en.
class Train {
  static CAB = 40;
  static CAR = 64;
  static H = 36;
  static LANDING = 8; // hur långt under taknivån man får vara och ändå landa på taket

  constructor(x, groundY, cars, speed) {
    this.x = x;
    this.y = groundY - Train.H;
    this.cars = cars;
    this.speed = speed;
    this.length = 2 * Train.CAB + cars * Train.CAR;
  }

  update() {
    this.x -= this.speed;
  }

  // Taket bär spelaren, resten av tåget dödar.
  collide(player) {
    if (!player.alive || player.dying || player.captured) return;
    if (player.x + player.w <= this.x + 2 || player.x >= this.x + this.length) return;

    const bottom = player.y + player.h;
    if (bottom <= this.y) return;
    if (bottom <= this.y + Train.LANDING) {
      if (player.vy >= 0) {
        player.y = this.y - player.h;
        player.vy = 0;
        player.onGround = true;
      }
      return;
    }
    player.kill(-this.speed);
    Sound.hit();
  }

  draw(ctx, camX) {
    let x = Math.round(this.x - camX);

    // Strålkastarljus framför tåget
    ctx.fillStyle = 'rgba(255, 240, 160, 0.18)';
    ctx.beginPath();
    ctx.moveTo(x + 3, this.y + 24);
    ctx.lineTo(x - 80, this.y + 6);
    ctx.lineTo(x - 80, this.y + Train.H);
    ctx.closePath();
    ctx.fill();

    ctx.drawImage(Sprites.train.front, x, this.y);
    x += Train.CAB;
    for (let i = 0; i < this.cars; i++) {
      ctx.drawImage(Sprites.train.car, x, this.y);
      x += Train.CAR;
    }
    ctx.drawImage(Sprites.train.rear, x, this.y);
  }
}

// Styr tågen på tunnelbanebanan: varnar, skickar in ett tåg i taget och räknar hur många
// spelaren har överlevt. När alla har passerat är banan klar.
class TrainLine extends Enemy {
  static FIRST_DELAY = 120;
  static MIN_GAP = 90;
  static MAX_GAP = 220;
  static WARNING = 80;
  static SPEEDS = [2.6, 3.0, 3.3, 3.6, 3.9, 4.2];

  constructor(x, groundY) {
    super(0, 0, 0, 0);
    this.groundY = groundY;
    this.total = 4 + Math.floor(Math.random() * 3); // 4-6 tåg
    this.survived = 0;
    this.train = null;
    this.state = 'waiting';
    this.timer = TrainLine.FIRST_DELAY;
    this.levelDone = false;
  }

  update(player) {
    this.shake = 0;
    if (this.levelDone) return;

    if (this.train) {
      this.train.update();
      this.train.collide(player);
      this.shake = 0.6;
      if (this.train.x + this.train.length < player.x - CONFIG.WIDTH) this.trainPassed(player);
      return;
    }

    if (!player.alive || player.dying) return;
    if (--this.timer > 0) return;

    if (this.state === 'waiting') {
      this.state = 'warning';
      this.timer = TrainLine.WARNING;
      Sound.horn();
      return;
    }

    const speed = TrainLine.SPEEDS[Math.min(this.survived, TrainLine.SPEEDS.length - 1)];
    const cars = 1 + Math.floor(Math.random() * 2);
    // Spawnar alltid till höger utanför bild eftersom kameran aldrig är längre till höger än spelaren
    this.train = new Train(player.x + CONFIG.WIDTH, this.groundY, cars, speed);
    this.state = 'passing';
    this.rumble = Sound.rumble((2 * CONFIG.WIDTH + this.train.length) / speed / 60);
  }

  trainPassed(player) {
    this.train = null;
    this.rumble?.stop(0.5);
    if (!player.alive || player.dying) return;
    this.survived++;
    if (this.survived >= this.total) {
      this.levelDone = true;
      return;
    }
    this.state = 'waiting';
    this.timer = TrainLine.MIN_GAP + Math.floor(Math.random() * (TrainLine.MAX_GAP - TrainLine.MIN_GAP));
  }

  draw(ctx, camX) {
    if (this.train) this.train.draw(ctx, camX);

    // Varning: blinkande strålkastarsken och utropstecken i högerkanten
    if (this.state === 'warning' && this.timer % 16 < 10) {
      const { WIDTH } = CONFIG;
      const g = ctx.createLinearGradient(WIDTH - 40, 0, WIDTH, 0);
      g.addColorStop(0, 'rgba(255, 240, 160, 0)');
      g.addColorStop(1, 'rgba(255, 240, 160, 0.5)');
      ctx.fillStyle = g;
      ctx.fillRect(WIDTH - 40, this.groundY - Train.H, 40, Train.H);
      ctx.fillStyle = '#f83800';
      ctx.fillRect(WIDTH - 14, this.groundY - 70, 6, 16);
      ctx.fillRect(WIDTH - 14, this.groundY - 50, 6, 6);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`TRAINS ${this.survived}/${this.total}`, 8, 6);
  }
}

Enemy.register('trains', TrainLine);
