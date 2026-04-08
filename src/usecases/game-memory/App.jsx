/**
 * Memory Card Game — 3D Chip-Themed
 *
 * Match pairs of tech/chip-themed cards:
 * - 3D card flip animation
 * - Chip, CPU, GPU, RAM, SSD icons
 * - Move counter, timer, score
 * - Multiple grid sizes (4x3, 4x4, 6x4)
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Environment, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const CARD_SYMBOLS = [
  { id: 'cpu', label: 'CPU', emoji: '🔲', color: '#3b82f6' },
  { id: 'gpu', label: 'GPU', emoji: '🟩', color: '#22c55e' },
  { id: 'ram', label: 'RAM', emoji: '📊', color: '#8b5cf6' },
  { id: 'ssd', label: 'SSD', emoji: '💾', color: '#f59e0b' },
  { id: 'chip', label: 'CHIP', emoji: '🧠', color: '#ec4899' },
  { id: 'cloud', label: 'CLOUD', emoji: '☁️', color: '#06b6d4' },
  { id: 'server', label: 'SRV', emoji: '🖥️', color: '#ef4444' },
  { id: 'network', label: 'NET', emoji: '🌐', color: '#10b981' },
  { id: 'data', label: 'DATA', emoji: '📡', color: '#f97316' },
  { id: 'ai', label: 'AI', emoji: '🤖', color: '#a855f7' },
  { id: 'lock', label: 'SEC', emoji: '🔒', color: '#64748b' },
  { id: 'code', label: 'CODE', emoji: '⌨️', color: '#14b8a6' },
];

/* ── 3D Card ── */
function Card3D({ position, card, isFlipped, isMatched, onClick }) {
  const groupRef = useRef();
  const targetRotation = useRef(0);

  useEffect(() => {
    targetRotation.current = (isFlipped || isMatched) ? Math.PI : 0;
  }, [isFlipped, isMatched]);

  useFrame(() => {
    if (!groupRef.current) return;
    const current = groupRef.current.rotation.y;
    const target = targetRotation.current;
    groupRef.current.rotation.y += (target - current) * 0.12;

    if (isMatched) {
      groupRef.current.position.y = position[1] + Math.sin(Date.now() * 0.003 + position[0]) * 0.05;
    } else {
      groupRef.current.position.y += (position[1] - groupRef.current.position.y) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={onClick}>
      {/* Card back (facing camera when not flipped) */}
      <RoundedBox args={[0.8, 1, 0.08]} radius={0.04} smoothness={4} castShadow>
        <meshStandardMaterial
          color={isMatched ? '#1a1a2e' : '#1e293b'}
          metalness={0.5}
          roughness={0.3}
          emissive={isMatched ? card.color : '#0f172a'}
          emissiveIntensity={isMatched ? 0.3 : 0.05}
        />
      </RoundedBox>

      {/* Card front design (visible when flipped — rotated 180 so it reads correctly) */}
      <group rotation={[0, Math.PI, 0]} position={[0, 0, 0.05]}>
        <RoundedBox args={[0.72, 0.92, 0.01]} radius={0.03} smoothness={4}>
          <meshStandardMaterial
            color={card.color}
            metalness={0.3}
            roughness={0.4}
            emissive={card.color}
            emissiveIntensity={0.15}
          />
        </RoundedBox>
        <Text position={[0, 0.1, 0.02]} fontSize={0.28} anchorX="center" anchorY="middle" color="white">
          {card.emoji}
        </Text>
        <Text position={[0, -0.25, 0.02]} fontSize={0.1} anchorX="center" color="white" font={undefined}>
          {card.label}
        </Text>
      </group>

      {/* Card back pattern */}
      <group position={[0, 0, 0.05]}>
        <Text position={[0, 0, 0.01]} fontSize={0.15} anchorX="center" color="#334155">
          {'?'}
        </Text>
        {/* Circuit pattern dots */}
        {[[-0.2, 0.3], [0.2, 0.3], [-0.2, -0.3], [0.2, -0.3]].map(([x, y], i) => (
          <mesh key={i} position={[x, y, 0.01]}>
            <circleGeometry args={[0.03, 8]} />
            <meshBasicMaterial color="#334155" />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ── Shuffle ── */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/* ── Grid Configs ── */
const GRID_CONFIGS = {
  easy: { cols: 4, rows: 3, pairs: 6 },
  medium: { cols: 4, rows: 4, pairs: 8 },
  hard: { cols: 6, rows: 4, pairs: 12 },
};

export default function MemoryGameApp() {
  const [difficulty, setDifficulty] = useState('medium');
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState(new Set());
  const [moves, setMoves] = useState(0);
  const [timer, setTimer] = useState(0);
  const [gameState, setGameState] = useState('ready');
  const [bestScores, setBestScores] = useState({ easy: null, medium: null, hard: null });

  const config = GRID_CONFIGS[difficulty];

  const initGame = useCallback((diff) => {
    const d = diff || difficulty;
    const cfg = GRID_CONFIGS[d];
    const symbols = shuffle(CARD_SYMBOLS).slice(0, cfg.pairs);
    const deck = shuffle([...symbols, ...symbols].map((s, i) => ({ ...s, uid: i })));
    setCards(deck);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setTimer(0);
    setGameState('playing');
    if (diff) setDifficulty(diff);
  }, [difficulty]);

  // Timer
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => setTimer(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, [gameState]);

  // Check win
  useEffect(() => {
    if (gameState === 'playing' && matched.size === cards.length && cards.length > 0) {
      setGameState('won');
      const score = moves;
      const best = bestScores[difficulty];
      if (best === null || score < best) {
        setBestScores(b => ({ ...b, [difficulty]: score }));
      }
    }
  }, [matched.size, cards.length, gameState, moves, difficulty, bestScores]);

  const handleCardClick = useCallback((index) => {
    if (gameState !== 'playing') return;
    if (flipped.length >= 2) return;
    if (flipped.includes(index)) return;
    if (matched.has(index)) return;

    const newFlipped = [...flipped, index];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      if (cards[a].id === cards[b].id) {
        setTimeout(() => {
          setMatched(m => new Set([...m, a, b]));
          setFlipped([]);
        }, 500);
      } else {
        setTimeout(() => setFlipped([]), 1000);
      }
    }
  }, [gameState, flipped, matched, cards]);

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="relative w-screen h-screen bg-[#030812] overflow-hidden">
      <Canvas camera={{ position: [0, 6, 5], fov: 50 }} shadows>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 10, 5]} intensity={0.6} castShadow />
        <pointLight position={[-3, 5, -3]} intensity={0.3} color="#8b5cf6" />

        {/* Cards grid */}
        {cards.map((card, i) => {
          const col = i % config.cols;
          const row = Math.floor(i / config.cols);
          const x = (col - (config.cols - 1) / 2) * 1.1;
          const z = (row - (config.rows - 1) / 2) * 1.3;

          return (
            <Card3D
              key={card.uid}
              position={[x, 0.5, z]}
              card={card}
              isFlipped={flipped.includes(i)}
              isMatched={matched.has(i)}
              onClick={() => handleCardClick(i)}
            />
          );
        })}

        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <planeGeometry args={[12, 10]} />
          <meshStandardMaterial color="#0a0f1a" />
        </mesh>
        <gridHelper args={[12, 12, '#1e3a5f33', '#0d1b2a33']} />

        <OrbitControls enablePan={false} minDistance={5} maxDistance={15}
          minPolarAngle={0.2} maxPolarAngle={Math.PI / 3} />
        <Environment preset="night" />
      </Canvas>

      {/* HUD */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white font-mono">{moves}</div>
            <div className="text-[9px] text-gray-500 uppercase">Moves</div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400 font-mono">{formatTime(timer)}</div>
            <div className="text-[9px] text-gray-500 uppercase">Time</div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <div className="text-2xl font-bold text-violet-400 font-mono">{matched.size / 2}/{config.pairs}</div>
            <div className="text-[9px] text-gray-500 uppercase">Matched</div>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="fixed top-4 left-4 z-20 bg-black/70 backdrop-blur-xl border border-white/10 rounded-2xl w-64">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <span className="text-xl">🃏</span> Memory Match
          </h1>
          <p className="text-[10px] text-gray-500 mt-0.5">Chip-themed card matching</p>
        </div>

        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Difficulty</p>
          <div className="flex gap-1.5">
            {Object.entries(GRID_CONFIGS).map(([id, cfg]) => (
              <button key={id} onClick={() => initGame(id)}
                className={`flex-1 px-2 py-2 rounded-lg text-[11px] font-bold capitalize transition-all ${
                  difficulty === id && gameState !== 'ready' ? 'bg-violet-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}>
                {id}
                <div className="text-[9px] font-normal opacity-60">{cfg.cols}x{cfg.rows}</div>
              </button>
            ))}
          </div>
        </div>

        {bestScores[difficulty] !== null && (
          <div className="p-4 border-b border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Best ({difficulty})</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{bestScores[difficulty]} moves</span>
            </div>
          </div>
        )}

        <div className="p-4">
          <button onClick={() => initGame()}
            className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-medium rounded-xl text-sm transition-colors">
            {gameState === 'ready' ? 'Start Game' : 'New Game'}
          </button>
        </div>
      </div>

      {/* Ready / Won overlay */}
      {(gameState === 'ready' || gameState === 'won') && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); initGame(); }}>
          <div className="text-center">
            {gameState === 'won' ? (
              <>
                <div className="text-5xl font-black text-white mb-2">You Win!</div>
                <div className="text-lg text-gray-400 mb-1">
                  <span className="text-violet-400 font-bold">{moves}</span> moves in{' '}
                  <span className="text-cyan-400 font-bold">{formatTime(timer)}</span>
                </div>
                {bestScores[difficulty] === moves && (
                  <div className="text-sm text-emerald-400 font-bold mb-6">New Best Score!</div>
                )}
              </>
            ) : (
              <>
                <div className="text-5xl font-black text-white mb-2">Memory Match</div>
                <p className="text-gray-500 mb-6">Match chip-themed card pairs!</p>
              </>
            )}
            <button className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-lg transition-colors shadow-lg shadow-violet-600/30">
              {gameState === 'won' ? 'Play Again' : 'Start'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
