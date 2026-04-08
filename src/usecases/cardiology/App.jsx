/**
 * Cardiology 3D Use Case
 *
 * Interactive 3D heart simulation:
 * - Beating heart model with chamber animation
 * - Real-time ECG waveform
 * - Blood flow particle system
 * - Adjustable BPM, view mode, chamber highlight
 */

import React, { useRef, useState, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Text, Environment, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

/* ── Heart Chamber Component ── */
function HeartChamber({ position, scale, color, label, highlighted, onClick, bpm }) {
  const ref = useRef();
  const speed = bpm / 60;

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed;
    const beat = 1 + Math.sin(t * Math.PI * 2) * 0.08 + Math.max(0, Math.sin(t * Math.PI * 4)) * 0.05;
    ref.current.scale.setScalar(beat * (scale || 1));
  });

  return (
    <group position={position} onClick={onClick}>
      <mesh ref={ref} castShadow>
        <sphereGeometry args={[0.5, 32, 32]} />
        <MeshDistortMaterial
          color={highlighted ? '#ef4444' : color}
          roughness={0.3}
          metalness={0.2}
          distort={0.15}
          speed={speed * 2}
          emissive={highlighted ? '#7f1d1d' : '#1a0000'}
          emissiveIntensity={highlighted ? 0.5 : 0.15}
        />
      </mesh>
      <Text position={[0, -0.7, 0]} fontSize={0.12} color="#94a3b8" anchorX="center">
        {label}
      </Text>
    </group>
  );
}

/* ── Aorta / Vessel ── */
function Vessel({ start, end, color, radius = 0.08 }) {
  const ref = useRef();
  const curve = useMemo(() => {
    const mid = new THREE.Vector3().lerpVectors(
      new THREE.Vector3(...start),
      new THREE.Vector3(...end),
      0.5
    );
    mid.y += 0.5;
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      mid,
      new THREE.Vector3(...end)
    );
  }, [start, end]);

  const geometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 32, radius, 8, false);
  }, [curve, radius]);

  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.material.emissiveIntensity = 0.2 + Math.sin(clock.getElapsedTime() * 3) * 0.15;
    }
  });

  return (
    <mesh ref={ref} geometry={geometry}>
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} transparent opacity={0.7} />
    </mesh>
  );
}

/* ── Blood Particles ── */
function BloodParticles({ count = 200, bpm }) {
  const ref = useRef();
  const speed = bpm / 60;

  const particles = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.3 + Math.random() * 1.5;
      pos[i * 3] = Math.cos(angle) * r;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 2] = Math.sin(angle) * r;
      vel[i * 3] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 1] = Math.random() * 0.01;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }
    return { pos, vel };
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const positions = ref.current.geometry.attributes.position.array;
    const t = clock.getElapsedTime() * speed;
    const pulse = 1 + Math.sin(t * Math.PI * 2) * 0.3;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx] += particles.vel[idx] * pulse;
      positions[idx + 1] += particles.vel[idx + 1] * pulse;
      positions[idx + 2] += particles.vel[idx + 2] * pulse;

      const dist = Math.sqrt(positions[idx] ** 2 + positions[idx + 1] ** 2 + positions[idx + 2] ** 2);
      if (dist > 2) {
        const angle = Math.random() * Math.PI * 2;
        positions[idx] = Math.cos(angle) * 0.3;
        positions[idx + 1] = (Math.random() - 0.5) * 0.5;
        positions[idx + 2] = Math.sin(angle) * 0.3;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={particles.pos} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#ef4444" transparent opacity={0.6} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ── Heart Model (composed of chambers) ── */
function HeartModel({ bpm, highlightedChamber, onChamberClick, showBlood }) {
  const groupRef = useRef();

  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.2) * 0.1;
    }
  });

  const chambers = [
    { id: 'la', label: 'Left Atrium', position: [-0.4, 0.5, 0], scale: 0.7, color: '#dc2626' },
    { id: 'ra', label: 'Right Atrium', position: [0.4, 0.5, 0], scale: 0.65, color: '#991b1b' },
    { id: 'lv', label: 'Left Ventricle', position: [-0.35, -0.3, 0], scale: 0.9, color: '#b91c1c' },
    { id: 'rv', label: 'Right Ventricle', position: [0.35, -0.3, 0], scale: 0.85, color: '#7f1d1d' },
  ];

  return (
    <group ref={groupRef}>
      {chambers.map(ch => (
        <HeartChamber
          key={ch.id}
          {...ch}
          highlighted={highlightedChamber === ch.id}
          onClick={() => onChamberClick(ch.id)}
          bpm={bpm}
        />
      ))}

      {/* Vessels */}
      <Vessel start={[-0.4, 0.9, 0]} end={[0, 1.8, -0.2]} color="#ef4444" radius={0.06} />
      <Vessel start={[0.4, 0.9, 0]} end={[0.3, 1.6, 0.2]} color="#7f1d1d" radius={0.05} />
      <Vessel start={[-0.35, -0.8, 0]} end={[-0.2, -1.5, 0]} color="#dc2626" radius={0.07} />
      <Vessel start={[0.35, -0.8, 0]} end={[0.2, -1.5, 0]} color="#991b1b" radius={0.06} />

      {showBlood && <BloodParticles count={300} bpm={bpm} />}
    </group>
  );
}

