"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message = "Loading..." }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-black to-black">
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl"></div>
        
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
      </div>

      {/* Logo and Content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center gap-4"
        >
          <Link
            href="/"
            className="flex items-center justify-center gap-3 group"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md group-hover:bg-primary/30 transition-colors" />
              <div className="relative bg-primary/10 rounded-lg p-4 group-hover:bg-primary/15 transition-all duration-300">
                <ShieldCheck className="h-12 w-12 text-primary" strokeWidth={2.5} />
              </div>
            </motion.div>
            <div className="flex flex-col items-start">
              <span className="text-4xl font-bold text-primary tracking-tight transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg">
                OriginX
              </span>
              <span className="text-sm text-gray-400 font-medium">
                Anti‑Counterfeit Platform
              </span>
            </div>
          </Link>

          {/* Loading Spinner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-col items-center gap-4 mt-8"
          >
            <div className="relative">
              <div className="w-12 h-12 border-4 border-gray-800 border-t-primary rounded-full animate-spin"></div>
              <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-primary/30 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }}></div>
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="text-gray-400 text-sm font-medium"
            >
              {message}
            </motion.p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
