"use client";
// Real WebGL device-frame body, rendered with @react-three/fiber (React Three Fiber) + three.js.
//
// This intentionally renders ONLY the frame's material/lighting/depth -- an original, generic
// "premium smartphone-style" metal+glass shell, not any specific manufacturer's product design.
// The actual screen content (poster/video/controls) stays exactly what it always was: a plain
// DOM layer painted on top by CinematicShowcase.tsx. This canvas paints the bezel behind/around
// it so the whole thing reads as one lit, dimensional object instead of a flat gradient card.
//
// Loaded exclusively via `next/dynamic(..., { ssr:false })` from CinematicShowcase.tsx, and only
// once that section scrolls near the viewport -- see the IntersectionObserver gate there. That
// keeps this chunk (three.js + fiber) out of the initial page bundle entirely.
import { useEffect, useMemo, useRef } from "react";
import type { RefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

// Deliberately no PMREM/environment-map reflections here -- generating one is a real (if
// one-time) GPU cost, and on modest/integrated hardware it's enough to make the whole tab
// stutter right as this section scrolls into view. A few real lights plus `clearcoat` on the
// physical material already read as polished metal/glass without that cost -- see the three
// lights in the exported <Canvas> below.

function FrameMesh({
  orientation,
  accentColor,
  radiusFraction,
  scrollProgress,
}: {
  orientation: "landscape" | "portrait";
  accentColor: string;
  /** corner radius as a fraction (0..0.5) of the frame's shorter side, so it scales exactly
   *  like the DOM version's CSS `borderRadius` does at any size/breakpoint. */
  radiusFraction: number;
  scrollProgress: RefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const rot = useRef({ x: 0, y: 0 });
  const { viewport } = useThree();

  useEffect(() => {
    function onMove(e: MouseEvent) {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame((_, delta) => {
    if (!group.current) return;
    const sp = scrollProgress.current ?? 1;
    // Subtle, continuous depth cue -- a few degrees at most, damped toward the target so mouse
    // jitter and scroll never produce a snap.
    const targetX = 0.05 - sp * 0.045 + mouse.current.y * 0.05;
    const targetY = mouse.current.x * 0.07;
    rot.current.x = THREE.MathUtils.damp(rot.current.x, targetX, 4, delta);
    rot.current.y = THREE.MathUtils.damp(rot.current.y, targetY, 4, delta);
    group.current.rotation.x = rot.current.x;
    group.current.rotation.y = rot.current.y;
  });

  // Box sized in world units to exactly fill the visible frustum at z=0 (R3F's `viewport` is
  // already expressed in those units), so it always matches the surrounding DOM frame's box,
  // portrait or landscape, mobile or desktop, with zero manual tuning per breakpoint.
  const w = Math.max(viewport.width, 0.01);
  const h = Math.max(viewport.height, 0.01);
  const depth = Math.min(w, h) * 0.09;
  // RoundedBoxGeometry throws if radius exceeds half the smallest edge (including depth) --
  // clamp defensively so an unusual aspect ratio can never break the whole canvas.
  const radius = Math.min(Math.min(w, h) * radiusFraction, Math.min(w, h, depth) * 0.48);

  const bodyMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#3a3a40"),
        metalness: 0.92,
        roughness: 0.33,
        clearcoat: 0.55,
        clearcoatRoughness: 0.22,
        emissive: new THREE.Color(accentColor),
        emissiveIntensity: 0.025,
      }),
    [accentColor]
  );

  // Camera-lens depth cue: a raised metal ring + recessed glass lens, genuinely modeled in 3D
  // (not a flat CSS dot) -- positioned near one short edge, the way a front-facing camera sits
  // near the top of a portrait device or the side of a landscape one.
  const lensX = orientation === "portrait" ? 0 : w / 2 - Math.min(w, h) * 0.09;
  const lensY = orientation === "portrait" ? h / 2 - Math.min(w, h) * 0.09 : 0;
  const lensR = Math.min(w, h) * 0.028;

  return (
    <group ref={group}>
      <mesh geometry={useMemo(() => new RoundedBoxGeometry(w, h, depth, 4, radius), [w, h, depth, radius])} material={bodyMat} />
      <mesh position={[lensX, lensY, depth / 2 + 0.001]}>
        <cylinderGeometry args={[lensR, lensR, depth * 0.4, 32]} />
        <meshPhysicalMaterial color="#111114" metalness={0.8} roughness={0.35} clearcoat={0.6} />
      </mesh>
      <mesh position={[lensX, lensY, depth / 2 + depth * 0.22]}>
        <cylinderGeometry args={[lensR * 0.52, lensR * 0.52, depth * 0.12, 24]} />
        <meshPhysicalMaterial color="#05050a" metalness={0.2} roughness={0.08} clearcoat={1} />
      </mesh>
    </group>
  );
}

export default function DeviceFrame3D({
  orientation,
  accentColor,
  radiusFraction,
  scrollProgress,
}: {
  orientation: "landscape" | "portrait";
  accentColor: string;
  /** matches the DOM frame's CSS borderRadius, expressed as a fraction (0..0.5) of its shorter side */
  radiusFraction: number;
  /** live 0..1 scroll-entrance progress, read each frame (no React re-render per scroll tick) */
  scrollProgress: RefObject<number>;
}) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 2.4], fov: 32 }}
      style={{ position: "absolute", inset: 0, borderRadius: "inherit", zIndex: 0 }}
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[-2, 2.4, 3]} intensity={1.4} />
      <directionalLight position={[1.5, -1.2, 1.5]} intensity={0.4} color="#cfd6ff" />
      <pointLight position={[2, -1, 2]} intensity={0.35} color="#8fa3ff" />
      <FrameMesh
        orientation={orientation}
        accentColor={accentColor}
        radiusFraction={radiusFraction}
        scrollProgress={scrollProgress}
      />
    </Canvas>
  );
}
