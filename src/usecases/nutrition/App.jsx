/**
 * Nutrition / Diet 3D Use Case
 *
 * Interactive 3D body + organ visualization:
 * - Digestive system organs (stomach, liver, intestines, pancreas)
 * - Nutrient particle flow (proteins, carbs, fats, vitamins)
 * - Macro/micro nutrient breakdown panel
 * - Meal builder with real-time 3D feedback
 */

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Text, Environment, MeshDistortMaterial, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/* ── Organ Component ── */
function Organ({ position, scale = 1, color, label, highlighted, onClick, shape = 'sphere' }) {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    ref.current.rotation.y = Math.sin(t * 0.3) * 0.05;
    if (highlighted) {
      ref.current.scale.setScalar(scale * (1 + Math.sin(t * 3) * 0.03));
    }
  });

  return (
    <group position={position} onClick={onClick}>
      <mesh ref={ref} castShadow scale={scale}>
        {shape === 'sphere' && <sphereGeometry args={[0.4, 32, 32]} />}
        {shape === 'capsule' && <capsuleGeometry args={[0.2, 0.5, 16, 32]} />}
        {shape === 'torus' && <torusGeometry args={[0.3, 0.12, 16, 32]} />}
        {shape === 'elongated' && <capsuleGeometry args={[0.15, 0.8, 16, 32]} />}
        <MeshDistortMaterial
          color={highlighted ? '#f59e0b' : color}
          roughness={0.4}
          metalness={0.1}
          distort={0.1}
          speed={1.5}
          emissive={highlighted ? '#78350f' : '#0a0000'}
          emissiveIntensity={highlighted ? 0.4 : 0.1}
          transparent
          opacity={highlighted ? 1 : 0.85}
        />
      </mesh>
      <Text position={[0, -0.6 * scale, 0]} fontSize={0.1} color="#94a3b8" anchorX="center">
        {label}
      </Text>
    </group>
  );
}

/* ── Nutrient Particles ── */
function NutrientParticles({ type, count = 100, active }) {
  const ref = useRef();
  const colors = {
    protein: '#ef4444',
    carbs: '#f59e0b',
    fat: '#8b5cf6',
    vitamins: '#10b981',
  };

  const particles = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 3;
      pos[i * 3 + 1] = Math.random() * 4 - 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    return pos;
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current || !active) return;
    const positions = ref.current.geometry.attributes.position.array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx + 1] -= 0.01 + Math.sin(t + i) * 0.005;
      positions[idx] += Math.sin(t * 0.5 + i * 0.3) * 0.003;
      if (positions[idx + 1] < -2.5) {
        positions[idx + 1] = 2;
        positions[idx] = (Math.random() - 0.5) * 2;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={particles} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color={colors[type]} transparent opacity={0.7} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ── Food Item 3D ── */
function FoodItem3D({ position, color, shape, scale = 0.3 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.rotation.y = clock.getElapsedTime() * 0.5;
      ref.current.position.y = position[1] + Math.sin(clock.getElapsedTime() * 2) * 0.05;
    }
  });

  return (
    <mesh ref={ref} position={position} scale={scale} castShadow>
      {shape === 'box' && <boxGeometry args={[1, 1, 1]} />}
      {shape === 'sphere' && <sphereGeometry args={[0.5, 16, 16]} />}
      {shape === 'cylinder' && <cylinderGeometry args={[0.3, 0.3, 0.8, 16]} />}
      {shape === 'cone' && <coneGeometry args={[0.4, 0.8, 16]} />}
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
    </mesh>
  );
}

/* ── 3D Scene ── */
function DigestiveScene({ highlightedOrgan, onOrganClick, nutrients, showParticles, mealItems }) {
  const organs = [
    { id: 'stomach', label: 'Stomach', position: [0, 0.8, 0], scale: 0.9, color: '#f97316', shape: 'sphere' },
    { id: 'liver', label: 'Liver', position: [-0.8, 0.5, 0.3], scale: 0.8, color: '#7f1d1d', shape: 'capsule' },
    { id: 'pancreas', label: 'Pancreas', position: [0.7, 0, 0.2], scale: 0.6, color: '#d97706', shape: 'elongated' },
    { id: 'small_intestine', label: 'Small Intestine', position: [0, -0.5, 0], scale: 1.0, color: '#ea580c', shape: 'torus' },
    { id: 'large_intestine', label: 'Large Intestine', position: [0, -1.3, 0], scale: 1.1, color: '#c2410c', shape: 'torus' },
  ];

  return (
    <>
      {organs.map(organ => (
        <Organ key={organ.id} {...organ}
          highlighted={highlightedOrgan === organ.id}
          onClick={() => onOrganClick(organ.id)} />
      ))}

      {showParticles && Object.entries(nutrients).map(([type, active]) => (
        active && <NutrientParticles key={type} type={type} count={80} active />
      ))}

      {mealItems.map((item, i) => (
        <FoodItem3D key={i}
          position={[-2 + i * 0.8, 2, 0]}
          color={item.color}
          shape={item.shape}
          scale={0.25} />
      ))}
    </>
  );
}

