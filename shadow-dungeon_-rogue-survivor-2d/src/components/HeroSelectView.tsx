import React from 'react';
import { CharacterClassId, PlayerSaveData } from '../game/types';
import { HERO_CLASSES } from '../game/constants';
import { sound } from '../game/audio';
import { Shield, Sparkles, Zap, Check, Heart, Swords, Wind, Lock } from 'lucide-react';

interface HeroSelectViewProps {
  saveData: PlayerSaveData;
  onSelectClass: (classId: CharacterClassId) => void;
}

export const HeroSelectView: React.FC<HeroSelectViewProps> = ({ saveData, onSelectClass }) => {
  const classes = Object.values(HERO_CLASSES);

  const handleChoose = (id: CharacterClassId) => {
    sound.playLevelUp();
    sound.triggerHaptic('light');
    onSelectClass(id);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
      <div className="text-center">
        <h2 className="text-xl font-cinzel font-bold text-white tracking-wide">
          Orden de Héroes
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Elige la clase con la que descenderás a los abismos
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {classes.map((c) => {
          const isSelected = saveData.selectedClass === c.id;
          const isUnlocked = saveData.unlockedClasses.includes(c.id);

          return (
            <div
              key={c.id}
              onClick={() => isUnlocked && handleChoose(c.id)}
              className={`rounded-3xl p-4 border transition-all cursor-pointer relative overflow-hidden flex flex-col gap-3 ${
                isSelected
                  ? 'bg-slate-900 border-blue-500 shadow-lg shadow-blue-500/10'
                  : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
              }`}
            >
              {/* Top Row: Icon, Title, and Checkmark */}
              <div className="flex items-center gap-3.5">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border relative"
                  style={{
                    backgroundColor: `${c.color}22`,
                    borderColor: `${c.color}66`,
                  }}
                >
                  {c.id === 'warrior' && <Shield className="w-7 h-7 text-blue-400" />}
                  {c.id === 'mage' && <Sparkles className="w-7 h-7 text-purple-400" />}
                  {c.id === 'rogue' && <Zap className="w-7 h-7 text-emerald-400" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-cinzel font-bold text-white text-base truncate">
                      {c.name}
                    </h3>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-lg border border-blue-800">
                        <Check className="w-3.5 h-3.5" /> Seleccionado
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">{c.title}</span>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-slate-300 leading-relaxed">{c.description}</p>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2.5 rounded-2xl border border-slate-800/80 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-slate-400">Vida:</span>
                  <span className="font-mono font-bold text-slate-200">{c.baseHp}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-slate-400">Daño:</span>
                  <span className="font-mono font-bold text-slate-200">{c.baseDamage}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-slate-400">Vel:</span>
                  <span className="font-mono font-bold text-slate-200">{c.baseSpeed}</span>
                </div>
              </div>

              {/* Select Action Button */}
              {!isSelected && isUnlocked && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleChoose(c.id);
                  }}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold font-cinzel transition-colors active:scale-95"
                >
                  Elegir Héroe
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
