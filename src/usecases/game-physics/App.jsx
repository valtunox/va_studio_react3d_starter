/**
 * Physics Game — 3D Tower Stacker
 *
 * Stack blocks as high as possible:
 * - Moving block slides back and forth
 * - Click/tap to drop and slice
 * - Blocks shrink if you miss the edge
 * - Score counter and combo tracker
 * - Progressive difficulty (speed increases)
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Environment, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4',
  '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#d946ef',
];

/* ── Stacked Block ── */
function StackedBlock({ position, size, color, index }) {
  return (
    <RoundedBox position={position} args={size} radius={0.02} smoothness={4} castShadow receiveShadow>
      <meshStandardMaterial
        color={color}
        metalness={0.3}
        roughness={0.4}
        emissive={color}
        emissiveIntensity={0.05}
      />
    </RoundedBox>
  );
}

/* ── Moving Block ── */
function MovingBlock({ size, height, direction, speed, color, onRef }) {
  const ref = useRef();

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    if (direction === 'x') {
      ref.current.position.x = Math.sin(t * speed) * 3;
    } else {
      ref.current.position.z = Math.sin(t * speed) * 3;
    }
    ref.current.position.y = height;
  });

  useEffect(() => {
    if (ref.current && onRef) onRef(ref);
  }, [onRef]);

  return (
    <RoundedBox ref={ref} args={size} radius={0.02} smoothness={4} castShadow>
      <meshStandardMaterial
        color={color}
        metalness={0.4}
        roughness={0.3}
        emissive={color}
        emissiveIntensity={0.15}
        transparent
        opacity={0.9}
      />
    </RoundedBox>
  );
}

