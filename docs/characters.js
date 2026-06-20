const CHARACTERS = {
  ryu: {
    id: 'ryu',
    name: 'RYUKEN',
    role: 'Balanced Warrior',
    icon: '🥋',
    color: '#ff6b35',
    accentColor: '#fff',
    hp: 100,
    speed: 5,
    punchDamage: 10,
    kickDamage: 14,
    superDamage: 35,
    superName: 'Hadou Blast',
    superIcon: '🔥',
    superColor: '#ff6b35',
    stats: { power: 70, speed: 70, defense: 70, special: 75 },
    // Sprite drawing function — called by canvas renderer
    drawBody(ctx, x, y, w, h, facing, state, frame) {
      const flip = facing === 'left';
      ctx.save();
      if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.translate(-x, -y); }

      // Body
      ctx.fillStyle = '#fff';
      roundRect(ctx, x + w*0.25, y + h*0.25, w*0.5, h*0.4, 4); ctx.fill();
      // Belt
      ctx.fillStyle = this.color;
      roundRect(ctx, x + w*0.25, y + h*0.47, w*0.5, h*0.06, 2); ctx.fill();
      // Head
      ctx.fillStyle = '#f5c5a0';
      ctx.beginPath(); ctx.arc(x + w*0.5, y + h*0.18, w*0.18, 0, Math.PI*2); ctx.fill();
      // Hair
      ctx.fillStyle = '#1a0a00';
      ctx.beginPath(); ctx.arc(x + w*0.5, y + h*0.12, w*0.16, Math.PI, 0); ctx.fill();
      // Eyes
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(x + w*0.44, y + h*0.17, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w*0.56, y + h*0.17, 2, 0, Math.PI*2); ctx.fill();
      // Legs
      drawLegs(ctx, x, y, w, h, state, frame, '#fff');
      // Arms
      drawArms(ctx, x, y, w, h, state, frame, '#f5c5a0');

      ctx.restore();
    }
  },

  shadow: {
    id: 'shadow',
    name: 'SHADOWBLADE',
    role: 'Ninja Assassin',
    icon: '🥷',
    color: '#6d28d9',
    accentColor: '#c4b5fd',
    hp: 80,
    speed: 8,
    punchDamage: 8,
    kickDamage: 11,
    superDamage: 40,
    superName: 'Shadow Strike',
    superIcon: '⚡',
    superColor: '#a855f7',
    stats: { power: 60, speed: 95, defense: 50, special: 90 },
    drawBody(ctx, x, y, w, h, facing, state, frame) {
      const flip = facing === 'left';
      ctx.save();
      if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.translate(-x, -y); }

      ctx.fillStyle = '#1a0a2e';
      roundRect(ctx, x + w*0.2, y + h*0.22, w*0.6, h*0.45, 5); ctx.fill();
      ctx.fillStyle = this.color;
      roundRect(ctx, x + w*0.25, y + h*0.22, w*0.5, h*0.08, 3); ctx.fill();
      // Head / mask
      ctx.fillStyle = '#1a0a2e';
      ctx.beginPath(); ctx.arc(x + w*0.5, y + h*0.16, w*0.19, 0, Math.PI*2); ctx.fill();
      // Eyes glowing
      ctx.fillStyle = '#a855f7';
      ctx.shadowColor = '#a855f7'; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(x + w*0.43, y + h*0.15, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w*0.57, y + h*0.15, 2.5, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
      drawLegs(ctx, x, y, w, h, state, frame, '#1a0a2e');
      drawArms(ctx, x, y, w, h, state, frame, '#1a0a2e');
      ctx.restore();
    }
  },

  titan: {
    id: 'titan',
    name: 'TITAN',
    role: 'Iron Juggernaut',
    icon: '🦍',
    color: '#64748b',
    accentColor: '#94a3b8',
    hp: 140,
    speed: 3,
    punchDamage: 18,
    kickDamage: 22,
    superDamage: 55,
    superName: 'Seismic Slam',
    superIcon: '💥',
    superColor: '#f59e0b',
    stats: { power: 100, speed: 30, defense: 95, special: 70 },
    drawBody(ctx, x, y, w, h, facing, state, frame) {
      const flip = facing === 'left';
      ctx.save();
      if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.translate(-x, -y); }

      // Big torso
      ctx.fillStyle = '#64748b';
      roundRect(ctx, x + w*0.15, y + h*0.2, w*0.7, h*0.5, 6); ctx.fill();
      // Armor plates
      ctx.fillStyle = '#94a3b8';
      roundRect(ctx, x + w*0.2, y + h*0.22, w*0.6, h*0.12, 3); ctx.fill();
      roundRect(ctx, x + w*0.2, y + h*0.36, w*0.6, h*0.12, 3); ctx.fill();
      // Head (big)
      ctx.fillStyle = '#4b5563';
      ctx.beginPath(); ctx.arc(x + w*0.5, y + h*0.14, w*0.22, 0, Math.PI*2); ctx.fill();
      // Visor
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b'; ctx.shadowBlur = 6;
      roundRect(ctx, x + w*0.34, y + h*0.11, w*0.32, h*0.07, 3); ctx.fill();
      ctx.shadowBlur = 0;
      drawLegs(ctx, x, y, w, h, state, frame, '#64748b', true);
      drawArms(ctx, x, y, w, h, state, frame, '#64748b', true);
      ctx.restore();
    }
  },

  ember: {
    id: 'ember',
    name: 'EMBER',
    role: 'Fire Sorceress',
    icon: '🔮',
    color: '#ef4444',
    accentColor: '#fbbf24',
    hp: 85,
    speed: 6,
    punchDamage: 7,
    kickDamage: 9,
    superDamage: 60,
    superName: 'Inferno Wave',
    superIcon: '🌊🔥',
    superColor: '#ef4444',
    stats: { power: 55, speed: 65, defense: 55, special: 100 },
    drawBody(ctx, x, y, w, h, facing, state, frame) {
      const flip = facing === 'left';
      ctx.save();
      if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.translate(-x, -y); }

      // Robe
      ctx.fillStyle = '#7c2d12';
      roundRect(ctx, x + w*0.22, y + h*0.22, w*0.56, h*0.48, 5); ctx.fill();
      // Trim
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(x + w*0.22, y + h*0.22, w*0.56, h*0.05);
      ctx.fillRect(x + w*0.22, y + h*0.65, w*0.56, h*0.05);
      // Head
      ctx.fillStyle = '#fde68a';
      ctx.beginPath(); ctx.arc(x + w*0.5, y + h*0.16, w*0.17, 0, Math.PI*2); ctx.fill();
      // Hair (flame-like)
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(x + w*0.33, y + h*0.1);
      ctx.quadraticCurveTo(x + w*0.38, y - h*0.02, x + w*0.44, y + h*0.06);
      ctx.quadraticCurveTo(x + w*0.5, y - h*0.04, x + w*0.56, y + h*0.06);
      ctx.quadraticCurveTo(x + w*0.62, y - h*0.02, x + w*0.67, y + h*0.1);
      ctx.arc(x + w*0.5, y + h*0.1, w*0.17, 0, Math.PI, true);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(x + w*0.44, y + h*0.16, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w*0.56, y + h*0.16, 2, 0, Math.PI*2); ctx.fill();
      drawLegs(ctx, x, y, w, h, state, frame, '#7c2d12');
      drawArms(ctx, x, y, w, h, state, frame, '#fde68a');
      ctx.restore();
    }
  },

  storm: {
    id: 'storm',
    name: 'STORM',
    role: 'Thunder God',
    icon: '⚡',
    color: '#0ea5e9',
    accentColor: '#7dd3fc',
    hp: 95,
    speed: 6,
    punchDamage: 12,
    kickDamage: 16,
    superDamage: 48,
    superName: 'Thunder Strike',
    superIcon: '⛈️',
    superColor: '#0ea5e9',
    stats: { power: 80, speed: 65, defense: 65, special: 85 },
    drawBody(ctx, x, y, w, h, facing, state, frame) {
      const flip = facing === 'left';
      ctx.save();
      if (flip) { ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.translate(-x, -y); }

      // Cape
      ctx.fillStyle = '#1e40af';
      ctx.beginPath();
      ctx.moveTo(x + w*0.5, y + h*0.2);
      ctx.lineTo(x + w*0.1, y + h*0.72);
      ctx.lineTo(x + w*0.9, y + h*0.72);
      ctx.closePath(); ctx.fill();
      // Torso
      ctx.fillStyle = '#0ea5e9';
      roundRect(ctx, x + w*0.25, y + h*0.22, w*0.5, h*0.4, 5); ctx.fill();
      // Lightning bolt on chest
      ctx.fillStyle = '#fbbf24';
      ctx.shadowColor = '#fbbf24'; ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(x + w*0.53, y + h*0.27);
      ctx.lineTo(x + w*0.46, y + h*0.4);
      ctx.lineTo(x + w*0.51, y + h*0.4);
      ctx.lineTo(x + w*0.44, y + h*0.54);
      ctx.lineTo(x + w*0.55, y + h*0.38);
      ctx.lineTo(x + w*0.5, y + h*0.38);
      ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      // Head
      ctx.fillStyle = '#f5c5a0';
      ctx.beginPath(); ctx.arc(x + w*0.5, y + h*0.16, w*0.18, 0, Math.PI*2); ctx.fill();
      // White hair
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath(); ctx.arc(x + w*0.5, y + h*0.1, w*0.16, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath(); ctx.arc(x + w*0.44, y + h*0.15, 2, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + w*0.56, y + h*0.15, 2, 0, Math.PI*2); ctx.fill();
      drawLegs(ctx, x, y, w, h, state, frame, '#1e40af');
      drawArms(ctx, x, y, w, h, state, frame, '#f5c5a0');
      ctx.restore();
    }
  }
};

