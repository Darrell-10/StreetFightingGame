// ═══════════════════════════════════════════════════════
//  BATTLE ARENA — Character definitions
// ═══════════════════════════════════════════════════════

const CHARACTERS = {
  ryu: {
    id: 'ryu', name: 'RYUKEN', role: 'Balanced Warrior',
    icon: '🥋', color: '#ff6b35', accentColor: '#fff',
    hp: 100, speed: 5, punchDamage: 10, kickDamage: 14, superDamage: 35,
    superName: 'Hadou Blast', superIcon: '🔥', superColor: '#ff6b35',
    stats: { power: 70, speed: 70, defense: 70, special: 75 },
    drawBody(ctx, x, y, w, h, facing, state, frame) {
      drawCharacter(ctx, x, y, w, h, facing, state, frame, {
        skinColor: '#f5c5a0', bodyColor: '#fff', pantColor: '#fff',
        hairColor: '#1a0a00', beltColor: '#ff6b35', eyeColor: '#222',
        accentColor: '#ff6b35',
      });
    }
  },
  shadow: {
    id: 'shadow', name: 'SHADOWBLADE', role: 'Ninja Assassin',
    icon: '🥷', color: '#6d28d9', accentColor: '#c4b5fd',
    hp: 80, speed: 8, punchDamage: 8, kickDamage: 11, superDamage: 40,
    superName: 'Shadow Strike', superIcon: '⚡', superColor: '#a855f7',
    stats: { power: 60, speed: 95, defense: 50, special: 90 },
    drawBody(ctx, x, y, w, h, facing, state, frame) {
      drawCharacter(ctx, x, y, w, h, facing, state, frame, {
        skinColor: '#1a0a2e', bodyColor: '#1a0a2e', pantColor: '#1a0a2e',
        hairColor: '#1a0a2e', beltColor: '#6d28d9', eyeColor: '#a855f7',
        eyeGlow: '#a855f7', accentColor: '#a855f7',
      });
    }
  },
  titan: {
    id: 'titan', name: 'TITAN', role: 'Iron Juggernaut',
    icon: '🦍', color: '#64748b', accentColor: '#94a3b8',
    hp: 140, speed: 3, punchDamage: 18, kickDamage: 22, superDamage: 55,
    superName: 'Seismic Slam', superIcon: '💥', superColor: '#f59e0b',
    stats: { power: 100, speed: 30, defense: 95, special: 70 },
    drawBody(ctx, x, y, w, h, facing, state, frame) {
      drawCharacter(ctx, x, y, w, h, facing, state, frame, {
        skinColor: '#4b5563', bodyColor: '#64748b', pantColor: '#475569',
        hairColor: '#374151', beltColor: '#f59e0b', eyeColor: '#f59e0b',
        eyeGlow: '#f59e0b', accentColor: '#94a3b8', wide: true,
      });
    }
  },
  ember: {
    id: 'ember', name: 'EMBER', role: 'Fire Sorceress',
    icon: '🔮', color: '#ef4444', accentColor: '#fbbf24',
    hp: 85, speed: 6, punchDamage: 7, kickDamage: 9, superDamage: 60,
    superName: 'Inferno Wave', superIcon: '🌊🔥', superColor: '#ef4444',
    stats: { power: 55, speed: 65, defense: 55, special: 100 },
    drawBody(ctx, x, y, w, h, facing, state, frame) {
      drawCharacter(ctx, x, y, w, h, facing, state, frame, {
        skinColor: '#fde68a', bodyColor: '#7c2d12', pantColor: '#7c2d12',
        hairColor: '#ef4444', beltColor: '#fbbf24', eyeColor: '#1a0000',
        accentColor: '#fbbf24', hairGlow: '#fbbf24',
      });
    }
  },
  storm: {
    id: 'storm', name: 'STORM', role: 'Thunder God',
    icon: '⚡', color: '#0ea5e9', accentColor: '#7dd3fc',
    hp: 95, speed: 6, punchDamage: 12, kickDamage: 16, superDamage: 48,
    superName: 'Thunder Strike', superIcon: '⛈️', superColor: '#0ea5e9',
    stats: { power: 80, speed: 65, defense: 65, special: 85 },
    drawBody(ctx, x, y, w, h, facing, state, frame) {
      drawCharacter(ctx, x, y, w, h, facing, state, frame, {
        skinColor: '#f5c5a0', bodyColor: '#0ea5e9', pantColor: '#1e40af',
        hairColor: '#e2e8f0', beltColor: '#fbbf24', eyeColor: '#222',
        accentColor: '#fbbf24', cape: true,
      });
    }
  }
};

