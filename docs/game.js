// ═══════════════════════════════════════════════════════
//  BATTLE ARENA — PeerJS P2P multiplayer game controller
// ═══════════════════════════════════════════════════════

// ── PeerJS state ────────────────────────────────────────
let peer = null;
let conn = null;
let myIndex = null;   // 0 = host, 1 = guest
let myChar = null;
let oppChar = null;
let gameRunning = false;

let charSelectionsReceived = {};  // track both players' picks

// ── Screens ─────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function showError(msg) {
  const el = document.getElementById('lobby-error');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => (el.style.display = 'none'), 4000);
}

// ── Init PeerJS ──────────────────────────────────────────
function initPeer(id) {
  return new Promise((resolve, reject) => {
    const p = id
      ? new Peer(id, { debug: 0 })
      : new Peer({ debug: 0 });

    p.on('open', (assignedId) => resolve({ peer: p, id: assignedId }));
    p.on('error', (err) => reject(err));
  });
}

// ── Create Room (host) ───────────────────────────────────
async function createRoom() {
  const btn = document.querySelector('.btn-primary');
  try {
    btn.textContent = 'Connecting…';
    btn.disabled = true;

    // Use a short random code as the actual peer ID so guest can connect directly
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const result = await initPeer(code);
    peer = result.peer;
    myIndex = 0;

    document.getElementById('lobby-main').style.display = 'none';
    document.getElementById('lobby-waiting').style.display = 'flex';
    document.getElementById('room-code-text').textContent = code;

    peer.on('connection', (c) => {
      conn = c;
      setupConnection();
      send({ type: 'welcome', playerIndex: 1 });
      setTimeout(() => {
        send({ type: 'go_charselect' });
        showCharSelect();
      }, 300);
    });
  } catch (e) {
    showError('Connection error. Try again.');
  } finally {
    btn.textContent = '⚔️  CREATE ROOM';
    btn.disabled = false;
  }
}

// ── Join Room (guest) ────────────────────────────────────
async function joinRoom() {
  const codeInput = document.getElementById('join-code-input').value.trim().toUpperCase();
  if (!codeInput || codeInput.length < 4) { showError('Enter the room code'); return; }

  const joinBtn = document.querySelector('.btn-secondary');
  const input = document.getElementById('join-code-input');
  joinBtn.textContent = '…'; joinBtn.disabled = true; input.disabled = true;

  try {
    const result = await initPeer();
    peer = result.peer;
    myIndex = 1;

    // Host's peer ID is the room code (lowercase, as PeerJS IDs are lowercase)
    conn = peer.connect(codeInput.toLowerCase(), { reliable: true });
    setupConnection();

    conn.on('error', () => showError('Room not found. Check the code.'));
  } catch (e) {
    showError('Connection error. Try again.');
  } finally {
    joinBtn.textContent = 'JOIN'; joinBtn.disabled = false; input.disabled = false;
  }
}

// ── Connection setup ─────────────────────────────────────
function setupConnection() {
  conn.on('open', () => {
    console.log('Connection established');
  });

  conn.on('data', (data) => {
    handleMessage(data);
  });

  conn.on('close', () => {
    if (gameRunning) {
      gameRunning = false;
      announce('OPPONENT DISCONNECTED', 2000, () => goToLobby());
    }
  });

  conn.on('error', (err) => {
    console.error('Connection error:', err);
  });
}

function send(data) {
  if (conn && conn.open) {
    conn.send(data);
  }
}

// ── Message handler ──────────────────────────────────────
function handleMessage(data) {
  switch (data.type) {
    case 'welcome':
      myIndex = data.playerIndex;
      break;

    case 'go_charselect':
      showCharSelect();
      break;

    case 'character_selected':
      oppChar = data.characterId;
      charSelectionsReceived[data.playerIndex] = data.characterId;
      // Mark opponent's card
      const card = document.getElementById(`char-card-${data.characterId}`);
      if (card && !card.querySelector('.tag-opp')) {
        card.classList.add('opponent-selected');
        const tag = document.createElement('div');
        tag.className = 'player-tag tag-opp';
        tag.textContent = 'OPP';
        card.appendChild(tag);
      }
      tryStartGame();
      break;

    case 'game_input':
      applyOpponentInput(data);
      break;

    case 'game_state_sync':
      applyStateSync(data);
      break;

    case 'rematch_accept':
      resetForRematch();
      showCharSelect();
      break;
  }
}

