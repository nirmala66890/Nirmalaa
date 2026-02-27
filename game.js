const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");
const goalEl = document.getElementById("goal");

const GRAVITY = 0.55;
const WORLD_WIDTH = 2600;
const GROUND_Y = 360;

const levelPlatforms = [
  { x: 200, y: 300, w: 160, h: 18 },
  { x: 460, y: 260, w: 120, h: 18 },
  { x: 700, y: 225, w: 140, h: 18 },
  { x: 930, y: 280, w: 150, h: 18 },
  { x: 1200, y: 240, w: 100, h: 18 },
  { x: 1480, y: 300, w: 150, h: 18 },
  { x: 1730, y: 255, w: 120, h: 18 },
  { x: 1970, y: 215, w: 130, h: 18 },
  { x: 2200, y: 260, w: 170, h: 18 }
];

const baseCoins = [
  { x: 250, y: 260 }, { x: 300, y: 260 },
  { x: 500, y: 220 }, { x: 760, y: 185 },
  { x: 980, y: 240 }, { x: 1235, y: 200 },
  { x: 1510, y: 260 }, { x: 1790, y: 215 },
  { x: 2035, y: 175 }, { x: 2280, y: 220 },
  { x: 2400, y: 320 }
];

const baseEnemies = [
  { x: 620, y: GROUND_Y - 28, minX: 560, maxX: 880, speed: 1.15 },
  { x: 1350, y: GROUND_Y - 28, minX: 1280, maxX: 1600, speed: 1.4 },
  { x: 2080, y: GROUND_Y - 28, minX: 1900, maxX: 2330, speed: 1.6 }
];

const keys = {};

const state = {
  player: null,
  coins: [],
  enemies: [],
  score: 0,
  lives: 3,
  cameraX: 0,
  gameOver: false,
  won: false
};

function resetPlayer() {
  state.player = {
    x: 60,
    y: GROUND_Y - 58,
    w: 36,
    h: 58,
    vx: 0,
    vy: 0,
    speed: 3.3,
    jumpPower: 11,
    onGround: false,
    invincibleTimer: 0,
    facing: 1
  };
}

function resetWorld(resetLives = true) {
  state.coins = baseCoins.map((coin) => ({ ...coin, collected: false }));
  state.enemies = baseEnemies.map((e) => ({ ...e, dir: 1 }));
  state.score = 0;
  state.gameOver = false;
  state.won = false;
  state.cameraX = 0;
  goalEl.textContent = "Reach the flag!";
  if (resetLives) {
    state.lives = 3;
  }
  resetPlayer();
  syncHud();
}

function syncHud() {
  scoreEl.textContent = `Score: ${state.score}`;
  livesEl.textContent = `Lives: ${state.lives}`;
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function takeHit() {
  const player = state.player;
  if (player.invincibleTimer > 0 || state.gameOver || state.won) {
    return;
  }

  state.lives -= 1;
  syncHud();

  if (state.lives <= 0) {
    state.gameOver = true;
    goalEl.textContent = "Game Over! Press R to restart.";
    return;
  }

  player.x = Math.max(40, player.x - 80);
  player.y = GROUND_Y - player.h;
  player.vx = 0;
  player.vy = -5;
  player.invincibleTimer = 80;
}

function updatePlayer() {
  const p = state.player;
  if (state.gameOver || state.won) {
    p.vx = 0;
    return;
  }

  p.vx = 0;
  if (keys.ArrowLeft) {
    p.vx = -p.speed;
    p.facing = -1;
  }
  if (keys.ArrowRight) {
    p.vx = p.speed;
    p.facing = 1;
  }

  if ((keys.ArrowUp || keys.Space) && p.onGround) {
    p.vy = -p.jumpPower;
    p.onGround = false;
  }

  p.x += p.vx;
  p.vy += GRAVITY;
  p.y += p.vy;

  p.onGround = false;

  // Ground collision
  if (p.y + p.h >= GROUND_Y) {
    p.y = GROUND_Y - p.h;
    p.vy = 0;
    p.onGround = true;
  }

  // Platform collisions
  for (const plat of levelPlatforms) {
    if (
      p.x + p.w > plat.x &&
      p.x < plat.x + plat.w &&
      p.y + p.h >= plat.y &&
      p.y + p.h <= plat.y + plat.h + 12 &&
      p.vy >= 0
    ) {
      p.y = plat.y - p.h;
      p.vy = 0;
      p.onGround = true;
    }
  }

  if (p.y > canvas.height + 200) {
    takeHit();
  }

  p.x = Math.max(0, Math.min(WORLD_WIDTH - p.w, p.x));

  if (p.invincibleTimer > 0) {
    p.invincibleTimer -= 1;
  }

  const flagX = WORLD_WIDTH - 110;
  if (p.x + p.w > flagX) {
    state.won = true;
    goalEl.textContent = "You won! Shinchan reached the flag. Press R to play again.";
  }
}

function updateEnemies() {
  for (const enemy of state.enemies) {
    enemy.x += enemy.speed * enemy.dir;
    if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
      enemy.dir *= -1;
    }

    const enemyRect = { x: enemy.x, y: enemy.y, w: 30, h: 28 };
    const p = state.player;
    if (rectsOverlap({ x: p.x, y: p.y, w: p.w, h: p.h }, enemyRect)) {
      const stomped = p.vy > 2 && p.y + p.h - enemy.y < 16;
      if (stomped) {
        enemy.x = enemy.minX;
        enemy.dir = 1;
        p.vy = -8;
        state.score += 120;
        syncHud();
      } else {
        takeHit();
      }
    }
  }
}

