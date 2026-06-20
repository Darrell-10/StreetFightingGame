// ═══════════════════════════════════════════════════════
//  BATTLE ARENA — main game controller
// ═══════════════════════════════════════════════════════

const socket = io();

// ── State ──────────────────────────────────────────────
let roomCode = null;
let myIndex = null;   // 0 or 1
let myChar = null;
let oppChar = null;
let gameRunning = false;

// ── Screens ─────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── Lobby ───────────────────────────────────────────────
function createRoom() {
  socket.emit('create_room');
}
function joinRoom() {
  const code = document.getElementById('join-code-input').value.trim().toUpperCase();
  if (!code) return;
  socket.emit('join_room', { code });
}

function showError(msg) {
  const el = document.getElementById('lobby-error');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => (el.style.display = 'none'), 3000);
}

socket.on('room_created', ({ code, playerIndex }) => {
  roomCode = code;
  myIndex = playerIndex;
  document.getElementById('lobby-main').style.display = 'none';
  document.getElementById('lobby-waiting').style.display = 'flex';
  document.getElementById('room-code-text').textContent = code;
});

socket.on('room_joined', ({ code, playerIndex }) => {
  roomCode = code;
  myIndex = playerIndex;
});

socket.on('join_error', ({ message }) => showError(message));

socket.on('player_joined', ({ playerCount }) => {
  if (playerCount === 2) {
    showCharSelect();
  }
});

// ── Character Select ─────────────────────────────────────
function showCharSelect() {
  showScreen('charselect-screen');
  document.getElementById('cs-player-label').textContent =
    `YOU ARE PLAYER ${myIndex + 1}`;
  buildCharGrid();
}

function buildCharGrid() {
  const grid = document.getElementById('characters-grid');
  grid.innerHTML = '';
  Object.values(CHARACTERS).forEach(char => {
    const card = document.createElement('div');
    card.className = 'char-card';
    card.id = `char-card-${char.id}`;
    card.innerHTML = `
      <div class="char-icon">${char.icon}</div>
      <div class="char-name">${char.name}</div>
      <div class="char-role">${char.role}</div>
      <div class="char-stats">
        ${statRow('PWR', char.stats.power, '#ff6b35')}
        ${statRow('SPD', char.stats.speed, '#f7c948')}
        ${statRow('DEF', char.stats.defense, '#4488ff')}
        ${statRow('SP', char.stats.special, '#a855f7')}
      </div>
    `;
    card.addEventListener('click', () => selectCharacter(char.id));
    grid.appendChild(card);
  });
}

function statRow(label, val, color) {
  return `<div class="stat-bar-row">
    <span style="width:22px">${label}</span>
    <div class="stat-bar"><div class="stat-fill" style="width:${val}%;background:${color}"></div></div>
  </div>`;
}

function selectCharacter(charId) {
  if (myChar) return; // already selected
  myChar = charId;
  document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById(`char-card-${charId}`);
  card.classList.add('selected');
  const youTag = document.createElement('div');
  youTag.className = 'player-tag tag-you';
  youTag.textContent = 'YOU';
  card.appendChild(youTag);
  document.getElementById('cs-waiting').style.display = 'block';
  socket.emit('select_character', { characterId: charId });
}

socket.on('character_selected', ({ playerIndex, characterId }) => {
  if (playerIndex !== myIndex) {
    oppChar = characterId;
    const card = document.getElementById(`char-card-${characterId}`);
    if (card) {
      card.classList.add('opponent-selected');
      const oppTag = document.createElement('div');
      oppTag.className = 'player-tag tag-opp';
      oppTag.textContent = 'OPP';
      card.appendChild(oppTag);
    }
  }
});

socket.on('game_start', ({ p1Character, p2Character }) => {
  myChar = myIndex === 0 ? p1Character : p2Character;
  oppChar = myIndex === 0 ? p2Character : p1Character;
  startGame(p1Character, p2Character);
});


// ═══════════════════════════════════════════════════════
//  GAME ENGINE
// ═══════════════════════════════════════════════════════

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const FPS = 60;
let animId = null;
let lastTime = 0;