// ── Character Select ─────────────────────────────────────
function showCharSelect() {
  charSelectionsReceived = {};
  myChar = null;
  oppChar = null;
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
  if (myChar) return;
  myChar = charId;
  charSelectionsReceived[myIndex] = charId;
  document.querySelectorAll('.char-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById(`char-card-${charId}`);
  card.classList.add('selected');
  if (!card.querySelector('.tag-you')) {
    const tag = document.createElement('div');
    tag.className = 'player-tag tag-you';
    tag.textContent = 'YOU';
    card.appendChild(tag);
  }
  document.getElementById('cs-waiting').style.display = 'block';
  send({ type: 'character_selected', characterId: charId, playerIndex: myIndex });
  tryStartGame();
}

function tryStartGame() {
  if (charSelectionsReceived[0] && charSelectionsReceived[1]) {
    startGame(charSelectionsReceived[0], charSelectionsReceived[1]);
  }
}

// ── Rematch ──────────────────────────────────────────────
function requestRematch() {
  send({ type: 'rematch_accept' });
  resetForRematch();
  showCharSelect();
}

function resetForRematch() {
  charSelectionsReceived = {};
  myChar = null;
  oppChar = null;
}

function goToLobby() {
  gameRunning = false;
  if (conn) { conn.close(); conn = null; }
  if (peer) { peer.destroy(); peer = null; }
  myIndex = null; myChar = null; oppChar = null;
  charSelectionsReceived = {};
  document.getElementById('lobby-main').style.display = 'flex';
  document.getElementById('lobby-waiting').style.display = 'none';
  document.getElementById('lobby-error').style.display = 'none';
  document.getElementById('join-code-input').value = '';
  showScreen('lobby-screen');
}


// ═══════════════════════════════════════════════════════
//  GAME ENGINE
// ═══════════════════════════════════════════════════════

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const FPS = 60;
let animId = null;
let lastTime = 0;

const STAGE_W = 800;
const STAGE_H = 450;
const FLOOR_Y = STAGE_H - 90;
const PLAYER_W = 72;
const PLAYER_H = 110;

let gs = null;

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
  ctx.setTransform(1, 0, 0, 1, 0, 0);
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
      state: 'idle',
      stateTimer: 0,
      superCooldown: 0,
      frame: 0,
      onGround: true,
      hitFlash: 0,
      _hitWindow: 0,
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
      frame: 0,
      onGround: true,
      hitFlash: 0,
      _hitWindow: 0,
    },
    timer: 99,
    timerCounter: 0,
    effects: [],
    roundOver: false,
    bgScroll: 0,
  };

  updateHUD();
  announce('FIGHT!', 1400);
}

function me()  { return myIndex === 0 ? gs.p1 : gs.p2; }
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

// ── Update ────────────────────────────────────────────────
function update(dt) {
  if (gs.roundOver) return;

  applyJoystickToPlayer(me(), dt);

  [gs.p1, gs.p2].forEach(p => {
    if (!p.onGround) p.vy += 0.7 * dt;
    p.y += p.vy * dt;
    p.x += p.vx * dt;

    if (p.y >= FLOOR_Y) {
      p.y = FLOOR_Y; p.vy = 0; p.onGround = true;
      if (p.state === 'jump') p.state = 'idle';
    }
    p.x = Math.max(0, Math.min(STAGE_W - PLAYER_W, p.x));

    const other = p === gs.p1 ? gs.p2 : gs.p1;
    p.facing = p.x < other.x ? 'right' : 'left';

    if (p.stateTimer > 0) {
      p.stateTimer -= dt;
      if (p.stateTimer <= 0) {
        p.stateTimer = 0;
        if (['punch', 'kick', 'super', 'hurt'].includes(p.state)) {
          p.state = 'idle'; p.vx = 0;
        }
      }
    }
    if (p.superCooldown > 0) p.superCooldown -= dt;
    if (p.hitFlash > 0) p.hitFlash -= dt;
    p.frame += dt;

    if (p.state === 'idle' && Math.abs(p.vx) > 0.5) p.state = 'walk';
    if (p.state === 'walk' && Math.abs(p.vx) < 0.5) p.state = 'idle';
  });

  checkHits(gs.p1, gs.p2);
  checkHits(gs.p2, gs.p1);

  gs.effects = gs.effects.filter(e => {
    e.life -= dt; e.x += e.vx * dt; e.y += e.vy * dt; e.size += e.grow * dt;
    return e.life > 0;
  });

  gs.timerCounter += dt;
  if (gs.timerCounter >= FPS) {
    gs.timerCounter = 0;
    gs.timer--;
    document.getElementById('hud-timer').textContent = gs.timer;
    if (gs.timer <= 0) endRound('timeout');
  }

  gs.bgScroll += 0.3 * dt;
  updateHUD();
}