function updateCoins() {
  const pRect = { x: state.player.x, y: state.player.y, w: state.player.w, h: state.player.h };
  for (const coin of state.coins) {
    if (coin.collected) continue;
    const cRect = { x: coin.x - 10, y: coin.y - 10, w: 20, h: 20 };
    if (rectsOverlap(pRect, cRect)) {
      coin.collected = true;
      state.score += 50;
      syncHud();
    }
  }
}

function drawBackground() {
  const cam = state.cameraX;

  ctx.fillStyle = "#87ceeb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Clouds
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < 7; i += 1) {
    const x = ((i * 300 - cam * 0.35) % (canvas.width + 280)) - 80;
    const y = 45 + (i % 3) * 36;
    ctx.beginPath();
    ctx.ellipse(x, y, 36, 20, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 30, y + 2, 26, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 30, y + 4, 22, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Hills
  ctx.fillStyle = "#71bd6b";
  for (let i = 0; i < 7; i += 1) {
    const baseX = i * 420 - cam * 0.5;
    ctx.beginPath();
    ctx.moveTo(baseX, GROUND_Y);
    ctx.quadraticCurveTo(baseX + 120, 220, baseX + 280, GROUND_Y);
    ctx.fill();
  }

  // Ground
  ctx.fillStyle = "#6e9f37";
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
  ctx.fillStyle = "#7e5f3d";
  for (let x = 0; x < canvas.width; x += 26) {
    ctx.fillRect(x, GROUND_Y + 25, 20, 6);
  }
}

function drawPlatforms() {
  ctx.fillStyle = "#9b6b44";
  for (const p of levelPlatforms) {
    const x = p.x - state.cameraX;
    if (x + p.w < 0 || x > canvas.width) continue;
    ctx.fillRect(x, p.y, p.w, p.h);
    ctx.fillStyle = "#bd8756";
    ctx.fillRect(x, p.y, p.w, 5);
    ctx.fillStyle = "#9b6b44";
  }
}

function drawCoin(coin) {
  const x = coin.x - state.cameraX;
  const y = coin.y;
  ctx.fillStyle = "#ffd43b";
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#d8a100";
  ctx.stroke();
}

function drawEnemy(enemy) {
  const x = enemy.x - state.cameraX;
  const y = enemy.y;
  ctx.fillStyle = "#703c1f";
  ctx.fillRect(x, y, 30, 28);
  ctx.fillStyle = "#f8dfc2";
  ctx.fillRect(x + 5, y + 6, 20, 8);
  ctx.fillStyle = "#000";
  ctx.fillRect(x + 6, y + 20, 6, 6);
  ctx.fillRect(x + 18, y + 20, 6, 6);
}

function drawShinchan(player) {
  const flash = player.invincibleTimer > 0 && Math.floor(player.invincibleTimer / 6) % 2 === 0;
  if (flash) return;

  const x = player.x - state.cameraX;
  const y = player.y;

  // Head
  ctx.fillStyle = "#f5c9a9";
  ctx.fillRect(x + 8, y, 20, 16);

  // Hair
  ctx.fillStyle = "#181818";
  ctx.fillRect(x + 6, y - 2, 24, 8);

  // Eyes
  ctx.fillStyle = "#000";
  ctx.fillRect(x + 11, y + 6, 4, 3);
  ctx.fillRect(x + 21, y + 6, 4, 3);

  // Body (red shirt)
  ctx.fillStyle = "#e63946";
  ctx.fillRect(x + 6, y + 16, 24, 18);

  // Shorts (yellow)
  ctx.fillStyle = "#f4c430";
  ctx.fillRect(x + 7, y + 34, 22, 10);

  // Legs
  ctx.fillStyle = "#f5c9a9";
  ctx.fillRect(x + 9, y + 44, 7, 11);
  ctx.fillRect(x + 20, y + 44, 7, 11);

  // Shoes
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + 8, y + 54, 9, 4);
  ctx.fillRect(x + 19, y + 54, 9, 4);
}

function drawFlag() {
  const poleX = WORLD_WIDTH - 100 - state.cameraX;
  if (poleX < -20 || poleX > canvas.width + 40) return;

  ctx.fillStyle = "#ddd";
  ctx.fillRect(poleX, 140, 8, 220);
  ctx.fillStyle = "#2a9d8f";
  ctx.beginPath();
  ctx.moveTo(poleX + 8, 155);
  ctx.lineTo(poleX + 68, 176);
  ctx.lineTo(poleX + 8, 198);
  ctx.closePath();
  ctx.fill();
}

function render() {
  drawBackground();
  drawPlatforms();
  drawFlag();

  for (const coin of state.coins) {
    if (!coin.collected) drawCoin(coin);
  }

  for (const enemy of state.enemies) {
    drawEnemy(enemy);
  }

  drawShinchan(state.player);
}

function tick() {
  updatePlayer();
  updateEnemies();
  updateCoins();

  state.cameraX = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, state.player.x - canvas.width * 0.35));

  render();
  requestAnimationFrame(tick);
}

window.addEventListener("keydown", (event) => {
  keys[event.code] = true;
  if (event.code === "KeyR") {
    resetWorld(true);
  }
  if (["ArrowUp", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
});

window.addEventListener("keyup", (event) => {
  keys[event.code] = false;
});

resetWorld(true);
tick();
