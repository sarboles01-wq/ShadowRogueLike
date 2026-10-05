import React from 'react';
import { GameSettings } from '../game/types';
import { sound } from '../game/audio';
import { Volume2, VolumeX, Smartphone, Vibrate, RotateCcw, X } from 'lucide-react';

interface SettingsModalProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onResetData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetData,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-cinzel text-base font-bold text-white">Ajustes del Juego</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2.5">
              {settings.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-blue-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <span className="text-xs text-slate-200">Efectos y Música</span>
            </div>
            <button
              onClick={() => {
                const next = !settings.soundEnabled;
                onUpdateSettings({ soundEnabled: next, musicEnabled: next });
                sound.setMuted(!next);
              }}
              className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                settings.soundEnabled ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.soundEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Haptics Toggle */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2.5">
              <Vibrate className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-slate-200">Vibración Háptica</span>
            </div>
            <button
              onClick={() => onUpdateSettings({ hapticsEnabled: !settings.hapticsEnabled })}
              className={`w-10 h-6 rounded-full transition-colors relative flex items-center p-0.5 ${
                settings.hapticsEnabled ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  settings.hapticsEnabled ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Joystick Mode: Floating vs Fixed */}
          <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center gap-2 text-xs text-slate-200">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>Modo de Control Táctil</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 mt-1">
              <button
                onClick={() => onUpdateSettings({ joystickMode: 'floating' })}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                  settings.joystickMode === 'floating'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Flotante Dinámico
              </button>
              <button
                onClick={() => onUpdateSettings({ joystickMode: 'fixed' })}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors ${
                  settings.joystickMode === 'fixed'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                Fijo al Centro
              </button>
            </div>
          </div>
        </div>

        {/* Reset progress */}
        <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
          <button
            onClick={() => {
              if (window.confirm('¿Seguro que deseas reiniciar tu progreso y volver a empezar?')) {
                onResetData();
                onClose();
              }
            }}
            className="w-full py-2 rounded-xl bg-red-950/40 border border-red-900/40 text-red-400 text-xs font-medium hover:bg-red-900/40 transition-colors flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar Progreso de Partida
          </button>
        </div>
      </div>
    </div>
  );
};
