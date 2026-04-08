/**
 * Data Center 3D Use Case
 *
 * Interactive 3D data center visualization:
 * - Server rack rows with individual servers
 * - Heat map overlay (temperature per server)
 * - Network traffic particles between racks
 * - Cooling system visualization
 * - Power & utilization metrics
 */

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Environment, RoundedBox, Line } from '@react-three/drei';
import * as THREE from 'three';

/* ── Server Unit ── */
function ServerUnit({ position, status, temp, load, label, highlighted, onClick }) {
  const ref = useRef();
  const ledRef = useRef();

  const color = useMemo(() => {
    if (status === 'offline') return '#374151';
    if (temp > 80) return '#ef4444';
    if (temp > 65) return '#f59e0b';
    return '#1e293b';
  }, [status, temp]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    if (highlighted) {
      ref.current.material.emissiveIntensity = 0.3 + Math.sin(clock.getElapsedTime() * 4) * 0.1;
    } else {
      ref.current.material.emissiveIntensity = status === 'online' ? (load / 100) * 0.2 : 0;
    }
    if (ledRef.current && status === 'online') {
      ledRef.current.material.emissiveIntensity = 0.5 + Math.sin(clock.getElapsedTime() * 5 + position[0]) * 0.3;
    }
  });

  return (
    <group position={position} onClick={onClick}>
      {/* Server chassis */}
      <RoundedBox ref={ref} args={[0.8, 0.12, 0.5]} radius={0.01} smoothness={4}>
        <meshStandardMaterial
          color={color}
          metalness={0.7}
          roughness={0.3}
          emissive={highlighted ? '#3b82f6' : status === 'online' ? '#0ea5e9' : '#000'}
          emissiveIntensity={0.1}
        />
      </RoundedBox>
      {/* Status LED */}
      {status === 'online' && (
        <mesh ref={ledRef} position={[0.35, 0, 0.26]}>
          <sphereGeometry args={[0.015, 8, 8]} />
          <meshStandardMaterial
            color={load > 80 ? '#ef4444' : '#22c55e'}
            emissive={load > 80 ? '#ef4444' : '#22c55e'}
            emissiveIntensity={0.5}
          />
        </mesh>
      )}
      {/* Drive bays (visual detail) */}
      {[...Array(4)].map((_, i) => (
        <mesh key={i} position={[-0.25 + i * 0.15, 0, 0.26]}>
          <boxGeometry args={[0.1, 0.06, 0.01]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Server Rack ── */
function ServerRack({ position, rackId, servers, highlightedServer, onServerClick }) {
  return (
    <group position={position}>
      {/* Rack frame */}
      <RoundedBox args={[1, 3, 0.7]} radius={0.02} smoothness={4}>
        <meshStandardMaterial color="#0f172a" metalness={0.6} roughness={0.4} transparent opacity={0.6} />
      </RoundedBox>
      {/* Rack label */}
      <Text position={[0, 1.65, 0.36]} fontSize={0.08} color="#64748b" anchorX="center">
        RACK {rackId}
      </Text>
      {/* Servers */}
      {servers.map((srv, i) => (
        <ServerUnit
          key={srv.id}
          position={[0, -1.2 + i * 0.18, 0]}
          {...srv}
          highlighted={highlightedServer === srv.id}
          onClick={() => onServerClick(srv.id)}
        />
      ))}
    </group>
  );
}

/* ── Network Traffic Particles ── */
function NetworkTraffic({ racks, active }) {
  const ref = useRef();
  const count = 200;

  const particles = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = Math.random() * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
      vel[i * 3] = (Math.random() - 0.5) * 0.08;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.02;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    }
    return { pos, vel };
  }, []);

  useFrame(() => {
    if (!ref.current || !active) return;
    const positions = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx] += particles.vel[idx];
      positions[idx + 1] += particles.vel[idx + 1];
      positions[idx + 2] += particles.vel[idx + 2];
      if (Math.abs(positions[idx]) > 6 || Math.abs(positions[idx + 2]) > 4) {
        positions[idx] = (Math.random() - 0.5) * 8;
        positions[idx + 1] = Math.random() * 2;
        positions[idx + 2] = (Math.random() - 0.5) * 4;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={particles.pos} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#0ea5e9" transparent opacity={0.5} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ── Cooling Visualization ── */
function CoolingFlow({ active }) {
  const ref = useRef();
  const count = 150;

  const particles = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = -1.6 + Math.random() * 0.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!ref.current || !active) return;
    const positions = ref.current.geometry.attributes.position.array;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx] += Math.sin(t + i * 0.1) * 0.01;
      positions[idx + 2] += 0.02;
      if (positions[idx + 2] > 3) positions[idx + 2] = -3;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={particles} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#06b6d4" transparent opacity={0.3} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ── Floor Grid ── */
function FloorGrid() {
  return (
    <group position={[0, -1.6, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 8]} />
        <meshStandardMaterial color="#0a0f1a" metalness={0.3} roughness={0.8} />
      </mesh>
      <gridHelper args={[14, 28, '#1e3a5f', '#0d1b2a']} />
    </group>
  );
}

/* ── Generate Server Data ── */
function generateServers(rackId, count = 12) {
  return Array.from({ length: count }, (_, i) => ({
    id: `R${rackId}-S${i}`,
    status: Math.random() > 0.1 ? 'online' : 'offline',
    temp: Math.floor(40 + Math.random() * 50),
    load: Math.floor(Math.random() * 100),
    label: `Server ${i}`,
    cpu: `${Math.floor(Math.random() * 100)}%`,
    memory: `${Math.floor(30 + Math.random() * 70)}%`,
    network: `${Math.floor(Math.random() * 10)}Gbps`,
  }));
}

export default function DataCenterApp() {
  const [highlightedServer, setHighlightedServer] = useState(null);
  const [showNetwork, setShowNetwork] = useState(true);
  const [showCooling, setShowCooling] = useState(true);

  const racks = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      position: [((i % 3) - 1) * 3, 0, i < 3 ? -1.5 : 1.5],
      servers: generateServers(i + 1),
    }));
  }, []);

  const allServers = racks.flatMap(r => r.servers);
  const selectedServer = allServers.find(s => s.id === highlightedServer);
  const onlineCount = allServers.filter(s => s.status === 'online').length;
  const avgTemp = Math.round(allServers.filter(s => s.status === 'online').reduce((a, s) => a + s.temp, 0) / onlineCount);
  const avgLoad = Math.round(allServers.filter(s => s.status === 'online').reduce((a, s) => a + s.load, 0) / onlineCount);
  const hotServers = allServers.filter(s => s.temp > 75).length;

  return (
    <div className="relative w-screen h-screen bg-[#020408] overflow-hidden">
      <Canvas camera={{ position: [6, 5, 8], fov: 50 }} shadows>
        <ambientLight intensity={0.15} />
        <directionalLight position={[10, 10, 5]} intensity={0.5} castShadow />
        <pointLight position={[0, 3, 0]} intensity={0.3} color="#0ea5e9" />

        <FloorGrid />

        {racks.map(rack => (
          <ServerRack
            key={rack.id}
            position={rack.position}
            rackId={rack.id}
            servers={rack.servers}
            highlightedServer={highlightedServer}
            onServerClick={setHighlightedServer}
          />
        ))}

        <NetworkTraffic racks={racks} active={showNetwork} />
        <CoolingFlow active={showCooling} />

        <OrbitControls enablePan minDistance={4} maxDistance={20} maxPolarAngle={Math.PI / 2.1} />
        <Environment preset="warehouse" />
      </Canvas>

      {/* Control Panel */}
      <div className="fixed top-4 left-4 z-20 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🏢</span> Data Center
          </h1>
          <p className="text-xs text-gray-500 mt-1">Server infrastructure monitoring</p>
        </div>

        {/* Overview stats */}
        <div className="p-4 border-b border-white/10">
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: 'Online', value: onlineCount, total: allServers.length, color: 'text-emerald-400' },
              { label: 'Avg Temp', value: `${avgTemp}°`, total: '', color: avgTemp > 70 ? 'text-red-400' : 'text-cyan-400' },
              { label: 'Avg Load', value: `${avgLoad}%`, total: '', color: avgLoad > 80 ? 'text-red-400' : 'text-blue-400' },
              { label: 'Hot', value: hotServers, total: '', color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 rounded-lg p-2 text-center">
                <div className={`text-sm font-bold font-mono ${s.color}`}>
                  {s.value}{s.total ? `/${s.total}` : ''}
                </div>
                <div className="text-[8px] text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="p-4 border-b border-white/10 space-y-2.5">
          {[
            { label: 'Network Traffic', active: showNetwork, toggle: () => setShowNetwork(v => !v), color: 'bg-blue-600' },
            { label: 'Cooling Flow', active: showCooling, toggle: () => setShowCooling(v => !v), color: 'bg-cyan-600' },
          ].map(({ label, active, toggle, color }) => (
            <label key={label} className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-300">{label}</span>
              <button onClick={toggle}
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${active ? color : 'bg-gray-700'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}
        </div>

        {/* Selected server detail */}
        {selectedServer && (
          <div className="p-4 border-b border-white/10 bg-blue-950/20">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-blue-300">{selectedServer.id}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedServer.status === 'online' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-gray-600/20 text-gray-400'}`}>
                {selectedServer.status}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Temperature', value: `${selectedServer.temp}°C`, color: selectedServer.temp > 75 ? 'text-red-400' : 'text-cyan-400' },
                { label: 'CPU Load', value: selectedServer.cpu, color: 'text-blue-400' },
                { label: 'Memory', value: selectedServer.memory, color: 'text-violet-400' },
                { label: 'Network', value: selectedServer.network, color: 'text-emerald-400' },
              ].map(m => (
                <div key={m.label} className="bg-black/30 rounded-lg p-2">
                  <div className={`text-xs font-bold font-mono ${m.color}`}>{m.value}</div>
                  <div className="text-[9px] text-gray-500">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rack list */}
        <div className="p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Racks</p>
          <div className="space-y-2">
            {racks.map(rack => {
              const online = rack.servers.filter(s => s.status === 'online').length;
              const maxTemp = Math.max(...rack.servers.map(s => s.temp));
              return (
                <div key={rack.id} className="bg-white/5 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-300">Rack {rack.id}</span>
                    <span className="text-[10px] text-gray-500">{online}/{rack.servers.length} online</span>
                  </div>
                  <div className="flex gap-0.5">
                    {rack.servers.map(s => (
                      <button key={s.id}
                        onClick={() => setHighlightedServer(highlightedServer === s.id ? null : s.id)}
                        className={`flex-1 h-3 rounded-sm transition-all ${highlightedServer === s.id ? 'ring-1 ring-blue-400' : ''}`}
                        style={{ backgroundColor: s.status === 'offline' ? '#374151' : s.temp > 75 ? '#ef4444' : s.temp > 60 ? '#f59e0b' : '#22c55e', opacity: 0.7 }}
                        title={`${s.id}: ${s.temp}°C, ${s.load}%`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
