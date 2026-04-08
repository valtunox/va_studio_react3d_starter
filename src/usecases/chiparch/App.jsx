/**
 * AI Chip Architecture 3D Use Case
 *
 * Interactive 3D chip die visualization:
 * - Exploded layer view (substrate, transistors, interconnect, heat spreader)
 * - Core grid with utilization heatmap
 * - Data flow particle animation between cores
 * - Memory hierarchy visualization
 * - Chip presets: GPU, TPU, CPU, NPU
 */

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Environment, RoundedBox, MeshTransmissionMaterial } from '@react-three/drei';
import * as THREE from 'three';

/* ── Chip Layer ── */
function ChipLayer({ position, size, color, label, opacity = 1, emissive, wireframe = false }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current && emissive) {
      ref.current.material.emissiveIntensity = 0.2 + Math.sin(clock.getElapsedTime() * 2) * 0.1;
    }
  });

  return (
    <group position={position}>
      <RoundedBox ref={ref} args={size} radius={0.02} smoothness={4} castShadow>
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          metalness={0.6}
          roughness={0.2}
          emissive={emissive || '#000000'}
          emissiveIntensity={0.2}
          wireframe={wireframe}
          side={THREE.DoubleSide}
        />
      </RoundedBox>
      {label && (
        <Text position={[0, size[1] / 2 + 0.15, 0]} fontSize={0.08} color="#94a3b8" anchorX="center">
          {label}
        </Text>
      )}
    </group>
  );
}

/* ── Compute Core ── */
function ComputeCore({ position, utilization, size = 0.2, label, onClick, highlighted }) {
  const ref = useRef();
  const color = useMemo(() => {
    if (utilization > 90) return '#ef4444';
    if (utilization > 70) return '#f59e0b';
    if (utilization > 40) return '#22c55e';
    return '#3b82f6';
  }, [utilization]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.material.emissiveIntensity = 0.3 + (utilization / 100) * 0.5 + Math.sin(t * 3 + utilization) * 0.1;
    if (highlighted) {
      ref.current.scale.setScalar(1 + Math.sin(t * 4) * 0.05);
    } else {
      ref.current.scale.setScalar(1);
    }
  });

  return (
    <group position={position} onClick={onClick}>
      <RoundedBox ref={ref} args={[size, 0.06, size]} radius={0.01} smoothness={4}>
        <meshStandardMaterial
          color={color}
          metalness={0.8}
          roughness={0.15}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </RoundedBox>
      <Text position={[0, 0.06, 0]} fontSize={0.04} color="#e5e5e5" anchorX="center">
        {label}
      </Text>
      <Text position={[0, 0.04, 0]} fontSize={0.025} color={color} anchorX="center">
        {utilization}%
      </Text>
    </group>
  );
}