// ── Shared drawing helpers ──
function roundRect(ctx, x, y, w, h, r) {
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

function drawLegs(ctx, x, y, w, h, state, frame, color, wide = false) {
  const lw = wide ? w * 0.22 : w * 0.18;
  const lh = h * 0.28;
  const ly = y + h * 0.65;
  const bob = (state === 'walk') ? Math.sin(frame * 0.3) * 6 : 0;
  ctx.fillStyle = color;
  // Left leg
  roundRect(ctx, x + w * 0.25, ly + bob, lw, lh, 4); ctx.fill();
  // Right leg
  roundRect(ctx, x + w * 0.57, ly - bob, lw, lh, 4); ctx.fill();
  // Feet
  ctx.fillStyle = '#111';
  roundRect(ctx, x + w * 0.22, ly + lh + bob, lw + 6, h * 0.07, 3); ctx.fill();
  roundRect(ctx, x + w * 0.55, ly + lh - bob, lw + 6, h * 0.07, 3); ctx.fill();
}

function drawArms(ctx, x, y, w, h, state, frame, color, wide = false) {
  const aw = wide ? w * 0.2 : w * 0.16;
  const ah = h * 0.3;
  const ay = y + h * 0.25;
  ctx.fillStyle = color;
  if (state === 'punch') {
    // Extended right arm
    roundRect(ctx, x + w * 0.68, ay, aw + 8, ah * 0.6, 4); ctx.fill();
    roundRect(ctx, x + w * 0.08, ay + 4, aw, ah * 0.7, 4); ctx.fill();
  } else if (state === 'kick') {
    roundRect(ctx, x + w * 0.08, ay, aw, ah, 4); ctx.fill();
    roundRect(ctx, x + w * 0.68, ay, aw, ah, 4); ctx.fill();
  } else {
    roundRect(ctx, x + w * 0.08, ay, aw, ah, 4); ctx.fill();
    roundRect(ctx, x + w * 0.76, ay, aw, ah, 4); ctx.fill();
  }
}
