/**
 * Geo Map Use Case — advanced interactive 3D map.
 *
 * Features
 *  - Major world cities (labels, population-scaled markers)
 *  - Road / flight network drawn as animated great-circle arcs
 *  - Browser geolocation: "Locate me" flies camera to the user's coordinates
 *  - Layer toggles: cities, arcs, atmosphere, country polygons, labels
 *  - City search -> fly-to, click-city -> detail panel
 *  - "Open in Google Earth" handoff with live lat/lng/alt
 *
 * Built on react-globe.gl (already in the starter). No new deps.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe from 'react-globe.gl';
import * as topojson from 'topojson-client';

const WORLD_TOPO_URL = 'https://unpkg.com/world-atlas@2/countries-110m.json';

/* ------------------------------------------------------------------ */
/*  Dataset: major world cities                                        */
/* ------------------------------------------------------------------ */
const CITIES = [
  { name: 'Tokyo',        lat: 35.6762,  lng: 139.6503, pop: 37.4, country: 'Japan',        continent: 'Asia' },
  { name: 'Delhi',        lat: 28.7041,  lng: 77.1025,  pop: 30.3, country: 'India',        continent: 'Asia' },
  { name: 'Shanghai',     lat: 31.2304,  lng: 121.4737, pop: 27.1, country: 'China',        continent: 'Asia' },
  { name: 'São Paulo',    lat: -23.5505, lng: -46.6333, pop: 22.0, country: 'Brazil',       continent: 'South America' },
  { name: 'Mexico City',  lat: 19.4326,  lng: -99.1332, pop: 21.8, country: 'Mexico',       continent: 'North America' },
  { name: 'Cairo',        lat: 30.0444,  lng: 31.2357,  pop: 20.9, country: 'Egypt',        continent: 'Africa' },
  { name: 'Mumbai',       lat: 19.0760,  lng: 72.8777,  pop: 20.4, country: 'India',        continent: 'Asia' },
  { name: 'Beijing',      lat: 39.9042,  lng: 116.4074, pop: 20.4, country: 'China',        continent: 'Asia' },
  { name: 'Dhaka',        lat: 23.8103,  lng: 90.4125,  pop: 21.0, country: 'Bangladesh',   continent: 'Asia' },
  { name: 'New York',     lat: 40.7128,  lng: -74.0060, pop: 18.8, country: 'USA',          continent: 'North America' },
  { name: 'Lagos',        lat: 6.5244,   lng: 3.3792,   pop: 14.4, country: 'Nigeria',      continent: 'Africa' },
  { name: 'London',       lat: 51.5074,  lng: -0.1278,  pop: 9.5,  country: 'UK',           continent: 'Europe' },
  { name: 'Paris',        lat: 48.8566,  lng: 2.3522,   pop: 11.0, country: 'France',       continent: 'Europe' },
  { name: 'Moscow',       lat: 55.7558,  lng: 37.6173,  pop: 12.5, country: 'Russia',       continent: 'Europe' },
  { name: 'Los Angeles',  lat: 34.0522,  lng: -118.2437, pop: 13.2, country: 'USA',         continent: 'North America' },
  { name: 'Bangkok',      lat: 13.7563,  lng: 100.5018, pop: 10.5, country: 'Thailand',     continent: 'Asia' },
  { name: 'Sydney',       lat: -33.8688, lng: 151.2093, pop: 5.3,  country: 'Australia',    continent: 'Oceania' },
  { name: 'Singapore',    lat: 1.3521,   lng: 103.8198, pop: 5.9,  country: 'Singapore',    continent: 'Asia' },
  { name: 'Dubai',        lat: 25.2048,  lng: 55.2708,  pop: 3.4,  country: 'UAE',          continent: 'Asia' },
  { name: 'Berlin',       lat: 52.5200,  lng: 13.4050,  pop: 3.7,  country: 'Germany',      continent: 'Europe' },
  { name: 'Toronto',      lat: 43.6532,  lng: -79.3832, pop: 6.2,  country: 'Canada',       continent: 'North America' },
  { name: 'Seoul',        lat: 37.5665,  lng: 126.9780, pop: 9.9,  country: 'South Korea',  continent: 'Asia' },
  { name: 'Jakarta',      lat: -6.2088,  lng: 106.8456, pop: 10.6, country: 'Indonesia',    continent: 'Asia' },
  { name: 'Istanbul',     lat: 41.0082,  lng: 28.9784,  pop: 15.2, country: 'Turkey',       continent: 'Europe' },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816, pop: 15.2, country: 'Argentina',    continent: 'South America' },
  { name: 'Chicago',      lat: 41.8781,  lng: -87.6298, pop: 8.9,  country: 'USA',          continent: 'North America' },
  { name: 'Nairobi',      lat: -1.2921,  lng: 36.8219,  pop: 4.7,  country: 'Kenya',        continent: 'Africa' },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473,  pop: 5.8,  country: 'South Africa', continent: 'Africa' },
  { name: 'Osaka',        lat: 34.6937,  lng: 135.5023, pop: 19.2, country: 'Japan',        continent: 'Asia' },
  { name: 'Madrid',       lat: 40.4168,  lng: -3.7038,  pop: 6.7,  country: 'Spain',        continent: 'Europe' },
  { name: 'Riyadh',       lat: 24.7136,  lng: 46.6753,  pop: 7.7,  country: 'Saudi Arabia', continent: 'Asia' },
  { name: 'Karachi',      lat: 24.8607,  lng: 67.0011,  pop: 16.1, country: 'Pakistan',     continent: 'Asia' },
  { name: 'Lima',         lat: -12.0464, lng: -77.0428, pop: 10.7, country: 'Peru',         continent: 'South America' },
  { name: 'Bogotá',       lat: 4.7110,   lng: -74.0721, pop: 11.0, country: 'Colombia',     continent: 'South America' },
  { name: 'Cape Town',    lat: -33.9249, lng: 18.4241,  pop: 4.7,  country: 'South Africa', continent: 'Africa' },
  { name: 'Amsterdam',    lat: 52.3676,  lng: 4.9041,   pop: 1.1,  country: 'Netherlands',  continent: 'Europe' },
  { name: 'San Francisco',lat: 37.7749,  lng: -122.4194, pop: 4.7, country: 'USA',          continent: 'North America' },
  { name: 'Hong Kong',    lat: 22.3193,  lng: 114.1694, pop: 7.5,  country: 'China',        continent: 'Asia' },
  { name: 'Stockholm',    lat: 59.3293,  lng: 18.0686,  pop: 1.6,  country: 'Sweden',       continent: 'Europe' },
  { name: 'Rio de Janeiro', lat: -22.9068, lng: -43.1729, pop: 13.6, country: 'Brazil',     continent: 'South America' },
];

