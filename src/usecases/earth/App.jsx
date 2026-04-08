/**
 * Earth / Geography Use Case
 *
 * Advanced 3D globe with:
 * - Country polygon boundaries (GeoJSON from world-110m)
 * - Click-to-zoom on any country
 * - Population heatmap bars per city
 * - Animated flight arcs between major hubs
 * - Adjustable parameters: altitude, arc density, rotation speed, atmosphere
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import Globe from 'react-globe.gl';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';

const WORLD_TOPO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';

const CITIES = [
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, pop: 37.4, country: 'Japan', continent: 'Asia' },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025, pop: 30.3, country: 'India', continent: 'Asia' },
  { name: 'Shanghai', lat: 31.2304, lng: 121.4737, pop: 27.1, country: 'China', continent: 'Asia' },
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333, pop: 22.0, country: 'Brazil', continent: 'South America' },
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332, pop: 21.8, country: 'Mexico', continent: 'North America' },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357, pop: 20.9, country: 'Egypt', continent: 'Africa' },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, pop: 20.4, country: 'India', continent: 'Asia' },
  { name: 'Beijing', lat: 39.9042, lng: 116.4074, pop: 20.4, country: 'China', continent: 'Asia' },
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125, pop: 21.0, country: 'Bangladesh', continent: 'Asia' },
  { name: 'New York', lat: 40.7128, lng: -74.0060, pop: 18.8, country: 'USA', continent: 'North America' },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792, pop: 14.4, country: 'Nigeria', continent: 'Africa' },
  { name: 'London', lat: 51.5074, lng: -0.1278, pop: 9.5, country: 'UK', continent: 'Europe' },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, pop: 11.0, country: 'France', continent: 'Europe' },
  { name: 'Moscow', lat: 55.7558, lng: 37.6173, pop: 12.5, country: 'Russia', continent: 'Europe' },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, pop: 13.2, country: 'USA', continent: 'North America' },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018, pop: 10.5, country: 'Thailand', continent: 'Asia' },
  { name: 'Nairobi', lat: -1.2921, lng: 36.8219, pop: 4.7, country: 'Kenya', continent: 'Africa' },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, pop: 5.3, country: 'Australia', continent: 'Oceania' },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, pop: 5.9, country: 'Singapore', continent: 'Asia' },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, pop: 3.4, country: 'UAE', continent: 'Asia' },
  { name: 'Berlin', lat: 52.5200, lng: 13.4050, pop: 3.7, country: 'Germany', continent: 'Europe' },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, pop: 6.2, country: 'Canada', continent: 'North America' },
  { name: 'Lima', lat: -12.0464, lng: -77.0428, pop: 10.7, country: 'Peru', continent: 'South America' },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473, pop: 5.8, country: 'South Africa', continent: 'Africa' },
  { name: 'Seoul', lat: 37.5665, lng: 126.9780, pop: 9.9, country: 'South Korea', continent: 'Asia' },
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456, pop: 10.6, country: 'Indonesia', continent: 'Asia' },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784, pop: 15.2, country: 'Turkey', continent: 'Europe' },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816, pop: 15.2, country: 'Argentina', continent: 'South America' },
  { name: 'Osaka', lat: 34.6937, lng: 135.5023, pop: 19.2, country: 'Japan', continent: 'Asia' },
  { name: 'Karachi', lat: 24.8607, lng: 67.0011, pop: 16.1, country: 'Pakistan', continent: 'Asia' },
];

function generateArcs(cities, count = 30) {
  const arcs = [];
  for (let i = 0; i < count; i++) {
    const src = cities[Math.floor(Math.random() * cities.length)];
    let dst = cities[Math.floor(Math.random() * cities.length)];
    while (dst.name === src.name) dst = cities[Math.floor(Math.random() * cities.length)];
    arcs.push({
      startLat: src.lat, startLng: src.lng,
      endLat: dst.lat, endLng: dst.lng,
      color: [
        `rgba(${100 + Math.random() * 155}, ${100 + Math.random() * 155}, 246, 0.6)`,
        `rgba(6, ${150 + Math.random() * 100}, 212, 0.6)`,
      ],
    });
  }
  return arcs;
}

const CONTINENTS = ['All', 'Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania'];

export default function EarthApp() {
  const globeRef = useRef();
  const [countries, setCountries] = useState([]);
  const [hoverCountry, setHoverCountry] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [continentFilter, setContinentFilter] = useState('All');

  // Adjustable parameters
  const [params, setParams] = useState({
    altitude: 2.5,
    rotateSpeed: 0.4,
    arcCount: 30,
    barHeight: 0.8,
    atmosphere: 0.25,
    showPolygons: true,
    showBars: true,
    showArcs: true,
    showLabels: true,
    globeTexture: 'blue-marble',
  });

  const updateParam = (key, value) => setParams(p => ({ ...p, [key]: value }));

  const textures = {
    'blue-marble': '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg',
    'night': '//unpkg.com/three-globe/example/img/earth-night.jpg',
    'dark': '//unpkg.com/three-globe/example/img/earth-dark.jpg',
    'water': '//unpkg.com/three-globe/example/img/earth-water.png',
  };

  // Load country polygons
  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then(r => r.json())
      .then(data => {
        const geo = topojson.feature(data, data.objects.countries);
        setCountries(geo.features);
      })
      .catch(() => {});
  }, []);

  const filteredCities = useMemo(() => {
    if (continentFilter === 'All') return CITIES;
    return CITIES.filter(c => c.continent === continentFilter);
  }, [continentFilter]);

  const arcsData = useMemo(() => generateArcs(filteredCities, params.arcCount), [filteredCities, params.arcCount]);

  // Globe controls
  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = params.rotateSpeed;
    controls.enableZoom = true;
    controls.minDistance = 120;
    controls.maxDistance = 800;
  }, [params.rotateSpeed]);

  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: params.altitude }, 0);
  }, []);

  const handleCountryClick = useCallback((polygon) => {
    if (!polygon || !globeRef.current) return;
    const coords = d3.geoCentroid(polygon);
    globeRef.current.pointOfView({ lat: coords[1], lng: coords[0], altitude: 1.2 }, 1000);
  }, []);

  const handleCityClick = useCallback((city) => {
    setSelectedCity(city);
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: city.lat, lng: city.lng, altitude: 1.0 }, 800);
    }
  }, []);

  const resetView = () => {
    setSelectedCity(null);
    setHoverCountry(null);
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: params.altitude }, 1000);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-[#000011] overflow-hidden">
      <Globe
        ref={globeRef}
        globeImageUrl={textures[params.globeTexture]}
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        // Country polygons
        polygonsData={params.showPolygons ? countries : []}
        polygonAltitude={d => d === hoverCountry ? 0.04 : 0.01}
        polygonCapColor={d => d === hoverCountry ? 'rgba(139, 92, 246, 0.4)' : 'rgba(100, 116, 139, 0.08)'}
        polygonSideColor={() => 'rgba(139, 92, 246, 0.15)'}
        polygonStrokeColor={() => 'rgba(148, 163, 184, 0.3)'}
        polygonLabel={d => `<div style="background:rgba(0,0,0,0.85);padding:6px 10px;border-radius:6px;border:1px solid rgba(139,92,246,0.3);font-family:Inter,sans-serif;font-size:12px;color:#e5e5e5">Country ID: ${d.id}</div>`}
        onPolygonHover={setHoverCountry}
        onPolygonClick={handleCountryClick}
        // City bars
        hexBinPointsData={params.showBars ? filteredCities : []}
        hexBinPointLat="lat"
        hexBinPointLng="lng"
        hexBinPointWeight="pop"
        hexBinResolution={4}
        hexTopColor={d => d3.interpolateViridis(d.sumWeight / 40)}
        hexSideColor={d => d3.interpolateViridis(d.sumWeight / 40)}
        hexAltitude={d => d.sumWeight * 0.003 * params.barHeight}
        hexLabel={d => `<div style="background:rgba(0,0,0,0.85);padding:8px 12px;border-radius:8px;border:1px solid rgba(52,211,153,0.3);font-family:Inter,sans-serif"><div style="font-weight:700;color:#e5e5e5;font-size:13px">${d.points.length} ${d.points.length === 1 ? 'city' : 'cities'}</div><div style="color:#a3a3a3;font-size:11px;margin-top:2px">Pop: ${d.sumWeight.toFixed(1)}M</div></div>`}
        // Points for clickable cities
        pointsData={params.showLabels ? filteredCities : []}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={0.01}
        pointRadius={0.4}
        pointColor={() => '#8b5cf6'}
        pointLabel={d => `<div style="background:rgba(0,0,0,0.85);padding:8px 12px;border-radius:8px;border:1px solid rgba(139,92,246,0.3);font-family:Inter,sans-serif"><div style="font-weight:700;color:#e5e5e5;font-size:13px">${d.name}</div><div style="color:#a3a3a3;font-size:11px;margin-top:2px">${d.country} — ${d.pop}M people</div></div>`}
        onPointClick={handleCityClick}
        // Arcs
        arcsData={params.showArcs ? arcsData : []}
        arcColor="color"
        arcDashLength={0.5}
        arcDashGap={0.3}
        arcDashAnimateTime={2000}
        arcStroke={0.4}
        // Atmosphere
        atmosphereColor="#6d28d9"
        atmosphereAltitude={params.atmosphere}
        width={typeof window !== 'undefined' ? window.innerWidth : 1200}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
      />

      {/* ── Control Panel ── */}
      <div className="fixed top-4 left-4 z-20 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl w-80 max-h-[calc(100vh-2rem)] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="text-2xl">🌍</span> Earth Explorer
              </h1>
              <p className="text-xs text-gray-500 mt-1">Interactive geographic visualization</p>
            </div>
            <button onClick={resetView} className="text-xs px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-400 hover:bg-violet-600/30 transition-colors">
              Reset View
            </button>
          </div>
        </div>

        {/* Continent filter */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Continent</p>
          <div className="flex flex-wrap gap-1.5">
            {CONTINENTS.map(c => (
              <button
                key={c}
                onClick={() => setContinentFilter(c)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  continentFilter === c
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-300'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Globe texture */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Globe Texture</p>
          <div className="grid grid-cols-4 gap-1.5">
            {Object.keys(textures).map(t => (
              <button
                key={t}
                onClick={() => updateParam('globeTexture', t)}
                className={`px-2 py-1.5 rounded-lg text-[10px] font-medium transition-all capitalize ${
                  params.globeTexture === t
                    ? 'bg-cyan-600 text-white'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                {t.replace('-', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="p-4 border-b border-white/10 space-y-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Layers</p>
          {[
            { key: 'showPolygons', label: 'Country Borders', color: 'bg-violet-600' },
            { key: 'showBars', label: 'Population Heatmap', color: 'bg-emerald-600' },
            { key: 'showArcs', label: 'Flight Arcs', color: 'bg-cyan-600' },
            { key: 'showLabels', label: 'City Labels', color: 'bg-amber-600' },
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

        {/* Sliders */}
        <div className="p-4 space-y-3">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Parameters</p>

          {[
            { key: 'altitude', label: 'Camera Altitude', min: 0.5, max: 5, step: 0.1, onChange: v => { updateParam('altitude', v); if (globeRef.current) globeRef.current.pointOfView({ altitude: v }, 500); } },
            { key: 'rotateSpeed', label: 'Rotation Speed', min: 0, max: 3, step: 0.1 },
            { key: 'arcCount', label: 'Arc Density', min: 0, max: 60, step: 5 },
            { key: 'barHeight', label: 'Bar Height', min: 0.1, max: 3, step: 0.1 },
            { key: 'atmosphere', label: 'Atmosphere', min: 0, max: 0.6, step: 0.05 },
          ].map(({ key, label, min, max, step, onChange }) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs text-gray-500 font-mono">{params[key]}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={params[key]}
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  if (onChange) onChange(v);
                  else updateParam(key, v);
                }}
                className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-violet-500"
              />
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="p-4 border-t border-white/10">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-violet-400">{filteredCities.length}</div>
              <div className="text-[9px] text-gray-500">Cities</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-cyan-400">{arcsData.length}</div>
              <div className="text-[9px] text-gray-500">Arcs</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-lg font-bold text-emerald-400">{countries.length}</div>
              <div className="text-[9px] text-gray-500">Countries</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Selected City Panel ── */}
      {selectedCity && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/70 backdrop-blur-xl border border-violet-500/30 rounded-2xl px-6 py-4 flex items-center gap-6 max-w-md">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-white">{selectedCity.name}</h2>
            <p className="text-xs text-gray-400">{selectedCity.country} — {selectedCity.continent}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-bold text-violet-400">{selectedCity.pop}M</div>
            <div className="text-[10px] text-gray-500">Population</div>
          </div>
          <button onClick={() => setSelectedCity(null)} className="ml-2 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors text-sm">
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
