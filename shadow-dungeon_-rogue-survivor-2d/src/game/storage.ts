import { CharacterClassId, EquipmentItem, ItemSlot, PlayerSaveData, PlayerStats } from './types';
import { HERO_CLASSES, INITIAL_EQUIPMENT, TALENTS_CONFIG } from './constants';

const STORAGE_KEY = 'shadow_dungeon_save_v1';

export const DEFAULT_SAVE_DATA: PlayerSaveData = {
  gold: 150,
  soulShards: 5,
  selectedClass: 'warrior',
  unlockedClasses: ['warrior', 'mage', 'rogue'],
  talents: {
    might: 0,
    vitality: 0,
    defense: 0,
    agility: 0,
    lethality: 0,
    regen: 0,
    magnet: 0,
    greed: 0,
  },
  inventory: [...INITIAL_EQUIPMENT],
  equipped: {
    weapon: INITIAL_EQUIPMENT[0],
    armor: INITIAL_EQUIPMENT[1],
    relic: INITIAL_EQUIPMENT[2],
    boots: INITIAL_EQUIPMENT[3],
  },
  stats: {
    runsPlayed: 0,
    highestFloor: 1,
    totalKills: 0,
    totalGoldEarned: 0,
    bossesDefeated: 0,
  },
  bestiary: {
    skeleton: 0,
    bat: 0,
    goblin_archer: 0,
    necromancer: 0,
    minotaur: 0,
    demon_boss: 0,
  },
  settings: {
    soundEnabled: true,
    musicEnabled: true,
    hapticsEnabled: true,
    joystickMode: 'floating',
    language: 'es',
  },
};

export function loadSaveData(): PlayerSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SAVE_DATA;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SAVE_DATA,
      ...parsed,
      stats: { ...DEFAULT_SAVE_DATA.stats, ...(parsed.stats || {}) },
      bestiary: { ...DEFAULT_SAVE_DATA.bestiary, ...(parsed.bestiary || {}) },
      settings: { ...DEFAULT_SAVE_DATA.settings, ...(parsed.settings || {}) },
      talents: { ...DEFAULT_SAVE_DATA.talents, ...(parsed.talents || {}) },
      equipped: { ...DEFAULT_SAVE_DATA.equipped, ...(parsed.equipped || {}) },
    };
  } catch (e) {
    console.error('Error loading save data:', e);
    return DEFAULT_SAVE_DATA;
  }
}

export function saveGameData(data: PlayerSaveData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving game data:', e);
  }
}

/**
 * Calculates current effective player base stats from:
 * 1. Base Class attributes
 * 2. Talent Tree levels
 * 3. Equipped Gear bonuses
 */
export function computeEffectiveStats(data: PlayerSaveData, classId?: CharacterClassId): PlayerStats {
  const chosenClass = HERO_CLASSES[classId || data.selectedClass] || HERO_CLASSES.warrior;

  let maxHp = chosenClass.baseHp;
  let damage = chosenClass.baseDamage;
  let speed = chosenClass.baseSpeed;
  let defense = chosenClass.baseDefense;
  let critRate = chosenClass.baseCritRate;
  let critDamage = chosenClass.baseCritDamage;
  let healthRegen = chosenClass.baseRegen;
  let pickupRadius = 85;
  let goldMultiplier = 1.0;
  let expMultiplier = 1.0;

  // Apply Talents
  TALENTS_CONFIG.forEach(talent => {
    const level = data.talents[talent.id] || 0;
    if (level <= 0) return;

    if (talent.id === 'might') {
      damage += chosenClass.baseDamage * (talent.statBonusPerLevel * level);
    } else if (talent.id === 'vitality') {
      maxHp += talent.statBonusPerLevel * level;
    } else if (talent.id === 'defense') {
      defense += talent.statBonusPerLevel * level;
    } else if (talent.id === 'agility') {
      speed += talent.statBonusPerLevel * level;
    } else if (talent.id === 'lethality') {
      critRate += talent.statBonusPerLevel * level;
    } else if (talent.id === 'regen') {
      healthRegen += talent.statBonusPerLevel * level;
    } else if (talent.id === 'magnet') {
      pickupRadius += talent.statBonusPerLevel * level;
    } else if (talent.id === 'greed') {
      goldMultiplier += talent.statBonusPerLevel * level;
    }
  });

  // Apply Equipped Gear
  Object.values(data.equipped).forEach(item => {
    if (!item) return;
    const itemLevelScale = 1 + (item.level - 1) * 0.15;
    const effectiveVal = item.statValue * itemLevelScale;

    switch (item.statType) {
      case 'damage':
        damage += effectiveVal;
        break;
      case 'hp':
        maxHp += effectiveVal;
        break;
      case 'defense':
        defense += effectiveVal;
        break;
      case 'speed':
        speed += effectiveVal * 0.5;
        break;
      case 'crit':
        critRate += effectiveVal;
        break;
    }
  });

  return {
    maxHp: Math.round(maxHp),
    currentHp: Math.round(maxHp),
    damageMultiplier: damage,
    defense: Math.round(defense),
    moveSpeed: Number(speed.toFixed(2)),
    critRate: Number(Math.min(0.85, critRate).toFixed(2)),
    critDamage: Number(critDamage.toFixed(2)),
    healthRegen: Number(healthRegen.toFixed(1)),
    pickupRadius: Math.round(pickupRadius),
    goldMultiplier: Number(goldMultiplier.toFixed(2)),
    expMultiplier: Number(expMultiplier.toFixed(2)),
    dashCooldown: 3.5, // seconds
  };
}