/* ------------------------------------------------------------------ */
/*  Flight / road network                                              */
/* ------------------------------------------------------------------ */
/* A hand-picked set of realistic hub-to-hub routes plus some random
 * connectors so the network looks organic rather than noisy. */
const CORE_ROUTES = [
  ['New York', 'London'], ['New York', 'Paris'], ['New York', 'Tokyo'],
  ['London', 'Dubai'], ['London', 'Singapore'], ['London', 'New York'],
  ['Paris', 'Tokyo'], ['Paris', 'Dubai'], ['Paris', 'São Paulo'],
  ['Dubai', 'Singapore'], ['Dubai', 'Mumbai'], ['Dubai', 'Nairobi'],
  ['Singapore', 'Tokyo'], ['Singapore', 'Sydney'], ['Singapore', 'Hong Kong'],
  ['Tokyo', 'Los Angeles'], ['Tokyo', 'Seoul'], ['Tokyo', 'Beijing'],
  ['Los Angeles', 'Mexico City'], ['Los Angeles', 'San Francisco'],
  ['Sydney', 'Los Angeles'], ['Sydney', 'Singapore'],
  ['São Paulo', 'Buenos Aires'], ['São Paulo', 'Lima'],
  ['Cairo', 'Nairobi'], ['Cairo', 'Istanbul'], ['Cairo', 'Dubai'],
  ['Moscow', 'Istanbul'], ['Moscow', 'Berlin'], ['Moscow', 'Beijing'],
  ['Berlin', 'Paris'], ['Berlin', 'Moscow'], ['Berlin', 'Amsterdam'],
  ['Beijing', 'Seoul'], ['Beijing', 'Shanghai'], ['Beijing', 'Delhi'],
  ['Chicago', 'Toronto'], ['Chicago', 'New York'],
  ['Mumbai', 'Delhi'], ['Mumbai', 'Dubai'], ['Mumbai', 'Bangkok'],
  ['Lagos', 'Johannesburg'], ['Lagos', 'Cairo'], ['Lagos', 'London'],
  ['Johannesburg', 'Cape Town'], ['Johannesburg', 'Nairobi'],
];

