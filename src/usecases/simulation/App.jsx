/**
 * 3D Simulation Use Case
 *
 * Real-time 3D orbital simulation:
 * - Satellite constellation orbiting Earth
 * - ISS tracker with real orbital path
 * - Debris field visualization
 * - Customizable orbital parameters (altitude, inclination, count)
 * - Time controls (pause, speed up)
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Globe from 'react-globe.gl';

// Generate satellite constellation
function generateSatellites(count, altitude, inclination) {
  const sats = [];
  const planes = Math.ceil(count / 6);
  for (let plane = 0; plane < planes; plane++) {
    const raan = (plane / planes) * 360; // right ascension
    const satsInPlane = Math.min(6, count - plane * 6);
    for (let i = 0; i < satsInPlane; i++) {
      const phase = (i / satsInPlane) * 360;
      sats.push({
        id: `SAT-${plane * 6 + i + 1}`,
        plane: plane + 1,
        altitude,
        inclination,
        raan,
        phase,
        type: 'satellite',
        color: `hsl(${(plane * 50) % 360}, 70%, 60%)`,
      });
    }
  }
  return sats;
}

// ISS orbital parameters
const ISS = {
  id: 'ISS',
  altitude: 420,
  inclination: 51.6,
  period: 92.68, // minutes
  type: 'station',
  color: '#fbbf24',
};

// Calculate position from orbital elements
function orbitalPosition(sat, timeMinutes) {
  const period = sat.type === 'station' ? sat.period : 90 + sat.altitude * 0.02;
  const meanAnomaly = ((sat.phase || 0) + (timeMinutes / period) * 360) % 360;
  const rad = (deg) => deg * Math.PI / 180;

  const inclRad = rad(sat.inclination);
  const raanRad = rad(sat.raan || 0);
  const maRad = rad(meanAnomaly);

  // Simplified orbital mechanics
  const x = Math.cos(maRad);
  const y = Math.sin(maRad);

  const lat = Math.asin(y * Math.sin(inclRad)) * 180 / Math.PI;
  const lng = (Math.atan2(
    y * Math.cos(inclRad),
    x
  ) * 180 / Math.PI + (sat.raan || 0) + timeMinutes * 0.25) % 360 - 180;

  return { lat, lng, alt: sat.altitude / 6371 }; // normalized altitude
}

// Generate debris field
function generateDebris(count) {
  const debris = [];
  for (let i = 0; i < count; i++) {
    debris.push({
      id: `DEB-${i}`,
      altitude: 300 + Math.random() * 1200,
      inclination: Math.random() * 100,
      raan: Math.random() * 360,
      phase: Math.random() * 360,
      type: 'debris',
      size: 0.01 + Math.random() * 0.05,
      color: 'rgba(239, 68, 68, 0.6)',
    });
  }
  return debris;
}

// Generate ground stations
const GROUND_STATIONS = [
  { name: 'Houston (NASA)', lat: 29.5502, lng: -95.0980, type: 'primary' },
  { name: 'Baikonur', lat: 45.9650, lng: 63.3050, type: 'primary' },
  { name: 'Kourou (ESA)', lat: 5.2320, lng: -52.7693, type: 'primary' },
  { name: 'Tanegashima (JAXA)', lat: 30.4000, lng: 131.0000, type: 'secondary' },
  { name: 'Wenchang', lat: 19.6145, lng: 110.9510, type: 'secondary' },
  { name: 'Sriharikota (ISRO)', lat: 13.7199, lng: 80.2304, type: 'secondary' },
  { name: 'Cape Canaveral', lat: 28.3922, lng: -80.6077, type: 'primary' },
  { name: 'Vandenberg', lat: 34.7420, lng: -120.5724, type: 'secondary' },
];

export default function SimulationApp() {
  const globeRef = useRef();
  const [simTime, setSimTime] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [selectedObject, setSelectedObject] = useState(null);

  const [params, setParams] = useState({
    satCount: 24,
    satAltitude: 550,
    satInclination: 53,
    debrisCount: 40,
    showISS: true,
    showDebris: true,
    showStations: true,
    showOrbits: true,
    atmosphere: 0.2,
    rotateSpeed: 0.2,
  });
  const updateParam = (key, value) => setParams(p => ({ ...p, [key]: value }));

  const satellites = useMemo(() =>
    generateSatellites(params.satCount, params.satAltitude, params.satInclination),
    [params.satCount, params.satAltitude, params.satInclination]
  );

  const debris = useMemo(() => generateDebris(params.debrisCount), [params.debrisCount]);

  // Simulation loop
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setSimTime(t => t + 0.5 * speed);
    }, 50);
    return () => clearInterval(interval);
  }, [paused, speed]);

  // Compute positions
  const satPositions = useMemo(() => {
    const all = satellites.map(s => {
      const pos = orbitalPosition(s, simTime);
      return { ...s, lat: pos.lat, lng: pos.lng, altitude: pos.alt };
    });
    if (params.showISS) {
      const issPos = orbitalPosition(ISS, simTime);
      all.push({ ...ISS, lat: issPos.lat, lng: issPos.lng, altitude: issPos.alt });
    }
    return all;
  }, [satellites, simTime, params.showISS]);

  const debrisPositions = useMemo(() => {
    if (!params.showDebris) return [];
    return debris.map(d => {
      const pos = orbitalPosition(d, simTime * 0.7);
      return { ...d, lat: pos.lat, lng: pos.lng, altitude: pos.alt };
    });
  }, [debris, simTime, params.showDebris]);

  // Orbit paths (pre-computed arcs for constellation)
  const orbitArcs = useMemo(() => {
    if (!params.showOrbits) return [];
    const arcs = [];
    // Show first satellite in each plane's orbit path
    const planes = new Set();
    for (const sat of satellites) {
      if (planes.has(sat.plane)) continue;
      planes.add(sat.plane);
      const points = [];
      for (let t = 0; t < 360; t += 10) {
        const pos = orbitalPosition({ ...sat, phase: t }, 0);
        points.push(pos);
      }
      for (let i = 0; i < points.length - 1; i++) {
        arcs.push({
          startLat: points[i].lat, startLng: points[i].lng,
          endLat: points[i + 1].lat, endLng: points[i + 1].lng,
          color: [`${sat.color}33`, `${sat.color}33`],
        });
      }
    }
    return arcs;
  }, [satellites, params.showOrbits]);

  useEffect(() => {
    if (!globeRef.current) return;
    const c = globeRef.current.controls();
    c.autoRotate = !paused;
    c.autoRotateSpeed = params.rotateSpeed;
    c.enableZoom = true;
  }, [params.rotateSpeed, paused]);

  useEffect(() => {
    if (globeRef.current) globeRef.current.pointOfView({ lat: 30, lng: -40, altitude: 3.0 }, 0);
  }, []);

  const totalMinutes = Math.floor(simTime);
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  return (
    <div className="relative w-screen h-screen bg-[#000008] overflow-hidden">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        // Satellites + ISS
        customLayerData={[...satPositions, ...debrisPositions]}
        customThreeObject={d => {
          const THREE = window.THREE || (typeof require !== 'undefined' ? require('three') : null);
          if (!THREE) return null;
          const size = d.type === 'station' ? 4 : d.type === 'debris' ? 1 : 2.5;
          const geo = d.type === 'station'
            ? new THREE.BoxGeometry(size, size, size * 2)
            : d.type === 'debris'
              ? new THREE.TetrahedronGeometry(size * 0.6)
              : new THREE.OctahedronGeometry(size * 0.5);
          const mat = new THREE.MeshBasicMaterial({
            color: d.type === 'debris' ? 0xef4444 : d.type === 'station' ? 0xfbbf24 : new THREE.Color(d.color || '#8b5cf6'),
            transparent: d.type === 'debris',
            opacity: d.type === 'debris' ? 0.5 : 1,
          });
          return new THREE.Mesh(geo, mat);
        }}
        customThreeObjectUpdate={(obj, d) => {
          Object.assign(obj.position, globeRef.current.getCoords(d.lat, d.lng, d.altitude));
        }}
        // Ground stations
        pointsData={params.showStations ? GROUND_STATIONS : []}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.01}
        pointRadius={d => d.type === 'primary' ? 0.5 : 0.3}
        pointColor={d => d.type === 'primary' ? '#8b5cf6' : '#6366f1'}
        pointLabel={d => `<div style="background:rgba(0,0,0,0.85);padding:8px 12px;border-radius:8px;border:1px solid rgba(139,92,246,0.3);font-family:Inter,sans-serif"><div style="font-weight:700;color:#e5e5e5;font-size:13px">${d.name}</div><div style="color:#a3a3a3;font-size:11px;margin-top:2px">${d.type === 'primary' ? 'Primary Launch Site' : 'Secondary Site'}</div></div>`}
        // Orbit paths
        arcsData={orbitArcs}
        arcColor="color"
        arcStroke={0.15}
        arcDashLength={1}
        arcDashGap={0}
        arcDashAnimateTime={0}
        atmosphereColor="#3b82f6"
        atmosphereAltitude={params.atmosphere}
        width={typeof window !== 'undefined' ? window.innerWidth : 1200}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
      />

      {/* Time Controls - top bar */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-black/80 border-b border-white/10 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setPaused(p => !p)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-colors ${paused ? 'bg-emerald-600 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}>
              {paused ? '▶' : '⏸'}
            </button>
            {[0.5, 1, 2, 5, 10].map(s => (
              <button key={s} onClick={() => setSpeed(s)}
                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${speed === s ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'}`}>
                {s}x
              </button>
            ))}
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="font-mono text-sm text-violet-400">
            T+ {String(hours).padStart(2, '0')}:{String(mins).padStart(2, '0')}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /> {satPositions.filter(s => s.type === 'satellite').length} Satellites</span>
          {params.showISS && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-400" /> ISS</span>}
          {params.showDebris && <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-400" /> {debrisPositions.length} Debris</span>}
        </div>
      </div>

      {/* Control Panel */}
      <div className="fixed top-16 left-4 z-20 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl w-80 max-h-[calc(100vh-6rem)] overflow-y-auto">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🛰️</span> Orbital Simulation
          </h1>
          <p className="text-xs text-gray-500 mt-1">Satellite constellation & debris tracker</p>
        </div>

        {/* Toggles */}
        <div className="p-4 border-b border-white/10 space-y-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Layers</p>
          {[
            { key: 'showISS', label: 'ISS Tracker', color: 'bg-yellow-600' },
            { key: 'showDebris', label: 'Space Debris', color: 'bg-red-600' },
            { key: 'showStations', label: 'Ground Stations', color: 'bg-violet-600' },
            { key: 'showOrbits', label: 'Orbit Paths', color: 'bg-cyan-600' },
          ].map(({ key, label, color }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-300">{label}</span>
              <button onClick={() => updateParam(key, !params[key])}
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${params[key] ? color : 'bg-gray-700'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${params[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}
        </div>

        {/* Orbital parameters */}
        <div className="p-4 space-y-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Constellation Parameters</p>
          {[
            { key: 'satCount', label: 'Satellite Count', min: 6, max: 72, step: 6, unit: '' },
            { key: 'satAltitude', label: 'Altitude (km)', min: 200, max: 2000, step: 50, unit: 'km' },
            { key: 'satInclination', label: 'Inclination', min: 0, max: 90, step: 1, unit: '°' },
            { key: 'debrisCount', label: 'Debris Objects', min: 0, max: 200, step: 10, unit: '' },
            { key: 'rotateSpeed', label: 'Globe Rotation', min: 0, max: 2, step: 0.1, unit: '' },
            { key: 'atmosphere', label: 'Atmosphere', min: 0, max: 0.5, step: 0.05, unit: '' },
          ].map(({ key, label, min, max, step, unit }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs text-gray-500 font-mono">{params[key]}{unit}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={params[key]}
                onChange={e => updateParam(key, parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-violet-500" />
            </div>
          ))}
        </div>

        {/* Presets */}
        <div className="p-4 border-t border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Presets</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Starlink', count: 72, alt: 550, inc: 53 },
              { label: 'GPS', count: 24, alt: 20200, inc: 55 },
              { label: 'LEO Swarm', count: 48, alt: 350, inc: 42 },
              { label: 'Polar', count: 12, alt: 800, inc: 90 },
            ].map(preset => (
              <button key={preset.label}
                onClick={() => setParams(p => ({ ...p, satCount: preset.count, satAltitude: Math.min(preset.alt, 2000), satInclination: preset.inc }))}
                className="px-3 py-2 rounded-lg bg-white/5 text-xs text-gray-400 hover:bg-white/10 hover:text-gray-300 transition-all text-left">
                <div className="font-medium text-gray-300">{preset.label}</div>
                <div className="text-[10px] text-gray-600 mt-0.5">{preset.count} sats • {preset.alt}km</div>
              </button>
            ))}
          </div>
        </div>

        {/* Ground stations list */}
        <div className="p-4 border-t border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Ground Stations</p>
          <div className="space-y-1">
            {GROUND_STATIONS.map(gs => (
              <button key={gs.name}
                onClick={() => { if (globeRef.current) globeRef.current.pointOfView({ lat: gs.lat, lng: gs.lng, altitude: 1.5 }, 800); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors text-left">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${gs.type === 'primary' ? 'bg-violet-400' : 'bg-indigo-400'}`} />
                <span className="text-[11px] text-gray-300 truncate">{gs.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
