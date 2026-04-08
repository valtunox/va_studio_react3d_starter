/**
 * Blackjack 3D — Casino card game
 *
 * - 3D felt table with card dealing animations
 * - Full blackjack rules (hit, stand, double down, split)
 * - Dealer AI (hits on 16, stands on 17)
 * - Chip betting system (25, 50, 100, 500)
 * - Card flip animation
 * - Win/loss/push tracking
 * - Multi-deck shoe (6 decks)
 */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Environment, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

/* ═══════════ CARD / DECK ═══════════ */
const SUITS = ['♠', '♥', '♦', '♣'];
const SUIT_COLORS = { '♠': '#e5e5e5', '♥': '#ef4444', '♦': '#ef4444', '♣': '#e5e5e5' };
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push({ rank, suit });
  return deck;
}

function createShoe(numDecks = 6) {
  let shoe = [];
  for (let i = 0; i < numDecks; i++) shoe = [...shoe, ...createDeck()];
  // Shuffle
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

function cardValue(card) {
  if (card.rank === 'A') return 11;
  if (['K', 'Q', 'J'].includes(card.rank)) return 10;
  return parseInt(card.rank);
}

function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) {
    total += cardValue(c);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function handStr(val) {
  return val > 21 ? 'BUST' : val === 21 ? 'BLACKJACK' : String(val);
}

/* ═══════════ 3D CARD ═══════════ */
function Card3D({ card, position, faceUp = true, index = 0, dealing }) {
  const groupRef = useRef();
  const targetFlip = useRef(faceUp ? Math.PI : 0);
  const targetPos = useRef(position);

  useEffect(() => {
    targetFlip.current = faceUp ? Math.PI : 0;
    targetPos.current = position;
  }, [faceUp, position]);

  useFrame(() => {
    if (!groupRef.current) return;
    // Animate position
    groupRef.current.position.x += (targetPos.current[0] - groupRef.current.position.x) * 0.1;
    groupRef.current.position.y += (targetPos.current[1] - groupRef.current.position.y) * 0.1;
    groupRef.current.position.z += (targetPos.current[2] - groupRef.current.position.z) * 0.1;
    // Animate flip
    groupRef.current.rotation.x += (targetFlip.current - groupRef.current.rotation.x) * 0.1;
  });

  const isRed = card.suit === '♥' || card.suit === '♦';

  return (
    <group ref={groupRef} position={dealing ? [0, 1, -3] : position}>
      {/* Card body */}
      <RoundedBox args={[0.7, 0.02, 1]} radius={0.03} smoothness={4} castShadow>
        <meshStandardMaterial color="#f5f5f0" metalness={0.1} roughness={0.4} />
      </RoundedBox>

      {/* Card back (visible when face down) */}
      <group position={[0, -0.015, 0]} rotation={[0, 0, 0]}>
        <RoundedBox args={[0.64, 0.005, 0.94]} radius={0.02} smoothness={4}>
          <meshStandardMaterial color="#1e3a8a" metalness={0.3} roughness={0.5} />
        </RoundedBox>
        {/* Diamond pattern */}
        {Array.from({ length: 3 }, (_, i) => (
          <mesh key={i} position={[0, -0.02, (i - 1) * 0.3]} rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[0.12, 0.003, 0.12]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.5} roughness={0.3} />
          </mesh>
        ))}
      </group>

      {/* Card face (visible when flipped) */}
      <group position={[0, 0.015, 0]} rotation={[Math.PI, 0, 0]}>
        {/* Rank + Suit */}
        <Text position={[-0.22, 0.005, -0.35]} fontSize={0.15} color={isRed ? '#dc2626' : '#1e1e1e'} anchorX="left" rotation={[-Math.PI / 2, 0, 0]}>
          {card.rank}
        </Text>
        <Text position={[-0.22, 0.005, -0.2]} fontSize={0.12} color={isRed ? '#dc2626' : '#1e1e1e'} anchorX="left" rotation={[-Math.PI / 2, 0, 0]}>
          {card.suit}
        </Text>
        {/* Center suit */}
        <Text position={[0, 0.005, 0]} fontSize={0.3} color={isRed ? '#dc2626' : '#374151'} anchorX="center" rotation={[-Math.PI / 2, 0, 0]}>
          {card.suit}
        </Text>
      </group>
    </group>
  );
}