function buildArcs() {
  const byName = Object.fromEntries(CITIES.map(c => [c.name, c]));
  const arcs = [];
  for (const [from, to] of CORE_ROUTES) {
    const src = byName[from];
    const dst = byName[to];
    if (!src || !dst) continue;
    arcs.push({
      startLat: src.lat, startLng: src.lng,
      endLat: dst.lat, endLng: dst.lng,
      from, to,
      color: ['rgba(56, 189, 248, 0.8)', 'rgba(168, 85, 247, 0.8)'],
    });
  }
  return arcs;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function GeoMapApp() {
  const globeRef = useRef();
  const containerRef = useRef();
  const [size, setSize] = useState({ w: typeof window !== 'undefined' ? window.innerWidth : 1200, h: typeof window !== 'undefined' ? window.innerHeight : 800 });

  const [countries, setCountries] = useState([]);
  const [userLoc, setUserLoc] = useState(null); // { lat, lng }
  const [locStatus, setLocStatus] = useState('idle'); // idle|asking|ok|denied
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [layers, setLayers] = useState({
    cities: true,
    arcs: true,
    labels: true,
    atmosphere: true,
    borders: true,
  });

  const arcs = useMemo(() => buildArcs(), []);

  /* -------- Resize handling -------- */
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* -------- Load country polygons -------- */
  useEffect(() => {
    let abort = false;
    fetch(WORLD_TOPO_URL)
      .then((r) => r.json())
      .then((topo) => {
        if (abort) return;
        const feats = topojson.feature(topo, topo.objects.countries).features;
        setCountries(feats);
      })
      .catch(() => {/* offline — borders simply won't render */});
    return () => { abort = true; };
  }, []);

  /* -------- Initial controls + rotation -------- */
  useEffect(() => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.35;
    controls.enableDamping = true;
    globeRef.current.pointOfView({ lat: 20, lng: 10, altitude: 2.2 }, 0);
  }, []);

  /* -------- Fly camera to a coordinate -------- */
  const flyTo = useCallback((lat, lng, altitude = 1.2, ms = 1500) => {
    if (!globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = false;
    globeRef.current.pointOfView({ lat, lng, altitude }, ms);
  }, []);

  /* -------- Browser geolocation -------- */
  const locateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocStatus('denied');
      return;
    }
    setLocStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        setUserLoc(p);
        setLocStatus('ok');
        flyTo(p.lat, p.lng, 0.9, 1800);
      },
      () => setLocStatus('denied'),
      { enableHighAccuracy: true, maximumAge: 60_000, timeout: 10_000 },
    );
  }, [flyTo]);

  /* -------- City search / click -------- */
  const filteredCities = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return CITIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.country.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [search]);

  const pickCity = useCallback((c) => {
    setSelected(c);
    setSearch('');
    flyTo(c.lat, c.lng, 0.8, 1400);
  }, [flyTo]);

  /* -------- Points dataset (cities + optional user pin) -------- */
  const points = useMemo(() => {
    const cityPoints = layers.cities ? CITIES.map(c => ({
      ...c,
      kind: 'city',
      size: Math.max(0.25, Math.min(1.6, Math.log10(c.pop + 1) * 0.7)),
      color: selected && selected.name === c.name ? '#f472b6' : '#38bdf8',
    })) : [];
    const userPoint = userLoc ? [{
      name: 'You are here',
      lat: userLoc.lat,
      lng: userLoc.lng,
      pop: null,
      country: '',
      continent: '',
      kind: 'user',
      size: 1.2,
      color: '#22c55e',
    }] : [];
    return [...cityPoints, ...userPoint];
  }, [layers.cities, userLoc, selected]);

  /* -------- Labels (separate from points) -------- */
  const labels = useMemo(() => {
    if (!layers.labels) return [];
    return CITIES.filter(c => c.pop >= 10).map(c => ({
      ...c,
      size: 0.5 + Math.log10(c.pop + 1) * 0.35,
    }));
  }, [layers.labels]);

  const googleEarthUrl = (lat, lng) =>
    `https://earth.google.com/web/@${lat},${lng},2000a,500000d`;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-[#000011] text-white"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      {/* Globe canvas */}
      <Globe
        ref={globeRef}
        width={size.w}
        height={size.h}
        /* Texture: NASA Blue Marble (Google-Earth-ish) */
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        showAtmosphere={layers.atmosphere}
        atmosphereColor="#6ba6ff"
        atmosphereAltitude={0.18}
        /* Country polygons */
        polygonsData={layers.borders ? countries : []}
        polygonCapColor={() => 'rgba(56, 189, 248, 0.05)'}
        polygonSideColor={() => 'rgba(56, 189, 248, 0.08)'}
        polygonStrokeColor={() => 'rgba(148, 163, 184, 0.35)'}
        polygonAltitude={0.004}
        /* City + user points */
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude={d => (d.kind === 'user' ? 0.04 : 0.01 + d.size * 0.03)}
        pointRadius={d => d.size * 0.35}
        pointResolution={6}
        onPointClick={(pt) => pt.kind === 'city' && pickCity(pt)}
        /* Arc network (roads / flight paths) */
        arcsData={layers.arcs ? arcs : []}
        arcColor="color"
        arcAltitude={0.18}
        arcStroke={0.35}
        arcDashLength={0.4}
        arcDashGap={0.14}
        arcDashAnimateTime={3500}
        /* Labels */
        labelsData={labels}
        labelLat="lat"
        labelLng="lng"
        labelText="name"
        labelSize={d => d.size}
        labelDotRadius={0.25}
        labelColor={() => 'rgba(230, 230, 255, 0.8)'}
        labelResolution={2}
        labelAltitude={0.01}
      />

      {/* ----------------------------------------------------------- */}
      {/* Top bar                                                     */}
      {/* ----------------------------------------------------------- */}
      <div className="pointer-events-none absolute left-0 right-0 top-0 flex items-start justify-between p-4">
        <div className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-black/60 px-4 py-3 shadow-lg shadow-black/30 backdrop-blur-xl">
          <span className="text-2xl">🗺️</span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Geo Map Explorer
            </p>
            <p className="text-xs text-slate-300/80">
              Geolocation · Cities · Roads · Google Earth
            </p>
          </div>
        </div>

        {/* Search box */}
        <div className="pointer-events-auto relative w-80 max-w-[calc(100vw-2rem)]">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-4 py-2 shadow-lg shadow-black/30 backdrop-blur-xl">
            <span className="text-slate-400">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Fly to a city or country…"
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          {filteredCities.length > 0 && (
            <ul className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-xl">
              {filteredCities.map(c => (
                <li key={c.name}>
                  <button
                    onClick={() => pickCity(c)}
                    className="flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors hover:bg-cyan-500/10"
                  >
                    <span>
                      <span className="text-white">{c.name}</span>
                      <span className="ml-2 text-slate-400">· {c.country}</span>
                    </span>
                    <span className="text-xs text-slate-500">{c.pop}M</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* Left panel — controls                                        */}
      {/* ----------------------------------------------------------- */}
      <div className="pointer-events-auto absolute left-4 top-24 w-60 rounded-2xl border border-white/10 bg-black/60 p-4 shadow-xl shadow-black/30 backdrop-blur-xl">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Layers
        </p>
        <div className="space-y-2 text-sm">
          {[
            ['cities',     '📍 Cities'],
            ['arcs',       '✈️ Roads / flights'],
            ['labels',     '🏷️ Labels'],
            ['borders',    '🌐 Country borders'],
            ['atmosphere', '🌌 Atmosphere'],
          ].map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5">
              <span>{label}</span>
              <input
                type="checkbox"
                checked={layers[key]}
                onChange={e => setLayers(l => ({ ...l, [key]: e.target.checked }))}
                className="h-4 w-4 accent-cyan-400"
              />
            </label>
          ))}
        </div>

        <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Geolocation
        </p>
        <button
          onClick={locateMe}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-indigo-500 px-3 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-shadow hover:shadow-cyan-500/40"
        >
          📍 Locate me
        </button>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
          {locStatus === 'idle'   && 'Click to request your location.'}
          {locStatus === 'asking' && 'Requesting permission…'}
          {locStatus === 'denied' && 'Permission denied or unavailable.'}
          {locStatus === 'ok' && userLoc && (
            <>
              You are at <span className="text-cyan-300">{userLoc.lat.toFixed(3)}</span>,{' '}
              <span className="text-cyan-300">{userLoc.lng.toFixed(3)}</span> (±{Math.round(userLoc.accuracy)}m)
            </>
          )}
        </p>

        <p className="mb-2 mt-5 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
          Jump to
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {['Tokyo', 'New York', 'London', 'Sydney', 'Cairo', 'São Paulo'].map(name => {
            const c = CITIES.find(x => x.name === name);
            if (!c) return null;
            return (
              <button
                key={name}
                onClick={() => pickCity(c)}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-slate-200 transition-colors hover:border-cyan-400/50 hover:bg-cyan-400/10"
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>

      {/* ----------------------------------------------------------- */}
      {/* Right panel — selected city                                  */}
      {/* ----------------------------------------------------------- */}
      {selected && (
        <div className="pointer-events-auto absolute right-4 top-24 w-72 rounded-2xl border border-white/10 bg-black/70 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                {selected.continent}
              </p>
              <h3 className="mt-0.5 text-2xl font-bold">{selected.name}</h3>
              <p className="text-sm text-slate-400">{selected.country}</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="rounded-full p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Population</p>
              <p className="text-base font-semibold">{selected.pop}M</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Latitude</p>
              <p className="text-base font-semibold">{selected.lat.toFixed(3)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Longitude</p>
              <p className="text-base font-semibold">{selected.lng.toFixed(3)}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Routes</p>
              <p className="text-base font-semibold">
                {arcs.filter(a => a.from === selected.name || a.to === selected.name).length}
              </p>
            </div>
          </div>
          <a
            href={googleEarthUrl(selected.lat, selected.lng)}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-3 py-2 text-sm font-semibold text-black shadow-lg transition-shadow hover:shadow-emerald-500/30"
          >
            🌍 Open in Google Earth
          </a>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* Bottom-left coordinate readout                               */}
      {/* ----------------------------------------------------------- */}
      <div className="pointer-events-none absolute bottom-4 left-4 rounded-lg border border-white/10 bg-black/60 px-3 py-2 font-mono text-[11px] text-slate-300 backdrop-blur-xl">
        {CITIES.length} cities &middot; {arcs.length} routes
        {userLoc && <> &middot; <span className="text-emerald-400">user pin active</span></>}
      </div>
    </div>
  );
}
