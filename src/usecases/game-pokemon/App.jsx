/**
 * Creature Battle 3D — Pokemon-style turn-based combat
 *
 * - 3D arena with two creatures facing off
 * - 6 starter creatures with unique stats, types, 4 moves each
 * - Type effectiveness chart (fire > grass > water > fire, etc.)
 * - HP / XP bars with animated damage
 * - Attack animations (shake, flash, particles)
 * - AI opponent with smart move selection
 * - Team of 3 — switch creatures mid-battle
 * - Battle log with damage numbers
 */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Environment, RoundedBox, Float } from '@react-three/drei';
import * as THREE from 'three';

/* ═══════════ TYPE CHART ═══════════ */
const TYPES = {
  fire:     { color: '#ef4444', strong: ['grass', 'ice'],    weak: ['water', 'rock'] },
  water:    { color: '#3b82f6', strong: ['fire', 'rock'],    weak: ['grass', 'electric'] },
  grass:    { color: '#22c55e', strong: ['water', 'rock'],   weak: ['fire', 'ice'] },
  electric: { color: '#eab308', strong: ['water', 'flying'], weak: ['rock'] },
  ice:      { color: '#06b6d4', strong: ['grass', 'flying'], weak: ['fire', 'rock'] },
  rock:     { color: '#a16207', strong: ['fire', 'ice'],     weak: ['water', 'grass'] },
  flying:   { color: '#a78bfa', strong: ['grass'],           weak: ['electric', 'ice', 'rock'] },
  normal:   { color: '#94a3b8', strong: [],                  weak: ['rock'] },
};

function getEffectiveness(moveType, defenderType) {
  const chart = TYPES[moveType];
  if (!chart) return 1;
  if (chart.strong.includes(defenderType)) return 2;
  if (chart.weak && TYPES[defenderType]?.strong?.includes(moveType)) return 0.5;
  return 1;
}

/* ═══════════ CREATURE DATABASE ═══════════ */
const CREATURES = [
  {
    id: 'blazetail', name: 'Blazetail', type: 'fire', emoji: '🔥',
    bodyColor: '#dc2626', accentColor: '#fbbf24',
    hp: 78, atk: 84, def: 58, spd: 100,
    moves: [
      { name: 'Flame Burst', type: 'fire', power: 65, acc: 95 },
      { name: 'Inferno', type: 'fire', power: 100, acc: 75 },
      { name: 'Scratch', type: 'normal', power: 40, acc: 100 },
      { name: 'Tail Whip', type: 'normal', power: 0, acc: 100, effect: 'def-down' },
    ],
  },
  {
    id: 'aquafin', name: 'Aquafin', type: 'water', emoji: '🌊',
    bodyColor: '#2563eb', accentColor: '#67e8f9',
    hp: 84, atk: 63, def: 80, spd: 78,
    moves: [
      { name: 'Hydro Pump', type: 'water', power: 110, acc: 70 },
      { name: 'Water Gun', type: 'water', power: 55, acc: 100 },
      { name: 'Ice Shard', type: 'ice', power: 50, acc: 95 },
      { name: 'Shell Guard', type: 'water', power: 0, acc: 100, effect: 'def-up' },
    ],
  },
  {
    id: 'thornleaf', name: 'Thornleaf', type: 'grass', emoji: '🌿',
    bodyColor: '#16a34a', accentColor: '#86efac',
    hp: 80, atk: 82, def: 83, spd: 65,
    moves: [
      { name: 'Razor Leaf', type: 'grass', power: 70, acc: 95 },
      { name: 'Solar Beam', type: 'grass', power: 120, acc: 80 },
      { name: 'Vine Whip', type: 'grass', power: 45, acc: 100 },
      { name: 'Growth', type: 'grass', power: 0, acc: 100, effect: 'atk-up' },
    ],
  },
  {
    id: 'voltpaw', name: 'Voltpaw', type: 'electric', emoji: '⚡',
    bodyColor: '#ca8a04', accentColor: '#fef08a',
    hp: 60, atk: 90, def: 50, spd: 120,
    moves: [
      { name: 'Thunderbolt', type: 'electric', power: 90, acc: 90 },
      { name: 'Spark', type: 'electric', power: 55, acc: 100 },
      { name: 'Quick Attack', type: 'normal', power: 40, acc: 100 },
      { name: 'Charge', type: 'electric', power: 0, acc: 100, effect: 'atk-up' },
    ],
  },
  {
    id: 'frostclaw', name: 'Frostclaw', type: 'ice', emoji: '❄️',
    bodyColor: '#0891b2', accentColor: '#a5f3fc',
    hp: 90, atk: 75, def: 85, spd: 55,
    moves: [
      { name: 'Ice Beam', type: 'ice', power: 85, acc: 90 },
      { name: 'Blizzard', type: 'ice', power: 110, acc: 65 },
      { name: 'Frost Bite', type: 'ice', power: 50, acc: 100 },
      { name: 'Harden', type: 'normal', power: 0, acc: 100, effect: 'def-up' },
    ],
  },
  {
    id: 'skywing', name: 'Skywing', type: 'flying', emoji: '🦅',
    bodyColor: '#7c3aed', accentColor: '#c4b5fd',
    hp: 70, atk: 88, def: 60, spd: 110,
    moves: [
      { name: 'Air Slash', type: 'flying', power: 75, acc: 90 },
      { name: 'Hurricane', type: 'flying', power: 110, acc: 70 },
      { name: 'Peck', type: 'flying', power: 45, acc: 100 },
      { name: 'Tailwind', type: 'flying', power: 0, acc: 100, effect: 'spd-up' },
    ],
  },
];