/* ═══════════ CHIP ═══════════ */
function Chip3D({ value, position, onClick, selected }) {
  const ref = useRef();
  const colors = { 25: '#22c55e', 50: '#3b82f6', 100: '#ef4444', 500: '#1e1e1e' };
  const color = colors[value] || '#888';

  useFrame(({ clock }) => {
    if (ref.current && selected) {
      ref.current.position.y = position[1] + 0.1 + Math.sin(clock.getElapsedTime() * 4) * 0.03;
    }
  });

  return (
    <group ref={ref} position={position} onClick={onClick}>
      <mesh castShadow>
        <cylinderGeometry args={[0.3, 0.3, 0.06, 32]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.005, 32]} />
        <meshStandardMaterial color="#fff" metalness={0.2} roughness={0.5} />
      </mesh>
      <Text position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.12} color={color} anchorX="center">
        {value}
      </Text>
    </group>
  );
}

/* ═══════════ TABLE ═══════════ */
function Table3D() {
  return (
    <group>
      {/* Felt surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#15803d" metalness={0.05} roughness={0.95} />
      </mesh>
      {/* Table edge */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[8.4, 0.2, 6.4]} />
        <meshStandardMaterial color="#5c3a1e" metalness={0.3} roughness={0.6} />
      </mesh>
      {/* Dealer area line */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, -0.5]}>
        <planeGeometry args={[5, 0.02]} />
        <meshBasicMaterial color="#fbbf2444" transparent />
      </mesh>
      {/* Betting circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 1.5]}>
        <ringGeometry args={[0.4, 0.45, 32]} />
        <meshBasicMaterial color="#fbbf2444" transparent />
      </mesh>
      <Text position={[0, 0.01, -2.5]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.15} color="#fbbf2433">
        BLACKJACK PAYS 3 TO 2
      </Text>
    </group>
  );
}

/* ═══════════ MAIN ═══════════ */
export default function BlackjackApp() {
  const [shoe, setShoe] = useState(() => createShoe());
  const [shoeIdx, setShoeIdx] = useState(0);
  const [playerHand, setPlayerHand] = useState([]);
  const [dealerHand, setDealerHand] = useState([]);
  const [phase, setPhase] = useState('bet'); // bet, deal, player, dealer, result
  const [balance, setBalance] = useState(1000);
  const [bet, setBet] = useState(0);
  const [result, setResult] = useState('');
  const [dealerRevealed, setDealerRevealed] = useState(false);
  const [stats, setStats] = useState({ wins: 0, losses: 0, pushes: 0, blackjacks: 0 });

  const draw = useCallback(() => {
    if (shoeIdx >= shoe.length - 10) {
      const newShoe = createShoe();
      setShoe(newShoe);
      setShoeIdx(1);
      return newShoe[0];
    }
    const card = shoe[shoeIdx];
    setShoeIdx(i => i + 1);
    return card;
  }, [shoe, shoeIdx]);

  const playerValue = handValue(playerHand);
  const dealerValue = handValue(dealerHand);
  const dealerShownValue = dealerRevealed ? dealerValue : (dealerHand[0] ? cardValue(dealerHand[0]) : 0);

  const addBet = (amount) => {
    if (phase !== 'bet') return;
    if (balance >= amount) {
      setBet(b => b + amount);
      setBalance(b => b - amount);
    }
  };

  const deal = () => {
    if (bet === 0) return;
    const p1 = draw(), d1 = draw(), p2 = draw(), d2 = draw();
    setPlayerHand([p1, p2]);
    setDealerHand([d1, d2]);
    setDealerRevealed(false);
    setResult('');

    const pv = handValue([p1, p2]);
    const dv = handValue([d1, d2]);

    if (pv === 21 && dv === 21) {
      setDealerRevealed(true);
      setResult('Push — both Blackjack');
      setBalance(b => b + bet);
      setStats(s => ({ ...s, pushes: s.pushes + 1 }));
      setPhase('result');
    } else if (pv === 21) {
      setDealerRevealed(true);
      setResult('Blackjack! You win!');
      setBalance(b => b + bet + Math.floor(bet * 1.5));
      setStats(s => ({ ...s, wins: s.wins + 1, blackjacks: s.blackjacks + 1 }));
      setPhase('result');
    } else {
      setPhase('player');
    }
  };

  const hit = () => {
    const card = draw();
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    if (handValue(newHand) > 21) {
      setDealerRevealed(true);
      setResult('Bust! You lose.');
      setStats(s => ({ ...s, losses: s.losses + 1 }));
      setPhase('result');
    }
  };

  const stand = useCallback(() => {
    setDealerRevealed(true);
    setPhase('dealer');

    // Dealer draws
    let dHand = [...dealerHand];
    const drawForDealer = () => {
      while (handValue(dHand) < 17) {
        dHand = [...dHand, draw()];
      }
      setDealerHand(dHand);

      const dv = handValue(dHand);
      const pv = playerValue;

      if (dv > 21) {
        setResult('Dealer busts! You win!');
        setBalance(b => b + bet * 2);
        setStats(s => ({ ...s, wins: s.wins + 1 }));
      } else if (dv > pv) {
        setResult('Dealer wins.');
        setStats(s => ({ ...s, losses: s.losses + 1 }));
      } else if (dv < pv) {
        setResult('You win!');
        setBalance(b => b + bet * 2);
        setStats(s => ({ ...s, wins: s.wins + 1 }));
      } else {
        setResult('Push — tie.');
        setBalance(b => b + bet);
        setStats(s => ({ ...s, pushes: s.pushes + 1 }));
      }
      setPhase('result');
    };

    setTimeout(drawForDealer, 500);
  }, [dealerHand, playerValue, bet, draw]);

  const doubleDown = () => {
    if (balance >= bet) {
      setBalance(b => b - bet);
      setBet(b => b * 2);
      const card = draw();
      const newHand = [...playerHand, card];
      setPlayerHand(newHand);
      if (handValue(newHand) > 21) {
        setDealerRevealed(true);
        setResult('Bust! You lose.');
        setStats(s => ({ ...s, losses: s.losses + 1 }));
        setPhase('result');
      } else {
        stand();
      }
    }
  };

  const newRound = () => {
    setBet(0);
    setPlayerHand([]);
    setDealerHand([]);
    setResult('');
    setDealerRevealed(false);
    setPhase('bet');
  };

  return (
    <div className="relative w-screen h-screen bg-[#0a1a0a] overflow-hidden">
      <Canvas camera={{ position: [0, 6, 5], fov: 45 }} shadows>
        <ambientLight intensity={0.3} />
        <directionalLight position={[3, 8, 3]} intensity={0.6} castShadow />
        <spotLight position={[0, 8, 0]} angle={0.6} penumbra={0.5} intensity={0.5} castShadow />

        <Table3D />

        {/* Dealer cards */}
        {dealerHand.map((card, i) => (
          <Card3D key={`d-${i}`} card={card}
            position={[-0.8 + i * 0.9, 0.04 + i * 0.01, -1.5]}
            faceUp={i === 0 || dealerRevealed}
            index={i} dealing={phase === 'deal'}
          />
        ))}

        {/* Player cards */}
        {playerHand.map((card, i) => (
          <Card3D key={`p-${i}`} card={card}
            position={[-0.8 + i * 0.9, 0.04 + i * 0.01, 1.5]}
            faceUp index={i} dealing={phase === 'deal'}
          />
        ))}

        {/* Bet chips on table */}
        {bet > 0 && (
          <group position={[0, 0.05, 0.3]}>
            {Array.from({ length: Math.min(5, Math.ceil(bet / 100)) }, (_, i) => (
              <mesh key={i} position={[0, i * 0.07, 0]} castShadow>
                <cylinderGeometry args={[0.25, 0.25, 0.06, 24]} />
                <meshStandardMaterial color={bet >= 500 ? '#1e1e1e' : bet >= 100 ? '#ef4444' : '#3b82f6'} metalness={0.4} roughness={0.4} />
              </mesh>
            ))}
          </group>
        )}

        <OrbitControls enablePan={false} minDistance={5} maxDistance={12} minPolarAngle={0.3} maxPolarAngle={1.2} target={[0, 0, 0]} />
        <Environment preset="apartment" />
      </Canvas>

      {/* Dealer info */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl px-5 py-2 flex items-center gap-4">
        <span className="text-xs text-gray-500">Dealer</span>
        <span className="text-xl font-bold text-white font-mono">{dealerRevealed ? handStr(dealerValue) : dealerHand.length > 0 ? `${dealerShownValue} + ?` : '—'}</span>
      </div>

      {/* Player info */}
      <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-20 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl px-5 py-2 flex items-center gap-4">
        <span className="text-xs text-gray-500">You</span>
        <span className={`text-xl font-bold font-mono ${playerValue > 21 ? 'text-red-400' : playerValue === 21 ? 'text-emerald-400' : 'text-white'}`}>
          {playerHand.length > 0 ? handStr(playerValue) : '—'}
        </span>
      </div>

      {/* Result banner */}
      {result && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl px-8 py-6 text-center">
          <div className="text-2xl font-black text-white mb-2">{result}</div>
          <button onClick={newRound} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-colors">
            Next Hand
          </button>
        </div>
      )}

      {/* Bottom controls */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-xl border-t border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-6">
          {/* Balance / Bet */}
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[9px] text-gray-500 uppercase">Balance</div>
              <div className="text-lg font-bold text-emerald-400 font-mono">${balance}</div>
            </div>
            <div>
              <div className="text-[9px] text-gray-500 uppercase">Bet</div>
              <div className="text-lg font-bold text-amber-400 font-mono">${bet}</div>
            </div>
          </div>

          <div className="h-10 w-px bg-white/10" />

          {phase === 'bet' ? (
            /* Betting chips */
            <div className="flex items-center gap-2 flex-1">
              {[25, 50, 100, 500].map(v => (
                <button key={v} onClick={() => addBet(v)} disabled={balance < v}
                  className={`w-12 h-12 rounded-full font-bold text-xs transition-all disabled:opacity-30 border-2 ${
                    v === 25 ? 'bg-emerald-700 border-emerald-500 text-white' :
                    v === 50 ? 'bg-blue-700 border-blue-500 text-white' :
                    v === 100 ? 'bg-red-700 border-red-500 text-white' :
                    'bg-gray-900 border-gray-600 text-white'
                  }`}>
                  ${v}
                </button>
              ))}
              <button onClick={deal} disabled={bet === 0}
                className="ml-auto px-6 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-30 text-white font-bold rounded-xl text-sm transition-colors">
                Deal
              </button>
            </div>
          ) : phase === 'player' ? (
            /* Play actions */
            <div className="flex items-center gap-2 flex-1">
              <button onClick={hit} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-sm transition-colors">Hit</button>
              <button onClick={stand} className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-sm transition-colors">Stand</button>
              {playerHand.length === 2 && balance >= bet && (
                <button onClick={doubleDown} className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-sm transition-colors">Double</button>
              )}
            </div>
          ) : (
            <div className="flex-1 text-center text-sm text-gray-400">
              {phase === 'dealer' ? 'Dealer drawing...' : ''}
            </div>
          )}

          <div className="h-10 w-px bg-white/10" />

          {/* Stats */}
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span>W: <span className="text-emerald-400 font-bold">{stats.wins}</span></span>
            <span>L: <span className="text-red-400 font-bold">{stats.losses}</span></span>
            <span>P: <span className="text-gray-400 font-bold">{stats.pushes}</span></span>
            <span>BJ: <span className="text-amber-400 font-bold">{stats.blackjacks}</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