/* ── Data Flow Particles ── */
function DataFlowParticles({ count = 300, active, coreCount }) {
  const ref = useRef();

  const particles = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 1] = Math.random() * 0.3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
      const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.2, 0.8, 0.6);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { pos, colors };
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current || !active) return;
    const positions = ref.current.geometry.attributes.position.array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx] += Math.sin(t * 2 + i * 0.5) * 0.005;
      positions[idx + 1] += 0.003;
      positions[idx + 2] += Math.cos(t * 2 + i * 0.3) * 0.005;
      if (positions[idx + 1] > 0.5) {
        positions[idx] = (Math.random() - 0.5) * 2;
        positions[idx + 1] = -0.1;
        positions[idx + 2] = (Math.random() - 0.5) * 2;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={particles.pos} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={count} array={particles.colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.015} vertexColors transparent opacity={0.8} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ── Chip Presets ── */
const CHIP_PRESETS = {
  gpu: {
    name: 'GPU — AI Accelerator',
    cores: 16, gridCols: 4,
    layers: [
      { id: 'substrate', label: 'Silicon Substrate', y: -0.2, color: '#1e293b', h: 0.08 },
      { id: 'transistors', label: 'Transistor Layer (5nm)', y: -0.1, color: '#334155', h: 0.04 },
      { id: 'compute', label: 'Compute Cores', y: 0, color: '#0ea5e9', h: 0 },
      { id: 'interconnect', label: 'Interconnect Mesh', y: 0.15, color: '#6366f1', h: 0.02, wireframe: true },
      { id: 'cache', label: 'L2/L3 Cache', y: 0.25, color: '#8b5cf6', h: 0.04 },
      { id: 'heatspreader', label: 'Heat Spreader (IHS)', y: 0.45, color: '#71717a', h: 0.06, opacity: 0.4 },
    ],
    specs: { transistors: '80B', process: '5nm', tdp: '350W', memory: '80GB HBM3', flops: '990 TFLOPS' },
  },
  tpu: {
    name: 'TPU — Tensor Processor',
    cores: 9, gridCols: 3,
    layers: [
      { id: 'substrate', label: 'Substrate', y: -0.2, color: '#1a1a2e', h: 0.08 },
      { id: 'transistors', label: 'Transistors (7nm)', y: -0.1, color: '#16213e', h: 0.04 },
      { id: 'compute', label: 'Tensor Cores', y: 0, color: '#10b981', h: 0 },
      { id: 'interconnect', label: 'Systolic Array Bus', y: 0.15, color: '#059669', h: 0.02, wireframe: true },
      { id: 'hbm', label: 'HBM2e Stack', y: 0.25, color: '#047857', h: 0.06 },
      { id: 'heatspreader', label: 'IHS', y: 0.45, color: '#71717a', h: 0.06, opacity: 0.4 },
    ],
    specs: { transistors: '26B', process: '7nm', tdp: '200W', memory: '32GB HBM2e', flops: '275 TFLOPS' },
  },
  cpu: {
    name: 'CPU — Multi-Core Processor',
    cores: 16, gridCols: 4,
    layers: [
      { id: 'substrate', label: 'Organic Substrate', y: -0.2, color: '#1c1917', h: 0.1 },
      { id: 'transistors', label: 'FinFET (3nm)', y: -0.08, color: '#292524', h: 0.04 },
      { id: 'compute', label: 'CPU Cores', y: 0, color: '#3b82f6', h: 0 },
      { id: 'interconnect', label: 'Ring Bus', y: 0.15, color: '#2563eb', h: 0.02, wireframe: true },
      { id: 'cache', label: 'L3 Cache (96MB)', y: 0.25, color: '#1d4ed8', h: 0.05 },
      { id: 'heatspreader', label: 'Copper IHS', y: 0.45, color: '#b45309', h: 0.06, opacity: 0.5 },
    ],
    specs: { transistors: '12B', process: '3nm', tdp: '125W', memory: 'DDR5', flops: '2.4 TFLOPS' },
  },
  npu: {
    name: 'NPU — Neural Engine',
    cores: 12, gridCols: 4,
    layers: [
      { id: 'substrate', label: 'Silicon', y: -0.2, color: '#0c0a09', h: 0.08 },
      { id: 'transistors', label: 'GAA (2nm)', y: -0.1, color: '#1c1917', h: 0.03 },
      { id: 'compute', label: 'Neural Engines', y: 0, color: '#ec4899', h: 0 },
      { id: 'interconnect', label: 'NoC Fabric', y: 0.15, color: '#db2777', h: 0.02, wireframe: true },
      { id: 'cache', label: 'Unified Memory', y: 0.25, color: '#be185d', h: 0.04 },
      { id: 'heatspreader', label: 'IHS', y: 0.45, color: '#71717a', h: 0.05, opacity: 0.4 },
    ],
    specs: { transistors: '16B', process: '2nm', tdp: '15W', memory: '16GB Unified', flops: '35 TOPS' },
  },
};

export default function ChipArchApp() {
  const [preset, setPreset] = useState('gpu');
  const [explode, setExplode] = useState(0.5);
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [highlightedCore, setHighlightedCore] = useState(null);
  const [visibleLayers, setVisibleLayers] = useState({ substrate: true, transistors: true, compute: true, interconnect: true, cache: true, hbm: true, heatspreader: true });

  const chip = CHIP_PRESETS[preset];

  const coreUtils = useMemo(() => {
    return Array.from({ length: chip.cores }, () => Math.floor(20 + Math.random() * 80));
  }, [chip.cores, preset]);

  const toggleLayer = (id) => setVisibleLayers(v => ({ ...v, [id]: !v[id] }));

  return (
    <div className="relative w-screen h-screen bg-[#030108] overflow-hidden">
      <Canvas camera={{ position: [2.5, 2, 2.5], fov: 45 }} shadows>
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} castShadow />
        <pointLight position={[-2, 3, -2]} intensity={0.3} color="#6366f1" />
        <pointLight position={[2, 1, 2]} intensity={0.3} color="#0ea5e9" />

        <group>
          {/* Layers */}
          {chip.layers.filter(l => l.h > 0 && visibleLayers[l.id] !== false).map(layer => (
            <ChipLayer
              key={layer.id}
              position={[0, layer.y * (1 + explode * 2), 0]}
              size={[2.2, layer.h, 2.2]}
              color={layer.color}
              label={layer.label}
              opacity={layer.opacity || 0.9}
              emissive={layer.id === 'interconnect' ? '#4f46e5' : undefined}
              wireframe={layer.wireframe}
            />
          ))}

          {/* Compute cores */}
          {visibleLayers.compute !== false && Array.from({ length: chip.cores }, (_, i) => {
            const cols = chip.gridCols;
            const rows = Math.ceil(chip.cores / cols);
            const col = i % cols;
            const row = Math.floor(i / cols);
            const spacing = 1.6 / Math.max(cols, rows);
            const x = (col - (cols - 1) / 2) * spacing;
            const z = (row - (rows - 1) / 2) * spacing;

            return (
              <ComputeCore
                key={i}
                position={[x, explode * 1, z]}
                utilization={coreUtils[i]}
                size={spacing * 0.85}
                label={`Core ${i}`}
                highlighted={highlightedCore === i}
                onClick={() => setHighlightedCore(highlightedCore === i ? null : i)}
              />
            );
          })}

          <DataFlowParticles count={400} active={showDataFlow} coreCount={chip.cores} />
        </group>

        <OrbitControls enablePan minDistance={2} maxDistance={8} autoRotate autoRotateSpeed={0.3} />
        <Environment preset="night" />
      </Canvas>

      {/* Control Panel */}
      <div className="fixed top-4 left-4 z-20 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🧠</span> Chip Architecture
          </h1>
          <p className="text-xs text-gray-500 mt-1">{chip.name}</p>
        </div>

        {/* Chip presets */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Chip Type</p>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.entries(CHIP_PRESETS).map(([id, c]) => (
              <button key={id} onClick={() => setPreset(id)}
                className={`px-2 py-2 rounded-lg text-[11px] font-bold uppercase transition-all ${
                  preset === id ? 'bg-indigo-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}>
                {id}
              </button>
            ))}
          </div>
        </div>

        {/* Explode slider */}
        <div className="p-4 border-b border-white/10">
          <div className="flex justify-between mb-1">
            <span className="text-xs text-gray-400">Layer Explode</span>
            <span className="text-xs text-gray-500 font-mono">{explode.toFixed(1)}</span>
          </div>
          <input type="range" min={0} max={2} step={0.1} value={explode}
            onChange={e => setExplode(parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-indigo-500" />
        </div>

        {/* Layer visibility */}
        <div className="p-4 border-b border-white/10 space-y-2">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Layers</p>
          {chip.layers.map(l => (
            <label key={l.id} className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-300">{l.label}</span>
              <button onClick={() => toggleLayer(l.id)}
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${visibleLayers[l.id] !== false ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${visibleLayers[l.id] !== false ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}
          <label className="flex items-center justify-between cursor-pointer pt-1 border-t border-white/5">
            <span className="text-xs text-gray-300">Data Flow</span>
            <button onClick={() => setShowDataFlow(v => !v)}
              className={`w-9 h-5 rounded-full transition-colors flex items-center ${showDataFlow ? 'bg-cyan-600' : 'bg-gray-700'}`}>
              <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${showDataFlow ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
          </label>
        </div>

        {/* Specs */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Specifications</p>
          <div className="space-y-1.5">
            {Object.entries(chip.specs).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-[11px] text-gray-500 capitalize">{key}</span>
                <span className="text-[11px] text-indigo-300 font-medium font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Core utilization */}
        <div className="p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Core Utilization</p>
          <div className="grid grid-cols-4 gap-1">
            {coreUtils.map((util, i) => (
              <button key={i} onClick={() => setHighlightedCore(highlightedCore === i ? null : i)}
                className={`rounded px-1 py-1 text-center transition-all ${highlightedCore === i ? 'ring-1 ring-indigo-400' : ''}`}
                style={{ backgroundColor: `rgba(${util > 70 ? '239,68,68' : util > 40 ? '245,158,11' : '34,197,94'}, ${util / 400 + 0.05})` }}>
                <div className="text-[9px] text-gray-400">C{i}</div>
                <div className={`text-[10px] font-bold ${util > 90 ? 'text-red-400' : util > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>{util}%</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
