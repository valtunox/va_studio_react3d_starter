/**
 * Finance Use Case
 *
 * Global financial markets on a 3D globe:
 * - Stock exchange locations with market cap bars
 * - Capital flow arcs between exchanges
 * - GDP per-country polygon heatmap
 * - Real-time-style ticker simulation
 * - Adjustable parameters
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Globe from 'react-globe.gl';
import * as topojson from 'topojson-client';

const WORLD_TOPO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';

const EXCHANGES = [
  { name: 'NYSE', city: 'New York', lat: 40.7069, lng: -74.0089, marketCap: 25.2, currency: 'USD', change: 1.2, region: 'Americas' },
  { name: 'NASDAQ', city: 'New York', lat: 40.7568, lng: -73.9897, marketCap: 21.7, currency: 'USD', change: 0.8, region: 'Americas' },
  { name: 'Shanghai SE', city: 'Shanghai', lat: 31.2339, lng: 121.4692, marketCap: 6.9, currency: 'CNY', change: -0.3, region: 'Asia Pacific' },
  { name: 'Euronext', city: 'Amsterdam', lat: 52.3702, lng: 4.8952, marketCap: 6.5, currency: 'EUR', change: 0.5, region: 'Europe' },
  { name: 'Japan Exchange', city: 'Tokyo', lat: 35.6817, lng: 139.7710, marketCap: 6.2, currency: 'JPY', change: -0.1, region: 'Asia Pacific' },
  { name: 'Shenzhen SE', city: 'Shenzhen', lat: 22.5431, lng: 114.0579, marketCap: 4.5, currency: 'CNY', change: 0.4, region: 'Asia Pacific' },
  { name: 'LSE', city: 'London', lat: 51.5156, lng: -0.0919, marketCap: 3.9, currency: 'GBP', change: 0.2, region: 'Europe' },
  { name: 'Hong Kong SE', city: 'Hong Kong', lat: 22.2783, lng: 114.1747, marketCap: 5.4, currency: 'HKD', change: -0.7, region: 'Asia Pacific' },
  { name: 'TSX', city: 'Toronto', lat: 43.6489, lng: -79.3818, marketCap: 2.9, currency: 'CAD', change: 0.3, region: 'Americas' },
  { name: 'BSE', city: 'Mumbai', lat: 18.9309, lng: 72.8337, marketCap: 3.8, currency: 'INR', change: 1.1, region: 'Asia Pacific' },
  { name: 'Saudi Exchange', city: 'Riyadh', lat: 24.7126, lng: 46.6744, marketCap: 3.1, currency: 'SAR', change: 0.6, region: 'Middle East' },
  { name: 'Deutsche Börse', city: 'Frankfurt', lat: 50.1109, lng: 8.6821, marketCap: 2.2, currency: 'EUR', change: 0.4, region: 'Europe' },
  { name: 'Korea Exchange', city: 'Seoul', lat: 37.5219, lng: 126.9277, marketCap: 2.0, currency: 'KRW', change: -0.5, region: 'Asia Pacific' },
  { name: 'SIX Swiss', city: 'Zurich', lat: 47.3769, lng: 8.5417, marketCap: 1.9, currency: 'CHF', change: 0.1, region: 'Europe' },
  { name: 'ASX', city: 'Sydney', lat: -33.8693, lng: 151.2089, marketCap: 1.7, currency: 'AUD', change: 0.3, region: 'Asia Pacific' },
  { name: 'B3', city: 'São Paulo', lat: -23.5497, lng: -46.6338, marketCap: 0.9, currency: 'BRL', change: -1.2, region: 'Americas' },
  { name: 'JSE', city: 'Johannesburg', lat: -26.1052, lng: 28.0561, marketCap: 1.1, currency: 'ZAR', change: 0.7, region: 'Africa' },
  { name: 'SGX', city: 'Singapore', lat: 1.2846, lng: 103.8514, marketCap: 0.7, currency: 'SGD', change: 0.2, region: 'Asia Pacific' },
];

// GDP data (ISO → trillion USD)
const GDP_DATA = {
  840: 25.5, 156: 18.3, 392: 4.2, 276: 4.1, 826: 3.1, 356: 3.4, 250: 2.8,
  380: 2.0, 76: 1.9, 124: 2.1, 410: 1.7, 36: 1.7, 643: 1.8, 484: 1.3,
  360: 1.3, 682: 1.1, 792: 0.9, 528: 1.0, 756: 0.8, 616: 0.7, 764: 0.5,
  710: 0.4, 32: 0.6, 566: 0.4, 818: 0.4, 784: 0.5, 608: 0.4, 152: 0.3,
  170: 0.3, 50: 0.4, 704: 0.4,
};

function generateCapitalFlows(exchanges, count = 25) {
  const arcs = [];
  for (let i = 0; i < count; i++) {
    const src = exchanges[Math.floor(Math.random() * exchanges.length)];
    let dst = exchanges[Math.floor(Math.random() * exchanges.length)];
    while (dst.name === src.name) dst = exchanges[Math.floor(Math.random() * exchanges.length)];
    const vol = (Math.random() * 500 + 50).toFixed(0);
    arcs.push({
      startLat: src.lat, startLng: src.lng,
      endLat: dst.lat, endLng: dst.lng,
      color: [`rgba(52,211,153,0.5)`, `rgba(250,204,21,0.5)`],
      volume: `$${vol}B`,
    });
  }
  return arcs;
}

function gdpColor(gdp) {
  if (gdp >= 5) return 'rgba(52,211,153,0.35)';
  if (gdp >= 2) return 'rgba(6,182,212,0.3)';
  if (gdp >= 1) return 'rgba(250,204,21,0.25)';
  if (gdp >= 0.3) return 'rgba(251,146,60,0.2)';
  return 'rgba(100,116,139,0.08)';
}

const REGIONS = ['All', 'Americas', 'Europe', 'Asia Pacific', 'Middle East', 'Africa'];

export default function FinanceApp() {
  const globeRef = useRef();
  const [countries, setCountries] = useState([]);
  const [hoverCountry, setHoverCountry] = useState(null);
  const [selectedExchange, setSelectedExchange] = useState(null);
  const [regionFilter, setRegionFilter] = useState('All');
  const [tick, setTick] = useState(0);

  const [params, setParams] = useState({
    rotateSpeed: 0.3,
    atmosphere: 0.15,
    barScale: 1.0,
    showGDP: true,
    showExchanges: true,
    showFlows: true,
  });
  const updateParam = (key, value) => setParams(p => ({ ...p, [key]: value }));

  const filteredExchanges = useMemo(() => {
    if (regionFilter === 'All') return EXCHANGES;
    return EXCHANGES.filter(e => e.region === regionFilter);
  }, [regionFilter]);

  const flowArcs = useMemo(() => generateCapitalFlows(filteredExchanges), [filteredExchanges]);

  // Simulated ticker
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  const tickerExchange = EXCHANGES[tick % EXCHANGES.length];

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
    if (globeRef.current) globeRef.current.pointOfView({ lat: 25, lng: -30, altitude: 2.3 }, 0);
  }, []);

  return (
    <div className="relative w-screen h-screen bg-[#000a11] overflow-hidden">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        // GDP polygons
        polygonsData={params.showGDP ? countries : []}
        polygonAltitude={d => d === hoverCountry ? 0.03 : 0.005}
        polygonCapColor={d => {
          const gdp = GDP_DATA[parseInt(d.id)] || 0;
          return d === hoverCountry ? 'rgba(52,211,153,0.5)' : gdpColor(gdp);
        }}
        polygonSideColor={() => 'rgba(52,211,153,0.1)'}
        polygonStrokeColor={() => 'rgba(148,163,184,0.15)'}
        polygonLabel={d => {
          const gdp = GDP_DATA[parseInt(d.id)];
          return gdp ? `<div style="background:rgba(0,0,0,0.85);padding:8px 12px;border-radius:8px;border:1px solid rgba(52,211,153,0.3);font-family:Inter,sans-serif"><div style="font-weight:700;color:#e5e5e5;font-size:13px">GDP: $${gdp}T</div><div style="color:#a3a3a3;font-size:11px">Country ID: ${d.id}</div></div>` : '';
        }}
        onPolygonHover={setHoverCountry}
        // Exchange points
        pointsData={params.showExchanges ? filteredExchanges : []}
        pointLat="lat"
        pointLng="lng"
        pointAltitude={d => d.marketCap * 0.008 * params.barScale}
        pointRadius={d => Math.max(0.25, d.marketCap / 20)}
        pointColor={d => d.change >= 0 ? '#34d399' : '#ef4444'}
        pointLabel={d => `<div style="background:rgba(0,0,0,0.9);padding:10px 14px;border-radius:10px;border:1px solid ${d.change >= 0 ? 'rgba(52,211,153,0.4)' : 'rgba(239,68,68,0.4)'};font-family:Inter,sans-serif;min-width:180px"><div style="font-weight:700;color:#e5e5e5;font-size:14px">${d.name}</div><div style="color:#a3a3a3;font-size:11px;margin-top:2px">${d.city}</div><div style="margin-top:6px;display:flex;justify-content:space-between"><span style="color:#a3a3a3;font-size:11px">Market Cap</span><span style="color:#e5e5e5;font-weight:600;font-size:12px">$${d.marketCap}T</span></div><div style="display:flex;justify-content:space-between"><span style="color:#a3a3a3;font-size:11px">Change</span><span style="color:${d.change >= 0 ? '#34d399' : '#ef4444'};font-weight:600;font-size:12px">${d.change >= 0 ? '+' : ''}${d.change}%</span></div></div>`}
        onPointClick={d => {
          setSelectedExchange(d);
          if (globeRef.current) globeRef.current.pointOfView({ lat: d.lat, lng: d.lng, altitude: 1.2 }, 800);
        }}
        // Capital flows
        arcsData={params.showFlows ? flowArcs : []}
        arcColor="color"
        arcDashLength={0.6}
        arcDashGap={0.3}
        arcDashAnimateTime={2500}
        arcStroke={0.35}
        atmosphereColor="#059669"
        atmosphereAltitude={params.atmosphere}
        width={typeof window !== 'undefined' ? window.innerWidth : 1200}
        height={typeof window !== 'undefined' ? window.innerHeight : 800}
      />

      {/* Ticker */}
      <div className="fixed top-0 left-0 right-0 z-30 bg-black/80 border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-6 overflow-hidden">
          <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider flex-shrink-0">LIVE</span>
          {EXCHANGES.slice(0, 10).map(e => (
            <div key={e.name} className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-gray-400 font-medium">{e.name}</span>
              <span className={`text-xs font-bold ${e.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {e.change >= 0 ? '+' : ''}{e.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Control Panel */}
      <div className="fixed top-14 left-4 z-20 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl w-80 max-h-[calc(100vh-5rem)] overflow-y-auto">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">💹</span> Global Markets
          </h1>
          <p className="text-xs text-gray-500 mt-1">Exchanges, GDP & capital flows</p>
        </div>

        {/* Region filter */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Region</p>
          <div className="flex flex-wrap gap-1.5">
            {REGIONS.map(r => (
              <button key={r} onClick={() => setRegionFilter(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  regionFilter === r ? 'bg-emerald-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="p-4 border-b border-white/10 space-y-2.5">
          {[
            { key: 'showGDP', label: 'GDP Heatmap', color: 'bg-emerald-600' },
            { key: 'showExchanges', label: 'Exchanges', color: 'bg-cyan-600' },
            { key: 'showFlows', label: 'Capital Flows', color: 'bg-amber-600' },
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

        {/* Parameters */}
        <div className="p-4 space-y-3">
          {[
            { key: 'rotateSpeed', label: 'Rotation', min: 0, max: 2, step: 0.1 },
            { key: 'barScale', label: 'Bar Scale', min: 0.2, max: 3, step: 0.1 },
            { key: 'atmosphere', label: 'Atmosphere', min: 0, max: 0.4, step: 0.05 },
          ].map(({ key, label, min, max, step }) => (
            <div key={key}>
              <div className="flex justify-between mb-1">
                <span className="text-xs text-gray-400">{label}</span>
                <span className="text-xs text-gray-500 font-mono">{params[key]}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={params[key]}
                onChange={e => updateParam(key, parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-emerald-500" />
            </div>
          ))}
        </div>

        {/* Top exchanges */}
        <div className="p-4 border-t border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Top Exchanges</p>
          <div className="space-y-1.5">
            {filteredExchanges.slice(0, 8).map(e => (
              <button key={e.name} onClick={() => {
                setSelectedExchange(e);
                if (globeRef.current) globeRef.current.pointOfView({ lat: e.lat, lng: e.lng, altitude: 1.2 }, 800);
              }}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${e.change >= 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
                  <span className="text-[11px] text-gray-300 truncate">{e.name}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                  <span className="text-[10px] text-gray-500">${e.marketCap}T</span>
                  <span className={`text-[10px] font-bold ${e.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {e.change >= 0 ? '+' : ''}{e.change}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selected exchange */}
      {selectedExchange && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20 bg-black/70 backdrop-blur-xl border border-emerald-500/30 rounded-2xl px-6 py-4 flex items-center gap-6">
          <div>
            <h2 className="text-base font-bold text-white">{selectedExchange.name}</h2>
            <p className="text-xs text-gray-400">{selectedExchange.city} — {selectedExchange.currency}</p>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold text-emerald-400">${selectedExchange.marketCap}T</div>
            <div className="text-[10px] text-gray-500">Market Cap</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${selectedExchange.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {selectedExchange.change >= 0 ? '+' : ''}{selectedExchange.change}%
            </div>
            <div className="text-[10px] text-gray-500">Today</div>
          </div>
          <button onClick={() => setSelectedExchange(null)} className="ml-2 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-400 hover:text-white transition-colors">&times;</button>
        </div>
      )}
    </div>
  );
}