/* ── Falling Debris ── */
function FallingPiece({ position, size, color }) {
  const ref = useRef();
  const vel = useRef(new THREE.Vector3((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.1));

  useFrame(() => {
    if (!ref.current) return;
    vel.current.y -= 0.005;
    ref.current.position.add(vel.current);
    ref.current.rotation.x += 0.02;
    ref.current.rotation.z += 0.01;
  });

  return (
    <RoundedBox ref={ref} position={position} args={size} radius={0.01} smoothness={2}>
      <meshStandardMaterial color={color} transparent opacity={0.6} />
    </RoundedBox>
  );
}

/* ── Game Scene ── */
function GameScene({ stack, movingBlock, debris, cameraY }) {
  const { camera } = useThree();

  useFrame(() => {
    const targetY = Math.max(3, cameraY + 2);
    camera.position.y += (targetY - camera.position.y) * 0.05;
    camera.lookAt(0, cameraY - 1, 0);
  });

  return (
    <>
      {/* Base platform */}
      <RoundedBox position={[0, -0.15, 0]} args={[4, 0.3, 4]} radius={0.05} smoothness={4} receiveShadow>
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
      </RoundedBox>

      {/* Stacked blocks */}
      {stack.map((block, i) => (
        <StackedBlock key={i} {...block} index={i} />
      ))}

      {/* Moving block */}
      {movingBlock && <MovingBlock {...movingBlock} />}

      {/* Debris */}
      {debris.map((d, i) => (
        <FallingPiece key={`debris-${i}`} {...d} />
      ))}

      {/* Grid floor */}
      <gridHelper args={[20, 20, '#1e3a5f55', '#0d1b2a55']} position={[0, -0.3, 0]} />
    </>
  );
}

/* ── Main ── */
export default function PhysicsGameApp() {
  const BLOCK_HEIGHT = 0.3;
  const INITIAL_SIZE = [2, BLOCK_HEIGHT, 2];

  const [gameState, setGameState] = useState('ready'); // ready, playing, gameover
  const [stack, setStack] = useState([]);
  const [debris, setDebris] = useState([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [speed, setSpeed] = useState(1.5);

  const movingBlockRef = useRef(null);

  const currentLevel = stack.length;
  const direction = currentLevel % 2 === 0 ? 'x' : 'z';
  const color = COLORS[currentLevel % COLORS.length];
  const lastBlock = stack[stack.length - 1];
  const currentSize = lastBlock ? [...lastBlock.size] : [...INITIAL_SIZE];
  const currentHeight = (currentLevel + 1) * BLOCK_HEIGHT;

  const movingBlock = gameState === 'playing' ? {
    size: currentSize,
    height: currentHeight,
    direction,
    speed: speed + currentLevel * 0.08,
    color,
    onRef: (ref) => { movingBlockRef.current = ref; },
  } : null;

  const startGame = () => {
    setStack([{ position: [0, BLOCK_HEIGHT / 2, 0], size: [...INITIAL_SIZE], color: COLORS[0] }]);
    setDebris([]);
    setScore(0);
    setCombo(0);
    setSpeed(1.5);
    setGameState('playing');
  };

  const handleDrop = useCallback(() => {
    if (gameState !== 'playing' || !movingBlockRef.current?.current) return;

    const pos = movingBlockRef.current.current.position;
    const prevBlock = stack[stack.length - 1];
    const prevPos = prevBlock.position;
    const prevSize = prevBlock.size;

    const axis = direction === 'x' ? 0 : 2;
    const sizeIdx = direction === 'x' ? 0 : 2;

    const delta = pos.toArray()[axis] - prevPos[axis];
    const overlap = prevSize[sizeIdx] - Math.abs(delta);

    if (overlap <= 0) {
      // Missed completely
      setGameState('gameover');
      if (score > bestScore) setBestScore(score);
      return;
    }

    const newCombo = overlap > prevSize[sizeIdx] * 0.9 ? combo + 1 : 0;
    const isPerfect = overlap > prevSize[sizeIdx] * 0.95;

    // New block
    const newSize = [...prevSize];
    newSize[sizeIdx] = isPerfect ? prevSize[sizeIdx] : overlap;

    const newPos = [...prevPos];
    newPos[1] = currentHeight;
    newPos[axis] = prevPos[axis] + delta / 2;

    // Debris from cut
    const newDebris = [];
    if (!isPerfect) {
      const debrisSize = [...prevSize];
      debrisSize[sizeIdx] = Math.abs(delta);
      const debrisPos = [...newPos];
      debrisPos[axis] = newPos[axis] + (delta > 0 ? overlap / 2 + Math.abs(delta) / 2 : -(overlap / 2 + Math.abs(delta) / 2));
      newDebris.push({ position: debrisPos, size: debrisSize, color });
    }

    setStack(s => [...s, { position: newPos, size: newSize, color }]);
    setDebris(d => [...d.slice(-5), ...newDebris]);
    setScore(s => s + (isPerfect ? 10 + newCombo * 5 : 5));
    setCombo(newCombo);

    movingBlockRef.current = null;
  }, [gameState, stack, direction, currentHeight, color, combo, score, bestScore]);

  // Keyboard listener
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        if (gameState === 'ready' || gameState === 'gameover') startGame();
        else handleDrop();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState, handleDrop]);

  return (
    <div className="relative w-screen h-screen bg-[#020810] overflow-hidden"
      onClick={() => { if (gameState === 'playing') handleDrop(); }}>

      <Canvas camera={{ position: [5, 5, 5], fov: 45 }} shadows>
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 10, 5]} intensity={0.6} castShadow />
        <pointLight position={[-3, 5, -3]} intensity={0.3} color="#8b5cf6" />

        <GameScene
          stack={stack}
          movingBlock={movingBlock}
          debris={debris}
          cameraY={currentHeight}
        />

        <OrbitControls enablePan={false} enableZoom={false} enableRotate={true}
          minPolarAngle={0.3} maxPolarAngle={Math.PI / 2.5} />
        <Environment preset="night" />
      </Canvas>

      {/* HUD */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-6">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl px-6 py-3 flex items-center gap-6">
          <div className="text-center">
            <div className="text-3xl font-black text-white font-mono">{score}</div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wider">Score</div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-center">
            <div className="text-xl font-bold text-violet-400 font-mono">{stack.length - 1}</div>
            <div className="text-[9px] text-gray-500 uppercase tracking-wider">Level</div>
          </div>
          {combo > 1 && (
            <>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <div className="text-xl font-bold text-amber-400 font-mono">x{combo}</div>
                <div className="text-[9px] text-gray-500 uppercase tracking-wider">Combo</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Best score */}
      {bestScore > 0 && (
        <div className="fixed top-4 right-4 z-20 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-2">
          <div className="text-[9px] text-gray-500 uppercase tracking-wider">Best</div>
          <div className="text-lg font-bold text-emerald-400 font-mono">{bestScore}</div>
        </div>
      )}

      {/* Start / Game Over screen */}
      {gameState !== 'playing' && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => { e.stopPropagation(); startGame(); }}>
          <div className="text-center">
            {gameState === 'gameover' && (
              <>
                <div className="text-6xl font-black text-white mb-2">Game Over</div>
                <div className="text-xl text-gray-400 mb-1">Score: <span className="text-violet-400 font-bold">{score}</span></div>
                <div className="text-sm text-gray-500 mb-8">Level: {stack.length - 1}</div>
              </>
            )}
            {gameState === 'ready' && (
              <>
                <div className="text-5xl font-black text-white mb-2">Tower Stacker</div>
                <p className="text-gray-500 mb-8">Stack blocks as high as you can!</p>
              </>
            )}
            <div className="space-y-3">
              <button className="px-8 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl text-lg transition-colors shadow-lg shadow-violet-600/30">
                {gameState === 'gameover' ? 'Play Again' : 'Start Game'}
              </button>
              <p className="text-xs text-gray-600">Click anywhere or press Space to drop</p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      {gameState === 'playing' && stack.length <= 2 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl px-5 py-3 text-center">
          <p className="text-xs text-gray-400">Click or press Space to drop the block</p>
          <p className="text-[10px] text-gray-600 mt-1">Align perfectly for bonus points!</p>
        </div>
      )}
    </div>
  );
}
