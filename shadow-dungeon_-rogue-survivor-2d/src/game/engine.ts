import {
  CharacterClassId,
  DungeonWaveConfig,
  Enemy,
  EnemyType,
  FloatingText,
  LootDrop,
  Particle,
  PlayerAcquiredSkill,
  PlayerStats,
  Projectile,
} from './types';
import { HERO_CLASSES, SKILL_POOL } from './constants';
import { sound } from './audio';

export interface GameEngineCallbacks {
  onLevelUp: (choices: string[]) => void;
  onGameOver: (summary: RunSummary) => void;
  onFloorComplete: (floor: number) => void;
  onChestReward: (gold: number, soulShards: number) => void;
  onStatsUpdate: (stats: {
    hp: number;
    maxHp: number;
    level: number;
    xp: number;
    nextXp: number;
    gold: number;
    soulShards: number;
    floor: number;
    dashCooldownPercent: number;
    enemiesLeft: number;
    bossHp?: { current: number; max: number; name: string };
  }) => void;
}

export interface RunSummary {
  floorReached: number;
  monstersSlain: number;
  goldEarned: number;
  soulShardsEarned: number;
  timeSurvivedSeconds: number;
  victory: boolean;
}

export class DungeonGameEngine {
  public classId: CharacterClassId;
  public baseStats: PlayerStats;
  public playerHp: number;
  public playerX: number = 0;
  public playerY: number = 0;
  public playerVx: number = 0;
  public playerVy: number = 0;
  public facingX: number = 0;
  public facingY: number = 1;
  public isMoving: boolean = false;
  public isDashing: boolean = false;
  public dashCooldownTimer: number = 0;
  public dashDurationTimer: number = 0;

  // Run Progression
  public floor: number = 1;
  public runLevel: number = 1;
  public runXp: number = 0;
  public runNextXp: number = 15;
  public runGold: number = 0;
  public runSoulShards: number = 0;
  public monstersSlain: number = 0;
  public runStartTime: number = Date.now();

  // Skills
  public acquiredSkills: Map<string, PlayerAcquiredSkill> = new Map();
  public orbitAngle: number = 0;
  public slashTimer: number = 0;
  public slashAngle: number = 0;
  public walkCycle: number = 0;

  // Arena dimensions
  public roomWidth: number = 880;
  public roomHeight: number = 1200;
  public portalOpen: boolean = false;
  public portalX: number = 0;
  public portalY: number = -380;

  // Entities
  public enemies: Enemy[] = [];
  public projectiles: Projectile[] = [];
  public particles: Particle[] = [];
  public floatingTexts: FloatingText[] = [];
  public loot: LootDrop[] = [];

  // Spawning & Waves
  private waveIndex: number = 0;
  private waveTimer: number = 0;
  private currentWaveConfig: DungeonWaveConfig | null = null;
  private spawnedInWave: number = 0;
  private totalEnemiesInFloor: number = 0;
  private nextEntityId: number = 1;

  // Input & Camera
  public joystick = { active: false, startX: 0, startY: 0, currX: 0, currY: 0 };
  public camera = { x: 0, y: 0 };
  public isPaused: boolean = false;
  public isEnded: boolean = false;

  private callbacks: GameEngineCallbacks;
  private lastTime: number = performance.now();
  private attackTimers: Record<string, number> = {};

  constructor(classId: CharacterClassId, baseStats: PlayerStats, callbacks: GameEngineCallbacks) {
    this.classId = classId;
    this.baseStats = { ...baseStats };
    this.playerHp = baseStats.maxHp;
    this.callbacks = callbacks;

    // Grant class starting skill
    const hero = HERO_CLASSES[classId];
    if (hero && hero.startingSkillId) {
      this.acquiredSkills.set(hero.startingSkillId, {
        id: hero.startingSkillId,
        level: 1,
        cooldownTimer: 0,
      });
    }

    this.startFloor(1);
  }

  public startFloor(floorNumber: number) {
    this.floor = floorNumber;
    this.playerX = 0;
    this.playerY = 220;
    this.enemies = [];
    this.projectiles = [];
    this.portalOpen = false;
    this.waveIndex = 0;
    this.spawnedInWave = 0;

    const isBossFloor = floorNumber % 5 === 0;
    const baseCount = 14 + floorNumber * 4;
    this.totalEnemiesInFloor = isBossFloor ? 1 + floorNumber * 2 : baseCount;

    this.currentWaveConfig = this.buildWaveConfig(floorNumber, isBossFloor);
    this.waveTimer = 0;

    // Boss sound
    if (isBossFloor) {
      setTimeout(() => sound.playBossRoar(), 300);
    }
  }