/* ── ECG Waveform (2D overlay) ── */
function ECGWaveform({ bpm, width = 400 }) {
  const canvasRef = useRef(null);
  const offsetRef = useRef(0);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const h = 100;
    canvas.width = width;
    canvas.height = h;

    const interval = setInterval(() => {
      offsetRef.current += 2;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.fillRect(0, 0, width, h);

      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#22c55e';
      ctx.shadowBlur = 8;
      ctx.beginPath();

      for (let x = 0; x < width; x++) {
        const t = ((x + offsetRef.current) % width) / width;
        const cycle = t * Math.PI * 2;
        let y = h / 2;

        // P wave
        if (t > 0.05 && t < 0.15) y -= Math.sin((t - 0.05) / 0.1 * Math.PI) * 8;
        // QRS complex
        else if (t > 0.2 && t < 0.22) y += (t - 0.2) / 0.02 * 15;
        else if (t > 0.22 && t < 0.25) y -= 40;
        else if (t > 0.25 && t < 0.28) y += (0.28 - t) / 0.03 * 10;
        // T wave
        else if (t > 0.35 && t < 0.5) y -= Math.sin((t - 0.35) / 0.15 * Math.PI) * 12;

        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Grid
      ctx.strokeStyle = 'rgba(34, 197, 94, 0.1)';
      ctx.lineWidth = 0.5;
      for (let gy = 0; gy < h; gy += 20) {
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke();
      }
      for (let gx = 0; gx < width; gx += 20) {
        ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke();
      }
    }, 1000 / 30);

    return () => clearInterval(interval);
  }, [bpm, width]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-xl border border-emerald-900/30"
      style={{ width, height: 100 }}
    />
  );
}

/* ── Chamber Info ── */
const CHAMBER_INFO = {
  la: { name: 'Left Atrium', desc: 'Receives oxygenated blood from lungs via pulmonary veins', pressure: '8-12 mmHg', volume: '~58 mL' },
  ra: { name: 'Right Atrium', desc: 'Receives deoxygenated blood from body via vena cava', pressure: '2-6 mmHg', volume: '~53 mL' },
  lv: { name: 'Left Ventricle', desc: 'Pumps oxygenated blood to body via aorta', pressure: '120/80 mmHg', volume: '~130 mL' },
  rv: { name: 'Right Ventricle', desc: 'Pumps deoxygenated blood to lungs via pulmonary artery', pressure: '25/4 mmHg', volume: '~120 mL' },
};