/* ── Organ Info ── */
const ORGAN_INFO = {
  stomach: { name: 'Stomach', role: 'Breaks down food with acid and enzymes', ph: '1.5 - 3.5', capacity: '~1L', time: '2-4 hours' },
  liver: { name: 'Liver', role: 'Processes nutrients, detoxifies, produces bile', weight: '~1.5 kg', functions: '500+', bloodFlow: '1.5 L/min' },
  pancreas: { name: 'Pancreas', role: 'Produces insulin and digestive enzymes', length: '~15 cm', enzymes: 'Lipase, Amylase, Protease', hormones: 'Insulin, Glucagon' },
  small_intestine: { name: 'Small Intestine', role: 'Primary site of nutrient absorption', length: '~6 m', surfaceArea: '~32 m²', absorption: '90% of nutrients' },
  large_intestine: { name: 'Large Intestine', role: 'Absorbs water, forms waste', length: '~1.5 m', bacteria: '100 trillion+', transit: '12-36 hours' },
};

/* ── Food Database ── */
const FOODS = [
  { name: 'Grilled Chicken', cal: 165, protein: 31, carbs: 0, fat: 3.6, color: '#d4a373', shape: 'cylinder', vitamins: ['B6', 'B12'] },
  { name: 'Brown Rice', cal: 216, protein: 5, carbs: 45, fat: 1.8, color: '#c9b99a', shape: 'box', vitamins: ['B1', 'Mg'] },
  { name: 'Broccoli', cal: 55, protein: 3.7, carbs: 11, fat: 0.6, color: '#22c55e', shape: 'cone', vitamins: ['C', 'K'] },
  { name: 'Salmon', cal: 208, protein: 20, carbs: 0, fat: 13, color: '#fb923c', shape: 'cylinder', vitamins: ['D', 'B12', 'Omega-3'] },
  { name: 'Avocado', cal: 160, protein: 2, carbs: 9, fat: 15, color: '#4d7c0f', shape: 'sphere', vitamins: ['K', 'E', 'C'] },
  { name: 'Sweet Potato', cal: 103, protein: 2.3, carbs: 24, fat: 0.1, color: '#ea580c', shape: 'sphere', vitamins: ['A', 'C', 'B6'] },
  { name: 'Greek Yogurt', cal: 100, protein: 17, carbs: 6, fat: 0.7, color: '#fef9c3', shape: 'cylinder', vitamins: ['B12', 'Ca'] },
  { name: 'Almonds', cal: 164, protein: 6, carbs: 6, fat: 14, color: '#a16207', shape: 'sphere', vitamins: ['E', 'Mg'] },
];