// Canvas dimensions (logical)
const STAGE_W = 800;
const STAGE_H = 450;
const FLOOR_Y = STAGE_H - 90;
const PLAYER_W = 72;
const PLAYER_H = 110;

// Game state
let gs = null;  // game state object

function startGame(p1Char, p2Char) {
  showScreen('game-screen');
  resizeCanvas();
  initGameState(p1Char, p2Char);
  if (animId) cancelAnimationFrame(animId);
  gameRunning = true;
  lastTime = performance.now();
  loop(lastTime);
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';
  ctx.scale(dpr, dpr);
}
window.addEventListener('resize', () => { if (gameRunning) resizeCanvas(); });

function initGameState(p1Char, p2Char) {
  const c1 = CHARACTERS[p1Char];
  const c2 = CHARACTERS[p2Char];

  gs = {
    p1: {
      char: c1,
      x: 150, y: FLOOR_Y,
      vx: 0, vy: 0,
      hp: c1.hp, maxHp: c1.hp,
      superMeter: 0,
      facing: 'right',
      state: 'idle',  // idle | walk | jump | duck | punch | kick | super | hurt | block
      stateTimer: 0,
      superCooldown: 0,
      hurtTimer: 0,
      blockTimer: 0,
      frame: 0,
      onGround: true,
      hitFlash: 0,
    },
    p2: {
      char: c2,
      x: STAGE_W - 150 - PLAYER_W, y: FLOOR_Y,
      vx: 0, vy: 0,
      hp: c2.hp, maxHp: c2.hp,
      superMeter: 0,
      facing: 'left',
      state: 'idle',
      stateTimer: 0,
      superCooldown: 0,
      hurtTimer: 0,
      blockTimer: 0,
      frame: 0,
      onGround: true,
      hitFlash: 0,
    },
    timer: 99,
    timerCounter: 0,
    effects: [],
    roundOver: false,
    winner: null,
    bgScroll: 0,
  };

  updateHUD();
  announce('FIGHT!', 1400);
}

// My player shorthand
function me() { return myIndex === 0 ? gs.p1 : gs.p2; }
function opp() { return myIndex === 0 ? gs.p2 : gs.p1; }

// ── Game loop ────────────────────────────────────────────
function loop(timestamp) {
  if (!gameRunning) return;
  const dt = Math.min((timestamp - lastTime) / (1000 / FPS), 3);
  lastTime = timestamp;

  update(dt);
  render();
  animId = requestAnimationFrame(loop);
}

// ── Update ───────────────────────────────────────────────
function update(dt) {
  if (gs.roundOver) return;

  // Joystick input → movement for my player
  applyJoystickToPlayer(me(), dt);

  // Physics
  [gs.p1, gs.p2].forEach(p => {
    // Gravity
    if (!p.onGround) {
      p.vy += 0.7 * dt;
    }
    p.y += p.vy * dt;
    p.x += p.vx * dt;

    // Floor
    if (p.y >= FLOOR_Y) {
      p.y = FLOOR_Y;
      p.vy = 0;
      p.onGround = true;
      if (p.state === 'jump') p.state = 'idle';
    }

    // Walls
    p.x = Math.max(0, Math.min(STAGE_W - PLAYER_W, p.x));

    // Facing: always face opponent
    const other = p === gs.p1 ? gs.p2 : gs.p1;
    p.facing = p.x < other.x ? 'right' : 'left';

    // State timers
    if (p.stateTimer > 0) {
      p.stateTimer -= dt;
      if (p.stateTimer <= 0) {
        p.stateTimer = 0;
        if (['punch', 'kick', 'super', 'hurt'].includes(p.state)) {
          p.state = 'idle';
          p.vx = 0;
        }
      }
    }

    // Super cooldown
    if (p.superCooldown > 0) p.superCooldown -= dt;

    // Hit flash
    if (p.hitFlash > 0) p.hitFlash -= dt;

    // Frame counter (for animation)
    p.frame += dt;

    // Walking state
    if (p.state === 'idle' && Math.abs(p.vx) > 0.5) p.state = 'walk';
    if (p.state === 'walk' && Math.abs(p.vx) < 0.5) p.state = 'idle';
  });

  // Hit detection (run each frame during attack states)
  checkHits(gs.p1, gs.p2);
  checkHits(gs.p2, gs.p1);

  // Effects
  gs.effects = gs.effects.filter(e => {
    e.life -= dt;
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    e.size += e.grow * dt;
    return e.life > 0;
  });

  // Timer
  gs.timerCounter += dt;
  if (gs.timerCounter >= FPS) {
    gs.timerCounter = 0;
    gs.timer--;
    document.getElementById('hud-timer').textContent = gs.timer;
    if (gs.timer <= 0) endRound('timeout');
  }

  // BG scroll
  gs.bgScroll += 0.3 * dt;

  updateHUD();
}