const hitCooldown = { p1: 0, p2: 0 };

function checkHits(attacker, defender) {
  if (!['punch', 'kick', 'super'].includes(attacker.state)) return;
  if (attacker.stateTimer > attacker._hitWindow) return;
  const cdKey = attacker === gs.p1 ? 'p1' : 'p2';
  if (hitCooldown[cdKey] > 0) { hitCooldown[cdKey]--; return; }

  const reach = attacker.state === 'kick' ? 90 : attacker.state === 'super' ? 130 : 70;
  const dx = (defender.x + PLAYER_W / 2) - (attacker.x + PLAYER_W / 2);
  const inRange = Math.abs(dx) < (PLAYER_W / 2 + reach * 0.7);
  const facing = (attacker.facing === 'right' && dx > 0) || (attacker.facing === 'left' && dx < 0);
  if (!inRange || !facing) return;

  if (defender.state === 'block') {
    applyDamage(defender, attacker.state === 'super' ? 8 : 2);
    spawnEffect(defender.x + PLAYER_W / 2, defender.y - PLAYER_H * 0.5, '#4488ff', 'BLOCK!', 'shield');
    hitCooldown[cdKey] = FPS * 0.5;
    sendStateSync();
    return;
  }

  let dmg = 0;
  if (attacker.state === 'punch') dmg = attacker.char.punchDamage;
  else if (attacker.state === 'kick') dmg = attacker.char.kickDamage;
  else if (attacker.state === 'super') dmg = attacker.char.superDamage;

  applyDamage(defender, dmg);
  attacker.superMeter = Math.min(100, attacker.superMeter + 12);
  defender.vx = attacker.facing === 'right' ? 6 : -6;
  defender.state = 'hurt';
  defender.stateTimer = FPS * 0.4;
  defender.hitFlash = FPS * 0.3;

  const label = attacker.state === 'super'
    ? attacker.char.superName + '!'
    : attacker.state === 'punch' ? 'PUNCH!' : 'KICK!';
  spawnEffect(defender.x + PLAYER_W / 2, defender.y - PLAYER_H * 0.6, attacker.state === 'super' ? attacker.char.superColor : '#f7c948', label, 'hit');
  hitCooldown[cdKey] = FPS * 0.6;

  sendStateSync();
  if (defender.hp <= 0) endRound('ko');
}

function applyDamage(player, dmg) {
  player.hp = Math.max(0, player.hp - dmg);
}

function spawnEffect(x, y, color, text, type) {
  gs.effects.push({ x, y, color, text, type, life: FPS * 1.2, maxLife: FPS * 1.2, vx: (Math.random()-0.5), vy: -1.5, size: type === 'hit' ? 30 : 20, grow: type === 'hit' ? 1.5 : 0.5 });
  if (type === 'hit') {
    for (let i = 0; i < 8; i++) {
      gs.effects.push({ x, y, color, text: '', life: FPS*0.5, maxLife: FPS*0.5, vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, size: 4+Math.random()*6, grow: -0.1, type: 'particle' });
    }
  }
}

function endRound(reason) {
  if (gs.roundOver) return;
  gs.roundOver = true;
  gameRunning = false;

  let winnerIndex;
  if (reason === 'ko') winnerIndex = gs.p1.hp <= 0 ? 1 : 0;
  else winnerIndex = gs.p1.hp >= gs.p2.hp ? 0 : 1;

  const isMyWin = winnerIndex === myIndex;
  announce(reason === 'ko' ? 'K.O.!' : 'TIME!', 1600, () => {
    setTimeout(() => {
      const winner = winnerIndex === 0 ? gs.p1.char.name : gs.p2.char.name;
      document.getElementById('result-title').textContent = isMyWin ? '🏆 YOU WIN!' : '💀 YOU LOSE';
      document.getElementById('result-sub').textContent = `${winner} wins · ${reason === 'ko' ? 'K.O.' : 'Time Out'}`;
      showScreen('result-screen');
    }, 800);
  });
}