/* ── Main ── */
export default function NutritionApp() {
  const [highlightedOrgan, setHighlightedOrgan] = useState(null);
  const [showParticles, setShowParticles] = useState(true);
  const [nutrients, setNutrients] = useState({ protein: true, carbs: true, fat: true, vitamins: true });
  const [mealItems, setMealItems] = useState([FOODS[0], FOODS[1], FOODS[2]]);

  const toggleNutrient = (key) => setNutrients(n => ({ ...n, [key]: !n[key] }));

  const totals = useMemo(() => {
    return mealItems.reduce((acc, f) => ({
      cal: acc.cal + f.cal,
      protein: acc.protein + f.protein,
      carbs: acc.carbs + f.carbs,
      fat: acc.fat + f.fat,
    }), { cal: 0, protein: 0, carbs: 0, fat: 0 });
  }, [mealItems]);

  const addFood = (food) => setMealItems(m => [...m, food]);
  const removeFood = (idx) => setMealItems(m => m.filter((_, i) => i !== idx));

  const organInfo = highlightedOrgan ? ORGAN_INFO[highlightedOrgan] : null;

  return (
    <div className="relative w-screen h-screen bg-[#050802] overflow-hidden">
      <Canvas camera={{ position: [0, 0, 5], fov: 50 }} shadows>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
        <pointLight position={[-3, 2, -2]} intensity={0.4} color="#f59e0b" />

        <Float speed={0.8} rotationIntensity={0.05} floatIntensity={0.2}>
          <DigestiveScene
            highlightedOrgan={highlightedOrgan}
            onOrganClick={id => setHighlightedOrgan(highlightedOrgan === id ? null : id)}
            nutrients={nutrients}
            showParticles={showParticles}
            mealItems={mealItems}
          />
        </Float>

        <OrbitControls enablePan={false} minDistance={3} maxDistance={10} autoRotate autoRotateSpeed={0.3} />
        <Environment preset="forest" />
      </Canvas>

      {/* Control Panel */}
      <div className="fixed top-4 left-4 z-20 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🥗</span> Nutrition 3D
          </h1>
          <p className="text-xs text-gray-500 mt-1">Digestive system & nutrient flow</p>
        </div>

        {/* Macro totals */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Daily Totals</p>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Calories', value: totals.cal, unit: 'kcal', color: 'text-amber-400' },
              { label: 'Protein', value: `${totals.protein}g`, unit: '', color: 'text-red-400' },
              { label: 'Carbs', value: `${totals.carbs}g`, unit: '', color: 'text-yellow-400' },
              { label: 'Fat', value: `${totals.fat.toFixed(1)}g`, unit: '', color: 'text-violet-400' },
            ].map(v => (
              <div key={v.label} className="bg-white/5 rounded-lg p-2 text-center">
                <div className={`text-sm font-bold font-mono ${v.color}`}>{v.value}</div>
                <div className="text-[8px] text-gray-500">{v.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Nutrient particle toggles */}
        <div className="p-4 border-b border-white/10 space-y-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Nutrient Flow</p>
            <button onClick={() => setShowParticles(v => !v)}
              className={`text-[10px] px-2 py-0.5 rounded ${showParticles ? 'bg-emerald-600 text-white' : 'bg-gray-700 text-gray-400'}`}>
              {showParticles ? 'ON' : 'OFF'}
            </button>
          </div>
          {[
            { key: 'protein', label: 'Protein', color: 'bg-red-600', dot: 'bg-red-400' },
            { key: 'carbs', label: 'Carbohydrates', color: 'bg-amber-600', dot: 'bg-amber-400' },
            { key: 'fat', label: 'Fats', color: 'bg-violet-600', dot: 'bg-violet-400' },
            { key: 'vitamins', label: 'Vitamins & Minerals', color: 'bg-emerald-600', dot: 'bg-emerald-400' },
          ].map(({ key, label, color, dot }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-300 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${dot}`} /> {label}
              </span>
              <button onClick={() => toggleNutrient(key)}
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${nutrients[key] ? color : 'bg-gray-700'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${nutrients[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}
        </div>

        {/* Meal builder */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Meal ({mealItems.length} items)</p>
          <div className="space-y-1 mb-3">
            {mealItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/5">
                <span className="text-[11px] text-gray-300">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-500">{item.cal} kcal</span>
                  <button onClick={() => removeFood(i)} className="text-gray-600 hover:text-red-400 transition-colors text-xs">×</button>
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {FOODS.filter(f => !mealItems.includes(f)).slice(0, 6).map(food => (
              <button key={food.name} onClick={() => addFood(food)}
                className="px-2 py-1.5 rounded-lg bg-white/5 text-[10px] text-gray-400 hover:bg-white/10 hover:text-gray-300 transition-colors text-left truncate">
                + {food.name}
              </button>
            ))}
          </div>
        </div>

        {/* Organ info */}
        {organInfo && (
          <div className="p-4 bg-orange-950/20 border-b border-white/10">
            <h3 className="text-sm font-bold text-orange-300 mb-1">{organInfo.name}</h3>
            <p className="text-[11px] text-gray-400 mb-2">{organInfo.role}</p>
            <div className="space-y-1">
              {Object.entries(organInfo).filter(([k]) => k !== 'name' && k !== 'role').map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                  <span className="text-[10px] text-orange-300 font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organs list */}
        <div className="p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Organs</p>
          <div className="space-y-1">
            {Object.entries(ORGAN_INFO).map(([id, info]) => (
              <button key={id} onClick={() => setHighlightedOrgan(highlightedOrgan === id ? null : id)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                  highlightedOrgan === id ? 'bg-orange-600/20 text-orange-300' : 'hover:bg-white/5 text-gray-400'
                }`}>
                <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                <span className="text-[11px]">{info.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