let hitCooldown = { p1: 0, p2: 0 };
function checkHits(attacker, defender) {
  if (!['punch', 'kick', 'super'].includes(attacker.state)) return;
  if (attacker.stateTimer > attacker._hitWindow) return; // only in first half of animation
  const cdKey = attacker === gs.p1 ? 'p1' : 'p2';
  if (hitCooldown[cdKey] > 0) { hitCooldown[cdKey]--; return; }

  // Attack reach box
  const reach = attacker.state === 'kick' ? 90 : attacker.state === 'super' ? 130 : 70;
  const ax = attacker.facing === 'right' ? attacker.x + PLAYER_W : attacker.x - reach + PLAYER_W;
  const aRight = ax + reach;
  const aLeft = ax;

  const dx = (defender.x + PLAYER_W / 2) - (attacker.x + PLAYER_W / 2);
  const inRange = Math.abs(dx) < (PLAYER_W / 2 + reach * 0.7);
  const facing = (attacker.facing === 'right' && dx > 0) || (attacker.facing === 'left' && dx < 0);

  if (!inRange || !facing) return;

  // Blocked?
  if (defender.state === 'block') {
    const blockDmg = attacker.state === 'super' ? 8 : 2;
    applyDamage(defender, blockDmg);
    spawnEffect(defender.x + PLAYER_W / 2, defender.y - PLAYER_H * 0.5, '#4488ff', 'BLOCK!', 'shield');
    hitCooldown[cdKey] = FPS * 0.5;
    return;
  }

  let dmg = 0;
  if (attacker.state === 'punch') dmg = attacker.char.punchDamage;
  else if (attacker.state === 'kick') dmg = attacker.char.kickDamage;
  else if (attacker.state === 'super') dmg = attacker.char.superDamage;

  applyDamage(defender, dmg);
  attacker.superMeter = Math.min(100, attacker.superMeter + 12);

  // Knockback
  defender.vx = attacker.facing === 'right' ? 6 : -6;
  defender.state = 'hurt';
  defender.stateTimer = FPS * 0.4;
  defender.hitFlash = FPS * 0.3;

  const label = attacker.state === 'super' ? attacker.char.superName + '!' : attacker.state === 'punch' ? 'PUNCH!' : 'KICK!';
  const color = attacker.state === 'super' ? attacker.char.superColor : '#f7c948';
  spawnEffect(defender.x + PLAYER_W / 2, defender.y - PLAYER_H * 0.6, color, label, 'hit');

  hitCooldown[cdKey] = FPS * 0.6;

  // Send to server
  sendGameState();

  if (defender.hp <= 0) {
    endRound('ko');
  }
}

function applyDamage(player, dmg) {
  player.hp = Math.max(0, player.hp - dmg);
}

function spawnEffect(x, y, color, text, type) {
  gs.effects.push({
    x, y, color, text, type,
    life: FPS * 1.2,
    maxLife: FPS * 1.2,
    vx: (Math.random() - 0.5) * 1,
    vy: -1.5,
    size: type === 'hit' ? 30 : 20,
    grow: type === 'hit' ? 1.5 : 0.5,
  });
  if (type === 'hit') {
    for (let i = 0; i < 8; i++) {
      gs.effects.push({
        x, y, color, text: '',
        life: FPS * 0.5, maxLife: FPS * 0.5,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        size: 4 + Math.random() * 6,
        grow: -0.1, type: 'particle'
      });
    }
  }
}