function updateHUD() {
  if (!gs) return;
  document.getElementById('hud-p1-hp').style.width = (gs.p1.hp / gs.p1.maxHp * 100) + '%';
  document.getElementById('hud-p2-hp').style.width = (gs.p2.hp / gs.p2.maxHp * 100) + '%';
  document.getElementById('hud-p1-super').style.width = gs.p1.superMeter + '%';
  document.getElementById('hud-p2-super').style.width = gs.p2.superMeter + '%';
  document.getElementById('hud-p1-name').textContent = gs.p1.char.name;
  document.getElementById('hud-p2-name').textContent = gs.p2.char.name;
  const myP = me();
  const superBtn = document.getElementById('btn-super');
  superBtn.querySelector('.btn-icon').textContent = myP.char.superIcon;
  superBtn.classList.toggle('on-cooldown', myP.superMeter < 100 || myP.superCooldown > 0);
}

// ── Render ────────────────────────────────────────────────
function render() {
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
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
  const sky = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
  sky.addColorStop(0, '#0f0c29');
  sky.addColorStop(0.5, '#302b63');
  sky.addColorStop(1, '#24243e');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, STAGE_W, FLOOR_Y);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  [[50,30],[120,80],[200,20],[300,60],[450,15],[550,45],[650,70],[730,25],[780,55]].forEach(([sx,sy]) => {
    ctx.beginPath();
    ctx.arc((sx + gs.bgScroll * 0.1) % STAGE_W, sy, 1.5, 0, Math.PI*2);
    ctx.fill();
  });

  ctx.fillStyle = '#0d0d1f';
  [[0,80,60],[70,120,50],[130,70,80],[220,100,60],[290,50,100],[400,90,70],[480,130,50],[540,60,90],[640,110,60],[710,80,50],[770,100,40]]
    .forEach(([bx, by, bw]) => {
      ctx.fillStyle = '#0d0d1f';
      ctx.fillRect(bx, by, bw, FLOOR_Y - by);
      ctx.fillStyle = 'rgba(255,220,100,0.25)';
      for (let wy = by+10; wy < FLOOR_Y-20; wy+=16) {
        for (let wx = bx+6; wx < bx+bw-6; wx+=12) {
          if (Math.random() > 0.3) ctx.fillRect(wx, wy, 6, 8);
        }
      }
    });

  const floorGrad = ctx.createLinearGradient(0, FLOOR_Y, 0, STAGE_H);
  floorGrad.addColorStop(0, '#1a1a2e');
  floorGrad.addColorStop(1, '#0a0a14');
  ctx.fillStyle = floorGrad;
  ctx.fillRect(0, FLOOR_Y, STAGE_W, STAGE_H - FLOOR_Y);

  ctx.strokeStyle = 'rgba(247,201,72,0.4)';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#f7c948'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(0, FLOOR_Y); ctx.lineTo(STAGE_W, FLOOR_Y); ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawPlayers() {
  [gs.p1, gs.p2].forEach(p => {
    const px = Math.round(p.x);
    const py = Math.round(p.y - PLAYER_H);
    if (p.hitFlash > 0 && Math.floor(p.hitFlash * 3) % 2 === 0) ctx.globalAlpha = 0.4;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(px + PLAYER_W/2, p.y + 4, PLAYER_W*0.4, 8, 0, 0, Math.PI*2); ctx.fill();
    p.char.drawBody(ctx, px, py, PLAYER_W, PLAYER_H, p.facing, p.state, p.frame);
    ctx.globalAlpha = 1;
  });
}

