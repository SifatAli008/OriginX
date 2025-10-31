"use client";

import { useCallback, useMemo } from "react";
import Particles from "@tsparticles/react";
import type { Engine, ISourceOptions } from "tsparticles-engine";
import { loadSlim } from "@tsparticles/slim";

type HeroParticlesProps = {
  density?: number; // base particles per area (desktop)
};

export default function HeroParticles({ density = 40 }: HeroParticlesProps) {
  const init = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  // Reduce motion/density for users who prefer it
  const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
  const particleDensity = prefersReduced ? Math.max(12, Math.floor(density * 0.4)) : density;

  const options = useMemo<ISourceOptions>(() => ({
    fullScreen: { enable: false },
    background: { color: { value: "transparent" } },
    fpsLimit: 60,
    detectRetina: true,
    interactivity: {
      detectsOn: "window",
      events: {
        onHover: { enable: true, mode: ["trail", "repulse"] },
        resize: true,
      },
      modes: {
        repulse: { distance: 80, duration: 0.3 },
        trail: { delay: 0.005, quantity: 2, pauseOnStop: true },
      },
    },
    particles: {
      number: {
        density: { enable: true, area: 800 },
        value: particleDensity,
      },
      color: { value: ["#60a5fa", "#a78bfa", "#34d399"] },
      links: {
        enable: !isMobile,
        color: "#60a5fa",
        opacity: 0.18,
        distance: 140,
        width: 1,
      },
      move: {
        enable: true,
        speed: prefersReduced ? 0.6 : 1.2,
        outModes: { default: "out" },
        direction: "none",
      },
      opacity: { value: 0.35 },
      size: { value: { min: 0.5, max: 2.2 } },
      shape: { type: "circle" },
      reduceDuplicates: true,
    },
  }), [particleDensity, prefersReduced]);

  return (
    <Particles id="hero-particles" init={init} options={options} className="absolute inset-0 pointer-events-none" />
  );
}


