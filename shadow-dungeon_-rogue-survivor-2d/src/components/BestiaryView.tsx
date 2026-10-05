import React from 'react';
import { PlayerSaveData } from '../game/types';
import { BESTIARY_CATALOG } from '../game/constants';
import { Skull, Feather, Crosshair, Ghost, ShieldAlert, Crown, Trophy, Swords, Flame, Coins } from 'lucide-react';

interface BestiaryViewProps {
  saveData: PlayerSaveData;
}

export const BestiaryView: React.FC<BestiaryViewProps> = ({ saveData }) => {
  const getEnemyIcon = (iconName: string) => {
    switch (iconName) {
      case 'Skull':
        return <Skull className="w-5 h-5 text-slate-300" />;
      case 'Feather':
        return <Feather className="w-5 h-5 text-indigo-400" />;
      case 'Crosshair':
        return <Crosshair className="w-5 h-5 text-emerald-400" />;
      case 'Ghost':
        return <Ghost className="w-5 h-5 text-purple-400" />;
      case 'ShieldAlert':
        return <ShieldAlert className="w-5 h-5 text-amber-500" />;
      case 'Crown':
        return <Crown className="w-5 h-5 text-rose-500" />;
      default:
        return <Skull className="w-5 h-5 text-slate-300" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
      {/* Title */}
      <div className="bg-slate-900/90 border border-slate-800 p-3.5 rounded-3xl">
        <h2 className="text-base font-cinzel font-bold text-white">Bestiario & Registros</h2>
        <span className="text-[11px] text-slate-400">
          Monstruos encontrados en las profundidades de la mazmorra
        </span>
      </div>

      {/* Global Records Banner */}
      <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 text-xs">
        <div className="flex items-center gap-2.5">
          <Trophy className="w-4 h-4 text-amber-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Récord de Piso</span>
            <span className="font-cinzel font-bold text-slate-100">
              Piso {saveData.stats.highestFloor}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Swords className="w-4 h-4 text-rose-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Kills Totales</span>
            <span className="font-mono font-bold text-slate-100">
              {saveData.stats.totalKills}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Flame className="w-4 h-4 text-purple-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Incursiones</span>
            <span className="font-mono font-bold text-slate-100">
              {saveData.stats.runsPlayed}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Coins className="w-4 h-4 text-yellow-400" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400">Oro Recolectado</span>
            <span className="font-mono font-bold text-amber-300">
              {saveData.stats.totalGoldEarned}
            </span>
          </div>
        </div>
      </div>

      {/* Monster Cards List */}
      <div className="flex flex-col gap-2.5">
        {BESTIARY_CATALOG.map((monster) => {
          const kills = saveData.bestiary[monster.type] || 0;
          const isBoss = monster.type === 'demon_boss';

          return (
            <div
              key={monster.type}
              className={`p-3.5 rounded-2xl border flex items-start gap-3.5 transition-all ${
                isBoss
                  ? 'bg-slate-900 border-rose-900/60 shadow-lg shadow-rose-950/20'
                  : 'bg-slate-900/70 border-slate-800'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
                  isBoss
                    ? 'bg-rose-950/40 border-rose-700/50'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                {getEnemyIcon(monster.icon)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-cinzel font-semibold text-white text-xs truncate">
                    {monster.name}
                  </h4>
                  <span className="text-[10px] font-mono text-slate-400">
                    Kills: <span className="text-white font-bold">{kills}</span>
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                  {monster.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