function endRound(reason) {
  if (gs.roundOver) return;
  gs.roundOver = true;
  gameRunning = false;

  let winnerName, winnerIndex;
  if (reason === 'ko') {
    if (gs.p1.hp <= 0) { winnerName = gs.p2.char.name; winnerIndex = 1; }
    else { winnerName = gs.p1.char.name; winnerIndex = 0; }
  } else {
    // timeout — whoever has more HP
    if (gs.p1.hp >= gs.p2.hp) { winnerName = gs.p1.char.name; winnerIndex = 0; }
    else { winnerName = gs.p2.char.name; winnerIndex = 1; }
  }

  const isMyWin = winnerIndex === myIndex;
  const label = reason === 'ko' ? 'K.O.!' : 'TIME!';

  announce(label, 1600, () => {
    setTimeout(() => {
      document.getElementById('result-title').textContent = isMyWin ? '🏆 YOU WIN!' : '💀 YOU LOSE';
      document.getElementById('result-sub').textContent =
        `${winnerName} wins • ${reason === 'ko' ? 'K.O.' : 'Time Out'}`;
      showScreen('result-screen');
    }, 800);
  });
}

function updateHUD() {
  if (!gs) return;
  const p1PctHP = (gs.p1.hp / gs.p1.maxHp) * 100;
  const p2PctHP = (gs.p2.hp / gs.p2.maxHp) * 100;
  document.getElementById('hud-p1-hp').style.width = p1PctHP + '%';
  document.getElementById('hud-p2-hp').style.width = p2PctHP + '%';
  document.getElementById('hud-p1-super').style.width = gs.p1.superMeter + '%';
  document.getElementById('hud-p2-super').style.width = gs.p2.superMeter + '%';
  document.getElementById('hud-p1-name').textContent = gs.p1.char.name;
  document.getElementById('hud-p2-name').textContent = gs.p2.char.name;

  // Super button state
  const myP = me();
  const superBtn = document.getElementById('btn-super');
  superBtn.querySelector('.btn-icon').textContent = myP.char.superIcon;
  superBtn.classList.toggle('on-cooldown', myP.superMeter < 100 || myP.superCooldown > 0);
}

// ── Render ────────────────────────────────────────────────
function render() {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;

  // Scale logical → display
  const scaleX = W / STAGE_W;
  const scaleY = H / STAGE_H;

  ctx.clearRect(0, 0, W, H);

  ctx.save();
  ctx.scale(scaleX, scaleY);

  drawBackground();
  drawPlayers();
  drawEffects();

  ctx.restore();
}

