import { Enemy, FloatingText, LootDrop, Particle, Projectile, CharacterClassId } from './types';

interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  player: {
    x: number;
    y: number;
    radius: number;
    facingX: number;
    facingY: number;
    classId: CharacterClassId;
    isMoving: boolean;
    isDashing: boolean;
    walkCycle: number;
    slashTimer: number;
    slashAngle: number;
    holyAuraActive: boolean;
    orbitBladesCount: number;
    orbitAngle: number;
  };
  enemies: Enemy[];
  projectiles: Projectile[];
  loot: LootDrop[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  joystick: {
    active: boolean;
    startX: number;
    startY: number;
    currX: number;
    currY: number;
  };
  roomWidth: number;
  roomHeight: number;
  portalOpen: boolean;
  portalX: number;
  portalY: number;
  camera: { x: number; y: number };
}

export function renderGameScene(data: RenderContext) {
  const { ctx, width, height, player, camera } = data;

  // Clear canvas
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  // Center camera on player
  ctx.translate(width / 2 - camera.x, height / 2 - camera.y);

  // 1. Draw Dungeon Floor & Walls
  drawDungeonFloor(ctx, data.roomWidth, data.roomHeight);

  // 2. Draw Portal if active
  if (data.portalOpen) {
    drawExitPortal(ctx, data.portalX, data.portalY);
  }

  // 3. Draw Loot Drops
  data.loot.forEach(item => drawLoot(ctx, item));

  // 4. Draw Holy Aura
  if (player.holyAuraActive) {
    drawHolyAura(ctx, player.x, player.y);
  }

  // 5. Draw Enemies
  data.enemies.forEach(enemy => drawEnemy(ctx, enemy));

  // 6. Draw Player
  drawPlayer(ctx, player);

  // 7. Draw Orbiting Blades
  if (player.orbitBladesCount > 0) {
    drawOrbitingBlades(ctx, player.x, player.y, player.orbitBladesCount, player.orbitAngle);
  }

  // 8. Draw Projectiles
  data.projectiles.forEach(p => drawProjectile(ctx, p));

  // 9. Draw Particles
  data.particles.forEach(p => drawParticle(ctx, p));

  // 10. Draw Floating Numbers
  data.floatingTexts.forEach(txt => drawFloatingText(ctx, txt));

  ctx.restore();

  // 11. Draw Virtual Joystick (in screen space)
  if (data.joystick.active) {
    drawJoystick(ctx, data.joystick.startX, data.joystick.startY, data.joystick.currX, data.joystick.currY);
  }
}

function drawDungeonFloor(ctx: CanvasRenderingContext2D, roomW: number, roomH: number) {
  const halfW = roomW / 2;
  const halfH = roomH / 2;
  const tileSize = 60;

  // Floor background
  ctx.fillStyle = '#111726';
  ctx.fillRect(-halfW, -halfH, roomW, roomH);

  // Tile grid
  ctx.strokeStyle = '#182238';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let x = -halfW; x <= halfW; x += tileSize) {
    ctx.moveTo(x, -halfH);
    ctx.lineTo(x, halfH);
  }
  for (let y = -halfH; y <= halfH; y += tileSize) {
    ctx.moveTo(-halfW, y);
    ctx.lineTo(halfW, y);
  }
  ctx.stroke();

  // Floor center rune seal
  ctx.save();
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, 140, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 90, 0, Math.PI * 2);
  ctx.stroke();
  // Star lines inside rune
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3;
    ctx.moveTo(Math.cos(angle) * 90, Math.sin(angle) * 90);
    ctx.lineTo(Math.cos(angle + Math.PI) * 90, Math.sin(angle + Math.PI) * 90);
  }
  ctx.stroke();
  ctx.restore();

  // Torches on walls
  drawTorches(ctx, -halfW + 30, -halfH + 30);
  drawTorches(ctx, halfW - 30, -halfH + 30);
  drawTorches(ctx, -halfW + 30, halfH - 30);
  drawTorches(ctx, halfW - 30, halfH - 30);

  // Outer Wall Border
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 16;
  ctx.strokeRect(-halfW, -halfH, roomW, roomH);

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 8;
  ctx.strokeRect(-halfW - 8, -halfH - 8, roomW + 16, roomH + 16);
}

