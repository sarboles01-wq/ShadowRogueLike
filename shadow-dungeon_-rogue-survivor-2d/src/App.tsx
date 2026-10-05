import React, { useState, useEffect } from 'react';
import {
  CharacterClassId,
  EquipmentItem,
  GameSettings,
  PlayerSaveData,
  PlayerStats,
} from './game/types';
import {
  loadSaveData,
  saveGameData,
  computeEffectiveStats,
  DEFAULT_SAVE_DATA,
} from './game/storage';
import { RunSummary } from './game/engine';
import { sound } from './game/audio';
import { DungeonCanvas } from './components/DungeonCanvas';
import { LobbyView } from './components/LobbyView';
import { HeroSelectView } from './components/HeroSelectView';
import { TalentView } from './components/TalentView';
import { EquipmentView } from './components/EquipmentView';
import { BestiaryView } from './components/BestiaryView';
import { SettingsModal } from './components/SettingsModal';
import {
  Swords,
  Shield,
  TreePine,
  Sparkles,
  BookOpen,
  Settings,
  Coins,
  Gem,
  Smartphone,
} from 'lucide-react';

type ActiveTab = 'lobby' | 'hero' | 'talents' | 'equipment' | 'bestiary';

export default function App() {
  const [saveData, setSaveData] = useState<PlayerSaveData>(loadSaveData);
  const [activeTab, setActiveTab] = useState<ActiveTab>('lobby');
  const [isInRun, setIsInRun] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Synchronize state with persistent localStorage
  useEffect(() => {
    saveGameData(saveData);
  }, [saveData]);

  // Compute stats combining Class + Talents + Equipped gear
  const effectiveStats: PlayerStats = computeEffectiveStats(saveData);

  // Tab navigation handler
  const handleTabChange = (tab: ActiveTab) => {
    sound.triggerHaptic('light');
    setActiveTab(tab);
  };

  // Launch Dungeon Run
  const handleStartRun = () => {
    sound.playLevelUp();
    sound.triggerHaptic('medium');
    setIsInRun(true);
  };

  // Run Exit (Victory or Defeat)
  const handleExitRun = (summary: RunSummary) => {
    sound.triggerHaptic('medium');
    setSaveData((prev) => {
      const highest = Math.max(prev.stats.highestFloor, summary.floorReached);
      const totalKills = prev.stats.totalKills + summary.monstersSlain;
      const totalGold = prev.stats.totalGoldEarned + summary.goldEarned;

      return {
        ...prev,
        gold: prev.gold + summary.goldEarned,
        soulShards: prev.soulShards + summary.soulShardsEarned,
        stats: {
          ...prev.stats,
          runsPlayed: prev.stats.runsPlayed + 1,
          highestFloor: highest,
          totalKills,
          totalGoldEarned: totalGold,
        },
      };
    });
    setIsInRun(false);
  };

  // Select Hero Class
  const handleSelectClass = (classId: CharacterClassId) => {
    setSaveData((prev) => ({
      ...prev,
      selectedClass: classId,
    }));
  };

  // Upgrade Talent
  const handleUpgradeTalent = (talentId: string) => {
    setSaveData((prev) => {
      const currentLevel = prev.talents[talentId] || 0;
      const goldCost = Math.round(100 * (1 + currentLevel * 0.4));
      const soulCost = currentLevel >= 3 ? 1 : 0;

      if (prev.gold < goldCost || prev.soulShards < soulCost) return prev;

      return {
        ...prev,
        gold: prev.gold - goldCost,
        soulShards: prev.soulShards - soulCost,
        talents: {
          ...prev.talents,
          [talentId]: currentLevel + 1,
        },
      };
    });
  };

  // Equip Item
  const handleEquipItem = (item: EquipmentItem) => {
    setSaveData((prev) => ({
      ...prev,
      equipped: {
        ...prev.equipped,
        [item.slot]: item,
      },
    }));
  };

  // Upgrade Item at Forge
  const handleUpgradeItem = (item: EquipmentItem) => {
    setSaveData((prev) => {
      const upgradeCost = item.upgradeCostGold * item.level;
      if (prev.gold < upgradeCost) return prev;

      const updatedInventory = prev.inventory.map((inv) =>
        inv.id === item.id ? { ...inv, level: inv.level + 1 } : inv
      );

      const updatedEquipped = { ...prev.equipped };
      if (updatedEquipped[item.slot]?.id === item.id) {
        updatedEquipped[item.slot] = {
          ...updatedEquipped[item.slot]!,
          level: updatedEquipped[item.slot]!.level + 1,
        };
      }

      return {
        ...prev,
        gold: prev.gold - upgradeCost,
        inventory: updatedInventory,
        equipped: updatedEquipped,
      };
    });
  };

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSaveData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings },
    }));
  };

  // Reset Progress
  const handleResetData = () => {
    setSaveData(DEFAULT_SAVE_DATA);
  };

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 flex items-center justify-center p-0 md:p-3 overflow-hidden text-slate-100">
      {/* Mobile Frame Container (Max 430px wide, 100% height, feels native on mobile & tablet) */}
      <div className="w-full h-full md:max-w-[430px] md:h-[92vh] md:max-h-[890px] md:rounded-3xl bg-slate-950 flex flex-col relative overflow-hidden md:border md:border-slate-800 shadow-2xl">
        {/* If Active in Run: Show Fullscreen Dungeon Canvas */}
        {isInRun ? (
          <DungeonCanvas
            classId={saveData.selectedClass}
            baseStats={effectiveStats}
            joystickMode={saveData.settings.joystickMode}
            soundEnabled={saveData.settings.soundEnabled}
            onExitRun={handleExitRun}
          />
        ) : (
          /* Main Metagame UI */
          <>
            {/* Top Bar Contract (1 Row, 3 Zones: Brand Title, Balance, Action) */}
            <header className="h-14 px-4 border-b border-slate-800/80 bg-slate-950/95 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
              {/* Zone 1: Single text element wordmark */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-cinzel font-bold text-xs">
                  SD
                </div>
                <h1 className="text-sm font-bold font-cinzel tracking-wider text-slate-100 truncate">
                  Shadow Dungeon
                </h1>
              </div>

              {/* Zone 2: Currency Balances */}
              <div className="flex items-center gap-2.5 text-xs font-mono">
                <div className="flex items-center gap-1 text-amber-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                  <Coins className="w-3.5 h-3.5" />
                  <span className="tabular-nums font-bold">{saveData.gold}</span>
                </div>
                <div className="flex items-center gap-1 text-purple-400 bg-slate-900 px-2 py-1 rounded-lg border border-slate-800">
                  <Gem className="w-3.5 h-3.5" />
                  <span className="tabular-nums font-bold">{saveData.soulShards}</span>
                </div>
              </div>

              {/* Zone 3: Settings Action */}
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-100 active:scale-95 transition-transform"
                title="Ajustes"
              >
                <Settings className="w-4 h-4" />
              </button>
            </header>

            {/* Middle Content View Area */}
            <main className="flex-1 overflow-hidden flex flex-col relative bg-slate-950">
              {activeTab === 'lobby' && (
                <LobbyView
                  saveData={saveData}
                  effectiveStats={effectiveStats}
                  onStartRun={handleStartRun}
                  onNavigateTab={(tab) => handleTabChange(tab)}
                />
              )}
              {activeTab === 'hero' && (
                <HeroSelectView
                  saveData={saveData}
                  onSelectClass={handleSelectClass}
                />
              )}
              {activeTab === 'talents' && (
                <TalentView
                  saveData={saveData}
                  onUpgradeTalent={handleUpgradeTalent}
                />
              )}
              {activeTab === 'equipment' && (
                <EquipmentView
                  saveData={saveData}
                  onEquipItem={handleEquipItem}
                  onUpgradeItem={handleUpgradeItem}
                />
              )}
              {activeTab === 'bestiary' && (
                <BestiaryView saveData={saveData} />
              )}
            </main>

            {/* Bottom Ergonomic Thumb Navigation Bar (Max 15% mobile sticky cap) */}
            <nav className="h-16 px-2 bg-slate-950/95 backdrop-blur-md border-t border-slate-800/80 grid grid-cols-5 items-center shrink-0 z-20 pb-safe">
              <button
                onClick={() => handleTabChange('lobby')}
                className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
                  activeTab === 'lobby' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Swords className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-medium tracking-tight">Aventura</span>
              </button>

              <button
                onClick={() => handleTabChange('hero')}
                className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
                  activeTab === 'hero' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-medium tracking-tight">Héroes</span>
              </button>

              <button
                onClick={() => handleTabChange('talents')}
                className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
                  activeTab === 'talents' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <TreePine className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-medium tracking-tight">Talentos</span>
              </button>

              <button
                onClick={() => handleTabChange('equipment')}
                className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
                  activeTab === 'equipment' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-medium tracking-tight">Armería</span>
              </button>

              <button
                onClick={() => handleTabChange('bestiary')}
                className={`flex flex-col items-center justify-center py-1 transition-colors min-h-[44px] ${
                  activeTab === 'bestiary' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-5 h-5 mb-0.5" />
                <span className="text-[10px] font-medium tracking-tight">Bestiario</span>
              </button>
            </nav>
          </>
        )}

        {/* Settings Dialog Modal */}
        {showSettings && (
          <SettingsModal
            settings={saveData.settings}
            onUpdateSettings={handleUpdateSettings}
            onResetData={handleResetData}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </div>
  );
}