/* ── Main Component ── */
export default function CardiologyApp() {
  const [bpm, setBpm] = useState(72);
  const [highlightedChamber, setHighlightedChamber] = useState(null);
  const [showBlood, setShowBlood] = useState(true);
  const [showECG, setShowECG] = useState(true);

  const chamberInfo = highlightedChamber ? CHAMBER_INFO[highlightedChamber] : null;

  return (
    <div className="relative w-screen h-screen bg-[#0a0008] overflow-hidden">
      {/* 3D Scene */}
      <Canvas camera={{ position: [0, 0, 4.5], fov: 50 }} shadows>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <pointLight position={[-3, 2, -2]} intensity={0.5} color="#ef4444" />
        <pointLight position={[3, -2, 2]} intensity={0.3} color="#3b82f6" />

        <Float speed={1} rotationIntensity={0.1} floatIntensity={0.3}>
          <HeartModel
            bpm={bpm}
            highlightedChamber={highlightedChamber}
            onChamberClick={setHighlightedChamber}
            showBlood={showBlood}
          />
        </Float>

        <OrbitControls enablePan={false} minDistance={2.5} maxDistance={8} autoRotate autoRotateSpeed={0.5} />
        <Environment preset="night" />
      </Canvas>

      {/* Control Panel */}
      <div className="fixed top-4 left-4 z-20 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🫀</span> Cardiology 3D
          </h1>
          <p className="text-xs text-gray-500 mt-1">Interactive heart simulation</p>
        </div>

        {/* BPM */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-400">Heart Rate</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-red-400 font-mono">{bpm}</span>
              <span className="text-[10px] text-gray-500">BPM</span>
            </div>
          </div>
          <input type="range" min={40} max={180} step={1} value={bpm}
            onChange={e => setBpm(parseInt(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer accent-red-500" />
          <div className="flex justify-between mt-1.5">
            {[60, 72, 90, 120, 150].map(v => (
              <button key={v} onClick={() => setBpm(v)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${bpm === v ? 'bg-red-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10'}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="p-4 border-b border-white/10 space-y-2.5">
          {[
            { key: 'blood', label: 'Blood Flow Particles', active: showBlood, toggle: () => setShowBlood(v => !v), color: 'bg-red-600' },
            { key: 'ecg', label: 'ECG Waveform', active: showECG, toggle: () => setShowECG(v => !v), color: 'bg-emerald-600' },
          ].map(({ key, label, active, toggle, color }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-300">{label}</span>
              <button onClick={toggle}
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${active ? color : 'bg-gray-700'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}
        </div>

        {/* Chambers */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Chambers</p>
          <div className="grid grid-cols-2 gap-1.5">
            {Object.entries(CHAMBER_INFO).map(([id, info]) => (
              <button key={id} onClick={() => setHighlightedChamber(highlightedChamber === id ? null : id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all text-left ${
                  highlightedChamber === id ? 'bg-red-600/20 text-red-300 border border-red-500/30' : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
                }`}>
                {info.name}
              </button>
            ))}
          </div>
        </div>

        {/* Chamber detail */}
        {chamberInfo && (
          <div className="p-4 border-b border-white/10 bg-red-950/20">
            <h3 className="text-sm font-bold text-red-300 mb-1">{chamberInfo.name}</h3>
            <p className="text-[11px] text-gray-400 mb-2">{chamberInfo.desc}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-black/30 rounded-lg p-2">
                <div className="text-xs font-bold text-red-400">{chamberInfo.pressure}</div>
                <div className="text-[9px] text-gray-500">Pressure</div>
              </div>
              <div className="bg-black/30 rounded-lg p-2">
                <div className="text-xs font-bold text-red-400">{chamberInfo.volume}</div>
                <div className="text-[9px] text-gray-500">Volume</div>
              </div>
            </div>
          </div>
        )}

        {/* Vitals */}
        <div className="p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Vitals</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Systolic', value: `${Math.round(120 + (bpm - 72) * 0.3)}`, unit: 'mmHg', color: 'text-red-400' },
              { label: 'Diastolic', value: `${Math.round(80 + (bpm - 72) * 0.1)}`, unit: 'mmHg', color: 'text-rose-400' },
              { label: 'SpO2', value: '98', unit: '%', color: 'text-cyan-400' },
            ].map(v => (
              <div key={v.label} className="bg-white/5 rounded-lg p-2 text-center">
                <div className={`text-lg font-bold font-mono ${v.color}`}>{v.value}</div>
                <div className="text-[8px] text-gray-500">{v.unit}</div>
                <div className="text-[9px] text-gray-500">{v.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ECG overlay */}
      {showECG && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <ECGWaveform bpm={bpm} width={500} />
        </div>
      )}
    </div>
  );
}