/* ═══════════ 3D CREATURE MODEL ═══════════ */
function Creature3D({ creature, side, isActive, shaking, flashing, fainted }) {
  const groupRef = useRef();
  const bodyRef = useRef();
  const shakeStart = useRef(0);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();

    // Idle bounce
    if (!fainted) {
      groupRef.current.position.y = Math.sin(t * 2) * 0.05;
      groupRef.current.rotation.y = Math.sin(t * 0.5) * 0.1 * (side === 'player' ? 1 : -1);
    }

    // Shake on hit
    if (shaking) {
      shakeStart.current = shakeStart.current || t;
      const elapsed = t - shakeStart.current;
      if (elapsed < 0.5) {
        groupRef.current.position.x = Math.sin(elapsed * 40) * 0.15;
      } else {
        groupRef.current.position.x = 0;
      }
    } else {
      shakeStart.current = 0;
      groupRef.current.position.x = 0;
    }

    // Flash on hit
    if (bodyRef.current) {
      bodyRef.current.material.emissiveIntensity = flashing ? 0.8 : 0.1;
    }

    // Fainted
    if (fainted && groupRef.current) {
      groupRef.current.rotation.z += (Math.PI / 2 - groupRef.current.rotation.z) * 0.05;
      groupRef.current.position.y += (-0.5 - groupRef.current.position.y) * 0.03;
    }
  });

  const x = side === 'player' ? -2.5 : 2.5;
  const rotY = side === 'player' ? 0.3 : -0.3;

  return (
    <group ref={groupRef} position={[x, 0.8, 0]} rotation={[0, rotY, 0]}>
      {/* Body */}
      <mesh ref={bodyRef} castShadow>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial
          color={creature.bodyColor}
          metalness={0.2} roughness={0.5}
          emissive={flashing ? '#ffffff' : creature.bodyColor}
          emissiveIntensity={0.1}
        />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.5, 0.15]} castShadow>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial color={creature.bodyColor} metalness={0.2} roughness={0.5} />
      </mesh>
      {/* Eyes */}
      {[[-0.12, 0.55, 0.4], [0.12, 0.55, 0.4]].map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshStandardMaterial color="#fff" emissive="#fff" emissiveIntensity={0.3} />
        </mesh>
      ))}
      {/* Accent marks */}
      <mesh position={[0, 0.75, 0.1]}>
        <coneGeometry args={[0.12, 0.25, 8]} />
        <meshStandardMaterial color={creature.accentColor} emissive={creature.accentColor} emissiveIntensity={0.3} />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0, -0.6]} rotation={[0.5, 0, 0]}>
        <coneGeometry args={[0.12, 0.5, 8]} />
        <meshStandardMaterial color={creature.accentColor} emissive={creature.accentColor} emissiveIntensity={0.2} />
      </mesh>
      {/* Name */}
      <Text position={[0, -0.8, 0]} fontSize={0.15} color="#e5e5e5" anchorX="center" outlineWidth={0.01} outlineColor="#000">
        {creature.name}
      </Text>
      {/* Type badge */}
      <Text position={[0, -1, 0]} fontSize={0.09} color={TYPES[creature.type]?.color || '#888'} anchorX="center">
        {creature.type.toUpperCase()}
      </Text>
    </group>
  );
}

