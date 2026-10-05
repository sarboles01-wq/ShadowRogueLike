import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DungeonGameEngine, RunSummary } from '../game/engine';
import { renderGameScene } from '../game/renderer';
import { CharacterClassId, PlayerStats, SkillUpgrade } from '../game/types';
import { SKILL_POOL } from '../game/constants';
import { sound } from '../game/audio';
import {
  Heart,
  Zap,
  RotateCcw,
  Pause,
  Play,
  Award,
  Skull,
  Coins,
  Gem,
  Swords,
  ChevronRight,
  Sparkles,
  Flame,
  Snowflake,
  Shield,
  Crosshair,
  Wind,
  Droplet,
  Magnet,
  Radio,
  Sun,
  Target,
} from 'lucide-react';

interface DungeonCanvasProps {
  classId: CharacterClassId;
  baseStats: PlayerStats;
  joystickMode: 'floating' | 'fixed';
  soundEnabled: boolean;
  onExitRun: (summary: RunSummary) => void;
}

export const DungeonCanvas: React.FC<DungeonCanvasProps> = ({
  classId,
  baseStats,
  joystickMode,
  soundEnabled,
  onExitRun,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<DungeonGameEngine | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // HUD State
  const [hudStats, setHudStats] = useState<{
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
  }>({
    hp: baseStats.maxHp,
    maxHp: baseStats.maxHp,
    level: 1,
    xp: 0,
    nextXp: 15,
    gold: 0,
    soulShards: 0,
    floor: 1,
    dashCooldownPercent: 0,
    enemiesLeft: 0,
    bossHp: undefined,
  });

  // Modals & Overlays
  const [levelUpChoices, setLevelUpChoices] = useState<SkillUpgrade[] | null>(null);
  const [chestReward, setChestReward] = useState<{ gold: number; souls: number } | null>(null);
  const [floorNotification, setFloorNotification] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [gameOverSummary, setGameOverSummary] = useState<RunSummary | null>(null);

  // Sound sync
  useEffect(() => {
    sound.setMuted(!soundEnabled);
    if (soundEnabled) {
      sound.startDungeonMusic();
    } else {
      sound.stopDungeonMusic();
    }
    return () => {
      sound.stopDungeonMusic();
    };
  }, [soundEnabled]);

  // Initialize Game Engine
  useEffect(() => {
    const engine = new DungeonGameEngine(classId, baseStats, {
      onLevelUp: (choices) => {
        const skills = choices
          .map((id) => SKILL_POOL.find((s) => s.id === id))
          .filter(Boolean) as SkillUpgrade[];
        setLevelUpChoices(skills);
      },
      onGameOver: (summary) => {
        setGameOverSummary(summary);
      },
      onFloorComplete: (floor) => {
        setFloorNotification(`¡Piso ${floor} Superado! Avanzando...`);
        setTimeout(() => setFloorNotification(null), 2500);
      },
      onChestReward: (gold, souls) => {
        setChestReward({ gold, souls });
        setTimeout(() => setChestReward(null), 2200);
      },
      onStatsUpdate: (stats) => {
        setHudStats(stats);
      },
    });

    engineRef.current = engine;

    // Keyboard controls
    const onKeyDown = (e: KeyboardEvent) => engine.handleKeyDown(e.code);
    const onKeyUp = (e: KeyboardEvent) => engine.handleKeyUp(e.code);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [classId, baseStats]);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      if (containerRef.current && canvas) {
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const loop = (now: number) => {
      const engine = engineRef.current;
      if (engine && !engine.isEnded) {
        engine.update(now);
        const renderData = engine.getRenderData(ctx, canvas.width, canvas.height);
        renderGameScene(renderData);
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // One-Handed Touch / Joystick Event Handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent | React.MouseEvent) => {
      const engine = engineRef.current;
      if (!engine || isPaused || levelUpChoices || gameOverSummary) return;

      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Allow joystick activation on the middle/bottom of screen
      if (y > 60) {
        if (joystickMode === 'fixed') {
          // Fixed bottom-center joystick anchor
          const startX = rect.width / 2;
          const startY = rect.height - 120;
          engine.joystick = {
            active: true,
            startX,
            startY,
            currX: x,
            currY: y,
          };
        } else {
          // Floating joystick: places anchor exactly where user touches!
          engine.joystick = {
            active: true,
            startX: x,
            startY: y,
            currX: x,
            currY: y,
          };
        }
      }
    },
    [joystickMode, isPaused, levelUpChoices, gameOverSummary]
  );

  const handleTouchMove = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    const engine = engineRef.current;
    if (!engine || !engine.joystick.active) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    engine.joystick.currX = clientX - rect.left;
    engine.joystick.currY = clientY - rect.top;
  }, []);

  const handleTouchEnd = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.joystick.active = false;
  }, []);

  // Skill Choice Handler
  const handleSelectSkill = (skillId: string) => {
    sound.playLevelUp();
    sound.triggerHaptic('medium');
    engineRef.current?.applySkillChoice(skillId);
    setLevelUpChoices(null);
  };

  const handleTogglePause = () => {
    if (!engineRef.current) return;
    const newPause = !isPaused;
    setIsPaused(newPause);
    engineRef.current.isPaused = newPause;
  };

  const handleTriggerDash = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    engineRef.current?.triggerDash();
  };

  // Helper icon renderer
  const renderSkillIcon = (iconName: string) => {
    switch (iconName) {
      case 'RotateCw':
        return <RotateCcw className="w-6 h-6 text-blue-400" />;
      case 'Snowflake':
        return <Snowflake className="w-6 h-6 text-sky-400" />;
      case 'Zap':
        return <Zap className="w-6 h-6 text-yellow-400" />;
      case 'Flame':
        return <Flame className="w-6 h-6 text-rose-400" />;
      case 'Sun':
        return <Sun className="w-6 h-6 text-amber-400" />;
      case 'Target':
        return <Target className="w-6 h-6 text-emerald-400" />;
      case 'Swords':
        return <Swords className="w-6 h-6 text-red-400" />;
      case 'Heart':
        return <Heart className="w-6 h-6 text-pink-400" />;
      case 'Wind':
        return <Wind className="w-6 h-6 text-cyan-400" />;
      case 'Droplet':
        return <Droplet className="w-6 h-6 text-red-500" />;
      case 'Crosshair':
        return <Crosshair className="w-6 h-6 text-amber-500" />;
      case 'Magnet':
        return <Magnet className="w-6 h-6 text-purple-400" />;
      case 'ShieldAlert':
        return <Shield className="w-6 h-6 text-stone-400" />;
      default:
        return <Sparkles className="w-6 h-6 text-amber-300" />;
    }
  };

  const hpPercent = Math.max(0, Math.min(100, (hudStats.hp / hudStats.maxHp) * 100));
  const xpPercent = Math.max(0, Math.min(100, (hudStats.xp / hudStats.nextXp) * 100));

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-slate-950 select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
    >
      {/* 2D Game Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />

      {/* TOP HUD BAR (Ergonomic, unboxed, zero-slop) */}
      <div className="absolute top-0 left-0 right-0 p-3 pt-2 pointer-events-none z-10 flex flex-col gap-1.5">
        {/* XP Progress Bar */}
        <div className="w-full bg-slate-900/80 backdrop-blur-md rounded-full h-2.5 overflow-hidden border border-slate-700/50">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-400 to-purple-500 transition-all duration-150"
            style={{ width: `${xpPercent}%` }}
          />
        </div>

        {/* Stats Row */}
        <div className="flex items-center justify-between text-xs font-medium">
          {/* Level & HP */}
          <div className="flex items-center gap-2">
            <span className="font-cinzel text-amber-400 font-bold tracking-wider">
              NV.{hudStats.level}
            </span>
            <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800">
              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
              <span className="font-mono tabular-nums text-slate-100">
                {hudStats.hp} / {hudStats.maxHp}
              </span>
            </div>
          </div>

          {/* Floor & Monster Count */}
          <div className="flex items-center gap-3 text-slate-300">
            <span className="font-cinzel font-semibold text-slate-200">
              Piso {hudStats.floor}
            </span>
            <div className="flex items-center gap-1 text-slate-400">
              <Skull className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">{hudStats.enemiesLeft}</span>
            </div>
            <button
              onClick={handleTogglePause}
              className="pointer-events-auto p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white active:scale-95 transition-transform"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Currency Row (Gold & Souls) */}
        <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-1 text-amber-400">
            <Coins className="w-3 h-3" />
            <span className="tabular-nums">+{hudStats.gold}</span>
          </div>
          <div className="flex items-center gap-1 text-purple-400">
            <Gem className="w-3 h-3" />
            <span className="tabular-nums">+{hudStats.soulShards}</span>
          </div>
        </div>

        {/* BOSS HP BAR (If boss is active) */}
        {hudStats.bossHp && (
          <div className="w-full mt-1 bg-slate-950/90 border border-rose-600/60 rounded-lg p-1.5 shadow-lg shadow-rose-950/40">
            <div className="flex justify-between items-center text-[10px] text-rose-300 font-cinzel mb-1 px-1">
              <span>{hudStats.bossHp.name}</span>
              <span className="font-mono tabular-nums">
                {hudStats.bossHp.current} / {hudStats.bossHp.max}
              </span>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-100"
                style={{
                  width: `${Math.max(0, (hudStats.bossHp.current / hudStats.bossHp.max) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* FLOOR CLEAR BANNER */}
      {floorNotification && (
        <div className="absolute top-20 left-4 right-4 z-20 pointer-events-none flex justify-center">
          <div className="bg-blue-600/90 text-white font-cinzel font-bold text-sm px-4 py-2 rounded-xl backdrop-blur-md border border-blue-400 shadow-xl shadow-blue-900/50 animate-bounce">
            {floorNotification}
          </div>
        </div>
      )}

      {/* CHEST REWARD TOAST */}
      {chestReward && (
        <div className="absolute top-32 left-8 right-8 z-20 pointer-events-none flex justify-center">
          <div className="bg-amber-950/95 border border-amber-500/70 text-amber-200 px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 backdrop-blur-md animate-pulse">
            <Award className="w-5 h-5 text-amber-400" />
            <div className="text-xs font-semibold">
              ¡Cofre del Tesoro! +{chestReward.gold} Oro, +{chestReward.souls} Almas
            </div>
          </div>
        </div>
      )}

      {/* ERGONOMIC BOTTOM THUMB DASH BUTTON (Right-Handed Natural Thumb Arc) */}
      <div className="absolute bottom-6 right-5 z-20 pointer-events-auto">
        <button
          onClick={handleTriggerDash}
          onTouchStart={handleTriggerDash}
          className={`relative w-16 h-16 rounded-full flex flex-col items-center justify-center font-bold text-xs shadow-2xl border-2 transition-transform active:scale-90 ${
            hudStats.dashCooldownPercent > 0
              ? 'bg-slate-800/80 border-slate-700 text-slate-500'
              : 'bg-gradient-to-br from-blue-500 to-indigo-600 border-blue-300 text-white shadow-blue-500/40'
          }`}
        >
          <Wind className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-wide font-cinzel">ESQUIVAR</span>
          {hudStats.dashCooldownPercent > 0 && (
            <div
              className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center text-[10px] font-mono text-slate-300"
            >
              {(hudStats.dashCooldownPercent * baseStats.dashCooldown).toFixed(1)}s
            </div>
          )}
        </button>
      </div>

      {/* ONE-HAND TOUCH HINT */}
      <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none text-[11px] text-slate-500 font-medium">
        Arrastra tu pulgar en la pantalla para moverte · Disparo automático
      </div>

      {/* LEVEL-UP UPGRADE MODAL (Paused Game) */}
      {levelUpChoices && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col justify-center items-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                ¡Subida de Nivel!
              </span>
              <h2 className="text-xl font-cinzel font-bold text-white mt-0.5">
                Elige tu Bendición
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Selecciona 1 mejora para potenciar a tu héroe en esta mazmorra
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {levelUpChoices.map((skill) => (
                <button
                  key={skill.id}
                  onClick={() => handleSelectSkill(skill.id)}
                  className="w-full p-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-blue-500/60 active:scale-[0.98] transition-all flex items-start gap-3.5 text-left group"
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                    style={{ backgroundColor: `${skill.color}22` }}
                  >
                    {renderSkillIcon(skill.icon)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-white group-hover:text-blue-300 truncate">
                        {skill.name}
                      </h4>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {skill.type === 'active' ? 'Activa' : 'Pasiva'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                      {skill.description}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 shrink-0 self-center" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {isPaused && !levelUpChoices && !gameOverSummary && (
        <div className="absolute inset-0 z-30 bg-black/80 backdrop-blur-md flex flex-col justify-center items-center p-6">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col items-center gap-4 text-center">
            <h3 className="font-cinzel text-xl font-bold text-white">Juego Pausado</h3>
            <p className="text-xs text-slate-400">
              Piso actual: <span className="text-white font-semibold">{hudStats.floor}</span> · Nivel:{' '}
              <span className="text-white font-semibold">{hudStats.level}</span>
            </p>

            <div className="w-full flex flex-col gap-2 mt-2">
              <button
                onClick={handleTogglePause}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors active:scale-95"
              >
                Continuar Jugando
              </button>
              <button
                onClick={() => {
                  engineRef.current?.startFloor(hudStats.floor);
                  setIsPaused(false);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
              >
                Reiniciar Piso
              </button>
              <button
                onClick={() => {
                  onExitRun({
                    floorReached: hudStats.floor,
                    monstersSlain: engineRef.current?.monstersSlain || 0,
                    goldEarned: hudStats.gold,
                    soulShardsEarned: hudStats.soulShards,
                    timeSurvivedSeconds: Math.floor(
                      (Date.now() - (engineRef.current?.runStartTime || Date.now())) / 1000
                    ),
                    victory: false,
                  });
                }}
                className="w-full py-2.5 rounded-xl bg-red-950/60 border border-red-800/40 text-red-300 font-medium text-xs hover:bg-red-900/60 transition-colors"
              >
                Abandonar Mazmorra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER / RUN SUMMARY MODAL */}
      {gameOverSummary && (
        <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col justify-center items-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-rose-500">
                Caíste en Combate
              </span>
              <h2 className="text-2xl font-cinzel font-bold text-white mt-1">Fin de la Incursión</h2>
              <p className="text-xs text-slate-400 mt-1">
                Tus almas y botín han sido preservados para tu progreso en la base.
              </p>
            </div>

            {/* Run Stats */}
            <div className="grid grid-cols-2 gap-2 text-left bg-slate-950/60 p-3 rounded-2xl border border-slate-800/60 text-xs">
              <div className="flex flex-col">
                <span className="text-slate-400 text-[11px]">Piso Alcanzado</span>
                <span className="font-cinzel text-lg font-bold text-slate-100">
                  Piso {gameOverSummary.floorReached}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-400 text-[11px]">Monstruos Derrotados</span>
                <span className="font-mono text-lg font-bold text-rose-400">
                  {gameOverSummary.monstersSlain}
                </span>
              </div>
              <div className="flex flex-col pt-2 border-t border-slate-800">
                <span className="text-slate-400 text-[11px]">Oro Rescatado</span>
                <span className="font-mono text-base font-bold text-amber-400">
                  +{gameOverSummary.goldEarned}
                </span>
              </div>
              <div className="flex flex-col pt-2 border-t border-slate-800">
                <span className="text-slate-400 text-[11px]">Esquirlas de Alma</span>
                <span className="font-mono text-base font-bold text-purple-400">
                  +{gameOverSummary.soulShardsEarned}
                </span>
              </div>
            </div>

            <button
              onClick={() => onExitRun(gameOverSummary)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-cinzel font-bold text-sm tracking-wide shadow-lg shadow-blue-600/30 active:scale-95 transition-all mt-1"
            >
              Regresar al Bastión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
