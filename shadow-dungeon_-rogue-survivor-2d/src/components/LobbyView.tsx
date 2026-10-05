import React from 'react';
import { CharacterClassId, PlayerSaveData, PlayerStats } from '../game/types';
import { HERO_CLASSES } from '../game/constants';
import { Play, Shield, Flame, Zap, Sparkles, Heart, Swords, Wind, Trophy, Skull } from 'lucide-react';

interface LobbyViewProps {
  saveData: PlayerSaveData;
  effectiveStats: PlayerStats;
  onStartRun: () => void;
  onNavigateTab: (tab: 'hero' | 'talents' | 'equipment' | 'bestiary') => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  saveData,
  effectiveStats,
  onStartRun,
  onNavigateTab,
}) => {
  const currentHero = HERO_CLASSES[saveData.selectedClass] || HERO_CLASSES.warrior;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
      {/* Hero Showcase Card */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 p-5 shadow-xl flex flex-col items-center text-center">
        {/* Decorative backdrop light */}
        <div
          className="absolute -top-16 w-44 h-44 rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: currentHero.color }}
        />

        {/* Hero Badge Avatar */}
        <div className="relative mt-2 mb-3">
          <div
            className="w-24 h-24 rounded-2xl flex items-center justify-center border-2 shadow-2xl relative overflow-hidden"
            style={{
              borderColor: currentHero.color,
              background: `radial-gradient(circle, ${currentHero.color}33 0%, #090d16 80%)`,
            }}
          >
            {/* Class Icon */}
            {currentHero.id === 'warrior' && <Shield className="w-12 h-12 text-blue-400" />}
            {currentHero.id === 'mage' && <Sparkles className="w-12 h-12 text-purple-400" />}
            {currentHero.id === 'rogue' && <Zap className="w-12 h-12 text-emerald-400" />}
          </div>
          <span
            className="absolute -bottom-2 -right-2 text-[10px] font-cinzel font-bold px-2 py-0.5 rounded-md border border-white/20 text-white shadow"
            style={{ backgroundColor: currentHero.color }}
          >
            NIVEL {saveData.stats.highestFloor}
          </span>
        </div>

        {/* Hero Title & Class Name */}
        <h2 className="text-xl font-cinzel font-bold text-white tracking-wide">
          {currentHero.name}
        </h2>
        <span className="text-xs text-slate-400 font-medium">
          {currentHero.title}
        </span>
        <p className="text-xs text-slate-300 mt-2 max-w-xs leading-relaxed">
          {currentHero.description}
        </p>

        {/* Hero Quick Switch Button */}
        <button
          onClick={() => onNavigateTab('hero')}
          className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 active:scale-95 transition-transform"
        >
          Cambiar Héroe · Ver Clases
        </button>
      </div>

      {/* Hero Effective Combat Attributes */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-lg flex flex-col gap-3">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-200">Atributos de Combate</span>
          <span>Base + Talentos + Equipo</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <Heart className="w-4 h-4 text-rose-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400">Vida Máxima</span>
              <span className="font-mono font-bold text-slate-100">{effectiveStats.maxHp} HP</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <Swords className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400">Poder de Ataque</span>
              <span className="font-mono font-bold text-slate-100">{effectiveStats.damageMultiplier}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <Shield className="w-4 h-4 text-blue-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400">Armadura / Def</span>
              <span className="font-mono font-bold text-slate-100">{effectiveStats.defense} DEF</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <Wind className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400">Velocidad</span>
              <span className="font-mono font-bold text-slate-100">{effectiveStats.moveSpeed}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Record & Stats Overview */}
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl flex flex-col items-center">
          <Trophy className="w-4 h-4 text-amber-400 mb-1" />
          <span className="text-[10px] text-slate-400">Mejor Piso</span>
          <span className="font-cinzel font-bold text-slate-100 text-sm">
            Piso {saveData.stats.highestFloor}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl flex flex-col items-center">
          <Skull className="w-4 h-4 text-rose-400 mb-1" />
          <span className="text-[10px] text-slate-400">Kills Totales</span>
          <span className="font-mono font-bold text-slate-100 text-sm">
            {saveData.stats.totalKills}
          </span>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl flex flex-col items-center">
          <Flame className="w-4 h-4 text-purple-400 mb-1" />
          <span className="text-[10px] text-slate-400">Incursiones</span>
          <span className="font-mono font-bold text-slate-100 text-sm">
            {saveData.stats.runsPlayed}
          </span>
        </div>
      </div>

      {/* PRIMARY ONE-HAND PLAY CTA (Anchored in natural thumb reach) */}
      <div className="mt-auto pt-2 pb-1">
        <button
          onClick={onStartRun}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-cinzel font-bold text-base tracking-wider shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <Play className="w-5 h-5 fill-white" />
          Entrar a la Mazmorra
        </button>
      </div>
    </div>
  );
};
