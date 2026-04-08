/**
 * Health Use Case
 *
 * Global health metrics visualized on a 3D globe:
 * - Health index by country (polygon coloring)
 * - Disease outbreak hotspots (rings)
 * - Hospital/facility density (points)
 * - Supply chain arcs between WHO hubs
 * - Adjustable parameters for visualization
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as topojson from 'topojson-client';

const WORLD_TOPO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';

// Simulated health data per country (ISO numeric codes → health index 0–100)
const HEALTH_INDEX = {
  840: 82, 826: 85, 250: 86, 276: 87, 392: 90, 410: 84, 36: 88, 124: 89,
  356: 45, 156: 62, 76: 58, 566: 32, 404: 38, 710: 52, 818: 42, 586: 40,
  50: 35, 764: 60, 360: 48, 484: 55, 32: 65, 604: 53, 643: 68, 792: 70,
  682: 72, 784: 75, 702: 88, 704: 55, 608: 50, 170: 54, 152: 71, 218: 52,
  231: 28, 180: 25, 800: 30, 854: 27, 324: 29, 562: 22, 466: 24,
};

// Major health facilities / WHO hubs
const HEALTH_HUBS = [
  { name: 'WHO HQ Geneva', lat: 46.2044, lng: 6.1432, type: 'hq', capacity: 'Global HQ' },
  { name: 'CDC Atlanta', lat: 33.7490, lng: -84.3880, type: 'research', capacity: 'Research Center' },
  { name: 'WHO AFRO Brazzaville', lat: -4.2634, lng: 15.2429, type: 'regional', capacity: 'Africa Regional' },
  { name: 'WHO SEARO Delhi', lat: 28.6139, lng: 77.2090, type: 'regional', capacity: 'SE Asia Regional' },
  { name: 'WHO WPRO Manila', lat: 14.5995, lng: 120.9842, type: 'regional', capacity: 'W Pacific Regional' },
  { name: 'WHO EMRO Cairo', lat: 30.0444, lng: 31.2357, type: 'regional', capacity: 'E Mediterranean' },
  { name: 'WHO EURO Copenhagen', lat: 55.6761, lng: 12.5683, type: 'regional', capacity: 'Europe Regional' },
  { name: 'WHO PAHO Washington', lat: 38.9072, lng: -77.0369, type: 'regional', capacity: 'Americas Regional' },
  { name: 'Institut Pasteur Paris', lat: 48.8396, lng: 2.3114, type: 'research', capacity: 'Research Center' },
  { name: 'Wuhan Institute', lat: 30.5928, lng: 114.3055, type: 'research', capacity: 'Virology Lab' },
  { name: 'KEMRI Nairobi', lat: -1.3032, lng: 36.8081, type: 'research', capacity: 'Tropical Medicine' },
  { name: 'Fiocruz Rio', lat: -22.8755, lng: -43.2471, type: 'research', capacity: 'Biomedical Research' },
];

// Simulated outbreak rings
const OUTBREAKS = [
  { lat: 0.3476, lng: 32.5825, name: 'Ebola — Uganda', severity: 0.9, cases: '1.2K', color: '#ef4444' },
  { lat: 7.9465, lng: -1.0232, name: 'Cholera — Ghana', severity: 0.6, cases: '3.4K', color: '#f59e0b' },
  { lat: 23.6345, lng: -102.5528, name: 'Dengue — Mexico', severity: 0.5, cases: '8.1K', color: '#f97316' },
  { lat: -6.1745, lng: 106.8227, name: 'COVID variant — Indonesia', severity: 0.7, cases: '12K', color: '#dc2626' },
  { lat: 15.8700, lng: 100.9925, name: 'Malaria — Thailand', severity: 0.4, cases: '5.6K', color: '#eab308' },
  { lat: -14.2350, lng: -51.9253, name: 'Zika — Brazil', severity: 0.5, cases: '6.8K', color: '#f59e0b' },
  { lat: 20.5937, lng: 78.9629, name: 'TB — India', severity: 0.8, cases: '45K', color: '#ef4444' },
];

// Supply chain arcs
function generateSupplyArcs(hubs) {
  const arcs = [];
  const hq = hubs[0]; // Geneva
  hubs.slice(1).forEach(hub => {
    arcs.push({
      startLat: hq.lat, startLng: hq.lng,
      endLat: hub.lat, endLng: hub.lng,
      color: hub.type === 'research' ? ['rgba(52,211,153,0.5)', 'rgba(6,182,212,0.5)'] : ['rgba(139,92,246,0.5)', 'rgba(236,72,153,0.5)'],
    });
  });
  return arcs;
}

function healthColor(score) {
  if (score >= 80) return 'rgba(52, 211, 153, 0.35)';
  if (score >= 60) return 'rgba(250, 204, 21, 0.3)';
  if (score >= 40) return 'rgba(251, 146, 60, 0.3)';
  return 'rgba(239, 68, 68, 0.35)';
}

const METRICS = ['overview', 'outbreaks', 'facilities', 'supply-chain'];

export default function HealthApp() {
  const globeRef = useRef();
  const [countries, setCountries] = useState([]);
  const [hoverCountry, setHoverCountry] = useState(null);
  const [activeMetric, setActiveMetric] = useState('overview');

  const [params, setParams] = useState({
    rotateSpeed: 0.3,
    atmosphere: 0.2,
    showPolygons: true,
    showRings: true,
    showFacilities: true,
    showSupplyArcs: true,
  });
  const updateParam = (key, value) => setParams(p => ({ ...p, [key]: value }));

  const supplyArcs = useMemo(() => generateSupplyArcs(HEALTH_HUBS), []);

  useEffect(() => {
    fetch(WORLD_TOPO_URL).then(r => r.json()).then(data => {
      setCountries(topojson.feature(data, data.objects.countries).features);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!globeRef.current) return;
    const c = globeRef.current.controls();
    c.autoRotate = true;
    c.autoRotateSpeed = params.rotateSpeed;
    c.enableZoom = true;
  }, [params.rotateSpeed]);

  useEffect(() => {
    if (globeRef.current) globeRef.current.pointOfView({ lat: 15, lng: 20, altitude: 2.2 }, 0);
  }, []);

  // Metric-based visibility
  const showPoly = params.showPolygons && (activeMetric === 'overview' || activeMetric === 'outbreaks');
  const showRings = params.showRings && (activeMetric === 'overview' || activeMetric === 'outbreaks');
  const showPoints = params.showFacilities && (activeMetric === 'overview' || activeMetric === 'facilities');
  const showArcs = params.showSupplyArcs && (activeMetric === 'overview' || activeMetric === 'supply-chain');

  return (
    <div className="relative w-screen h-screen bg-[#000811] overflow-hidden">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        // Country health polygons
        polygonsData={showPoly ? countries : []}
        polygonAltitude={d => d === hoverCountry ? 0.035 : 0.008}
        polygonCapColor={d => {
          const score = HEALTH_INDEX[parseInt(d.id)] || 50;
          return d === hoverCountry ? 'rgba(139, 92, 246, 0.5)' : healthColor(score);
        }}
        polygonSideColor={() => 'rgba(100, 116, 139, 0.1)'}
        polygonStrokeColor={() => 'rgba(148, 163, 184, 0.2)'}
        polygonLabel={d => {
          const score = HEALTH_INDEX[parseInt(d.id)];
          return score != null ? `<div style="background:rgba(0,0,0,0.85);padding:8px 12px;border-radius:8px;border:1px solid ${score >= 60 ? 'rgba(52,211,153,0.4)' : 'rgba(239,68,68,0.4)'};font-family:Inter,sans-serif"><div style="font-weight:700;color:#e5e5e5;font-size:13px">Health Index: ${score}/100</div><div style="color:#a3a3a3;font-size:11px;margin-top:2px">Country ID: ${d.id}</div></div>` : '';
        }}
        onPolygonHover={setHoverCountry}
        // Outbreak rings
        ringsData={showRings ? OUTBREAKS : []}
        ringLat="lat"
        ringLng="lng"
        ringAltitude={0.015}
        ringColor={d => (t) => `rgba(${d.color === '#ef4444' ? '239,68,68' : d.color === '#f59e0b' ? '245,158,11' : '249,115,22'}, ${1 - t})`}
        ringMaxRadius={d => d.severity * 6}
        ringPropagationSpeed={2}
        ringRepeatPeriod={800}
        // Facility points
        pointsData={showPoints ? HEALTH_HUBS : []}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.02}
        pointRadius={d => d.type === 'hq' ? 0.6 : 0.35}
        pointColor={d => d.type === 'hq' ? '#8b5cf6' : d.type === 'research' ? '#06b6d4' : '#10b981'}
        pointLabel={d => `<div style="background:rgba(0,0,0,0.85);padding:8px 12px;border-radius:8px;border:1px solid rgba(52,211,153,0.3);font-family:Inter,sans-serif"><div style="font-weight:700;color:#e5e5e5;font-size:13px">${d.name}</div><div style="color:#a3a3a3;font-size:11px;margin-top:2px">${d.capacity}</div></div>`}
        // Supply arcs
        arcsData={showArcs ? supplyArcs : []}
        arcColor="color"
        arcDashLength={0.4}
        arcDashGap={0.3}
        arcDashAnimateTime={3000}
        arcStroke={0.3}
        atmosphereColor="#0ea5e9"
        atmosphereAltitude={params.atmosphere}
        width={typeof window !== 'undefined' ? window.innerWidth : 1200}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
      />

      {/* Control Panel */}
      <div className="fixed top-4 left-4 z-20 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🏥</span> Global Health Monitor
          </h1>
          <p className="text-xs text-gray-500 mt-1">WHO regions, outbreaks & supply chain</p>
        </div>

        {/* Metric tabs */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">View</p>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { id: 'overview', label: 'Overview', icon: '📊' },
              { id: 'outbreaks', label: 'Outbreaks', icon: '🦠' },
              { id: 'facilities', label: 'Facilities', icon: '🏥' },
              { id: 'supply-chain', label: 'Supply Chain', icon: '🚚' },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setActiveMetric(m.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  activeMetric === m.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <span>{m.icon}</span> {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="p-4 border-b border-white/10 space-y-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Layers</p>
          {[
            { key: 'showPolygons', label: 'Health Index', color: 'bg-emerald-600' },
            { key: 'showRings', label: 'Outbreak Rings', color: 'bg-red-600' },
            { key: 'showFacilities', label: 'Facilities', color: 'bg-cyan-600' },
            { key: 'showSupplyArcs', label: 'Supply Routes', color: 'bg-violet-600' },
          ].map(({ key, label, color }) => (
            <label key={key} className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-300">{label}</span>
              <button
                onClick={() => updateParam(key, !params[key])}
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${params[key] ? color : 'bg-gray-700'}`}
              >
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${params[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}
        </div>

        {/* Parameters */}
        <div className="p-4 space-y-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Parameters</p>
          {[
            { key: 'rotateSpeed', label: 'Rotation Speed', min: 0, max: 2, step: 0.1 },
            { key: 'atmosphere', label: 'Atmosphere', min: 0, max: 0.5, step: 0.05 },
          ].map(({ key, label, min, max, step }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs text-gray-500 font-mono">{params[key]}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={params[key]}
                onChange={e => updateParam(key, parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="p-4 border-t border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Health Index Legend</p>
          <div className="space-y-1.5">
            {[
              { color: 'bg-emerald-500', label: '80–100 Excellent' },
              { color: 'bg-yellow-500', label: '60–79 Good' },
              { color: 'bg-orange-500', label: '40–59 Fair' },
              { color: 'bg-red-500', label: '0–39 Critical' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-sm ${l.color}`} />
                <span className="text-[11px] text-gray-400">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Outbreak stats */}
        <div className="p-4 border-t border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Active Outbreaks</p>
          <div className="space-y-1.5">
            {OUTBREAKS.map(o => (
              <div key={o.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: o.color }} />
                  <span className="text-[11px] text-gray-300 truncate">{o.name}</span>
                </div>
                <span className="text-[10px] text-gray-500 flex-shrink-0 ml-2">{o.cases}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
