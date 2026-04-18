/**
 * VA Studio React 3D Starter - Main Application Entry Point
 *
 * This starter provides 14 use-case visualizations, switchable via the
 * UsecaseSwitcher panel (same pattern as va_studio_frontend_starter's
 * TemplateSwitcher).
 *
 * Globe Use Cases:
 *   earth       → Geographic explorer with country polygons, zoom, heatmap
 *   health      → Global health monitor with WHO regions, outbreaks, supply chain
 *   finance     → Financial markets with exchanges, GDP, capital flows
 *   simulation  → Orbital simulation with satellites, ISS, debris
 *
 * 3D Simulation Use Cases (non-globe, @react-three/fiber):
 *   robotics    → 6-DOF robot arm, conveyor belt, AGV fleet, motion sequences
 *   cardiology  → 3D beating heart, ECG, blood flow, chamber anatomy
 *   nutrition   → 3D digestive system, nutrient particles, meal builder
 *   chiparch    → AI chip die layers, core grid, data flow, GPU/TPU/CPU/NPU presets
 *   datacenter  → 3D server racks, heat map, network traffic, cooling
 *
 * Games:
 *   game-physics → 3D tower stacker with block slicing
 *   game-memory  → 3D chip-themed memory card matching
 *
 * Each use case is lazy-loaded and self-contained in /usecases/<name>/App.jsx.
 * Users can switch between them at runtime without page reload.
 *
 * @module App
 * @version 2.0.0
 */

import { lazy, Suspense, useState } from 'react';
import { UsecaseSwitcher } from './components/UsecaseSwitcher';

/* ------------------------------------------------------------------ */
/*  Lazy-loaded use-case components (code-split per use case)          */
/* ------------------------------------------------------------------ */

const usecases = {
  // Advanced Geo Map (default entry for this build)
  'geo-map': lazy(() => import('./usecases/geo-map/App.jsx')),
  // Globe-based
  earth: lazy(() => import('./usecases/earth/App.jsx')),
  health: lazy(() => import('./usecases/health/App.jsx')),
  finance: lazy(() => import('./usecases/finance/App.jsx')),
  simulation: lazy(() => import('./usecases/simulation/App.jsx')),
  // 3D simulations
  robotics: lazy(() => import('./usecases/robotics/App.jsx')),
  cardiology: lazy(() => import('./usecases/cardiology/App.jsx')),
  nutrition: lazy(() => import('./usecases/nutrition/App.jsx')),
  chiparch: lazy(() => import('./usecases/chiparch/App.jsx')),
  datacenter: lazy(() => import('./usecases/datacenter/App.jsx')),
  // Games
  'game-pokemon': lazy(() => import('./usecases/game-pokemon/App.jsx')),
  'game-chess': lazy(() => import('./usecases/game-chess/App.jsx')),
  'game-cards': lazy(() => import('./usecases/game-cards/App.jsx')),
  'game-physics': lazy(() => import('./usecases/game-physics/App.jsx')),
  'game-memory': lazy(() => import('./usecases/game-memory/App.jsx')),
};

/* ------------------------------------------------------------------ */
/*  Loading state                                                      */
/* ------------------------------------------------------------------ */

function UsecaseLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000011]">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-violet-900/50" />
          <div className="absolute inset-0 rounded-full border-4 border-violet-500 border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-gray-500 font-medium">Loading 3D visualization...</p>
        <p className="text-xs text-gray-700 mt-1">Preparing scene and assets</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root App                                                           */
/* ------------------------------------------------------------------ */

export default function App() {
  const [activeUsecase, setActiveUsecase] = useState('geo-map');
  const ActiveComponent = usecases[activeUsecase];

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#000011]">
      <Suspense fallback={<UsecaseLoader />}>
        <ActiveComponent key={activeUsecase} />
      </Suspense>
      <UsecaseSwitcher activeUsecase={activeUsecase} onSelect={setActiveUsecase} />
    </div>
  );
}