  private buildWaveConfig(floor: number, isBoss: boolean): DungeonWaveConfig {
    const enemyTypes: { type: EnemyType; weight: number }[] = [];

    enemyTypes.push({ type: 'skeleton', weight: 40 });
    enemyTypes.push({ type: 'bat', weight: 30 });
    if (floor >= 2) enemyTypes.push({ type: 'goblin_archer', weight: 25 });
    if (floor >= 3) enemyTypes.push({ type: 'necromancer', weight: 20 });
    if (floor >= 4) enemyTypes.push({ type: 'minotaur', weight: 15 });

    return {
      waveNumber: 1,
      enemyCount: this.totalEnemiesInFloor,
      enemyTypes,
      spawnInterval: isBoss ? 2.5 : 1.2,
      hasBoss: isBoss,
    };
  }

  public update(now: number) {
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (this.isPaused || this.isEnded) return;

    // 1. Process Player Movement & Dash
    this.updatePlayerMovement(dt);

    // 2. Health Regen
    if (this.baseStats.healthRegen > 0) {
      this.playerHp = Math.min(this.baseStats.maxHp, this.playerHp + this.baseStats.healthRegen * dt);
    }

    // 3. Update Skills & Auto-Attacks
    this.updateSkills(dt);

    // 4. Update Spawner & Waves
    this.updateSpawner(dt);

    // 5. Update Enemies
    this.updateEnemies(dt);

    // 6. Update Projectiles
    this.updateProjectiles(dt);

    // 7. Update Loot & Magnetism
    this.updateLoot(dt);

    // 8. Update Particles & Floating Text
    this.updateParticlesAndText(dt);

    // 9. Check Portal & Floor Progression
    this.checkFloorCompletion();

    // 10. Update Camera
    this.camera.x += (this.playerX - this.camera.x) * 0.12;
    this.camera.y += (this.playerY - this.camera.y) * 0.12;

    // 11. Send HUD Stats update
    this.emitStats();
  }

  private updatePlayerMovement(dt: number) {
    let moveX = 0;
    let moveY = 0;

    // Joystick input
    if (this.joystick.active) {
      const dx = this.joystick.currX - this.joystick.startX;
      const dy = this.joystick.currY - this.joystick.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        moveX = dx / dist;
        moveY = dy / dist;
      }
    }

    // Keyboard fallback (for testing in browser)
    if (moveX === 0 && moveY === 0) {
      if (this.keyState['KeyW'] || this.keyState['ArrowUp']) moveY -= 1;
      if (this.keyState['KeyS'] || this.keyState['ArrowDown']) moveY += 1;
      if (this.keyState['KeyA'] || this.keyState['ArrowLeft']) moveX -= 1;
      if (this.keyState['KeyD'] || this.keyState['ArrowRight']) moveX += 1;
      if (moveX !== 0 && moveY !== 0) {
        const len = Math.sqrt(moveX * moveX + moveY * moveY);
        moveX /= len;
        moveY /= len;
      }
    }

    // Dash update
    if (this.dashCooldownTimer > 0) {
      this.dashCooldownTimer -= dt;
    }

    let speed = this.baseStats.moveSpeed * 60;
    if (this.isDashing) {
      speed *= 2.8;
      this.dashDurationTimer -= dt;
      if (this.dashDurationTimer <= 0) {
        this.isDashing = false;
      }
    }

    if (moveX !== 0 || moveY !== 0) {
      this.facingX = moveX;
      this.facingY = moveY;
      this.isMoving = true;
      this.walkCycle += dt * 14;

      this.playerX += moveX * speed * dt;
      this.playerY += moveY * speed * dt;
    } else {
      this.isMoving = false;
    }

    // Arena Boundaries
    const halfW = this.roomWidth / 2 - 25;
    const halfH = this.roomHeight / 2 - 25;
    this.playerX = Math.max(-halfW, Math.min(halfW, this.playerX));
    this.playerY = Math.max(-halfH, Math.min(halfH, this.playerY));