function drawEffects() {
  gs.effects.forEach(e => {
    ctx.globalAlpha = Math.max(0, e.life / e.maxLife);
    if (e.type === 'particle') {
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(e.x, e.y, Math.max(0, e.size), 0, Math.PI*2); ctx.fill();
    } else if (e.text) {
      ctx.font = `bold ${Math.round(e.size)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = e.color; ctx.shadowBlur = 12;
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
  setTimeout(() => { el.classList.remove('visible'); if (cb) setTimeout(cb, 300); }, duration);
}

// ══════════════════════════════════════════════════════════
//  JOYSTICK
// ══════════════════════════════════════════════════════════

const joystickState = { dx: 0, dy: 0, active: false };
const joystickBase = document.getElementById('joystick-base');
const joystickKnob = document.getElementById('joystick-knob');
const MAX_KNOB_DIST = 38;

function getJoystickPos(e) {
  const rect = joystickBase.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const touch = e.touches ? e.touches[0] : e;
  return { x: touch.clientX - cx, y: touch.clientY - cy };
}

function joystickStart(e) { e.preventDefault(); joystickState.active = true; joystickMove(e); }
function joystickMove(e) {
  if (!joystickState.active) return;
  e.preventDefault();
  const { x, y } = getJoystickPos(e);
  const dist = Math.sqrt(x*x + y*y);
  const clamp = Math.min(dist, MAX_KNOB_DIST);
  const nx = dist > 0 ? (x/dist)*clamp : 0;
  const ny = dist > 0 ? (y/dist)*clamp : 0;
  joystickKnob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
  joystickState.dx = dist > 8 ? x/dist : 0;
  joystickState.dy = dist > 8 ? y/dist : 0;
}
function joystickEnd() {
  joystickState.active = false; joystickState.dx = 0; joystickState.dy = 0;
  joystickKnob.style.transform = 'translate(-50%, -50%)';
}

joystickBase.addEventListener('touchstart', joystickStart, { passive: false });
joystickBase.addEventListener('touchmove', joystickMove, { passive: false });
joystickBase.addEventListener('touchend', joystickEnd);
joystickBase.addEventListener('mousedown', joystickStart);
window.addEventListener('mousemove', (e) => { if (joystickState.active) joystickMove(e); });
window.addEventListener('mouseup', joystickEnd);

function applyJoystickToPlayer(player, dt) {
  if (!joystickState.active) { player.vx *= 0.7; return; }
  const { dx, dy } = joystickState;
  if (Math.abs(dx) > 0.3) player.vx = dx * player.char.speed * 1.5;
  else player.vx *= 0.7;

  if (dy < -0.5 && player.onGround && player.state !== 'duck') {
    player.vy = -14; player.onGround = false; player.state = 'jump';
    sendInput('jump');
  }
  if (dy > 0.5 && player.onGround) {
    if (player.state !== 'duck') { player.state = 'duck'; sendInput('duck'); }
  } else if (player.state === 'duck') {
    player.state = 'idle';
  }
}

// ── Action buttons ────────────────────────────────────────
const attackCooldowns = { punch: 0, kick: 0, super: 0 };

function actionPress(action) {
  if (!gameRunning || !gs) return;
  const p = me();
  if (p.state === 'hurt') return;

  if (action === 'punch' && attackCooldowns.punch <= 0) {
    p.state = 'punch'; p._hitWindow = FPS*0.25; p.stateTimer = FPS*0.45;
    attackCooldowns.punch = FPS*0.55;
    sendInput('punch');
  } else if (action === 'kick' && attackCooldowns.kick <= 0) {
    p.state = 'kick'; p._hitWindow = FPS*0.3; p.stateTimer = FPS*0.55;
    attackCooldowns.kick = FPS*0.65;
    sendInput('kick');
  } else if (action === 'super' && p.superMeter >= 100 && p.superCooldown <= 0) {
    p.state = 'super'; p._hitWindow = FPS*0.4; p.stateTimer = FPS*0.7;
    p.superMeter = 0; p.superCooldown = FPS*3;
    attackCooldowns.super = FPS*0.8;
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
    p.state = 'idle'; sendInput('unblock');
  }
}

setInterval(() => {
  Object.keys(attackCooldowns).forEach(k => { if (attackCooldowns[k] > 0) attackCooldowns[k]--; });
}, 1000 / FPS);

function spawnSuperEffect(player) {
  const cx = player.x + PLAYER_W/2, cy = player.y - PLAYER_H/2;
  for (let i = 0; i < 20; i++) {
    const angle = (i/20)*Math.PI*2;
    gs.effects.push({ x:cx, y:cy, color:player.char.superColor, text:'', type:'particle', life:FPS*0.8, maxLife:FPS*0.8, vx:Math.cos(angle)*(3+Math.random()*4), vy:Math.sin(angle)*(3+Math.random()*4), size:6+Math.random()*8, grow:-0.1 });
  }
  gs.effects.push({ x:cx, y:cy-20, color:player.char.superColor, text:player.char.superName.toUpperCase()+'!', type:'super_text', life:FPS*1.5, maxLife:FPS*1.5, vx:0, vy:-0.8, size:22, grow:0.3 });
}

// ── P2P networking ────────────────────────────────────────
// Periodic position sync
setInterval(() => {
  if (!gameRunning || !gs) return;
  const p = me();
  send({ type: 'game_input', action: 'move', x: p.x, y: p.y, vx: p.vx, vy: p.vy, playerIndex: myIndex });
}, 50);

function sendInput(action) {
  const p = me();
  send({ type: 'game_input', action, x: p.x, y: p.y, vx: p.vx, vy: p.vy, playerIndex: myIndex });
}

function sendStateSync() {
  send({ type: 'game_state_sync', p1hp: gs.p1.hp, p2hp: gs.p2.hp, p1super: gs.p1.superMeter, p2super: gs.p2.superMeter });
}

function applyOpponentInput({ action, x, y, vx, vy, playerIndex }) {
  if (!gs || !gameRunning) return;
  if (playerIndex === myIndex) return;
  const p = playerIndex === 0 ? gs.p1 : gs.p2;

  // Sync position
  p.x = x; p.y = y; p.vx = vx; p.vy = vy;

  if (action === 'punch')   { p.state = 'punch'; p._hitWindow = FPS*0.25; p.stateTimer = FPS*0.45; }
  else if (action === 'kick')    { p.state = 'kick';  p._hitWindow = FPS*0.3;  p.stateTimer = FPS*0.55; }
  else if (action === 'super')   { p.state = 'super'; p._hitWindow = FPS*0.4;  p.stateTimer = FPS*0.7; p.superMeter = 0; p.superCooldown = FPS*3; spawnSuperEffect(p); }
  else if (action === 'jump')    { p.vy = -14; p.onGround = false; p.state = 'jump'; }
  else if (action === 'duck')    { p.state = 'duck'; }
  else if (action === 'block')   { p.state = 'block'; }
  else if (action === 'unblock') { if (p.state === 'block') p.state = 'idle'; }
}

function applyStateSync({ p1hp, p2hp, p1super, p2super }) {
  if (!gs) return;
  gs.p1.hp = Math.min(gs.p1.hp, p1hp);
  gs.p2.hp = Math.min(gs.p2.hp, p2hp);
  gs.p1.superMeter = Math.max(gs.p1.superMeter, p1super);
  gs.p2.superMeter = Math.max(gs.p2.superMeter, p2super);
  if (gs.p1.hp <= 0 || gs.p2.hp <= 0) endRound('ko');
}

// ── Keyboard (desktop) ────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  if (keys[e.code]) return;
  keys[e.code] = true;
  if (!gameRunning) return;
  if (e.code === 'ArrowLeft'  || e.code === 'KeyA') { joystickState.dx = -1; joystickState.active = true; }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') { joystickState.dx =  1; joystickState.active = true; }
  if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') { joystickState.dy = -1; joystickState.active = true; }
  if (e.code === 'ArrowDown'  || e.code === 'KeyS') { joystickState.dy =  1; joystickState.active = true; }
  if (e.code === 'KeyJ') actionPress('punch');
  if (e.code === 'KeyK') actionPress('kick');
  if (e.code === 'KeyL') actionPress('super');
  if (e.code === 'ShiftLeft') actionPress('block');
});
window.addEventListener('keyup', e => {
  keys[e.code] = false;
  const horzHeld = keys['ArrowLeft']||keys['KeyA']||keys['ArrowRight']||keys['KeyD'];
  const vertHeld = keys['ArrowUp']||keys['KeyW']||keys['Space']||keys['ArrowDown']||keys['KeyS'];
  if (!horzHeld) joystickState.dx = 0;
  if (!vertHeld) joystickState.dy = 0;
  if (!horzHeld && !vertHeld) joystickState.active = false;
  if (e.code === 'ShiftLeft') actionRelease('block');
});