function drawBackground() {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
  sky.addColorStop(0, '#0f0c29');
  sky.addColorStop(0.5, '#302b63');
  sky.addColorStop(1, '#24243e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, STAGE_W, FLOOR_Y);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const stars = [[50,30],[120,80],[200,20],[300,60],[450,15],[550,45],[650,70],[730,25],[780,55]];
  stars.forEach(([sx, sy]) => {
    ctx.beginPath();
    ctx.arc((sx + gs.bgScroll * 0.1) % STAGE_W, sy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // City silhouette
  ctx.fillStyle = '#0d0d1f';
  const buildings = [
    [0, 80, 60, 220], [70, 120, 50, 180], [130, 70, 80, 230],
    [220, 100, 60, 200], [290, 50, 100, 250], [400, 90, 70, 210],
    [480, 130, 50, 170], [540, 60, 90, 240], [640, 110, 60, 190],
    [710, 80, 50, 220], [770, 100, 40, 200],
  ];
  buildings.forEach(([bx, by, bw, bh]) => {
    ctx.fillRect(bx, by, bw, FLOOR_Y - by);
    // Windows
    ctx.fillStyle = 'rgba(255,220,100,0.3)';
    for (let wy = by + 10; wy < FLOOR_Y - 20; wy += 16) {
      for (let wx = bx + 6; wx < bx + bw - 6; wx += 12) {
        if (Math.random() > 0.3) ctx.fillRect(wx, wy, 6, 8);
      }
    }
    ctx.fillStyle = '#0d0d1f';
  });

  // Floor
  const floorGrad = ctx.createLinearGradient(0, FLOOR_Y, 0, STAGE_H);
  floorGrad.addColorStop(0, '#1a1a2e');
  floorGrad.addColorStop(1, '#0a0a14');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, FLOOR_Y, STAGE_W, STAGE_H - FLOOR_Y);

  // Floor line glow
  ctx.strokeStyle = 'rgba(247,201,72,0.4)';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#f7c948';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, FLOOR_Y);
  ctx.lineTo(STAGE_W, FLOOR_Y);
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawPlayers() {
  [gs.p1, gs.p2].forEach(p => {
    const px = Math.round(p.x);
    const py = Math.round(p.y - PLAYER_H);

    // Hit flash
    if (p.hitFlash > 0 && Math.floor(p.hitFlash * 3) % 2 === 0) {
      ctx.globalAlpha = 0.4;
    }

    // Shadow on floor
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(px + PLAYER_W / 2, p.y + 4, PLAYER_W * 0.4, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw character sprite
    p.char.drawBody(ctx, px, py, PLAYER_W, PLAYER_H, p.facing, p.state, p.frame);

    // Duck indicator
    if (p.state === 'duck') {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = '#4488ff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DUCK', px + PLAYER_W / 2, py - 4);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
  });
}

function drawEffects() {
  gs.effects.forEach(e => {
    const alpha = Math.max(0, e.life / e.maxLife);
    ctx.globalAlpha = alpha;

    if (e.type === 'particle') {
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, Math.max(0, e.size), 0, Math.PI * 2);
      ctx.fill();
    } else if (e.text) {
      ctx.font = `bold ${Math.round(e.size)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = e.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = e.color;
      ctx.fillText(e.text, e.x, e.y);
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  });
}

// ── Announce ─────────────────────────────────────────────
function announce(text, duration = 1200, cb) {
  const el = document.getElementById('announce-text');
  el.textContent = text;
  el.classList.add('visible');
  setTimeout(() => {
    el.classList.remove('visible');
    if (cb) setTimeout(cb, 300);
  }, duration);
}

// ══════════════════════════════════════════════════════════
//  JOYSTICK CONTROLS
// ══════════════════════════════════════════════════════════

const joystickState = { dx: 0, dy: 0, active: false, startX: 0, startY: 0 };
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const joystickArea = document.getElementById('joystick-area');
const MAX_KNOB_DIST = 38;

function getJoystickPos(e) {
  const rect = joystickBase.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const touch = e.touches ? e.touches[0] : e;
  return { x: touch.clientX - cx, y: touch.clientY - cy };
}

function joystickStart(e) {
  e.preventDefault();
  joystickState.active = true;
  joystickMove(e);
}
function joystickMove(e) {
  if (!joystickState.active) return;
  e.preventDefault();
  const { x, y } = getJoystickPos(e);
  const dist = Math.sqrt(x * x + y * y);
  const clamp = Math.min(dist, MAX_KNOB_DIST);
  const nx = dist > 0 ? (x / dist) * clamp : 0;
  const ny = dist > 0 ? (y / dist) * clamp : 0;
  joystickKnob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
  joystickState.dx = dist > 8 ? x / dist : 0;
  joystickState.dy = dist > 8 ? y / dist : 0;
}
function joystickEnd(e) {
  joystickState.active = false;
  joystickState.dx = 0;
  joystickState.dy = 0;
  joystickKnob.style.transform = 'translate(-50%, -50%)';
}

joystickBase.addEventListener('touchstart', joystickStart, { passive: false });
joystickBase.addEventListener('touchmove', joystickMove, { passive: false });
joystickBase.addEventListener('touchend', joystickEnd);
joystickBase.addEventListener('mousedown', joystickStart);
window.addEventListener('mousemove', (e) => { if (joystickState.active) joystickMove(e); });
window.addEventListener('mouseup', joystickEnd);

function applyJoystickToPlayer(player, dt) {
  if (!joystickState.active) {
    player.vx *= 0.7; // friction
    return;
  }
  const { dx, dy } = joystickState;

  // Left / Right
  if (Math.abs(dx) > 0.3) {
    player.vx = dx * player.char.speed * 1.5;
  } else {
    player.vx *= 0.7;
  }

  // Up = jump
  if (dy < -0.5 && player.onGround && player.state !== 'duck') {
    player.vy = -14;
    player.onGround = false;
    player.state = 'jump';
    sendInput('jump');
  }

  // Down = duck
  if (dy > 0.5 && player.onGround) {
    if (player.state !== 'duck') {
      player.state = 'duck';
      sendInput('duck');
    }
  } else if (player.state === 'duck') {
    player.state = 'idle';
  }
}

// ── Action Buttons ───────────────────────────────────────
const attackCooldowns = { punch: 0, kick: 0, super: 0 };

function actionPress(action) {
  if (!gameRunning || !gs) return;
  const p = me();
  if (p.state === 'hurt') return;

  if (action === 'punch' && attackCooldowns.punch <= 0) {
    p.state = 'punch';
    p._hitWindow = FPS * 0.25;
    p.stateTimer = FPS * 0.45;
    attackCooldowns.punch = FPS * 0.55;
    sendInput('punch');
  } else if (action === 'kick' && attackCooldowns.kick <= 0) {
    p.state = 'kick';
    p._hitWindow = FPS * 0.3;
    p.stateTimer = FPS * 0.55;
    attackCooldowns.kick = FPS * 0.65;
    sendInput('kick');
  } else if (action === 'super' && p.superMeter >= 100 && p.superCooldown <= 0) {
    p.state = 'super';
    p._hitWindow = FPS * 0.4;
    p.stateTimer = FPS * 0.7;
    p.superMeter = 0;
    p.superCooldown = FPS * 3;
    attackCooldowns.super = FPS * 0.8;
    spawnSuperEffect(p);
    sendInput('super');
  } else if (action === 'block') {
    p.state = 'block';
    sendInput('block');
  }
}

function actionRelease(action) {
  if (!gameRunning || !gs) return;
  const p = me();
  if (action === 'block' && p.state === 'block') {
    p.state = 'idle';
    sendInput('unblock');
  }
}

// Tick attack cooldowns
setInterval(() => {
  Object.keys(attackCooldowns).forEach(k => {
    if (attackCooldowns[k] > 0) attackCooldowns[k]--;
  });
}, 1000 / FPS);

function spawnSuperEffect(player) {
  const cx = player.x + PLAYER_W / 2;
  const cy = player.y - PLAYER_H / 2;
  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    gs.effects.push({
      x: cx, y: cy,
      color: player.char.superColor,
      text: '', type: 'particle',
      life: FPS * 0.8, maxLife: FPS * 0.8,
      vx: Math.cos(angle) * (3 + Math.random() * 4),
      vy: Math.sin(angle) * (3 + Math.random() * 4),
      size: 6 + Math.random() * 8, grow: -0.1,
    });
  }
  gs.effects.push({
    x: cx, y: cy - 20,
    color: player.char.superColor,
    text: player.char.superName.toUpperCase() + '!',
    type: 'super_text',
    life: FPS * 1.5, maxLife: FPS * 1.5,
    vx: 0, vy: -0.8,
    size: 22, grow: 0.3,
  });
}

// ── Multiplayer sync ─────────────────────────────────────
function sendInput(action) {
  socket.emit('game_input', { action, x: me().x, y: me().y, vx: me().vx, vy: me().vy });
}

function sendGameState() {
  if (!gs) return;
  socket.emit('game_state_update', {
    p1hp: gs.p1.hp, p2hp: gs.p2.hp,
    p1super: gs.p1.superMeter, p2super: gs.p2.superMeter,
  });
}

socket.on('opponent_input', ({ action, x, y, vx, vy, playerIndex }) => {
  if (!gs || !gameRunning) return;
  const p = playerIndex === 0 ? gs.p1 : gs.p2;
  if (playerIndex === myIndex) return; // ignore our own echoes

  // Sync position
  p.x = x; p.y = y; p.vx = vx; p.vy = vy;

  if (action === 'punch') {
    p.state = 'punch'; p._hitWindow = FPS * 0.25; p.stateTimer = FPS * 0.45;
  } else if (action === 'kick') {
    p.state = 'kick'; p._hitWindow = FPS * 0.3; p.stateTimer = FPS * 0.55;
  } else if (action === 'super') {
    p.state = 'super'; p._hitWindow = FPS * 0.4; p.stateTimer = FPS * 0.7;
    p.superMeter = 0; p.superCooldown = FPS * 3;
    spawnSuperEffect(p);
  } else if (action === 'jump') {
    p.vy = -14; p.onGround = false; p.state = 'jump';
  } else if (action === 'duck') {
    p.state = 'duck';
  } else if (action === 'block') {
    p.state = 'block';
  } else if (action === 'unblock') {
    if (p.state === 'block') p.state = 'idle';
  }
});

socket.on('game_state_sync', ({ p1hp, p2hp, p1super, p2super }) => {
  if (!gs) return;
  // Authoritative HP from whoever computed the hit
  gs.p1.hp = Math.min(gs.p1.hp, p1hp);
  gs.p2.hp = Math.min(gs.p2.hp, p2hp);
  gs.p1.superMeter = Math.max(gs.p1.superMeter, p1super);
  gs.p2.superMeter = Math.max(gs.p2.superMeter, p2super);
  if (gs.p1.hp <= 0 || gs.p2.hp <= 0) endRound('ko');
});

// Opponent movement sync (periodic)
setInterval(() => {
  if (!gameRunning || !gs) return;
  const p = me();
  socket.emit('game_input', { action: 'move', x: p.x, y: p.y, vx: p.vx, vy: p.vy });
}, 50);

socket.on('player_disconnected', () => {
  if (gameRunning) {
    gameRunning = false;
    announce('OPPONENT DISCONNECTED', 2000, () => goToLobby());
  }
});

// ── Rematch / Lobby ──────────────────────────────────────
function requestRematch() {
  myChar = null;
  oppChar = null;
  socket.emit('rematch_request');
}

socket.on('rematch_vote', ({ votes }) => {
  document.getElementById('result-sub').textContent =
    votes === 1 ? 'Waiting for opponent to agree…' : 'Starting rematch!';
});

socket.on('rematch_start', () => {
  showCharSelect();
});

function goToLobby() {
  gameRunning = false;
  roomCode = null; myChar = null; oppChar = null; myIndex = null;
  document.getElementById('lobby-main').style.display = 'flex';
  document.getElementById('lobby-waiting').style.display = 'none';
  document.getElementById('lobby-error').style.display = 'none';
  document.getElementById('join-code-input').value = '';
  showScreen('lobby-screen');
}

// ── Keyboard (desktop) ────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  if (keys[e.code]) return;
  keys[e.code] = true;
  if (!gameRunning) return;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') { joystickState.dx = -1; joystickState.active = true; }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') { joystickState.dx = 1; joystickState.active = true; }
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') { joystickState.dy = -1; joystickState.active = true; }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') { joystickState.dy = 1; joystickState.active = true; }
  if (e.code === 'KeyJ') actionPress('punch');
  if (e.code === 'KeyK') actionPress('kick');
  if (e.code === 'KeyL') actionPress('super');
  if (e.code === 'ShiftLeft') actionPress('block');
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA' || e.code === 'ArrowRight' || e.code === 'KeyD') {
    if (!keys['ArrowLeft'] && !keys['KeyA'] && !keys['ArrowRight'] && !keys['KeyD']) {
      joystickState.dx = 0;
    }
    if (!keys['ArrowLeft'] && !keys['KeyA'] && !keys['ArrowRight'] && !keys['KeyD'] &&
        !keys['ArrowUp'] && !keys['KeyW'] && !keys['Space'] && !keys['ArrowDown'] && !keys['KeyS']) {
      joystickState.active = false;
    }
  }
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space' || e.code === 'ArrowDown' || e.code === 'KeyS') {
    joystickState.dy = 0;
    if (!keys['ArrowLeft'] && !keys['KeyA'] && !keys['ArrowRight'] && !keys['KeyD'] &&
        !keys['ArrowUp'] && !keys['KeyW'] && !keys['Space'] && !keys['ArrowDown'] && !keys['KeyS']) {
      joystickState.active = false;
    }
  }
  if (e.code === 'ShiftLeft') actionRelease('block');
});
