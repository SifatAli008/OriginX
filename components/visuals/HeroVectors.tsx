"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface HeroVectorsProps {
  pointer: { x: number; y: number };
  reduced?: boolean;
}

export default function HeroVectors({ pointer, reduced = false }: HeroVectorsProps) {
  const [windowSize, setWindowSize] = useState(() => {
    if (typeof window !== "undefined") {
      return { width: window.innerWidth, height: window.innerHeight };
    }
    return { width: 1920, height: 1080 };
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Set mounted state in next tick to avoid setState in effect
    const timer = setTimeout(() => setMounted(true), 0);
    const updateSize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };
    
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  if (!mounted) return null;

  const isMobile = windowSize.width < 640;
  const isTablet = windowSize.width >= 640 && windowSize.width < 1024;
  const gridSize = isMobile ? 18 : isTablet ? 12 : 10;
  const lineOpacity = isMobile ? 0.05 : isTablet ? 0.08 : 0.12;

  return (
    <>
      {/* Animated Mesh Gradient Background */}
      <motion.svg
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: isMobile ? 0.15 : 0.30,
          transformOrigin: "center center"
        }}
        animate={{
          rotate: reduced ? 0 : [0, 360],
        }}
        transition={{
          duration: 120,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <defs>
          <radialGradient id="meshGradient1" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.2" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <radialGradient id="meshGradient2" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.15" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <ellipse cx="20%" cy="30%" rx="30%" ry="30%" fill="url(#meshGradient1)" />
        <ellipse cx="80%" cy="70%" rx="25%" ry="25%" fill="url(#meshGradient2)" />
      </motion.svg>

      {/* Responsive Animated Grid */}
      <motion.svg
        aria-hidden="true"
        viewBox={`0 0 ${windowSize.width} ${windowSize.height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: lineOpacity }}
        animate={{
          x: reduced ? 0 : (pointer.x || 0) * (isMobile ? 10 : 20),
          y: reduced ? 0 : (pointer.y || 0) * (isMobile ? 8 : 15),
        }}
        transition={{
          type: "spring",
          stiffness: 30,
          damping: 20
        }}
      >
        <defs>
          <pattern
            id="animatedGrid"
            x="0"
            y="0"
            width={gridSize}
            height={gridSize}
            patternUnits="userSpaceOnUse"
          >
            <path
              d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={isMobile ? "0.5" : "0.8"}
              opacity="0.4"
            />
          </pattern>
          <linearGradient id="gridGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
            <stop offset="50%" stopColor="currentColor" stopOpacity="0.2" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#animatedGrid)" />
      </motion.svg>

      {/* Animated Vector Lines */}
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 pointer-events-none"
        style={{
          transformOrigin: "center center",
          opacity: isMobile ? 0.12 : 0.20
        }}
        animate={{
          rotate: reduced ? 0 : [0, 5, -5, 0]
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <defs>
          <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#60a5fa" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.3" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        
        {/* Curved connecting lines */}
        <motion.path
          d="M 100 200 Q 300 100, 500 200 T 900 200"
          fill="none"
          stroke="url(#lineGradient1)"
          strokeWidth="1.5"
          strokeDasharray="8,4"
          filter="url(#glow)"
          animate={{
            strokeDashoffset: reduced ? 0 : [0, 20, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.path
          d="M 100 400 Q 300 300, 500 400 T 900 400"
          fill="none"
          stroke="url(#lineGradient2)"
          strokeWidth="1.5"
          strokeDasharray="6,6"
          filter="url(#glow)"
          animate={{
            strokeDashoffset: reduced ? 0 : [0, -20, 0]
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "linear"
          }}
        />
        <motion.path
          d="M 200 100 Q 400 200, 600 100 T 1000 100"
          fill="none"
          stroke="url(#lineGradient1)"
          strokeWidth="1"
          strokeDasharray="10,5"
          opacity="0.6"
          animate={{
            strokeDashoffset: reduced ? 0 : [0, 25, 0]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </motion.svg>

      {/* Animated Wave Pattern */}
      <motion.svg
        aria-hidden="true"
        viewBox="0 0 1440 320"
        preserveAspectRatio="xMidYMid slice"
        className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
        style={{
          opacity: isMobile ? 0.05 : 0.10
        }}
        animate={{
          x: reduced ? 0 : [0, -50, 0]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        <path
          d="M0,160 C320,240 640,80 960,160 C1280,240 1440,80 1440,160 L1440,320 L0,320 Z"
          fill="url(#waveGradient)"
        />
        <motion.path
          d="M0,200 C320,120 640,240 960,200 C1280,120 1440,240 1440,200 L1440,320 L0,320 Z"
          fill="url(#waveGradient)"
          opacity="0.5"
          animate={reduced ? {} : {
            y: [0, -10, 0],
            opacity: [0.5, 0.7, 0.5]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.svg>

      {/* Floating Geometric Vectors - Hidden on mobile for performance */}
      {!isMobile && (
        <>
          <motion.svg
            aria-hidden="true"
            viewBox="0 0 200 200"
            className="absolute top-1/4 left-1/3 w-32 h-32 opacity-15 pointer-events-none"
            style={{
              display: isMobile ? "none" : "block"
            }}
            animate={{
              rotate: reduced ? 0 : [0, 360],
              x: reduced ? 0 : (pointer.x || 0) * (isTablet ? 15 : 20),
              y: reduced ? 0 : (pointer.y || 0) * (isTablet ? 10 : 15)
            }}
            transition={{
              rotate: {
                duration: 20,
                repeat: Infinity,
                ease: "linear"
              },
              x: {
                type: "spring",
                stiffness: 30,
                damping: 20
              },
              y: {
                type: "spring",
                stiffness: 30,
                damping: 20
              }
            }}
          >
            <polygon
              points="100,20 180,60 180,140 100,180 20,140 20,60"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.4"
            />
            <circle cx="100" cy="100" r="30" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
          </motion.svg>

          <motion.svg
            aria-hidden="true"
            viewBox="0 0 150 150"
            className="absolute bottom-1/3 right-1/4 w-24 h-24 opacity-12 pointer-events-none"
            style={{
              display: isMobile ? "none" : "block"
            }}
            animate={{
              rotate: reduced ? 0 : [360, 0],
              scale: reduced ? 1 : [1, 1.2, 1]
            }}
            transition={{
              rotate: {
                duration: 25,
                repeat: Infinity,
                ease: "linear"
              },
              scale: {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut"
              }
            }}
          >
            <rect x="25" y="25" width="100" height="100" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5" rx="5" />
            <path d="M 75 25 L 100 75 L 75 125 L 50 75 Z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
          </motion.svg>
        </>
      )}

      {/* Particle Trail Effect */}
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${50 + (pointer.x || 0) * 20}% ${50 + (pointer.y || 0) * 20}%, rgba(96,165,250,0.1) 0%, transparent 50%)`,
          mixBlendMode: "screen"
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
    </>
  );
}
