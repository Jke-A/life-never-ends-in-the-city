// Slutscenen när Godzilla är besegrad: polisen kommer till glasskiosken och tar fast
// glassmannen som sålde den förgiftade glassen. Styrs av main.js med en tidräknare.
const Ending = (() => {
  const FADE = 30;
  const ARRIVE = 120; // polisbilen stannar
  const OUT = 140; // polisen kliver ur
  const MEET = 200;
  const EXIT = 215; // glassmannen kommer ut ur kiosken
  const EXIT_END = 250;
  const CUFF = 270; // handfängsel
  const WALK = 320;
  const BACK = 390; // båda sitter i bilen
  const LEAVE = 470; // bilen har kört iväg
  const TEXT = 490;
  const DONE = 550;

  const KIOSK_X = 168;
  const CAR_X = 40;

  const lerp = (a, b, k) => a + (b - a) * Math.max(0, Math.min(1, k));

  function update(t) {
    if (t === FADE + 5) Sound.policeSiren((LEAVE + 30 - FADE) / 60);
    if (t === CUFF) Sound.click();
    if (t === CUFF + 6) Sound.click();
    if (t === EXIT + 10) Sound.giggle();
    if (t === BACK + 5) Sound.stomp(); // bildörren smäller igen
    if (t === TEXT) Sound.fanfare();
  }

  function draw(ctx, t) {
    const { WIDTH, HEIGHT } = CONFIG;
    if (t < FADE) {
      ctx.fillStyle = `rgba(0, 0, 0, ${t / FADE})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      return;
    }
    drawScene(ctx, t);
    if (t < FADE + 20) {
      ctx.fillStyle = `rgba(0, 0, 0, ${1 - (t - FADE) / 20})`;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }
    if (t >= TEXT) drawText(ctx, t);
  }

  function drawScene(ctx, t) {
    const { WIDTH } = CONFIG;
    const T = CONFIG.TILE;
    const ground = Level.GROUND_Y;

    Background.draw(ctx, 0, 'city');
    const tiles = Sprites.tiles.city;
    for (let x = 0; x < WIDTH; x += T) {
      ctx.drawImage(tiles.top, x, ground);
      ctx.drawImage(tiles.ground, x, ground + T);
    }

    // Kiosken, tom när glassmannen har gått ut
    ctx.drawImage(Sprites.kiosk, KIOSK_X, ground - 40);
    if (t >= EXIT) {
      ctx.fillStyle = '#1c1824';
      ctx.fillRect(KIOSK_X + 2, ground - 30, 36, 14);
    }

    // Polisbilen kör in, väntar och kör iväg
    let carX = -60;
    if (t < ARRIVE) carX = lerp(-60, CAR_X, 1 - (1 - (t - FADE) / (ARRIVE - FADE)) ** 2);
    else if (t < BACK + 20) carX = CAR_X;
    else carX = CAR_X + (t - BACK - 20) ** 2 * 0.06;
    if (carX < WIDTH) {
      const car = Sprites.policeCar;
      const bump = t < ARRIVE || t >= BACK + 20 ? Math.floor(t / 4) % 2 : 0;
      ctx.drawImage(car, Math.round(carX), ground - car.height - bump);
      // Blinkande blåljus
      const blue = Math.floor(t / 8) % 2 === 0;
      ctx.fillStyle = blue ? 'rgba(80, 140, 255, 0.35)' : 'rgba(255, 60, 60, 0.35)';
      ctx.fillRect(Math.round(carX) + (blue ? 12 : 22), ground - car.height - bump - 6, 14, 8);
      ctx.fillStyle = blue ? '#a0c8ff' : '#ffa0a0';
      ctx.fillRect(Math.round(carX) + (blue ? 20 : 24), ground - car.height - bump + 1, 4, 1);
    }

    // Polisen och glassmannen
    const feet = ground - 16;
    const bob = (moving) => (moving && Math.floor(t / 6) % 2 ? -1 : 0);
    if (t >= OUT && t < BACK) {
      let x;
      let dir = 'right';
      let moving = false;
      if (t < MEET) {
        x = lerp(CAR_X + 16, 124, (t - OUT) / (MEET - OUT));
        moving = true;
      } else if (t < WALK) {
        x = 124;
      } else {
        x = lerp(124, CAR_X + 10, (t - WALK) / (BACK - WALK));
        dir = 'left';
        moving = true;
      }
      ctx.drawImage(Sprites.police[dir], Math.round(x), feet + bob(moving));

      let manX = 144;
      let manMoving = false;
      if (t < EXIT) manX = null;
      else if (t < EXIT_END) {
        manX = lerp(KIOSK_X + 12, 144, (t - EXIT) / (EXIT_END - EXIT));
        manMoving = true;
      } else if (t >= WALK) {
        manX = x + 20;
        manMoving = true;
      }
      if (manX !== null) {
        // Glassmannen darrar av rädsla
        const shiver = t >= EXIT_END && t < WALK ? (t % 4 < 2 ? 1 : 0) : 0;
        ctx.drawImage(Sprites.iceCreamMan.left, Math.round(manX) + shiver, feet + bob(manMoving));
        if (t >= CUFF) {
          // Handfängsel mellan polisen och glassmannen
          const a = Math.round(x + 13);
          const b = Math.round(manX + 3);
          ctx.fillStyle = '#c8c8d0';
          ctx.fillRect(Math.min(a, b), ground - 8, Math.abs(b - a) + 1, 1);
          ctx.fillRect(a - 1, ground - 9, 3, 3);
          ctx.fillRect(b - 1, ground - 9, 3, 3);
        }
      }

      if (t >= OUT + 10 && t < EXIT) bubble(ctx, 'STOP! POLICE!', x + 8, feet - 4);
      if (t >= EXIT + 10 && t < CUFF) bubble(ctx, 'NOOOOO!', manX + 8, feet - 4);
      if (t >= CUFF && t < WALK + 40) bubble(ctx, "YOU'RE UNDER ARREST FOR POISON ICE CREAM!", x + 8, feet - 4);
    }

    if (t < MEET) caption(ctx, 'MEANWHILE IN THE CITY...');
  }

  // Pratbubbla med en liten pil ner mot den som pratar
  function bubble(ctx, text, x, y) {
    const { WIDTH } = CONFIG;
    ctx.font = 'bold 8px "Courier New", monospace';
    const w = Math.ceil(ctx.measureText(text).width) + 8;
    const h = 13;
    const left = Math.round(Math.max(2, Math.min(WIDTH - w - 2, x - w / 2)));
    const top = Math.round(y - h - 6);
    ctx.fillStyle = '#000000';
    ctx.fillRect(left - 1, top - 1, w + 2, h + 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(left, top, w, h);
    ctx.fillRect(Math.round(x) - 2, top + h, 5, 2);
    ctx.fillRect(Math.round(x) - 1, top + h + 2, 3, 2);
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, left + w / 2, top + h / 2 + 1);
  }

  function caption(ctx, text) {
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000000';
    ctx.fillText(text, CONFIG.WIDTH / 2 + 1, 13);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, CONFIG.WIDTH / 2, 12);
  }

  function drawText(ctx, t) {
    const { WIDTH, HEIGHT } = CONFIG;
    ctx.fillStyle = `rgba(0, 0, 0, ${0.75 * Math.min(1, (t - TEXT) / 20)})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px "Courier New", monospace';
    ctx.fillStyle = '#f8d838';
    ctx.fillText('YOU BEAT', WIDTH / 2, HEIGHT / 2 - 34);
    ctx.fillText('THE GAME!', WIDTH / 2, HEIGHT / 2 - 12);
    ctx.font = 'bold 10px "Courier New", monospace';
    ctx.fillStyle = '#5c94fc';
    ctx.fillText('LIFE NEVER ENDS IN THE CITY', WIDTH / 2, HEIGHT / 2 + 10);
    ctx.fillStyle = '#a8a8b8';
    ctx.fillText('THE ICE CREAM MAN WENT TO JAIL', WIDTH / 2, HEIGHT / 2 + 26);
    if (t > DONE && Math.floor(t / 30) % 2 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText('PRESS JUMP TO PLAY AGAIN', WIDTH / 2, HEIGHT / 2 + 50);
    }
  }

  return { update, draw, DONE };
})();
