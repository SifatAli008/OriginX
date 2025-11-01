"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import HeroVectors from "@/components/visuals/HeroVectors";

type AuthCardProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

// Get initial reduced motion preference
function getInitialReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(getInitialReducedMotion);

  useEffect(() => {
    // Subscribe to reduced motion preference changes
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handleChange = (e: MediaQueryListEvent) => setReduced(e.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const rect = document.body.getBoundingClientRect();
      const x = (e.clientX / rect.width) - 0.5;
      const y = (e.clientY / rect.height) - 0.5;
      setPointer({ x, y });
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 200,
        y: (e.clientY / window.innerHeight - 0.5) * 200,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <motion.div
      className="min-h-screen grid place-items-center px-4 py-12 relative overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      style={{
        background: `
          radial-gradient(circle at 20% 30%, hsl(var(--primary) / 0.08) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, hsl(var(--primary) / 0.05) 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.03) 0%, transparent 50%),
          linear-gradient(to bottom right, hsl(var(--background)), hsl(var(--background))),
          linear-gradient(to top left, hsl(var(--background)), hsl(var(--background) / 0.8))
        `,
      }}
    >
      {/* Multi-layer animated background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Hero Section Vector Effects */}
        <HeroVectors pointer={pointer} reduced={reduced} />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Dotted overlay pattern */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Large animated blobs - Layer 1 */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/12 rounded-full blur-3xl"
          animate={{
            x: [0, 60, 0],
            y: [0, -60, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-3xl"
          animate={{
            x: [0, -60, 0],
            y: [0, 60, 0],
            scale: [1, 0.85, 1],
          }}
          transition={{
            duration: 30,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Medium blobs - Layer 2 */}
        <motion.div
          className="absolute top-1/2 right-1/3 w-[300px] h-[300px] bg-primary/6 rounded-full blur-3xl"
          animate={{
            x: [0, -40, 0],
            y: [0, 40, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />
        <motion.div
          className="absolute bottom-1/3 left-1/3 w-[350px] h-[350px] bg-primary/7 rounded-full blur-3xl"
          animate={{
            x: [0, 40, 0],
            y: [0, -40, 0],
            scale: [1, 0.9, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Small accent blobs */}
        <motion.div
          className="absolute top-1/3 right-1/4 w-[200px] h-[200px] bg-primary/10 rounded-full blur-2xl"
          animate={{
            x: [0, 30, 0],
            y: [0, 30, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
        />
        <motion.div
          className="absolute bottom-1/2 left-1/5 w-[180px] h-[180px] bg-primary/8 rounded-full blur-2xl"
          animate={{
            x: [0, -25, 0],
            y: [0, 25, 0],
            scale: [1, 1.25, 1],
          }}
          transition={{
            duration: 18,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2,
          }}
        />

        {/* Cursor-reactive gradient */}
        <motion.div
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl"
          animate={{
            x: `${mousePosition.x * 0.5}px`,
            y: `${mousePosition.y * 0.5}px`,
          }}
          transition={{
            type: "spring",
            stiffness: 50,
            damping: 20,
          }}
        />

        {/* Animated gradient orbs */}
        <motion.div
          className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-[350px] h-[350px] bg-gradient-to-tr from-primary/8 via-primary/4 to-transparent rounded-full blur-3xl"
          animate={{
            scale: [1, 0.8, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Subtle shine effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent"
          animate={{
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      {/* Back to Home Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="absolute top-6 left-6 z-20"
      >
        <Button
          asChild
          variant="ghost"
          size="sm"
          className={cn(
            "gap-2 text-muted-foreground hover:text-foreground",
            "hover:bg-accent/50 transition-all duration-200",
            "backdrop-blur-sm bg-background/50 border border-border/50",
            "hover:scale-105 active:scale-95"
          )}
        >
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Home</span>
            <Home className="h-4 w-4 sm:hidden" />
          </Link>
        </Button>
      </motion.div>

      <motion.div variants={cardVariants} className="w-full max-w-md mx-auto relative z-10">
        <Card className="shadow-2xl border-border/50 bg-card/95 backdrop-blur-xl">
          {/* Logo Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="pt-8 px-6 pb-4 border-b border-border/50"
          >
            <Link
              href="/"
              className="flex items-center justify-center gap-3 group mb-2"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-colors" />
                <div className="relative bg-primary/10 rounded-lg p-2.5 group-hover:bg-primary/15 transition-all duration-300 group-hover:scale-105">
                  <ShieldCheck className="h-7 w-7 text-primary" strokeWidth={2.5} />
                </div>
              </div>
              <div className="flex flex-col items-start">
                <span className="text-2xl font-bold text-primary tracking-tight transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg">
                  OriginX
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Anti‑Counterfeit Platform
                </span>
              </div>
            </Link>
          </motion.div>

          <CardHeader className="flex flex-col items-start gap-1 pb-6 pt-6">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {title}
              </CardTitle>
            </motion.div>
            {subtitle && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <CardDescription className="text-sm mt-1.5">{subtitle}</CardDescription>
              </motion.div>
            )}
        </CardHeader>
          <CardContent className="pb-8">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {children}
            </motion.div>
          </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );
}


