import React, { useState } from 'react';
import { EquipmentItem, ItemSlot, PlayerSaveData } from '../game/types';
import { sound } from '../game/audio';
import {
  Sword,
  Shield,
  Sparkles,
  Footprints,
  Wand2,
  Flame,
  ArrowUpCircle,
  Coins,
  Check,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface EquipmentViewProps {
  saveData: PlayerSaveData;
  onEquipItem: (item: EquipmentItem) => void;
  onUpgradeItem: (item: EquipmentItem) => void;
}

export const EquipmentView: React.FC<EquipmentViewProps> = ({
  saveData,
  onEquipItem,
  onUpgradeItem,
}) => {
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);

  const getItemIcon = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'Sword':
        return <Sword className={className} />;
      case 'Shield':
      case 'ShieldAlert':
        return <Shield className={className} />;
      case 'Sparkles':
        return <Sparkles className={className} />;
      case 'Footprints':
        return <Footprints className={className} />;
      case 'Wand2':
        return <Wand2 className={className} />;
      case 'Flame':
        return <Flame className={className} />;
      default:
        return <Sword className={className} />;
    }
  };

  const getRarityBadge = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'text-amber-400 border-amber-500/40 bg-amber-950/40';
      case 'epic':
        return 'text-purple-400 border-purple-500/40 bg-purple-950/40';
      case 'rare':
        return 'text-blue-400 border-blue-500/40 bg-blue-950/40';
      default:
        return 'text-slate-400 border-slate-700 bg-slate-800/40';
    }
  };

  const slots: { slot: ItemSlot; label: string; icon: any }[] = [
    { slot: 'weapon', label: 'Arma Principal', icon: Sword },
    { slot: 'armor', label: 'Armadura / Coraza', icon: Shield },
    { slot: 'relic', label: 'Reliquia Mística', icon: Sparkles },
    { slot: 'boots', label: 'Botas de Batalla', icon: Footprints },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-4">
      {/* Title & Gold Balance */}
      <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 p-3.5 rounded-3xl">
        <div className="flex flex-col">
          <h2 className="text-base font-cinzel font-bold text-white">Armería & Forja</h2>
          <span className="text-[11px] text-slate-400">Equipa y mejora tus armas y reliquias</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800 text-xs">
          <Coins className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-mono font-bold text-amber-300">{saveData.gold}</span>
        </div>
      </div>

      {/* Paper Doll: Equipped Items */}
      <div className="grid grid-cols-2 gap-2.5">
        {slots.map(({ slot, label, icon: IconComponent }) => {
          const item = saveData.equipped[slot];
          const isSelected = selectedItem?.id === item?.id;

          return (
            <div
              key={slot}
              onClick={() => item && setSelectedItem(item)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                item
                  ? isSelected
                    ? 'bg-slate-900 border-blue-500 shadow-md'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-950/40 border-dashed border-slate-800 text-slate-600'
              }`}
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  item ? getRarityBadge(item.rarity) : 'border-slate-800 bg-slate-900'
                }`}
              >
                {item ? getItemIcon(item.icon) : <IconComponent className="w-5 h-5 text-slate-600" />}
              </div>

              <div className="flex flex-col min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  {label}
                </span>
                <span className="text-xs font-semibold text-white truncate">
                  {item ? item.name : 'Vacío'}
                </span>
                {item && (
                  <span className="text-[10px] font-mono text-blue-400">
                    Nivel {item.level}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Inventory Backpack */}
      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Inventario de Objetos ({saveData.inventory.length})
        </h3>

        <div className="grid grid-cols-1 gap-2">
          {saveData.inventory.map((item) => {
            const isEquipped = Object.values(saveData.equipped).some((e) => e?.id === item.id);
            const isSelected = selectedItem?.id === item.id;

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-900 border-blue-500'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${getRarityBadge(
                      item.rarity
                    )}`}
                  >
                    {getItemIcon(item.icon)}
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        Nv.{item.level}
                      </span>
                      {isEquipped && (
                        <span className="text-[9px] font-bold uppercase text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800/40">
                          Equipado
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">{item.bonusText}</span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Item Inspector / Forge Sheet */}
      {selectedItem && (
        <div className="mt-auto bg-slate-900 border border-slate-800 rounded-3xl p-4 shadow-xl flex flex-col gap-3 animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center border ${getRarityBadge(
                  selectedItem.rarity
                )}`}
              >
                {getItemIcon(selectedItem.icon, 'w-6 h-6')}
              </div>
              <div className="flex flex-col">
                <h4 className="text-sm font-bold text-white font-cinzel">
                  {selectedItem.name}
                </h4>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 capitalize">{selectedItem.rarity}</span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono text-blue-400">
                    Nivel {selectedItem.level} / {selectedItem.maxLevel}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="text-slate-500 hover:text-slate-300 text-xs px-2 py-1"
            >
              Cerrar
            </button>
          </div>

          <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
            {selectedItem.bonusText}
          </p>

          <div className="flex items-center gap-2">
            {/* Equip Button */}
            <button
              onClick={() => {
                sound.playLevelUp();
                sound.triggerHaptic('light');
                onEquipItem(selectedItem);
              }}
              className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4" /> Equipar Objeto
            </button>

            {/* Upgrade Button */}
            {selectedItem.level < selectedItem.maxLevel && (
              <button
                disabled={saveData.gold < selectedItem.upgradeCostGold * selectedItem.level}
                onClick={() => {
                  sound.playLevelUp();
                  sound.triggerHaptic('medium');
                  onUpgradeItem(selectedItem);
                }}
                className={`flex-1 py-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                  saveData.gold >= selectedItem.upgradeCostGold * selectedItem.level
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-900/30'
                    : 'bg-slate-800 text-slate-500 opacity-60 cursor-not-allowed'
                }`}
              >
                <ArrowUpCircle className="w-4 h-4" /> Forjar (+1) ·{' '}
                {selectedItem.upgradeCostGold * selectedItem.level} Oro
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