function drawTorches(ctx: CanvasRenderingContext2D, x: number, y: number) {
  // Sconce base
  ctx.fillStyle = '#475569';
  ctx.fillRect(x - 4, y - 6, 8, 12);

  // Flame glow
  const flicker = Math.sin(Date.now() * 0.008 + x) * 2;
  const gradient = ctx.createRadialGradient(x, y - 8, 2, x, y - 8, 38 + flicker);
  gradient.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
  gradient.addColorStop(0.6, 'rgba(239, 68, 68, 0.12)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y - 8, 40 + flicker, 0, Math.PI * 2);
  ctx.fill();

  // Flame core
  ctx.fillStyle = '#fef08a';
  ctx.beginPath();
  ctx.arc(x, y - 8 + flicker * 0.3, 4, 0, Math.PI * 2);
  ctx.fill();
}

function drawExitPortal(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const time = Date.now() * 0.003;
  ctx.save();
  ctx.translate(x, y);

  // Portal outer glow
  const grad = ctx.createRadialGradient(0, 0, 5, 0, 0, 55);
  grad.addColorStop(0, 'rgba(96, 165, 250, 0.8)');
  grad.addColorStop(0.5, 'rgba(168, 85, 247, 0.5)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, 55, 0, Math.PI * 2);
  ctx.fill();

  // Swirling rings
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 32 + Math.sin(time * 2) * 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 2;
  ctx.rotate(time);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(Math.PI / 2);
    ctx.beginPath();
    ctx.arc(14, 0, 10, 0, Math.PI);
    ctx.stroke();
  }

  // Portal label text
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('PORTAL', 0, 48);

  ctx.restore();
}

function drawHolyAura(ctx: CanvasRenderingContext2D, x: number, y: number) {
  const pulse = Math.sin(Date.now() * 0.006) * 4;
  const radius = 100 + pulse;

  const grad = ctx.createRadialGradient(x, y, 10, x, y, radius);
  grad.addColorStop(0, 'rgba(234, 179, 8, 0.22)');
  grad.addColorStop(0.7, 'rgba(234, 179, 8, 0.1)');
  grad.addColorStop(1, 'rgba(234, 179, 8, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(250, 204, 21, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawOrbitingBlades(
  ctx: CanvasRenderingContext2D,
  px: number,
  py: number,
  count: number,
  angleOffset: number
) {
  const dist = 65;
  for (let i = 0; i < count; i++) {
    const angle = angleOffset + (i * Math.PI * 2) / count;
    const bx = px + Math.cos(angle) * dist;
    const by = py + Math.sin(angle) * dist;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle + Math.PI / 2);

    // Blade glow
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 14);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();

    // Blade core highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(2, 4);
    ctx.lineTo(0, 10);
    ctx.lineTo(-2, 4);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, player: RenderContext['player']) {
  const { x, y, facingX, facingY, classId, isMoving, walkCycle, isDashing, slashTimer, slashAngle } = player;

  ctx.save();
  ctx.translate(x, y);

  // Dash ghost / trail
  if (isDashing) {
    ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
    ctx.beginPath();
    ctx.arc(-facingX * 18, -facingY * 18, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  // Shadow under feet
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 15, 7, 0, 0, Math.PI * 2);
  ctx.fill();

  const bob = isMoving ? Math.sin(walkCycle) * 3 : 0;

  // Determine class theme colors
  let bodyColor = '#2563eb';
  let accentColor = '#93c5fd';
  let headColor = '#cbd5e1';

  if (classId === 'mage') {
    bodyColor = '#7c3aed';
    accentColor = '#c084fc';
    headColor = '#f3e8ff';
  } else if (classId === 'rogue') {
    bodyColor = '#059669';
    accentColor = '#6ee7b7';
    headColor = '#1e293b';
  }

  // Character Body / Cloak
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.roundRect(-12, -8 + bob, 24, 22, 6);
  ctx.fill();

  // Character Head
  ctx.fillStyle = headColor;
  ctx.beginPath();
  ctx.arc(0, -14 + bob, 10, 0, Math.PI * 2);
  ctx.fill();

  // Helmet / Hood / Eyes
  if (classId === 'warrior') {
    // Knight visor
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-6, -16 + bob, 12, 3);
    // Azure visor light
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-4, -15 + bob, 8, 2);
  } else if (classId === 'mage') {
    // Wizard pointed hat
    ctx.fillStyle = '#581c87';
    ctx.beginPath();
    ctx.moveTo(-11, -16 + bob);
    ctx.lineTo(11, -16 + bob);
    ctx.lineTo(0, -32 + bob);
    ctx.closePath();
    ctx.fill();
    // Arcane eyes
    ctx.fillStyle = '#e879f9';
    ctx.beginPath();
    ctx.arc(-3, -13 + bob, 2, 0, Math.PI * 2);
    ctx.arc(3, -13 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Rogue hood
    ctx.fillStyle = '#064e3b';
    ctx.beginPath();
    ctx.arc(0, -16 + bob, 11, Math.PI, 0);
    ctx.lineTo(8, -10 + bob);
    ctx.lineTo(-8, -10 + bob);
    ctx.closePath();
    ctx.fill();
    // Glowing emerald eyes
    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(-3, -13 + bob, 2, 0, Math.PI * 2);
    ctx.arc(3, -13 + bob, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Weapon in hand
  const lookAngle = Math.atan2(facingY, facingX);
  const wx = Math.cos(lookAngle) * 16;
  const wy = Math.sin(lookAngle) * 16 + bob;

  ctx.save();
  ctx.translate(wx, wy);
  ctx.rotate(lookAngle);

  if (classId === 'warrior') {
    // Steel Sword
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(0, -2.5, 18, 5);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(3, -1, 10, 2);
  } else if (classId === 'mage') {
    // Magic Staff
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-6, -2, 22, 4);
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(17, 0, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Twin Dagger
    ctx.fillStyle = '#34d399';
    ctx.fillRect(0, -2, 12, 4);
  }
  ctx.restore();

  // Attack slash arc
  if (slashTimer > 0) {
    ctx.save();
    ctx.rotate(slashAngle);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 36, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy) {
  const { x, y, type, radius, hp, maxHp, isBoss, isCharging, hitFlashTimer } = enemy;

  ctx.save();
  ctx.translate(x, y);

  // Hit flash white
  if (hitFlashTimer > 0) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, radius + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, radius * 0.8, radius * 0.9, radius * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw by Monster Type
  if (type === 'skeleton') {
    // Skull & Ribs
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(0, -6, 9, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-4, -8, 2.5, 2.5);
    ctx.fillRect(1.5, -8, 2.5, 2.5);
    // Torso / bones
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-6, 2, 12, 10);
    // Rusty sword
    ctx.fillStyle = '#78716c';
    ctx.fillRect(8, -4, 4, 16);
  } else if (type === 'bat') {
    // Bat wings flapping
    const wingY = Math.sin(Date.now() * 0.02 + enemy.id) * 8;
    ctx.fillStyle = '#312e81';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-18, wingY - 6);
    ctx.lineTo(-8, 6);
    ctx.lineTo(0, 2);
    ctx.lineTo(8, 6);
    ctx.lineTo(18, wingY - 6);
    ctx.closePath();
    ctx.fill();
    // Head & red eyes
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-2, -3, 1.5, 1.5);
    ctx.fillRect(1, -3, 1.5, 1.5);
  } else if (type === 'goblin_archer') {
    // Green goblin skin
    ctx.fillStyle = '#16a34a';
    ctx.beginPath();
    ctx.arc(0, -6, 8, 0, Math.PI * 2);
    ctx.fill();
    // Leather garb
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-6, 2, 12, 10);
    // Wooden bow
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(10, 0, 10, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  } else if (type === 'necromancer') {
    // Purple robed sorcerer
    ctx.fillStyle = '#4c1d95';
    ctx.beginPath();
    ctx.moveTo(-12, 14);
    ctx.lineTo(12, 14);
    ctx.lineTo(0, -18);
    ctx.closePath();
    ctx.fill();
    // Skull face
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.arc(0, -4, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(-2.5, -5, 2, 2);
    ctx.fillRect(1, -5, 2, 2);
  } else if (type === 'minotaur') {
    // Hulking brown beast
    ctx.fillStyle = isCharging ? '#b91c1c' : '#78350f';
    ctx.beginPath();
    ctx.roundRect(-16, -14, 32, 28, 8);
    ctx.fill();
    // Iron horns
    ctx.fillStyle = '#cbd5e1';
    ctx.beginPath();
    ctx.moveTo(-12, -14);
    ctx.lineTo(-22, -26);
    ctx.lineTo(-10, -18);
    ctx.moveTo(12, -14);
    ctx.lineTo(22, -26);
    ctx.lineTo(10, -18);
    ctx.fill();
    // Red rage eyes
    ctx.fillStyle = '#facc15';
    ctx.fillRect(-6, -6, 4, 3);
    ctx.fillRect(2, -6, 4, 3);
  } else if (type === 'demon_boss') {
    // Huge Demon Lord
    const pulse = Math.sin(Date.now() * 0.005) * 3;
    // Fiery aura
    const demonGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, radius + 15);
    demonGrad.addColorStop(0, 'rgba(239, 68, 68, 0.4)');
    demonGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = demonGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 15, 0, Math.PI * 2);
    ctx.fill();

    // Dark magma body
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.roundRect(-24, -20 + pulse * 0.5, 48, 44, 12);
    ctx.fill();

    // Fiery horns
    ctx.fillStyle = '#ea580c';
    ctx.beginPath();
    ctx.moveTo(-16, -20);
    ctx.quadraticCurveTo(-36, -42, -26, -50);
    ctx.quadraticCurveTo(-20, -32, -10, -22);
    ctx.moveTo(16, -20);
    ctx.quadraticCurveTo(36, -42, 26, -50);
    ctx.quadraticCurveTo(20, -32, 10, -22);
    ctx.fill();

    // Glowing magma eyes
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(-10, -8, 7, 5);
    ctx.fillRect(3, -8, 7, 5);
  }

  // Health bar above non-boss (or small boss bar)
  if (hp < maxHp && !isBoss) {
    const barW = Math.max(26, radius * 1.6);
    const barH = 4;
    const barY = -radius - 10;
    const hpRatio = Math.max(0, hp / maxHp);

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(-barW / 2, barY, barW, barH);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(-barW / 2, barY, barW * hpRatio, barH);
  }

  ctx.restore();
}

