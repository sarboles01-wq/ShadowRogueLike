export type CharacterClassId = 'warrior' | 'mage' | 'rogue';

export interface CharacterClass {
  id: CharacterClassId;
  name: string;
  title: string;
  description: string;
  baseHp: number;
  baseDamage: number;
  baseSpeed: number;
  baseDefense: number;
  baseCritRate: number; // 0 to 1
  baseCritDamage: number; // 1.5 = 150%
  baseRegen: number; // HP per sec
  startingSkillId: string;
  color: string;
  iconName: string;
}

export interface PlayerStats {
  maxHp: number;
  currentHp: number;
  damageMultiplier: number;
  defense: number;
  moveSpeed: number;
  critRate: number;
  critDamage: number;
  healthRegen: number;
  pickupRadius: number;
  goldMultiplier: number;
  expMultiplier: number;
  dashCooldown: number;
}

export type SkillType = 'active' | 'passive';

export interface SkillUpgrade {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  maxLevel: number;
  icon: string;
  color: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface PlayerAcquiredSkill {
  id: string;
  level: number;
  cooldownTimer: number;
}

export type ItemRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type ItemSlot = 'weapon' | 'armor' | 'relic' | 'boots';

export interface EquipmentItem {
  id: string;
  name: string;
  slot: ItemSlot;
  rarity: ItemRarity;
  level: number;
  maxLevel: number;
  statType: 'damage' | 'hp' | 'defense' | 'speed' | 'crit';
  statValue: number;
  bonusText: string;
  icon: string;
  upgradeCostGold: number;
}

export interface TalentNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  maxLevel: number;
  costPerLevel: number;
  soulCostPerLevel: number;
  statBonusPerLevel: number;
  unit: string;
  statKey: keyof PlayerStats;
}

export type EnemyType = 'skeleton' | 'bat' | 'goblin_archer' | 'necromancer' | 'minotaur' | 'demon_boss';

export interface Enemy {
  id: number;
  type: EnemyType;
  name: string;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  damage: number;
  speed: number;
  xpValue: number;
  goldValue: number;
  isBoss: boolean;
  isElite: boolean;
  attackCooldown: number;
  attackTimer: number;
  chargeTimer?: number;
  isCharging?: boolean;
  chargeTargetX?: number;
  chargeTargetY?: number;
  color: string;
  animFrame: number;
  hitFlashTimer: number;
}

export interface Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  isPlayer: boolean;
  piercing: number;
  color: string;
  lifetime: number;
  trail: { x: number; y: number; alpha: number }[];
  isOrbit?: boolean;
  orbitAngle?: number;
  orbitDist?: number;
  freezeDuration?: number;
  isPoison?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface FloatingText {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  isCrit?: boolean;
}

export type LootType = 'gem_xp' | 'gold' | 'potion_hp' | 'chest';

export interface LootDrop {
  id: number;
  type: LootType;
  x: number;
  y: number;
  value: number;
  color: string;
  collected: boolean;
}

export interface DungeonWaveConfig {
  waveNumber: number;
  enemyCount: number;
  enemyTypes: { type: EnemyType; weight: number }[];
  spawnInterval: number;
  hasBoss?: boolean;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  joystickMode: 'floating' | 'fixed';
  language: 'es' | 'en';
}

export interface BestiaryEntry {
  type: EnemyType;
  name: string;
  description: string;
  kills: number;
  icon: string;
}

export interface PlayerSaveData {
  gold: number;
  soulShards: number;
  selectedClass: CharacterClassId;
  unlockedClasses: CharacterClassId[];
  talents: Record<string, number>;
  inventory: EquipmentItem[];
  equipped: Partial<Record<ItemSlot, EquipmentItem>>;
  stats: {
    runsPlayed: number;
    highestFloor: number;
    totalKills: number;
    totalGoldEarned: number;
    bossesDefeated: number;
  };
  bestiary: Record<string, number>;
  settings: GameSettings;
}
