// Litet hus som spelaren kan gömma sig i. Inne i huset ser monstren inte spelaren
// och bomberna kan inte skada hen. Huset ritas ovanpå spelaren så att hen syns
// bara som ett par ögon i dörröppningen.
class House extends Enemy {
  static W = 48;
  static H = 40;
  static ROOF = 14; // takets höjd
  static MARGIN = 14; // hur långt in man måste gå för att vara gömd

  constructor(x, groundY) {
    super(x, groundY - House.H, House.W, House.H);
    this.timer = 0;
    this.occupied = false;
    this.peekX = 0;
  }

  // Står spelaren inne i huset?
  shelters(player) {
    if (!player.alive || player.dying || player.captured) return false;
    const px = player.x + player.w / 2;
    return px > this.x + House.MARGIN && px < this.x + this.w - House.MARGIN &&
      player.y + player.h > this.y + House.ROOF + 4;
  }

  // Takets överkant vid x (används när bomber slår ner).
  roofY(x) {
    return this.y + Math.max(0, ((Math.abs(x - (this.x + this.w / 2)) - 4) * 13) / 20);
  }

  update(player) {
    this.timer++;
    this.occupied = this.shelters(player);
    if (this.occupied) {
      this.peekX = Math.max(this.x + 20, Math.min(this.x + 25, player.x + player.w / 2 - 2));
    }
  }

  draw(ctx, camX) {
    ctx.drawImage(Sprites.house, Math.round(this.x - camX), Math.round(this.y));
    if (this.occupied && this.timer % 150 > 8) {
      // Spelarens ögon som tittar ut ur mörkret
      const x = Math.round(this.peekX - camX);
      const y = Math.round(this.y + 28);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, 1, 1);
      ctx.fillRect(x + 3, y, 1, 1);
    }
  }
}

Enemy.register('house', House);