function drawLoot(ctx: CanvasRenderingContext2D, item: LootDrop) {
  const { x, y, type, color } = item;
  const bob = Math.sin(Date.now() * 0.007 + item.id) * 3;

  ctx.save();
  ctx.translate(x, y + bob);

  if (type === 'gem_xp') {
    // XP diamond crystal
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 0);
    ctx.lineTo(0, 9);
    ctx.lineTo(-6, 0);
    ctx.closePath();
    ctx.fill();

    // Crystal shine
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(2, 0);
    ctx.lineTo(0, 2);
    ctx.lineTo(-2, 0);
    ctx.closePath();
    ctx.fill();
  } else if (type === 'gold') {
    // Shiny gold coin
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Inner symbol
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 8px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, 3);
  } else if (type === 'potion_hp') {
    // Red health flask
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(0, 2, 7, 0, Math.PI * 2);
    ctx.fill();
    // Cork top
    ctx.fillStyle = '#92400e';
    ctx.fillRect(-2.5, -8, 5, 4);
  } else if (type === 'chest') {
    // Wooden treasure chest
    ctx.fillStyle = '#854d0e';
    ctx.fillRect(-12, -8, 24, 16);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -8, 24, 16);
    // Keyhole
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(0, -1, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawProjectile(ctx: CanvasRenderingContext2D, p: Projectile) {
  ctx.save();
  ctx.translate(p.x, p.y);

  if (p.isPoison) {
    // Green poison kunai
    const angle = Math.atan2(p.vy, p.vx);
    ctx.rotate(angle);
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, -4);
    ctx.lineTo(-2, 0);
    ctx.lineTo(-6, 4);
    ctx.closePath();
    ctx.fill();
  } else if (p.freezeDuration) {
    // Frost flake / ice shard
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else {
    // Arcane / Fire / Default projectile
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();

    // Hot glowing core
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = Math.max(0, p.life / p.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFloatingText(ctx: CanvasRenderingContext2D, ft: FloatingText) {
  const alpha = Math.max(0, ft.life / ft.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = ft.color;
  ctx.font = ft.isCrit ? 'bold 16px Cinzel, serif' : 'bold 12px system-ui';
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.strokeText(ft.text, ft.x, ft.y);
  ctx.fillText(ft.text, ft.x, ft.y);
  ctx.restore();
}

function drawJoystick(ctx: CanvasRenderingContext2D, sx: number, sy: number, cx: number, cy: number) {
  // Outer circle
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(sx, sy, 55, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Inner thumb knob
  const dx = cx - sx;
  const dy = cy - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const maxDist = 45;
  const clampedX = dist > maxDist ? sx + (dx / dist) * maxDist : cx;
  const clampedY = dist > maxDist ? sy + (dy / dist) * maxDist : cy;

  ctx.fillStyle = 'rgba(96, 165, 250, 0.65)';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(clampedX, clampedY, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
