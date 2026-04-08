/**
 * Robotics 3D Simulation Use Case
 *
 * Full industrial robotics simulation:
 * - 6-axis articulated robot arm with real joint kinematics
 * - Conveyor belt production line with moving parts
 * - Warehouse AGV (autonomous guided vehicles) fleet
 * - Sensor cone visualization (LIDAR, camera FOV)
 * - Welding spark / gripper FX
 * - Joint angle sliders (forward kinematics)
 * - Pre-programmed motion sequences (pick-place, weld, scan)
 * - Robot presets: Industrial Arm, SCARA, Delta, Mobile Bot
 */

import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  OrbitControls, Text, Environment, RoundedBox,
  Cylinder, Sphere, Box, Torus,
} from '@react-three/drei';
import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════════ */
/*  ROBOT ARM — 6-DOF articulated manipulator                        */
/* ═══════════════════════════════════════════════════════════════════ */

function Joint({ children, axis = 'y', angle = 0 }) {
  const ref = useRef();
  useFrame(() => {
    if (!ref.current) return;
    const target = THREE.MathUtils.degToRad(angle);
    ref.current.rotation[axis] += (target - ref.current.rotation[axis]) * 0.08;
  });
  return <group ref={ref}>{children}</group>;
}

function LinkSegment({ length, radius, color, emissive }) {
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, length, 16]} />
        <meshStandardMaterial
          color={color}
          metalness={0.8}
          roughness={0.2}
          emissive={emissive || '#000'}
          emissiveIntensity={0.05}
        />
      </mesh>
    </group>
  );
}

function JointSphere({ radius = 0.12, color = '#f59e0b', highlighted }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current && highlighted) {
      ref.current.material.emissiveIntensity = 0.4 + Math.sin(clock.getElapsedTime() * 5) * 0.2;
    }
  });
  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        color={highlighted ? '#f59e0b' : color}
        metalness={0.7}
        roughness={0.25}
        emissive={highlighted ? '#f59e0b' : '#000'}
        emissiveIntensity={highlighted ? 0.4 : 0.02}
      />
    </mesh>
  );
}