// ══════════════════════════════════════════════════════
//  Shared character renderer — handles all states
// ══════════════════════════════════════════════════════
function drawCharacter(ctx, x, y, w, h, facing, state, frame, opts) {
  const { skinColor, bodyColor, pantColor, hairColor, beltColor,
          eyeColor, eyeGlow, accentColor, hairGlow, cape, wide } = opts;

  const flip = facing === 'left';
  const wm = wide ? 1.18 : 1;  // width multiplier for Titan

  ctx.save();
  if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.translate(-x, -y); }

  const isDuck  = state === 'duck';
  const isJump  = state === 'jump';
  const isPunch = state === 'punch';
  const isKick  = state === 'kick';
  const isHurt  = state === 'hurt';
  const isBlock = state === 'block';
  const isSuper = state === 'super';
  const t = frame; // animation frame counter

  // Duck: compress vertically
  const yOff  = isDuck ? h * 0.3 : 0;
  const hMult = isDuck ? 0.7 : 1;

  // Hurt: lean back
  const hurtLean = isHurt ? 0.12 : 0;

  ctx.save();
  if (hurtLean) {
    ctx.translate(x + w * 0.5, y + h * 0.5);
    ctx.rotate(hurtLean);
    ctx.translate(-(x + w * 0.5), -(y + h * 0.5));
  }

  // ── Cape (Storm) ──
  if (cape && !isDuck) {
    ctx.fillStyle = '#1e40af';
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + h * 0.22 + yOff);
    const capeFlap = Math.sin(t * 0.08) * 8;
    ctx.lineTo(x + w * 0.05 + capeFlap, y + h * 0.85 + yOff);
    ctx.lineTo(x + w * 0.95 - capeFlap, y + h * 0.85 + yOff);
    ctx.closePath();
    ctx.fill();
  }

  // ── Legs ──
  const legW = w * (wide ? 0.24 : 0.19);
  const legH = h * (isDuck ? 0.15 : 0.3) * hMult;
  const legY = y + h * (isDuck ? 0.78 : 0.66) + yOff;
  const walkBob = (state === 'walk') ? Math.sin(t * 0.28) * 7 : 0;

  ctx.fillStyle = pantColor;

  if (isKick) {
    // Left leg grounded
    rr(ctx, x + w * 0.22, legY, legW, legH * 1.1, 4); ctx.fill();
    // Right leg kicks forward-up
    ctx.save();
    ctx.translate(x + w * 0.62, legY - 2);
    ctx.rotate(-0.9);
    rr(ctx, 0, 0, legW, legH * 1.3, 4); ctx.fill();
    ctx.restore();
    // Kick foot (extended)
    ctx.fillStyle = '#111';
    ctx.save();
    ctx.translate(x + w * 0.62, legY - 2);
    ctx.rotate(-0.9);
    rr(ctx, -4, legH * 1.3 - 4, legW + 12, h * 0.08, 3); ctx.fill();
    ctx.restore();
    // Kick motion lines
    ctx.strokeStyle = `rgba(255,220,50,0.55)`;
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const lx = x + w * (0.9 + i * 0.12);
      const ly = legY - 22 - i * 8;
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 18, ly - 6); ctx.stroke();
    }
  } else {
    rr(ctx, x + w * 0.22, legY + walkBob, legW, legH, 4); ctx.fill();
    rr(ctx, x + w * 0.59, legY - walkBob, legW, legH, 4); ctx.fill();
    // Feet
    ctx.fillStyle = '#111';
    rr(ctx, x + w * 0.19, legY + legH + walkBob, legW + 8, h * 0.07, 3); ctx.fill();
    rr(ctx, x + w * 0.56, legY + legH - walkBob, legW + 8, h * 0.07, 3); ctx.fill();
  }

  // ── Torso ──
  const torsoX = x + w * (0.18 * wm > 0.18 ? 0.13 : 0.18);
  const torsoW = w * (wide ? 0.74 : 0.64);
  const torsoY = y + h * 0.23 + yOff;
  const torsoH = h * 0.43 * hMult;

  ctx.fillStyle = bodyColor;
  rr(ctx, torsoX, torsoY, torsoW, torsoH, 5); ctx.fill();

  // Belt / waist accent
  ctx.fillStyle = beltColor;
  rr(ctx, torsoX, torsoY + torsoH * 0.68, torsoW, h * 0.055, 2); ctx.fill();

  // Lightning bolt (Storm)
  if (cape) {
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 6;
    ctx.beginPath();
    const bx = x + w * 0.5, by = torsoY + 4;
    ctx.moveTo(bx + 4, by); ctx.lineTo(bx - 3, by + 12); ctx.lineTo(bx + 1, by + 12);
    ctx.lineTo(bx - 4, by + 24); ctx.lineTo(bx + 6, by + 10); ctx.lineTo(bx + 2, by + 10); ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  // Armor plates (Titan)
  if (wide) {
    ctx.fillStyle = accentColor || '#94a3b8';
    rr(ctx, torsoX + 2, torsoY + 2, torsoW - 4, torsoH * 0.25, 3); ctx.fill();
    rr(ctx, torsoX + 2, torsoY + torsoH * 0.35, torsoW - 4, torsoH * 0.25, 3); ctx.fill();
  }

  // ── Block shield ──
  if (isBlock) {
    ctx.fillStyle = 'rgba(68,136,255,0.35)';
    ctx.strokeStyle = '#4488ff';
    ctx.lineWidth = 2;
    rr(ctx, x - 4, y + h * 0.15 + yOff, w * 0.35, h * 0.65 * hMult, 6);
    ctx.fill(); ctx.stroke();
  }

  // ── Arms ──
  const armW = w * (wide ? 0.22 : 0.16);
  const armH = h * 0.28 * hMult;
  const armY = torsoY + 4;

  ctx.fillStyle = skinColor;

  if (isPunch || isSuper) {
    // Back arm
    rr(ctx, x + w * 0.06, armY + 4, armW, armH * 0.7, 4); ctx.fill();
    // Front arm fully extended
    const punchReach = isPunch ? w * 0.82 : w * 0.92;
    rr(ctx, x + w * 0.68, armY - 2, punchReach - w * 0.68, armH * 0.65, 4); ctx.fill();
    // Fist
    ctx.fillStyle = skinColor;
    ctx.beginPath(); ctx.arc(x + punchReach, armY + armH * 0.28, armW * 0.6, 0, Math.PI * 2); ctx.fill();
    // Impact lines
    const impX = x + punchReach + 8;
    ctx.strokeStyle = 'rgba(255,200,50,0.7)';
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI - Math.PI * 0.25;
      const len = 10 + Math.random() * 8;
      ctx.beginPath();
      ctx.moveTo(impX, armY + armH * 0.3);
      ctx.lineTo(impX + Math.cos(angle) * len, armY + armH * 0.3 + Math.sin(angle) * len);
      ctx.stroke();
    }
  } else if (isBlock) {
    // Both arms raised crossing in front
    rr(ctx, x + w * 0.06, armY, armW, armH * 0.6, 4); ctx.fill();
    rr(ctx, x + w * 0.22, armY - 8, armW, armH * 0.55, 4); ctx.fill();
  } else {
    const armBob = (state === 'walk') ? Math.sin(t * 0.28 + 1.5) * 5 : 0;
    rr(ctx, x + w * 0.06, armY + armBob, armW, armH, 4); ctx.fill();
    rr(ctx, x + w * (wide ? 0.78 : 0.78), armY - armBob, armW, armH, 4); ctx.fill();
  }

  // ── Head ──
  const headR = w * (wide ? 0.22 : 0.185);
  const headX = x + w * 0.5;
  const headY = y + h * 0.165 + yOff;

  ctx.fillStyle = skinColor;
  ctx.beginPath(); ctx.arc(headX, headY, headR, 0, Math.PI * 2); ctx.fill();

  // Hair / head detail
  if (hairGlow) { ctx.shadowColor = hairGlow; ctx.shadowBlur = 10; }
  ctx.fillStyle = hairColor;
  if (hairGlow) {
    // Flame hair (Ember)
    ctx.beginPath();
    ctx.moveTo(headX - headR, headY);
    ctx.quadraticCurveTo(headX - headR * 0.7, headY - headR * 1.6, headX - headR * 0.2, headY - headR * 0.9);
    ctx.quadraticCurveTo(headX, headY - headR * 1.9, headX + headR * 0.2, headY - headR * 0.9);
    ctx.quadraticCurveTo(headX + headR * 0.7, headY - headR * 1.6, headX + headR, headY);
    ctx.arc(headX, headY, headR, 0, Math.PI, true);
    ctx.fill();
  } else {
    ctx.beginPath(); ctx.arc(headX, headY - headR * 0.18, headR, Math.PI, 0); ctx.fill();
  }
  ctx.shadowBlur = 0;

  // Eyes
  if (eyeGlow) { ctx.shadowColor = eyeGlow; ctx.shadowBlur = 8; }
  ctx.fillStyle = eyeColor;
  ctx.beginPath(); ctx.arc(headX - headR * 0.35, headY, wide ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(headX + headR * 0.35, headY, wide ? 3.5 : 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  // Jump: draw legs tucked
  if (isJump) {
    // Erase legs drawn below and redraw tucked up
    // (legs already drawn — we add visual upward-kick effect)
    // Air thrust lines below feet
    ctx.strokeStyle = 'rgba(200,200,255,0.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const lx2 = x + w * (0.25 + i * 0.17);
      ctx.beginPath();
      ctx.moveTo(lx2, y + h + 4);
      ctx.lineTo(lx2 + (Math.random() - 0.5) * 6, y + h + 14 + Math.random() * 8);
      ctx.stroke();
    }
  }

  ctx.restore(); // hurtLean
  ctx.restore(); // flip
}

// ── Rounded rect helper ──────────────────────────────────
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