    if (this.slashTimer > 0) {
      this.slashTimer -= dt;
    }
  }

  private keyState: Record<string, boolean> = {};
  public handleKeyDown(code: string) {
    this.keyState[code] = true;
    if (code === 'Space') {
      this.triggerDash();
    }
  }
  public handleKeyUp(code: string) {
    this.keyState[code] = false;
  }

  public triggerDash() {
    if (this.dashCooldownTimer <= 0 && !this.isDashing) {
      this.isDashing = true;
      this.dashDurationTimer = 0.22;
      this.dashCooldownTimer = this.baseStats.dashCooldown;
      sound.playDash();
      sound.triggerHaptic('medium');

      // Dash particles
      for (let i = 0; i < 8; i++) {
        this.particles.push({
          x: this.playerX,
          y: this.playerY,
          vx: (Math.random() - 0.5) * 60,
          vy: (Math.random() - 0.5) * 60,
          life: 0.25,
          maxLife: 0.25,
          size: 4,
          color: '#60a5fa',
        });
      }
    }
  }

  private updateSkills(dt: number) {
    this.orbitAngle += dt * 3.5;

    // 1. Spinning blades active check
    const blades = this.acquiredSkills.get('spinning_blades');
    if (blades) {
      const bladeCount = 1 + blades.level;
      const bladeDist = 65;
      for (let i = 0; i < bladeCount; i++) {
        const angle = this.orbitAngle + (i * Math.PI * 2) / bladeCount;
        const bx = this.playerX + Math.cos(angle) * bladeDist;
        const by = this.playerY + Math.sin(angle) * bladeDist;

        // Check collision with enemies
        this.enemies.forEach(enemy => {
          const dist = Math.hypot(enemy.x - bx, enemy.y - by);
          if (dist < enemy.radius + 14) {
            this.hitEnemy(enemy, (this.baseStats.damageMultiplier * 0.7) / (bladeCount * 0.4), false, '#60a5fa');
          }
        });
      }
    }

    // 2. Holy aura damage tick
    const aura = this.acquiredSkills.get('holy_aura');
    if (aura) {
      const auraTimer = (this.attackTimers['holy_aura'] || 0) + dt;
      if (auraTimer >= 0.5) {
        this.attackTimers['holy_aura'] = 0;
        const auraRadius = 100 + aura.level * 15;
        this.enemies.forEach(e => {
          if (Math.hypot(e.x - this.playerX, e.y - this.playerY) < auraRadius) {
            this.hitEnemy(e, this.baseStats.damageMultiplier * 0.45 * aura.level, false, '#facc15');
          }
        });
      } else {
        this.attackTimers['holy_aura'] = auraTimer;
      }
    }

    // 3. Arcane Missiles auto-target & shoot
    const missile = this.acquiredSkills.get('arcane_missile');
    if (missile) {
      const timer = (this.attackTimers['arcane_missile'] || 0) + dt;
      const interval = Math.max(0.4, 1.2 - missile.level * 0.15);
      if (timer >= interval) {
        this.attackTimers['arcane_missile'] = 0;
        this.fireArcaneMissile(missile.level);
      } else {
        this.attackTimers['arcane_missile'] = timer;
      }
    }

    // 4. Poison Kunai
    const kunai = this.acquiredSkills.get('poison_kunai');
    if (kunai) {
      const timer = (this.attackTimers['poison_kunai'] || 0) + dt;
      const interval = Math.max(0.5, 1.4 - kunai.level * 0.16);
      if (timer >= interval) {
        this.attackTimers['poison_kunai'] = 0;
        this.firePoisonKunai(kunai.level);
      } else {
        this.attackTimers['poison_kunai'] = timer;
      }
    }

    // 5. Frost Nova
    const frost = this.acquiredSkills.get('frost_nova');
    if (frost) {
      const timer = (this.attackTimers['frost_nova'] || 0) + dt;
      const interval = Math.max(2.0, 4.0 - frost.level * 0.4);
      if (timer >= interval) {
        this.attackTimers['frost_nova'] = 0;
        this.triggerFrostNova(frost.level);
      } else {
        this.attackTimers['frost_nova'] = timer;
      }
    }

    // 6. Chain Lightning
    const lightning = this.acquiredSkills.get('chain_lightning');
    if (lightning) {
      const timer = (this.attackTimers['chain_lightning'] || 0) + dt;
      const interval = Math.max(1.8, 3.8 - lightning.level * 0.35);
      if (timer >= interval) {
        this.attackTimers['chain_lightning'] = 0;
        this.triggerChainLightning(lightning.level);
      } else {
        this.attackTimers['chain_lightning'] = timer;
      }
    }

    // Default basic class slash when near enemies
    const defaultTimer = (this.attackTimers['default_slash'] || 0) + dt;
    if (defaultTimer >= 0.75) {
      this.attackTimers['default_slash'] = 0;
      this.performBasicAttack();
    } else {
      this.attackTimers['default_slash'] = defaultTimer;
    }
  }

  private performBasicAttack() {
    const target = this.getNearestEnemy();
    if (!target) return;

    const dist = Math.hypot(target.x - this.playerX, target.y - this.playerY);
    if (dist < 120) {
      this.slashTimer = 0.2;
      this.slashAngle = Math.atan2(target.y - this.playerY, target.x - this.playerX);
      sound.playSlash();

      // Damage enemies in front arc
      this.enemies.forEach(e => {
        const d = Math.hypot(e.x - this.playerX, e.y - this.playerY);
        if (d < 110) {
          const angleToE = Math.atan2(e.y - this.playerY, e.x - this.playerX);
          const diff = Math.abs(angleToE - this.slashAngle);
          if (diff < Math.PI / 3 || diff > Math.PI * 1.66) {
            this.hitEnemy(e, this.baseStats.damageMultiplier, true, '#ffffff');
          }
        }
      });
    }
  }

  private fireArcaneMissile(level: number) {
    const target = this.getNearestEnemy();
    if (!target) return;

    sound.playCast();
    const count = 1 + Math.floor(level / 2);
    for (let i = 0; i < count; i++) {
      const spread = (i - (count - 1) / 2) * 0.2;
      const angle = Math.atan2(target.y - this.playerY, target.x - this.playerX) + spread;
      const speed = 360;

      this.projectiles.push({
        id: this.nextEntityId++,
        x: this.playerX,
        y: this.playerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 6,
        damage: this.baseStats.damageMultiplier * (0.9 + level * 0.2),
        isPlayer: true,
        piercing: level >= 4 ? 2 : 1,
        color: '#f43f5e',
        lifetime: 2.5,
        trail: [],
      });
    }
  }

  private firePoisonKunai(level: number) {
    const target = this.getNearestEnemy();
    sound.playSlash();
    const count = 2 + level;
    const baseAngle = target ? Math.atan2(target.y - this.playerY, target.x - this.playerX) : Math.atan2(this.facingY, this.facingX);

    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i - (count - 1) / 2) * 0.18;
      const speed = 400;

      this.projectiles.push({
        id: this.nextEntityId++,
        x: this.playerX,
        y: this.playerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 5,
        damage: this.baseStats.damageMultiplier * (0.65 + level * 0.15),
        isPlayer: true,
        piercing: 1,
        color: '#10b981',
        lifetime: 1.8,
        isPoison: true,
        trail: [],
      });
    }
  }

  private triggerFrostNova(level: number) {
    sound.playCast();
    const novaRadius = 140 + level * 20;

    // Visual ring particle burst
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI * 2) / 24;
      this.particles.push({
        x: this.playerX + Math.cos(a) * 20,
        y: this.playerY + Math.sin(a) * 20,
        vx: Math.cos(a) * 180,
        vy: Math.sin(a) * 180,
        life: 0.4,
        maxLife: 0.4,
        size: 5,
        color: '#38bdf8',
      });
    }

    this.enemies.forEach(e => {
      const dist = Math.hypot(e.x - this.playerX, e.y - this.playerY);
      if (dist < novaRadius) {
        this.hitEnemy(e, this.baseStats.damageMultiplier * (0.8 + level * 0.25), true, '#38bdf8');
        e.speed *= 0.5; // slow down
        setTimeout(() => {
          if (e) e.speed *= 2;
        }, 1500);
      }
    });
  }

  private triggerChainLightning(level: number) {
    if (this.enemies.length === 0) return;
    sound.playCast();

    let current = this.getNearestEnemy();
    let hitTargets: Enemy[] = [];
    let chainsLeft = 2 + level;

    while (current && chainsLeft > 0) {
      hitTargets.push(current);
      this.hitEnemy(current, this.baseStats.damageMultiplier * (1.1 + level * 0.3), true, '#fbbf24');

      // Spark particles
      for (let p = 0; p < 6; p++) {
        this.particles.push({
          x: current.x,
          y: current.y,
          vx: (Math.random() - 0.5) * 120,
          vy: (Math.random() - 0.5) * 120,
          life: 0.2,
          maxLife: 0.2,
          size: 3,
          color: '#facc15',
        });
      }

      // Next closest unhit enemy
      const candidates = this.enemies.filter(e => !hitTargets.includes(e));
      if (candidates.length === 0) break;
      candidates.sort((a, b) => Math.hypot(a.x - current!.x, a.y - current!.y) - Math.hypot(b.x - current!.x, b.y - current!.y));
      current = candidates[0];
      chainsLeft--;
    }
  }

  private updateSpawner(dt: number) {
    if (!this.currentWaveConfig) return;

    if (this.spawnedInWave < this.currentWaveConfig.enemyCount) {
      this.waveTimer += dt;
      if (this.waveTimer >= this.currentWaveConfig.spawnInterval) {
        this.waveTimer = 0;

        // If boss floor and first spawn, spawn boss!
        if (this.currentWaveConfig.hasBoss && this.spawnedInWave === 0) {
          this.spawnBoss();
          this.spawnedInWave++;
        } else {
          const spawnCount = Math.min(2, this.currentWaveConfig.enemyCount - this.spawnedInWave);
          for (let i = 0; i < spawnCount; i++) {
            this.spawnRandomEnemy();
            this.spawnedInWave++;
          }
        }
      }
    }
  }

  private spawnBoss() {
    this.enemies.push({
      id: this.nextEntityId++,
      type: 'demon_boss',
      name: 'Belial, Señor del Abismo',
      x: 0,
      y: -300,
      radius: 32,
      hp: 1200 + this.floor * 400,
      maxHp: 1200 + this.floor * 400,
      damage: 28 + this.floor * 3,
      speed: 1.6,
      xpValue: 120,
      goldValue: 90,
      isBoss: true,
      isElite: true,
      attackCooldown: 2.2,
      attackTimer: 0,
      color: '#ef4444',
      animFrame: 0,
      hitFlashTimer: 0,
    });
  }

  private spawnRandomEnemy() {
    if (!this.currentWaveConfig) return;

    // Pick type by weight
    const totalWeight = this.currentWaveConfig.enemyTypes.reduce((acc, t) => acc + t.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosenType: EnemyType = 'skeleton';

    for (const t of this.currentWaveConfig.enemyTypes) {
      if (rand < t.weight) {
        chosenType = t.type;
        break;
      }
      rand -= t.weight;
    }

    // Spawn at room edges
    const angle = Math.random() * Math.PI * 2;
    const dist = 380;
    const x = Math.max(-this.roomWidth / 2 + 40, Math.min(this.roomWidth / 2 - 40, this.playerX + Math.cos(angle) * dist));
    const y = Math.max(-this.roomHeight / 2 + 40, Math.min(this.roomHeight / 2 - 40, this.playerY + Math.sin(angle) * dist));

    const floorScale = 1 + (this.floor - 1) * 0.22;
    let hp = 45 * floorScale;
    let damage = 10 * floorScale;
    let speed = 2.1;
    let radius = 14;
    let xpValue = 10;
    let goldValue = 4;
    let name = 'Esqueleto';

    if (chosenType === 'bat') {
      name = 'Murciélago Abisal';
      hp = 25 * floorScale;
      speed = 3.3;
      radius = 12;
      damage = 8 * floorScale;
      xpValue = 8;
    } else if (chosenType === 'goblin_archer') {
      name = 'Tirador Sombrío';
      hp = 35 * floorScale;
      speed = 2.0;
      damage = 12 * floorScale;
      xpValue = 14;
      goldValue = 6;
    } else if (chosenType === 'necromancer') {
      name = 'Cultista del Velo';
      hp = 65 * floorScale;
      speed = 1.7;
      damage = 16 * floorScale;
      xpValue = 22;
      goldValue = 10;
    } else if (chosenType === 'minotaur') {
      name = 'Minotauro Acorazado';
      hp = 160 * floorScale;
      speed = 1.8;
      radius = 20;
      damage = 22 * floorScale;
      xpValue = 35;
      goldValue = 16;
    }

    this.enemies.push({
      id: this.nextEntityId++,
      type: chosenType,
      name,
      x,
      y,
      radius,
      hp: Math.round(hp),
      maxHp: Math.round(hp),
      damage: Math.round(damage),
      speed,
      xpValue,
      goldValue,
      isBoss: false,
      isElite: Math.random() < 0.12,
      attackCooldown: chosenType === 'goblin_archer' ? 2.5 : 1.2,
      attackTimer: 0,
      color: '#ffffff',
      animFrame: 0,
      hitFlashTimer: 0,
    });
  }

  private updateEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.hitFlashTimer > 0) e.hitFlashTimer -= dt;

      const dx = this.playerX - e.x;
      const dy = this.playerY - e.y;
      const distToPlayer = Math.hypot(dx, dy);

      // AI Logic
      if (e.type === 'goblin_archer' || e.type === 'necromancer') {
        // Keep distance & shoot
        if (distToPlayer < 220) {
          // Back away
          e.x -= (dx / distToPlayer) * e.speed * 40 * dt;
          e.y -= (dy / distToPlayer) * e.speed * 40 * dt;
        } else if (distToPlayer > 300) {
          // Move closer
          e.x += (dx / distToPlayer) * e.speed * 40 * dt;
          e.y += (dy / distToPlayer) * e.speed * 40 * dt;
        }

        // Ranged attack
        e.attackTimer += dt;
        if (e.attackTimer >= e.attackCooldown) {
          e.attackTimer = 0;
          this.fireEnemyProjectile(e);
        }
      } else if (e.type === 'minotaur') {
        // Minotaur charge behavior
        if (!e.isCharging) {
          e.chargeTimer = (e.chargeTimer || 0) + dt;
          if (e.chargeTimer > 3.0 && distToPlayer < 350) {
            e.isCharging = true;
            e.chargeTimer = 0;
            e.chargeTargetX = this.playerX;
            e.chargeTargetY = this.playerY;
          } else {
            // Normal walk
            e.x += (dx / distToPlayer) * e.speed * 40 * dt;
            e.y += (dy / distToPlayer) * e.speed * 40 * dt;
          }
        } else {
          // High speed charge to target
          const cdx = (e.chargeTargetX || 0) - e.x;
          const cdy = (e.chargeTargetY || 0) - e.y;
          const cdist = Math.hypot(cdx, cdy);
          if (cdist < 15) {
            e.isCharging = false;
          } else {
            e.x += (cdx / cdist) * e.speed * 120 * dt;
            e.y += (cdy / cdist) * e.speed * 120 * dt;
          }
        }
      } else if (e.type === 'demon_boss') {
        // Boss moves steadily towards player and casts fire rings
        e.x += (dx / distToPlayer) * e.speed * 40 * dt;
        e.y += (dy / distToPlayer) * e.speed * 40 * dt;

        e.attackTimer += dt;
        if (e.attackTimer >= e.attackCooldown) {
          e.attackTimer = 0;
          this.bossCastFireRing(e);
        }
      } else {
        // Basic melee tracker (Skeleton, Bat)
        e.x += (dx / distToPlayer) * e.speed * 45 * dt;
        e.y += (dy / distToPlayer) * e.speed * 45 * dt;
      }

      // Check collision with player
      if (distToPlayer < e.radius + 15 && !this.isDashing) {
        this.hitPlayer(e.damage);
      }
    }
  }

  private fireEnemyProjectile(e: Enemy) {
    const angle = Math.atan2(this.playerY - e.y, this.playerX - e.x);
    const speed = 190;
    this.projectiles.push({
      id: this.nextEntityId++,
      x: e.x,
      y: e.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 6,
      damage: e.damage,
      isPlayer: false,
      piercing: 1,
      color: e.type === 'necromancer' ? '#c084fc' : '#22c55e',
      lifetime: 3.5,
      trail: [],
    });
  }

  private bossCastFireRing(boss: Enemy) {
    sound.playBossRoar();
    const count = 10;
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count;
      const speed = 160;
      this.projectiles.push({
        id: this.nextEntityId++,
        x: boss.x,
        y: boss.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 8,
        damage: boss.damage * 0.9,
        isPlayer: false,
        piercing: 1,
        color: '#f97316',
        lifetime: 4.0,
        trail: [],
      });
    }
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.lifetime -= dt;

      if (p.lifetime <= 0) {
        this.projectiles.splice(i, 1);
        continue;
      }

      if (p.isPlayer) {
        // Hit check against enemies
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.hypot(e.x - p.x, e.y - p.y) < e.radius + p.radius) {
            this.hitEnemy(e, p.damage, true, p.color);
            p.piercing--;
            if (p.piercing <= 0) {
              this.projectiles.splice(i, 1);
              break;
            }
          }
        }
      } else {
        // Hit check against player
        if (Math.hypot(this.playerX - p.x, this.playerY - p.y) < 16 + p.radius && !this.isDashing) {
          this.hitPlayer(p.damage);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private hitEnemy(enemy: Enemy, rawDamage: number, canCrit: boolean = true, sparkColor: string = '#ffffff') {
    let damage = rawDamage;
    let isCrit = false;

    if (canCrit && Math.random() < this.baseStats.critRate) {
      damage *= this.baseStats.critDamage;
      isCrit = true;
      sound.playCrit();
      sound.triggerHaptic('medium');
    } else {
      sound.playHit();
    }

    damage = Math.max(1, Math.round(damage));
    enemy.hp -= damage;
    enemy.hitFlashTimer = 0.08;

    // Floating damage text
    this.floatingTexts.push({
      id: this.nextEntityId++,
      x: enemy.x + (Math.random() - 0.5) * 20,
      y: enemy.y - 15,
      text: isCrit ? `¡CRIT! -${damage}` : `-${damage}`,
      color: isCrit ? '#facc15' : '#ffffff',
      life: 0.7,
      maxLife: 0.7,
      isCrit,
    });

    // Blood / spark particles
    for (let p = 0; p < 4; p++) {
      this.particles.push({
        x: enemy.x,
        y: enemy.y,
        vx: (Math.random() - 0.5) * 80,
        vy: (Math.random() - 0.5) * 80,
        life: 0.25,
        maxLife: 0.25,
        size: 3,
        color: sparkColor,
      });
    }

    // Death Check
    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  private killEnemy(enemy: Enemy) {
    const idx = this.enemies.indexOf(enemy);
    if (idx !== -1) {
      this.enemies.splice(idx, 1);
      this.monstersSlain++;

      // Drop XP Gems
      const xpVal = Math.round(enemy.xpValue * this.baseStats.expMultiplier);
      this.loot.push({
        id: this.nextEntityId++,
        type: 'gem_xp',
        x: enemy.x,
        y: enemy.y,
        value: xpVal,
        color: enemy.isBoss ? '#c084fc' : '#60a5fa',
        collected: false,
      });

      // Drop Gold
      const goldVal = Math.round(enemy.goldValue * this.baseStats.goldMultiplier);
      if (goldVal > 0) {
        this.loot.push({
          id: this.nextEntityId++,
          type: 'gold',
          x: enemy.x + (Math.random() - 0.5) * 16,
          y: enemy.y + (Math.random() - 0.5) * 16,
          value: goldVal,
          color: '#f59e0b',
          collected: false,
        });
      }

      // Chance for Health Flask
      if (Math.random() < 0.08) {
        this.loot.push({
          id: this.nextEntityId++,
          type: 'potion_hp',
          x: enemy.x,
          y: enemy.y,
          value: 30,
          color: '#ef4444',
          collected: false,
        });
      }

      // Boss special chest drop
      if (enemy.isBoss) {
        this.loot.push({
          id: this.nextEntityId++,
          type: 'chest',
          x: enemy.x,
          y: enemy.y,
          value: 100,
          color: '#eab308',
          collected: false,
        });
        sound.playVictory();
      }

      // Vampire skill lifesteal check
      const vamp = this.acquiredSkills.get('vampire_fangs');
      if (vamp) {
        const heal = Math.round(this.baseStats.maxHp * 0.03 * vamp.level);
        this.playerHp = Math.min(this.baseStats.maxHp, this.playerHp + heal);
      }
    }
  }

  private hitPlayer(damage: number) {
    if (this.isEnded) return;

    // Stone skin / armor calculation
    const effectiveDamage = Math.max(1, Math.round(damage - this.baseStats.defense * 0.5));
    this.playerHp -= effectiveDamage;
    sound.playPlayerHurt();
    sound.triggerHaptic('heavy');

    this.floatingTexts.push({
      id: this.nextEntityId++,
      x: this.playerX,
      y: this.playerY - 20,
      text: `-${effectiveDamage}`,
      color: '#ef4444',
      life: 0.7,
      maxLife: 0.7,
    });

    if (this.playerHp <= 0) {
      this.playerHp = 0;
      this.isEnded = true;
      sound.playGameOver();
      this.callbacks.onGameOver({
        floorReached: this.floor,
        monstersSlain: this.monstersSlain,
        goldEarned: this.runGold,
        soulShardsEarned: this.runSoulShards,
        timeSurvivedSeconds: Math.floor((Date.now() - this.runStartTime) / 1000),
        victory: false,
      });
    }
  }

  private updateLoot(dt: number) {
    const pickupDist = this.baseStats.pickupRadius;

    for (let i = this.loot.length - 1; i >= 0; i--) {
      const item = this.loot[i];
      const dx = this.playerX - item.x;
      const dy = this.playerY - item.y;
      const dist = Math.hypot(dx, dy);

      // Magnetic attraction to player
      if (dist < pickupDist) {
        const speed = 320;
        item.x += (dx / dist) * speed * dt;
        item.y += (dy / dist) * speed * dt;

        // Pickup collection
        if (dist < 25) {
          if (item.type === 'gem_xp') {
            this.gainXp(item.value);
            sound.playGem();
          } else if (item.type === 'gold') {
            this.runGold += item.value;
            sound.playCoin();
          } else if (item.type === 'potion_hp') {
            this.playerHp = Math.min(this.baseStats.maxHp, this.playerHp + item.value);
            sound.playLevelUp();
            this.floatingTexts.push({
              id: this.nextEntityId++,
              x: this.playerX,
              y: this.playerY - 25,
              text: `+${item.value} HP`,
              color: '#22c55e',
              life: 0.8,
              maxLife: 0.8,
            });
          } else if (item.type === 'chest') {
            sound.playChest();
            const goldFound = 80 + this.floor * 25;
            const soulsFound = 2 + Math.floor(this.floor / 3);
            this.runGold += goldFound;
            this.runSoulShards += soulsFound;
            this.callbacks.onChestReward(goldFound, soulsFound);
          }
          this.loot.splice(i, 1);
        }
      }
    }
  }

  private gainXp(amount: number) {
    this.runXp += amount;
    if (this.runXp >= this.runNextXp) {
      this.runXp -= this.runNextXp;
      this.runLevel++;
      this.runNextXp = Math.round(this.runNextXp * 1.45 + 10);
      sound.playLevelUp();
      sound.triggerHaptic('medium');

      // Trigger level-up modal with 3 choices
      this.isPaused = true;
      const choices = this.generateSkillChoices();
      this.callbacks.onLevelUp(choices);
    }
  }

  public applySkillChoice(skillId: string) {
    const existing = this.acquiredSkills.get(skillId);
    if (existing) {
      existing.level++;
    } else {
      this.acquiredSkills.set(skillId, {
        id: skillId,
        level: 1,
        cooldownTimer: 0,
      });
    }

    // Apply immediate passive stat boosts if applicable
    const skillDef = SKILL_POOL.find(s => s.id === skillId);
    if (skillDef && skillDef.type === 'passive') {
      if (skillId === 'might_boost') {
        this.baseStats.damageMultiplier *= 1.2;
      } else if (skillId === 'vitality_boost') {
        this.baseStats.maxHp = Math.round(this.baseStats.maxHp * 1.25);
        this.playerHp = Math.min(this.baseStats.maxHp, this.playerHp + 30);
      } else if (skillId === 'swift_boots') {
        this.baseStats.moveSpeed *= 1.15;
      } else if (skillId === 'critical_eye') {
        this.baseStats.critRate = Math.min(0.85, this.baseStats.critRate + 0.12);
        this.baseStats.critDamage += 0.3;
      } else if (skillId === 'magnetic_pull') {
        this.baseStats.pickupRadius += 50;
      } else if (skillId === 'stone_skin') {
        this.baseStats.defense += 4;
      }
    }

    this.isPaused = false;
  }

  private generateSkillChoices(): string[] {
    const available = SKILL_POOL.filter(s => {
      const current = this.acquiredSkills.get(s.id);
      return !current || current.level < s.maxLevel;
    });

    // Shuffle & pick 3
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3).map(s => s.id);
  }

  private checkFloorCompletion() {
    if (!this.portalOpen && this.spawnedInWave >= this.totalEnemiesInFloor && this.enemies.length === 0) {
      this.portalOpen = true;
      sound.playVictory();
    }

    // Check if player enters portal
    if (this.portalOpen) {
      const distToPortal = Math.hypot(this.playerX - this.portalX, this.playerY - this.portalY);
      if (distToPortal < 45) {
        sound.playCast();
        this.callbacks.onFloorComplete(this.floor);
        this.startFloor(this.floor + 1);
      }
    }
  }

  private updateParticlesAndText(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const t = this.floatingTexts[i];
      t.y -= 30 * dt;
      t.life -= dt;
      if (t.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  private getNearestEnemy(): Enemy | null {
    if (this.enemies.length === 0) return null;
    let closest: Enemy | null = null;
    let minDist = Infinity;

    this.enemies.forEach(e => {
      const d = Math.hypot(e.x - this.playerX, e.y - this.playerY);
      if (d < minDist) {
        minDist = d;
        closest = e;
      }
    });

    return closest;
  }

  private emitStats() {
    const boss = this.enemies.find(e => e.isBoss);
    this.callbacks.onStatsUpdate({
      hp: Math.round(this.playerHp),
      maxHp: this.baseStats.maxHp,
      level: this.runLevel,
      xp: this.runXp,
      nextXp: this.runNextXp,
      gold: this.runGold,
      soulShards: this.runSoulShards,
      floor: this.floor,
      dashCooldownPercent: Math.max(0, this.dashCooldownTimer / this.baseStats.dashCooldown),
      enemiesLeft: Math.max(0, this.totalEnemiesInFloor - this.spawnedInWave + this.enemies.length),
      bossHp: boss ? { current: boss.hp, max: boss.maxHp, name: boss.name } : undefined,
    });
  }

  public getRenderData(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const blades = this.acquiredSkills.get('spinning_blades');
    const holyAura = this.acquiredSkills.has('holy_aura');

    return {
      ctx,
      width,
      height,
      player: {
        x: this.playerX,
        y: this.playerY,
        radius: 16,
        facingX: this.facingX,
        facingY: this.facingY,
        classId: this.classId,
        isMoving: this.isMoving,
        isDashing: this.isDashing,
        walkCycle: this.walkCycle,
        slashTimer: this.slashTimer,
        slashAngle: this.slashAngle,
        holyAuraActive: holyAura,
        orbitBladesCount: blades ? 1 + blades.level : 0,
        orbitAngle: this.orbitAngle,
      },
      enemies: this.enemies,
      projectiles: this.projectiles,
      loot: this.loot,
      particles: this.particles,
      floatingTexts: this.floatingTexts,
      joystick: this.joystick,
      roomWidth: this.roomWidth,
      roomHeight: this.roomHeight,
      portalOpen: this.portalOpen,
      portalX: this.portalX,
      portalY: this.portalY,
      camera: this.camera,
    };
  }
}
