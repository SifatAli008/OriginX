"use client";

import { useCallback, useMemo } from "react";
import Particles from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";

type HeroParticlesProps = {
  density?: number; // base particles per area (desktop)
};

export default function HeroParticles({ density = 40 }: HeroParticlesProps) {
  const init = useCallback(async (engine: unknown) => {
    // Type mismatch between tsparticles-engine and @tsparticles/engine
    await loadSlim(engine as Parameters<typeof loadSlim>[0]);
  }, []);

  // Reduce motion/density for users who prefer it
  const prefersReduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isMobile = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
  const particleDensity = prefersReduced ? Math.max(12, Math.floor(density * 0.4)) : density;

  const options = useMemo(() => ({
    fullScreen: { enable: false },
    background: { color: { value: "transparent" } },
    fpsLimit: 120,
    detectRetina: true,
    interactivity: {
      detectsOn: "window" as const,
      events: {
        onHover: { 
          enable: true, 
          mode: ["grab", "trail", "bubble", "repulse"],
          parallax: { enable: true, force: 2, smooth: 10 }
        },
        onClick: { enable: true, mode: ["push", "bubble"] },
        resize: { enable: true },
      },
      modes: {
        grab: { 
          distance: 180, 
          links: { opacity: 0.4, blink: true },
          lineLinked: { opacity: 0.6 }
        },
        repulse: { 
          distance: 120, 
          duration: 0.4,
          speed: 1,
          factor: 2
        },
        trail: { 
          delay: 0.005, 
          quantity: 3, 
          pauseOnStop: true,
          length: 10
        },
        bubble: {
          distance: 200,
          size: 6,
          duration: 2,
          opacity: 0.3
        },
        push: { quantity: 4 },
      },
    },
    particles: {
      number: {
        density: { enable: true, area: 800 },
        value: particleDensity,
      },
      color: { 
        value: ["#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#f472b6"],
        animation: {
          enable: true,
          speed: 20,
          sync: false
        }
      },
      links: {
        enable: !isMobile,
        color: "#60a5fa",
        opacity: 0.25,
        distance: 150,
        width: 1.2,
        triangles: {
          enable: true,
          opacity: 0.05,
          color: "#a78bfa"
        },
        blink: true,
        consent: false,
        shadow: {
          enable: true,
          blur: 5,
          color: "#3b82f6",
          opacity: 0.2
        }
      },
      move: {
        enable: true,
        speed: prefersReduced ? 0.6 : 1.5,
        outModes: { default: "out" as const },
        direction: "none" as const,
        random: true,
        straight: false,
        attract: {
          enable: true,
          rotate: { x: 300, y: 300 }
        },
        trail: {
          enable: true,
          length: 3,
          fill: { color: { value: "#60a5fa" } }
        },
        vibrate: true,
        warp: true
      },
      opacity: { 
        value: { min: 0.2, max: 0.6 },
        animation: {
          enable: true,
          speed: 1.5,
          minimumValue: 0.2,
          sync: false,
          destroy: "none"
        }
      },
      size: { 
        value: { min: 1, max: 3 },
        animation: {
          enable: true,
          speed: 3,
          minimumValue: 0.5,
          sync: false,
          destroy: "none",
          startValue: "random"
        }
      },
      shape: { 
        type: ["circle", "triangle", "polygon"] as const,
        options: {
          polygon: {
            sides: 6,
            radius: { min: 1, max: 2 }
          }
        }
      },
      reduceDuplicates: true,
      twinkle: {
        particles: {
          enable: true,
          frequency: 0.05,
          opacity: 1
        }
      },
      life: {
        count: 0,
        delay: {
          value: 0,
          sync: false
        },
        duration: {
          value: 0,
          sync: false
        }
      }
    },
  }), [particleDensity, prefersReduced, isMobile]);

  return (
    // @ts-expect-error - Type mismatch between tsparticles-engine and @tsparticles/engine
    <Particles id="hero-particles" init={init} options={options} className="absolute inset-0 pointer-events-none" />
  );
}