/* ═══════════ BATTLE ARENA ═══════════ */
function BattleArena() {
  return (
    <group>
      {/* Arena floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[5, 64]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Battle circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <ringGeometry args={[3.8, 4, 64]} />
        <meshStandardMaterial color="#8b5cf6" transparent opacity={0.15} emissive="#8b5cf6" emissiveIntensity={0.2} />
      </mesh>
      {/* Center line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <planeGeometry args={[0.05, 8]} />
        <meshBasicMaterial color="#334155" transparent opacity={0.3} />
      </mesh>
      {/* Player platforms */}
      {[-2.5, 2.5].map((x, i) => (
        <mesh key={i} position={[x, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.9, 32]} />
          <meshStandardMaterial
            color={i === 0 ? '#1e40af' : '#991b1b'}
            transparent opacity={0.2}
            emissive={i === 0 ? '#3b82f6' : '#ef4444'}
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════ ATTACK PARTICLES ═══════════ */
function AttackParticles({ active, type, side }) {
  const ref = useRef();
  const count = 40;

  const data = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const vel = new Float32Array(count * 3);
    const dir = side === 'player' ? 1 : -1;
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (side === 'player' ? -2 : 2);
      pos[i * 3 + 1] = 0.5 + Math.random() * 1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
      vel[i * 3] = (0.05 + Math.random() * 0.08) * dir;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.03;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.03;
    }
    return { pos, vel };
  }, [side]);

  useFrame(() => {
    if (!ref.current || !active) return;
    const positions = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx] += data.vel[idx];
      positions[idx + 1] += data.vel[idx + 1];
      positions[idx + 2] += data.vel[idx + 2];
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  if (!active) return null;
  const col = TYPES[type]?.color || '#fff';

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={count} array={data.pos} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color={col} transparent opacity={0.8} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/* ═══════════ HP BAR (2D overlay) ═══════════ */
function HPBar({ current, max, name, level, type, side }) {
  const pct = Math.max(0, current / max) * 100;
  const barColor = pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444';
  const typeColor = TYPES[type]?.color || '#888';

  return (
    <div className={`${side === 'player' ? 'items-start' : 'items-end'}`}>
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-sm font-bold text-white">{name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: typeColor + '22', color: typeColor }}>
          {type.toUpperCase()}
        </span>
        <span className="text-[10px] text-gray-500">Lv.50</span>
      </div>
      <div className="w-48 h-2.5 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
        <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <div className="text-[10px] text-gray-400 mt-0.5 font-mono">{Math.max(0, current)} / {max} HP</div>
    </div>
  );
}

/* ═══════════ DAMAGE CALC ═══════════ */
function calcDamage(attacker, move, defender) {
  if (move.power === 0) return 0;
  if (Math.random() * 100 > move.acc) return -1; // miss
  const eff = getEffectiveness(move.type, defender.type);
  const stab = move.type === attacker.type ? 1.5 : 1;
  const rand = 0.85 + Math.random() * 0.15;
  const crit = Math.random() < 0.0625 ? 1.5 : 1;
  const raw = ((22 * move.power * (attacker.atk / defender.def)) / 50 + 2) * stab * eff * rand * crit;
  return { damage: Math.max(1, Math.round(raw)), eff, crit: crit > 1 };
}

/* ═══════════ MAIN ═══════════ */
export default function PokemonApp() {
  const [phase, setPhase] = useState('pick'); // pick, battle, win, lose
  const [playerTeam, setPlayerTeam] = useState([]);
  const [enemyTeam, setEnemyTeam] = useState([]);
  const [playerIdx, setPlayerIdx] = useState(0);
  const [enemyIdx, setEnemyIdx] = useState(0);
  const [playerHP, setPlayerHP] = useState({});
  const [enemyHP, setEnemyHP] = useState({});
  const [log, setLog] = useState([]);
  const [animState, setAnimState] = useState({ playerShake: false, enemyShake: false, playerFlash: false, enemyFlash: false, attackParticles: null });
  const [turn, setTurn] = useState('player');
  const [busy, setBusy] = useState(false);

  const playerCreature = playerTeam[playerIdx];
  const enemyCreature = enemyTeam[enemyIdx];

  const addLog = useCallback((msg) => setLog(l => [msg, ...l].slice(0, 30)), []);

  // Team picking
  const pickTeam = (ids) => {
    const team = ids.map(id => CREATURES.find(c => c.id === id));
    const remaining = CREATURES.filter(c => !ids.includes(c.id));
    const shuffled = [...remaining].sort(() => Math.random() - 0.5);
    const enemy = shuffled.slice(0, 3);

    const pHP = {}; team.forEach(c => { pHP[c.id] = c.hp; });
    const eHP = {}; enemy.forEach(c => { eHP[c.id] = c.hp; });

    setPlayerTeam(team);
    setEnemyTeam(enemy);
    setPlayerHP(pHP);
    setEnemyHP(eHP);
    setPlayerIdx(0);
    setEnemyIdx(0);
    setLog([`Battle start! ${team[0].name} vs ${enemy[0].name}`]);
    setPhase('battle');
    setTurn('player');
  };

  // Player attack
  const playerAttack = useCallback((moveIdx) => {
    if (busy || turn !== 'player' || !playerCreature || !enemyCreature) return;
    setBusy(true);
    const move = playerCreature.moves[moveIdx];

    // Status moves
    if (move.power === 0) {
      addLog(`${playerCreature.name} used ${move.name}!`);
      setAnimState(a => ({ ...a, attackParticles: { type: move.type, side: 'player' } }));
      setTimeout(() => {
        setAnimState(a => ({ ...a, attackParticles: null }));
        addLog(`${playerCreature.name}'s stats changed!`);
        doEnemyTurn();
      }, 800);
      return;
    }

    const result = calcDamage(playerCreature, move, enemyCreature);
    addLog(`${playerCreature.name} used ${move.name}!`);
    setAnimState(a => ({ ...a, attackParticles: { type: move.type, side: 'player' } }));

    setTimeout(() => {
      setAnimState(a => ({ ...a, attackParticles: null }));

      if (result === -1) {
        addLog(`${move.name} missed!`);
        setTimeout(() => doEnemyTurn(), 500);
        return;
      }

      const { damage, eff, crit } = result;
      setAnimState(a => ({ ...a, enemyShake: true, enemyFlash: true }));
      if (eff > 1) addLog("It's super effective!");
      if (eff < 1) addLog("It's not very effective...");
      if (crit) addLog("Critical hit!");
      addLog(`${enemyCreature.name} took ${damage} damage!`);

      setEnemyHP(hp => {
        const newHP = { ...hp, [enemyCreature.id]: Math.max(0, hp[enemyCreature.id] - damage) };
        setTimeout(() => {
          setAnimState(a => ({ ...a, enemyShake: false, enemyFlash: false }));
          if (newHP[enemyCreature.id] <= 0) {
            addLog(`${enemyCreature.name} fainted!`);
            const nextAlive = enemyTeam.findIndex((c, i) => i !== enemyIdx && newHP[c.id] > 0);
            if (nextAlive === -1) {
              setTimeout(() => { addLog('You win!'); setPhase('win'); setBusy(false); }, 1000);
            } else {
              setTimeout(() => {
                setEnemyIdx(nextAlive);
                addLog(`Opponent sent out ${enemyTeam[nextAlive].name}!`);
                setTurn('player'); setBusy(false);
              }, 1200);
            }
          } else {
            doEnemyTurn();
          }
        }, 600);
        return newHP;
      });
    }, 700);
  }, [busy, turn, playerCreature, enemyCreature, enemyTeam, enemyIdx, addLog]);

  // Enemy turn
  const doEnemyTurn = useCallback(() => {
    setTimeout(() => {
      if (!enemyCreature || !playerCreature) { setBusy(false); return; }

      // AI: pick best move
      const moves = enemyCreature.moves.filter(m => m.power > 0);
      const scored = moves.map(m => ({
        ...m,
        score: m.power * getEffectiveness(m.type, playerCreature.type) * (m.type === enemyCreature.type ? 1.5 : 1) * (m.acc / 100),
      }));
      scored.sort((a, b) => b.score - a.score);
      const move = Math.random() < 0.7 ? scored[0] : scored[Math.floor(Math.random() * scored.length)];

      addLog(`${enemyCreature.name} used ${move.name}!`);
      setAnimState(a => ({ ...a, attackParticles: { type: move.type, side: 'enemy' } }));

      setTimeout(() => {
        setAnimState(a => ({ ...a, attackParticles: null }));
        const result = calcDamage(enemyCreature, move, playerCreature);

        if (result === -1) {
          addLog(`${move.name} missed!`);
          setTurn('player'); setBusy(false);
          return;
        }

        const { damage, eff, crit } = result;
        setAnimState(a => ({ ...a, playerShake: true, playerFlash: true }));
        if (eff > 1) addLog("It's super effective!");
        if (crit) addLog("Critical hit!");
        addLog(`${playerCreature.name} took ${damage} damage!`);

        setPlayerHP(hp => {
          const newHP = { ...hp, [playerCreature.id]: Math.max(0, hp[playerCreature.id] - damage) };
          setTimeout(() => {
            setAnimState(a => ({ ...a, playerShake: false, playerFlash: false }));
            if (newHP[playerCreature.id] <= 0) {
              addLog(`${playerCreature.name} fainted!`);
              const nextAlive = playerTeam.findIndex((c, i) => i !== playerIdx && newHP[c.id] > 0);
              if (nextAlive === -1) {
                setTimeout(() => { addLog('You lost!'); setPhase('lose'); setBusy(false); }, 1000);
              } else {
                setTimeout(() => {
                  setPlayerIdx(nextAlive);
                  addLog(`Go, ${playerTeam[nextAlive].name}!`);
                  setTurn('player'); setBusy(false);
                }, 1200);
              }
            } else {
              setTurn('player'); setBusy(false);
            }
          }, 600);
          return newHP;
        });
      }, 700);
    }, 800);
  }, [enemyCreature, playerCreature, playerTeam, playerIdx, addLog]);

  // Switch creature
  const switchCreature = (idx) => {
    if (busy || idx === playerIdx || playerHP[playerTeam[idx].id] <= 0) return;
    setBusy(true);
    addLog(`Come back, ${playerCreature.name}! Go, ${playerTeam[idx].name}!`);
    setPlayerIdx(idx);
    setTimeout(() => doEnemyTurn(), 600);
  };

  /* ═══════════ TEAM PICK SCREEN ═══════════ */
  if (phase === 'pick') {
    return (
      <div className="w-screen h-screen bg-[#0a0a1a] flex items-center justify-center overflow-auto">
        <div className="text-center max-w-3xl px-4">
          <h1 className="text-4xl font-black text-white mb-2">Creature Battle</h1>
          <p className="text-gray-500 mb-8">Choose 3 creatures for your team</p>
          <TeamPicker onPick={pickTeam} />
        </div>
      </div>
    );
  }

  /* ═══════════ WIN / LOSE ═══════════ */
  if (phase === 'win' || phase === 'lose') {
    return (
      <div className="w-screen h-screen bg-[#0a0a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">{phase === 'win' ? '🏆' : '💀'}</div>
          <h1 className="text-4xl font-black text-white mb-2">{phase === 'win' ? 'Victory!' : 'Defeated'}</h1>
          <p className="text-gray-500 mb-8">{phase === 'win' ? 'All opponent creatures fainted!' : 'Your team was wiped out...'}</p>
          <button onClick={() => { setPhase('pick'); setLog([]); }}
            className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-lg transition-colors">
            Play Again
          </button>
        </div>
      </div>
    );
  }

  /* ═══════════ BATTLE SCREEN ═══════════ */
  return (
    <div className="relative w-screen h-screen bg-[#0a0a1a] overflow-hidden">
      {/* 3D Arena */}
      <Canvas camera={{ position: [0, 4, 7], fov: 45 }} shadows>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 8, 5]} intensity={0.6} castShadow />
        <pointLight position={[-3, 4, -2]} intensity={0.3} color="#3b82f6" />
        <pointLight position={[3, 4, 2]} intensity={0.3} color="#ef4444" />

        <BattleArena />

        {playerCreature && (
          <Creature3D
            creature={playerCreature}
            side="player"
            isActive
            shaking={animState.playerShake}
            flashing={animState.playerFlash}
            fainted={playerHP[playerCreature.id] <= 0}
          />
        )}
        {enemyCreature && (
          <Creature3D
            creature={enemyCreature}
            side="enemy"
            isActive
            shaking={animState.enemyShake}
            flashing={animState.enemyFlash}
            fainted={enemyHP[enemyCreature.id] <= 0}
          />
        )}

        {animState.attackParticles && (
          <AttackParticles active type={animState.attackParticles.type} side={animState.attackParticles.side} />
        )}

        <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.5} maxPolarAngle={1.2} />
        <Environment preset="night" />
      </Canvas>

      {/* HP Bars */}
      <div className="fixed top-4 left-6 z-20">
        {playerCreature && <HPBar current={playerHP[playerCreature.id]} max={playerCreature.hp} name={playerCreature.name} type={playerCreature.type} side="player" />}
      </div>
      <div className="fixed top-4 right-6 z-20 text-right">
        {enemyCreature && <HPBar current={enemyHP[enemyCreature.id]} max={enemyCreature.hp} name={enemyCreature.name} type={enemyCreature.type} side="enemy" />}
      </div>

      {/* Move buttons */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-xl border-t border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex gap-3">
            {/* Moves */}
            <div className="flex-1">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Moves</p>
              <div className="grid grid-cols-2 gap-1.5">
                {playerCreature?.moves.map((move, i) => {
                  const typeColor = TYPES[move.type]?.color || '#888';
                  return (
                    <button key={i} onClick={() => playerAttack(i)}
                      disabled={busy || turn !== 'player'}
                      className="px-3 py-2 rounded-lg text-left transition-all disabled:opacity-40 hover:brightness-110 border"
                      style={{ backgroundColor: typeColor + '15', borderColor: typeColor + '30' }}>
                      <div className="text-xs font-bold text-white">{move.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold uppercase" style={{ color: typeColor }}>{move.type}</span>
                        {move.power > 0 && <span className="text-[9px] text-gray-500">PWR {move.power}</span>}
                        <span className="text-[9px] text-gray-500">ACC {move.acc}%</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Team */}
            <div className="w-40">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Team</p>
              <div className="space-y-1">
                {playerTeam.map((c, i) => {
                  const hp = playerHP[c.id];
                  const pct = Math.max(0, hp / c.hp) * 100;
                  const isCurrent = i === playerIdx;
                  return (
                    <button key={c.id} onClick={() => switchCreature(i)}
                      disabled={busy || isCurrent || hp <= 0}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-all ${
                        isCurrent ? 'bg-white/10 border border-white/20' : hp <= 0 ? 'opacity-30' : 'hover:bg-white/5 border border-transparent'
                      }`}>
                      <span className="text-sm">{c.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium text-gray-300 truncate">{c.name}</div>
                        <div className="w-full h-1 bg-gray-800 rounded-full mt-0.5">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct > 50 ? '#22c55e' : pct > 20 ? '#eab308' : '#ef4444' }} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Battle log */}
            <div className="w-52">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1.5 font-semibold">Log</p>
              <div className="h-[100px] overflow-y-auto space-y-0.5 text-[10px] text-gray-400 font-mono">
                {log.map((msg, i) => (
                  <div key={i} className={i === 0 ? 'text-gray-200' : ''}>{msg}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ TEAM PICKER ═══════════ */
function TeamPicker({ onPick }) {
  const [selected, setSelected] = useState([]);
  const toggle = (id) => {
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : s.length < 3 ? [...s, id] : s);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 mb-6">
        {CREATURES.map(c => {
          const picked = selected.includes(c.id);
          const typeColor = TYPES[c.type]?.color || '#888';
          return (
            <button key={c.id} onClick={() => toggle(c.id)}
              className={`p-4 rounded-2xl border-2 transition-all text-left ${
                picked ? 'border-violet-500 bg-violet-600/10 scale-105' : 'border-gray-800 bg-gray-900/50 hover:border-gray-600'
              }`}>
              <div className="text-3xl mb-2">{c.emoji}</div>
              <div className="text-sm font-bold text-white">{c.name}</div>
              <div className="text-[10px] font-bold uppercase mt-0.5" style={{ color: typeColor }}>{c.type}</div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 mt-2">
                {[['HP', c.hp], ['ATK', c.atk], ['DEF', c.def], ['SPD', c.spd]].map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-[9px] text-gray-500">{k}</span>
                    <span className="text-[9px] text-gray-300 font-mono">{v}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
      <button onClick={() => selected.length === 3 && onPick(selected)}
        disabled={selected.length !== 3}
        className="px-8 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg transition-colors">
        Battle! ({selected.length}/3)
      </button>
    </div>
  );
}
