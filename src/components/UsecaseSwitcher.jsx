/**
 * UsecaseSwitcher - Sticky right-side panel to switch between 3D use cases.
 *
 * Mirrors the TemplateSwitcher pattern from va_studio_frontend_starter.
 * Organized by category: Globe, Simulation, Games.
 *
 * Usage:
 *   <UsecaseSwitcher activeUsecase={activeUsecase} onSelect={setActiveUsecase} />
 */

import { useState } from 'react';

const USECASE_GROUPS = [
  {
    label: 'Featured',
    items: [
      { id: 'geo-map',    label: 'Geo Map',          icon: '🗺️', desc: 'Geolocation, cities, roads' },
    ],
  },
  {
    label: 'Globe',
    items: [
      { id: 'earth',      label: 'Earth Explorer',   icon: '🌍', desc: 'Countries, cities, heatmap' },
      { id: 'health',     label: 'Health Monitor',    icon: '🏥', desc: 'WHO, outbreaks, supply' },
      { id: 'finance',    label: 'Global Markets',    icon: '💹', desc: 'Exchanges, GDP, flows' },
      { id: 'simulation', label: 'Orbital Sim',       icon: '🛰️', desc: 'Satellites, ISS, debris' },
    ],
  },
  {
    label: 'Simulation',
    items: [
      { id: 'robotics',   label: 'Robotics Lab',       icon: '🤖', desc: '6-DOF arm, conveyor, AGVs' },
      { id: 'cardiology', label: 'Cardiology',          icon: '🫀', desc: 'Heart, ECG, blood flow' },
      { id: 'nutrition',  label: 'Nutrition',            icon: '🥗', desc: 'Organs, nutrients, diet' },
      { id: 'chiparch',   label: 'Chip Architecture',   icon: '🧠', desc: 'GPU, TPU, CPU, cores' },
      { id: 'datacenter', label: 'Data Center',         icon: '🏢', desc: 'Racks, network, cooling' },
    ],
  },
  {
    label: 'Games',
    items: [
      { id: 'game-pokemon', label: 'Creature Battle',  icon: '⚔️', desc: 'Turn-based RPG combat' },
      { id: 'game-chess',   label: 'Chess',            icon: '♟', desc: 'Full 3D chess vs AI' },
      { id: 'game-cards',   label: 'Blackjack',        icon: '🃏', desc: 'Casino card game' },
      { id: 'game-physics', label: 'Tower Stacker',    icon: '🏗️', desc: 'Stack blocks, combos' },
      { id: 'game-memory',  label: 'Memory Match',     icon: '🧩', desc: 'Chip-themed pairs' },
    ],
  },
];

const ALL_USECASES = USECASE_GROUPS.flatMap(g => g.items);

export function UsecaseSwitcher({ activeUsecase, onSelect }) {
  const [open, setOpen] = useState(false);

  const active = ALL_USECASES.find(u => u.id === activeUsecase) ?? ALL_USECASES[0];

  return (
    <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center">
      {/* Sliding panel */}
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${open ? 'w-60 opacity-100' : 'w-0 opacity-0 pointer-events-none'}
        `}
      >
        <div className="w-60 bg-black/80 backdrop-blur-xl border border-white/10 rounded-l-2xl shadow-2xl shadow-black/40 py-3 max-h-[85vh] overflow-y-auto">
          {USECASE_GROUPS.map(group => (
            <div key={group.label}>
              <p className="px-4 pt-3 pb-1 text-[9px] font-bold uppercase tracking-widest text-gray-600">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5 px-2">
                {group.items.map(u => {
                  const isActive = u.id === activeUsecase;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        onSelect(u.id);
                        setOpen(false);
                      }}
                      className={`
                        flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                        ${isActive
                          ? 'bg-violet-600/20 text-white border border-violet-500/30'
                          : 'text-gray-300 hover:bg-white/5 border border-transparent'
                        }
                      `}
                    >
                      <span className="text-base flex-shrink-0">{u.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-medium leading-tight">{u.label}</div>
                        <div className="text-[10px] text-gray-500 leading-tight mt-0.5">{u.desc}</div>
                      </div>
                      {isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle tab */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`
          flex flex-col items-center justify-center gap-1.5
          bg-black/70 backdrop-blur-xl
          border border-white/10
          rounded-l-xl shadow-lg shadow-black/30
          px-2.5 py-5 cursor-pointer select-none transition-all
          hover:bg-black/80 hover:border-white/20
          ${open ? 'rounded-l-none border-r-0' : ''}
        `}
        title={open ? 'Close use case switcher' : 'Switch use case'}
      >
        {open ? (
          <span className="text-gray-400 text-sm">✕</span>
        ) : (
          <>
            <span className="text-xl">{active.icon}</span>
            <span
              className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              {active.label}
            </span>
            <span className="text-[10px] text-gray-600">◆</span>
          </>
        )}
      </button>
    </div>
  );
}