function Gripper({ open, active }) {
  const leftRef = useRef();
  const rightRef = useRef();
  const sparkRef = useRef();

  useFrame(({ clock }) => {
    const target = open ? 0.15 : 0.03;
    if (leftRef.current) leftRef.current.position.x += ((-target) - leftRef.current.position.x) * 0.1;
    if (rightRef.current) rightRef.current.position.x += (target - rightRef.current.position.x) * 0.1;
    if (sparkRef.current && active) {
      sparkRef.current.material.emissiveIntensity = 0.5 + Math.sin(clock.getElapsedTime() * 20) * 0.5;
      sparkRef.current.scale.setScalar(0.8 + Math.sin(clock.getElapsedTime() * 15) * 0.3);
    }
  });

  return (
    <group>
      {/* Left finger */}
      <group ref={leftRef} position={[-0.1, 0, 0]}>
        <mesh castShadow position={[0, -0.15, 0]}>
          <boxGeometry args={[0.03, 0.3, 0.06]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
      {/* Right finger */}
      <group ref={rightRef} position={[0.1, 0, 0]}>
        <mesh castShadow position={[0, -0.15, 0]}>
          <boxGeometry args={[0.03, 0.3, 0.06]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
        </mesh>
      </group>
      {/* Welding/action spark */}
      {active && (
        <mesh ref={sparkRef} position={[0, -0.3, 0]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.5} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  );
}

function RobotArm({ joints, gripperOpen, effectorActive, highlightedJoint, armColor = '#1e293b', accentColor = '#0ea5e9' }) {
  return (
    <group position={[0, 0, 0]}>
      {/* Base */}
      <mesh castShadow receiveShadow position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.35, 0.4, 0.2, 32]} />
        <meshStandardMaterial color={armColor} metalness={0.85} roughness={0.15} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.04, 32]} />
        <meshStandardMaterial color={accentColor} metalness={0.7} roughness={0.2} emissive={accentColor} emissiveIntensity={0.1} />
      </mesh>

      {/* J1 — Base rotation (Y) */}
      <Joint axis="y" angle={joints[0]}>
        <group position={[0, 0.2, 0]}>
          <JointSphere radius={0.14} color={accentColor} highlighted={highlightedJoint === 0} />

          {/* J2 — Shoulder (Z) */}
          <Joint axis="z" angle={joints[1]}>
            <group position={[0, 0.14, 0]}>
              <JointSphere radius={0.12} color={accentColor} highlighted={highlightedJoint === 1} />
              {/* Upper arm */}
              <group position={[0, 0.45, 0]}>
                <LinkSegment length={0.7} radius={0.07} color={armColor} />
              </group>

              {/* J3 — Elbow (Z) */}
              <group position={[0, 0.85, 0]}>
                <Joint axis="z" angle={joints[2]}>
                  <JointSphere radius={0.11} color={accentColor} highlighted={highlightedJoint === 2} />
                  {/* Forearm */}
                  <group position={[0, 0.35, 0]}>
                    <LinkSegment length={0.55} radius={0.055} color={armColor} />
                  </group>

                  {/* J4 — Wrist roll (Y) */}
                  <group position={[0, 0.65, 0]}>
                    <Joint axis="y" angle={joints[3]}>
                      <JointSphere radius={0.08} color={accentColor} highlighted={highlightedJoint === 3} />

                      {/* J5 — Wrist pitch (Z) */}
                      <Joint axis="z" angle={joints[4]}>
                        <JointSphere radius={0.07} color={accentColor} highlighted={highlightedJoint === 4} />
                        <group position={[0, 0.12, 0]}>
                          <LinkSegment length={0.15} radius={0.04} color={armColor} />
                        </group>

                        {/* J6 — Wrist rotate (Y) + Gripper */}
                        <group position={[0, 0.2, 0]}>
                          <Joint axis="y" angle={joints[5]}>
                            <JointSphere radius={0.06} color="#f59e0b" highlighted={highlightedJoint === 5} />
                            <Gripper open={gripperOpen} active={effectorActive} />
                          </Joint>
                        </group>
                      </Joint>
                    </Joint>
                  </group>
                </Joint>
              </group>
            </group>
          </Joint>
        </group>
      </Joint>
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  CONVEYOR BELT                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

function ConveyorBelt({ position, length = 6, speed = 1, active }) {
  const beltRef = useRef();

  useFrame(({ clock }) => {
    if (beltRef.current && active) {
      beltRef.current.material.map.offset.x = clock.getElapsedTime() * speed * 0.3;
    }
  });

  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 128, 32);
    for (let x = 0; x < 128; x += 16) {
      ctx.fillStyle = '#334155';
      ctx.fillRect(x, 0, 2, 32);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(length, 1);
    return tex;
  }, [length]);

  return (
    <group position={position}>
      {/* Belt surface */}
      <mesh ref={beltRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.35, 0]} receiveShadow>
        <planeGeometry args={[length, 0.8]} />
        <meshStandardMaterial map={texture} metalness={0.3} roughness={0.7} />
      </mesh>
      {/* Side rails */}
      {[-0.42, 0.42].map((z, i) => (
        <mesh key={i} position={[0, 0.25, z]} castShadow>
          <boxGeometry args={[length, 0.15, 0.04]} />
          <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}
      {/* Legs */}
      {[-length / 2 + 0.3, length / 2 - 0.3].map((x, i) => (
        [-0.35, 0.35].map((z, j) => (
          <mesh key={`${i}-${j}`} position={[x, 0.12, z]} castShadow>
            <boxGeometry args={[0.06, 0.25, 0.06]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} />
          </mesh>
        ))
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  WORKPIECES on conveyor                                            */
/* ═══════════════════════════════════════════════════════════════════ */

function Workpieces({ conveyorPos, speed, active, count = 5 }) {
  const groupRef = useRef();
  const piecesRef = useRef(
    Array.from({ length: count }, (_, i) => ({
      x: -2.5 + i * 1.2,
      color: ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'][i % 5],
      shape: ['box', 'cylinder', 'box', 'cylinder', 'box'][i % 5],
    }))
  );

  useFrame(({ clock }) => {
    if (!active) return;
    piecesRef.current.forEach(p => {
      p.x += speed * 0.008;
      if (p.x > 3.5) p.x = -3.5;
    });
  });

  return (
    <group position={conveyorPos}>
      {piecesRef.current.map((p, i) => (
        <group key={i} position={[p.x, 0.5, 0]}>
          {p.shape === 'box' ? (
            <mesh castShadow>
              <boxGeometry args={[0.25, 0.25, 0.25]} />
              <meshStandardMaterial color={p.color} metalness={0.4} roughness={0.5} />
            </mesh>
          ) : (
            <mesh castShadow>
              <cylinderGeometry args={[0.12, 0.12, 0.25, 16]} />
              <meshStandardMaterial color={p.color} metalness={0.4} roughness={0.5} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  AGV — Autonomous Guided Vehicle (warehouse robot)                 */
/* ═══════════════════════════════════════════════════════════════════ */

function AGV({ id, path, speed = 1, color = '#0ea5e9', showSensor }) {
  const ref = useRef();
  const sensorRef = useRef();
  const pathIndex = useRef(0);
  const progress = useRef(0);

  useFrame(({ clock }) => {
    if (!ref.current || path.length < 2) return;
    const i = pathIndex.current;
    const next = (i + 1) % path.length;
    progress.current += speed * 0.005;

    if (progress.current >= 1) {
      progress.current = 0;
      pathIndex.current = next;
    }

    const from = path[i];
    const to = path[next];
    ref.current.position.x = from[0] + (to[0] - from[0]) * progress.current;
    ref.current.position.z = from[1] + (to[1] - from[1]) * progress.current;

    // Face movement direction
    const angle = Math.atan2(to[1] - from[1], to[0] - from[0]);
    ref.current.rotation.y = -angle + Math.PI / 2;

    // Sensor cone pulse
    if (sensorRef.current && showSensor) {
      sensorRef.current.material.opacity = 0.08 + Math.sin(clock.getElapsedTime() * 3) * 0.04;
    }
  });

  return (
    <group ref={ref} position={[path[0][0], 0.15, path[0][1]]}>
      {/* Body */}
      <mesh castShadow>
        <boxGeometry args={[0.5, 0.2, 0.7]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Top accent */}
      <mesh position={[0, 0.12, 0]}>
        <boxGeometry args={[0.35, 0.04, 0.5]} />
        <meshStandardMaterial color={color} metalness={0.6} roughness={0.3} emissive={color} emissiveIntensity={0.15} />
      </mesh>
      {/* Wheels */}
      {[[-0.22, -0.25], [0.22, -0.25], [-0.22, 0.25], [0.22, 0.25]].map(([x, z], i) => (
        <mesh key={i} position={[x, -0.1, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 0.05, 12]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
      {/* Status LED */}
      <mesh position={[0, 0.16, 0.2]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
      </mesh>
      {/* ID label */}
      <Text position={[0, 0.18, -0.2]} fontSize={0.06} color="#94a3b8" anchorX="center">
        AGV-{id}
      </Text>
      {/* LIDAR sensor cone */}
      {showSensor && (
        <mesh ref={sensorRef} position={[0, 0.05, 0.6]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.8, 1.5, 16, 1, true]} />
          <meshStandardMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  FACTORY FLOOR                                                     */
/* ═══════════════════════════════════════════════════════════════════ */

function FactoryFloor() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 16]} />
        <meshStandardMaterial color="#0c1220" metalness={0.2} roughness={0.9} />
      </mesh>
      <gridHelper args={[20, 40, '#1e3a5f22', '#0d1b2a22']} position={[0, 0.001, 0]} />
      {/* Safety line markings */}
      {[-3, 3].map(z => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, z]}>
          <planeGeometry args={[14, 0.06]} />
          <meshBasicMaterial color="#eab308" transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  MOTION SEQUENCES (pre-programmed)                                 */
/* ═══════════════════════════════════════════════════════════════════ */

const SEQUENCES = {
  idle: {
    name: 'Idle',
    frames: [
      { joints: [0, 0, 0, 0, 0, 0], gripper: true, duration: 2000 },
    ],
  },
  'pick-place': {
    name: 'Pick & Place',
    frames: [
      { joints: [0, -30, 0, 0, 0, 0], gripper: true, duration: 800 },
      { joints: [-45, -50, -20, 0, -30, 0], gripper: true, duration: 1000 },
      { joints: [-45, -60, -40, 0, -45, 0], gripper: true, duration: 600 },
      { joints: [-45, -60, -40, 0, -45, 0], gripper: false, duration: 400 },
      { joints: [-45, -30, -10, 0, -20, 0], gripper: false, duration: 600 },
      { joints: [45, -30, -10, 0, -20, 0], gripper: false, duration: 1000 },
      { joints: [45, -55, -35, 0, -40, 0], gripper: false, duration: 800 },
      { joints: [45, -55, -35, 0, -40, 0], gripper: true, duration: 400 },
      { joints: [45, -20, 0, 0, 0, 0], gripper: true, duration: 600 },
      { joints: [0, 0, 0, 0, 0, 0], gripper: true, duration: 800 },
    ],
  },
  weld: {
    name: 'Welding',
    frames: [
      { joints: [0, -40, -20, 0, -30, 0], gripper: false, active: false, duration: 600 },
      { joints: [-20, -55, -30, 0, -45, 0], gripper: false, active: true, duration: 400 },
      { joints: [-10, -55, -30, 10, -45, 0], gripper: false, active: true, duration: 500 },
      { joints: [0, -55, -30, -10, -45, 0], gripper: false, active: true, duration: 500 },
      { joints: [10, -55, -30, 10, -45, 0], gripper: false, active: true, duration: 500 },
      { joints: [20, -55, -30, 0, -45, 0], gripper: false, active: true, duration: 500 },
      { joints: [20, -55, -30, 0, -45, 0], gripper: false, active: false, duration: 300 },
      { joints: [0, -20, 0, 0, 0, 0], gripper: false, active: false, duration: 800 },
    ],
  },
  scan: {
    name: '360° Scan',
    frames: [
      { joints: [0, -30, -15, 0, -20, 0], gripper: true, duration: 500 },
      { joints: [60, -30, -15, 0, -20, 60], gripper: true, duration: 800 },
      { joints: [120, -30, -15, 0, -20, 120], gripper: true, duration: 800 },
      { joints: [180, -30, -15, 0, -20, 180], gripper: true, duration: 800 },
      { joints: [240, -45, -25, 0, -30, 240], gripper: true, duration: 800 },
      { joints: [300, -45, -25, 0, -30, 300], gripper: true, duration: 800 },
      { joints: [360, -30, -15, 0, -20, 360], gripper: true, duration: 800 },
      { joints: [0, 0, 0, 0, 0, 0], gripper: true, duration: 600 },
    ],
  },
  dance: {
    name: 'Dance',
    frames: [
      { joints: [0, -20, 0, 0, 0, 0], gripper: true, duration: 300 },
      { joints: [30, -40, -20, 30, -20, 45], gripper: false, duration: 400 },
      { joints: [-30, -40, -20, -30, -20, -45], gripper: true, duration: 400 },
      { joints: [60, -20, -40, 60, -40, 90], gripper: false, duration: 400 },
      { joints: [-60, -20, -40, -60, -40, -90], gripper: true, duration: 400 },
      { joints: [45, -60, -10, 45, -10, 180], gripper: false, duration: 500 },
      { joints: [-45, -60, -10, -45, -10, -180], gripper: true, duration: 500 },
      { joints: [0, -30, -30, 0, -30, 360], gripper: false, duration: 600 },
      { joints: [0, 0, 0, 0, 0, 0], gripper: true, duration: 500 },
    ],
  },
};

const AGV_PATHS = [
  [[4, -4], [4, 4], [6, 4], [6, -4]],
  [[-6, -3], [-6, 5], [-4, 5], [-4, -3]],
  [[5, -6], [-5, -6], [-5, -5], [5, -5]],
];

const JOINT_NAMES = ['Base Rotate', 'Shoulder', 'Elbow', 'Wrist Roll', 'Wrist Pitch', 'Wrist Rotate'];
const JOINT_LIMITS = [
  [-180, 180], [-90, 10], [-120, 0], [-180, 180], [-90, 10], [-360, 360],
];

/* ═══════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                    */
/* ═══════════════════════════════════════════════════════════════════ */

export default function RoboticsApp() {
  const [joints, setJoints] = useState([0, 0, 0, 0, 0, 0]);
  const [gripperOpen, setGripperOpen] = useState(true);
  const [effectorActive, setEffectorActive] = useState(false);
  const [highlightedJoint, setHighlightedJoint] = useState(null);
  const [activeSequence, setActiveSequence] = useState(null);
  const [conveyorActive, setConveyorActive] = useState(true);
  const [conveyorSpeed, setConveyorSpeed] = useState(1);
  const [showAGVs, setShowAGVs] = useState(true);
  const [showSensors, setShowSensors] = useState(true);
  const [manualMode, setManualMode] = useState(true);

  const seqRef = useRef({ frame: 0, timer: 0 });

  // Sequence playback
  useEffect(() => {
    if (!activeSequence) return;
    const seq = SEQUENCES[activeSequence];
    if (!seq) return;

    setManualMode(false);
    seqRef.current = { frame: 0, timer: 0 };

    const tick = () => {
      const s = seqRef.current;
      const frame = seq.frames[s.frame];
      if (!frame) { setActiveSequence(null); setManualMode(true); return; }

      setJoints([...frame.joints]);
      setGripperOpen(frame.gripper);
      setEffectorActive(!!frame.active);

      s.timer = setTimeout(() => {
        s.frame++;
        if (s.frame >= seq.frames.length) {
          if (activeSequence === 'idle') { s.frame = 0; tick(); }
          else { setActiveSequence(null); setManualMode(true); }
        } else { tick(); }
      }, frame.duration);
    };
    tick();

    return () => clearTimeout(seqRef.current.timer);
  }, [activeSequence]);

  const setJoint = (idx, value) => {
    if (!manualMode) return;
    setJoints(j => { const n = [...j]; n[idx] = value; return n; });
  };

  return (
    <div className="relative w-screen h-screen bg-[#020810] overflow-hidden">
      <Canvas camera={{ position: [5, 4, 6], fov: 50 }} shadows>
        <ambientLight intensity={0.2} />
        <directionalLight position={[8, 12, 6]} intensity={0.7} castShadow
          shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <pointLight position={[-4, 5, -4]} intensity={0.3} color="#0ea5e9" />
        <pointLight position={[4, 3, 4]} intensity={0.2} color="#f59e0b" />
        <spotLight position={[0, 8, 0]} angle={0.5} penumbra={0.5} intensity={0.4} castShadow />

        <FactoryFloor />

        {/* Robot arm — centered */}
        <group position={[0, 0, 0]}>
          <RobotArm
            joints={joints}
            gripperOpen={gripperOpen}
            effectorActive={effectorActive}
            highlightedJoint={highlightedJoint}
          />
        </group>

        {/* Conveyor belt */}
        <ConveyorBelt position={[0, 0, -2.5]} length={7} speed={conveyorSpeed} active={conveyorActive} />
        <Workpieces conveyorPos={[0, 0, -2.5]} speed={conveyorSpeed} active={conveyorActive} />

        {/* Second conveyor */}
        <ConveyorBelt position={[0, 0, 2.5]} length={7} speed={conveyorSpeed * 0.7} active={conveyorActive} />

        {/* AGVs */}
        {showAGVs && AGV_PATHS.map((path, i) => (
          <AGV key={i} id={i + 1} path={path} speed={0.6 + i * 0.2}
            color={['#0ea5e9', '#8b5cf6', '#10b981'][i]}
            showSensor={showSensors} />
        ))}

        <OrbitControls enablePan minDistance={3} maxDistance={18}
          maxPolarAngle={Math.PI / 2.05} target={[0, 1, 0]} />
        <Environment preset="warehouse" />
      </Canvas>

      {/* ── Control Panel ── */}
      <div className="fixed top-4 left-4 z-20 bg-black/75 backdrop-blur-xl border border-white/10 rounded-2xl w-[340px] max-h-[calc(100vh-2rem)] overflow-y-auto">
        <div className="p-5 border-b border-white/10">
          <h1 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🤖</span> Robotics Lab
          </h1>
          <p className="text-xs text-gray-500 mt-1">6-DOF arm + production line + AGV fleet</p>
        </div>

        {/* Motion sequences */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Motion Sequence</p>
          <div className="grid grid-cols-5 gap-1.5">
            {Object.entries(SEQUENCES).map(([id, seq]) => (
              <button key={id} onClick={() => setActiveSequence(id)}
                className={`px-2 py-2 rounded-lg text-[10px] font-bold transition-all text-center ${
                  activeSequence === id
                    ? 'bg-cyan-600 text-white ring-1 ring-cyan-400/50'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}>
                {seq.name}
              </button>
            ))}
          </div>
          {activeSequence && (
            <div className="mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[11px] text-cyan-400">Playing: {SEQUENCES[activeSequence].name}</span>
              <button onClick={() => { setActiveSequence(null); setManualMode(true); }}
                className="ml-auto text-[10px] text-gray-500 hover:text-red-400 px-2 py-0.5 rounded bg-white/5 transition-colors">
                Stop
              </button>
            </div>
          )}
        </div>

        {/* Joint angles */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Joint Angles</p>
            {manualMode && (
              <button onClick={() => setJoints([0, 0, 0, 0, 0, 0])}
                className="text-[9px] text-gray-500 hover:text-white px-2 py-0.5 rounded bg-white/5 transition-colors">
                Reset
              </button>
            )}
          </div>
          <div className="space-y-2">
            {JOINT_NAMES.map((name, i) => (
              <div key={i}
                onMouseEnter={() => setHighlightedJoint(i)}
                onMouseLeave={() => setHighlightedJoint(null)}>
                <div className="flex items-center justify-between mb-0.5">
                  <span className={`text-[11px] transition-colors ${highlightedJoint === i ? 'text-amber-400' : 'text-gray-400'}`}>
                    J{i + 1} — {name}
                  </span>
                  <span className="text-[11px] text-gray-500 font-mono w-12 text-right">{Math.round(joints[i])}°</span>
                </div>
                <input type="range"
                  min={JOINT_LIMITS[i][0]} max={JOINT_LIMITS[i][1]} step={1}
                  value={joints[i]}
                  onChange={e => setJoint(i, parseFloat(e.target.value))}
                  disabled={!manualMode}
                  className={`w-full h-1 rounded-full appearance-none cursor-pointer ${manualMode ? 'accent-cyan-500 bg-gray-700' : 'accent-gray-600 bg-gray-800 opacity-50'}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* End effector */}
        <div className="p-4 border-b border-white/10">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">End Effector</p>
          <div className="flex gap-2">
            <button onClick={() => manualMode && setGripperOpen(v => !v)}
              disabled={!manualMode}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                gripperOpen
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-600/20 text-red-400 border border-red-500/30'
              } ${!manualMode ? 'opacity-50' : ''}`}>
              Gripper: {gripperOpen ? 'OPEN' : 'CLOSED'}
            </button>
            <button onClick={() => manualMode && setEffectorActive(v => !v)}
              disabled={!manualMode}
              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                effectorActive
                  ? 'bg-amber-600/20 text-amber-400 border border-amber-500/30'
                  : 'bg-white/5 text-gray-400 border border-transparent'
              } ${!manualMode ? 'opacity-50' : ''}`}>
              Tool: {effectorActive ? 'ACTIVE' : 'OFF'}
            </button>
          </div>
        </div>

        {/* Conveyor + AGV */}
        <div className="p-4 border-b border-white/10 space-y-2.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 font-semibold">Factory</p>
          {[
            { label: 'Conveyor Belt', active: conveyorActive, toggle: () => setConveyorActive(v => !v), color: 'bg-orange-600' },
            { label: 'AGV Fleet', active: showAGVs, toggle: () => setShowAGVs(v => !v), color: 'bg-cyan-600' },
            { label: 'Sensor Cones', active: showSensors, toggle: () => setShowSensors(v => !v), color: 'bg-violet-600' },
          ].map(({ label, active, toggle, color }) => (
            <label key={label} className="flex items-center justify-between cursor-pointer">
              <span className="text-xs text-gray-300">{label}</span>
              <button onClick={toggle}
                className={`w-9 h-5 rounded-full transition-colors flex items-center ${active ? color : 'bg-gray-700'}`}>
                <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-transform mx-0.5 ${active ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
            </label>
          ))}

          {conveyorActive && (
            <div>
              <div className="flex justify-between mb-0.5">
                <span className="text-xs text-gray-400">Belt Speed</span>
                <span className="text-xs text-gray-500 font-mono">{conveyorSpeed.toFixed(1)}x</span>
              </div>
              <input type="range" min={0.2} max={3} step={0.1} value={conveyorSpeed}
                onChange={e => setConveyorSpeed(parseFloat(e.target.value))}
                className="w-full h-1 bg-gray-700 rounded-full appearance-none cursor-pointer accent-orange-500" />
            </div>
          )}
        </div>

        {/* Status readout */}
        <div className="p-4">
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 font-semibold">Status</p>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-cyan-400 font-mono">6</div>
              <div className="text-[8px] text-gray-500">Axes</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-emerald-400 font-mono">{showAGVs ? 3 : 0}</div>
              <div className="text-[8px] text-gray-500">AGVs</div>
            </div>
            <div className="bg-white/5 rounded-lg p-2 text-center">
              <div className="text-sm font-bold text-amber-400 font-mono">
                {manualMode ? 'MAN' : 'AUTO'}
              </div>
              <div className="text-[8px] text-gray-500">Mode</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
