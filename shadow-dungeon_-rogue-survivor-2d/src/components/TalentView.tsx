import React from 'react';
import { PlayerSaveData } from '../game/types';
import { TALENTS_CONFIG } from '../game/constants';
import { sound } from '../game/audio';
import {
  Flame,
  Heart,
  Shield,
  Wind,
  Crosshair,
  Activity,
  Radio,
  Coins,
  Gem,
  Plus,
  Check,
} from 'lucide-react';

interface TalentViewProps {
  saveData: PlayerSaveData;
  onUpgradeTalent: (talentId: string) => void;
}

export const TalentView: React.FC<TalentViewProps> = ({ saveData, onUpgradeTalent }) => {
  const getTalentIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-amber-400" />;
      case 'Heart':
        return <Heart className="w-5 h-5 text-rose-400" />;
      case 'Shield':
        return <Shield className="w-5 h-5 text-blue-400" />;
      case 'Wind':
        return <Wind className="w-5 h-5 text-cyan-400" />;
      case 'Crosshair':
        return <Crosshair className="w-5 h-5 text-orange-400" />;
      case 'Activity':
        return <Activity className="w-5 h-5 text-emerald-400" />;
      case 'Radio':
        return <Radio className="w-5 h-5 text-purple-400" />;
      case 'Coins':
        return <Coins className="w-5 h-5 text-yellow-400" />;
      default:
        return <Flame className="w-5 h-5 text-amber-400" />;
    }
  };

  const handleUpgrade = (talentId: string) => {
    sound.playLevelUp();
    sound.triggerHaptic('medium');
    onUpgradeTalent(talentId);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
      {/* Title & Currency Balance Banner */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3.5 rounded-3xl">
        <div className="flex flex-col">
          <h2 className="text-base font-cinzel font-bold text-white">Árbol de Talentos</h2>
          <span className="text-[11px] text-slate-400">Mejoras permanentes para tus héroes</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono font-bold text-amber-300">{saveData.gold}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
            <Gem className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-mono font-bold text-purple-300">{saveData.soulShards}</span>
          </div>
        </div>
      </div>

      {/* Talent Nodes List */}
      <div className="flex flex-col gap-2.5">
        {TALENTS_CONFIG.map((talent) => {
          const currentLevel = saveData.talents[talent.id] || 0;
          const isMax = currentLevel >= talent.maxLevel;
          const goldCost = Math.round(talent.costPerLevel * (1 + currentLevel * 0.4));
          const soulCost = talent.soulCostPerLevel > 0 ? talent.soulCostPerLevel * (1 + Math.floor(currentLevel / 2)) : 0;
          const canAfford = !isMax && saveData.gold >= goldCost && saveData.soulShards >= soulCost;

          // Format current bonus
          let bonusText = '';
          if (talent.unit === '%') {
            bonusText = `+${Math.round(currentLevel * talent.statBonusPerLevel * 100)}%`;
          } else {
            bonusText = `+${(currentLevel * talent.statBonusPerLevel).toFixed(1)}${talent.unit}`;
          }

          return (
            <div
              key={talent.id}
              className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                isMax
                  ? 'bg-slate-950/80 border-slate-800/60 opacity-80'
                  : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Left: Icon & Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                  {getTalentIcon(talent.icon)}
                </div>

                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-white text-xs truncate">{talent.name}</h4>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {currentLevel}/{talent.maxLevel}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {talent.description}
                  </span>
                  <span className="text-[10px] text-blue-400 font-medium mt-0.5 font-mono">
                    Bono actual: {bonusText}
                  </span>
                </div>
              </div>

              {/* Right: Upgrade Button / Max Badge */}
              <div className="shrink-0 flex items-center">
                {isMax ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/40">
                    <Check className="w-3.5 h-3.5" /> Máximo
                  </span>
                ) : (
                  <button
                    disabled={!canAfford}
                    onClick={() => handleUpgrade(talent.id)}
                    className={`px-3 py-2 rounded-xl flex flex-col items-center justify-center min-w-[76px] transition-all active:scale-95 ${
                      canAfford
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-md shadow-blue-900/30'
                        : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-0.5">
                      <Plus className="w-3 h-3" /> Mejorar
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5">
                      <span className="flex items-center text-amber-300">
                        {goldCost}
                      </span>
                      {soulCost > 0 && (
                        <span className="flex items-center text-purple-300">
                          {soulCost}✦
                        </span>
                      )}
                    </div>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
