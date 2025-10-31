"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useState, useEffect } from "react";
import HeroParticles from "@/components/visuals/HeroParticles";
import HeroVectors from "@/components/visuals/HeroVectors";
import { motion } from "framer-motion";
import Navbar from "@/components/site/Navbar";
import Footer from "@/components/site/Footer";
import HowItWorksFlow from "@/components/landing/HowItWorksFlow";
import { 
  ShieldCheck, 
  QrCode, 
  Bot, 
  Route, 
  Blocks, 
  BarChart3,
  CheckCircle2,
  TrendingUp,
  Users,
  Package,
  ArrowRight,
  Sparkles,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.6 }
  }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.6 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.5 }
  }
};

export default function LandingPage() {
  const [pointer, setPointer] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [reduced, setReduced] = useState(false);

  // Check for reduced motion preference
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduced(mediaQuery.matches);
      
      const handleChange = (e: MediaQueryListEvent) => setReduced(e.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);
  const features = [
    {
      title: "Product registration",
      body: "Onboard SKUs with unique IDs, batch uploads, and rich metadata synced to Firebase and Cloudinary.",
      tag: "Products",
      icon: ShieldCheck,
    },
    {
      title: "Encrypted QR",
      body: "Bind tamper-evident QR codes using AES-256 payloads and printable assets ready for packaging.",
      tag: "QR",
      icon: QrCode,
    },
    {
      title: "AI verification",
      body: "Score product scans with explainable AI so auditors see verdicts, reasons, and escalation actions.",
      tag: "AI",
      icon: Bot,
    },
    {
      title: "Movements",
      body: "Track shipments, handovers, and QC events across warehouses with digital signatures.",
      tag: "Logistics",
      icon: Route,
    },
    {
      title: "Transactions",
      body: "Review an append-only ledger with hash, block, and status to mirror blockchain governance.",
      tag: "Ledger",
      icon: Blocks,
    },
    {
      title: "Analytics",
      body: "Monitor KPIs, fraud alerts, and supplier performance with role-aware dashboards.",
      tag: "Analytics",
      icon: BarChart3,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main id="main" className="flex-1">
      {/* Hero Section */}
      <section id="hero" aria-labelledby="hero-heading" className="relative overflow-hidden bg-gradient-to-b from-primary/[0.03] via-background to-background"
        onMouseMove={(e) => {
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const x = (e.clientX - rect.left) / rect.width - 0.5;
          const y = (e.clientY - rect.top) / rect.height - 0.5;
          setPointer({ x, y });
        }}
      >
        {/* Decorative background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Enhanced vector animations */}
          <HeroVectors pointer={pointer} reduced={reduced} />
          
          {/* Enhanced particle system */}
          <HeroParticles density={60} />
          
          {/* Animated gradient orbs */}
          <motion.div 
            aria-hidden="true"
            animate={{ 
              y: [0, -30, 0],
              rotate: [0, 180, 360],
              scale: [1, 1.15, 1]
            }}
            transition={{ 
              duration: 12, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute top-20 right-20 w-80 h-80 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl opacity-25"
          />
          <motion.div 
            aria-hidden="true"
            animate={{ 
              y: [0, 30, 0],
              rotate: [360, 180, 0],
              scale: [1, 0.85, 1]
            }}
            transition={{ 
              duration: 15, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 2
            }}
            className="absolute bottom-20 left-20 w-96 h-96 bg-gradient-to-tl from-primary/15 via-primary/5 to-transparent rounded-full blur-3xl opacity-30"
          />
          <motion.div 
            aria-hidden="true"
            animate={{ 
              x: [0, 50, 0],
              y: [0, -40, 0],
              rotate: [0, 90, 180],
              scale: [1, 1.2, 1]
            }}
            transition={{ 
              duration: 18, 
              repeat: Infinity, 
              ease: "easeInOut",
              delay: 1
            }}
            className="absolute top-1/2 left-1/4 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-primary/5 rounded-full blur-3xl opacity-20"
          />
          
          {/* Enhanced cursor-reactive liquid blobs */}
          <motion.div
            aria-hidden="true"
            className="absolute -top-16 -left-24 w-[600px] h-[600px] rounded-full bg-gradient-to-br from-primary/30 via-primary/15 to-transparent blur-3xl"
            animate={{ 
              x: (pointer.x || 0) * 60, 
              y: (pointer.y || 0) * 50,
            }}
            transition={{ 
              type: "spring", 
              stiffness: 50, 
              damping: 25, 
              mass: 0.4 
            }}
            style={{
              scale: 1 + Math.abs(pointer.x || 0) * 0.1 + Math.abs(pointer.y || 0) * 0.05
            }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute -bottom-24 right-0 w-[550px] h-[550px] rounded-full bg-gradient-to-tr from-purple-500/25 via-sky-400/15 to-transparent blur-3xl"
            animate={{ 
              x: (pointer.x || 0) * -50, 
              y: (pointer.y || 0) * -40,
            }}
            transition={{ 
              type: "spring", 
              stiffness: 50, 
              damping: 25, 
              mass: 0.4 
            }}
            style={{
              scale: 1 + Math.abs(pointer.x || 0) * 0.08 + Math.abs(pointer.y || 0) * 0.07
            }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute top-1/2 right-1/4 w-[480px] h-[480px] rounded-full bg-gradient-to-bl from-green-400/15 via-primary/10 to-transparent blur-3xl"
            animate={{ 
              x: (pointer.x || 0) * 30, 
              y: (pointer.y || 0) * -35,
            }}
            transition={{ 
              type: "spring", 
              stiffness: 40, 
              damping: 20, 
              mass: 0.5
            }}
            style={{
              rotate: (pointer.x || 0) * 90 + (pointer.y || 0) * 90
            }}
          />
          
        </div>
        
        <div className="relative mx-auto max-w-6xl px-4 pt-24 sm:pt-32 pb-20 sm:pb-28">
          {/* Cursor spotlight */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-40 opacity-60 mix-blend-screen"
            animate={{ x: (pointer.x || 0) * (reduced ? 0 : 80), y: (pointer.y || 0) * (reduced ? 0 : 60) }}
            transition={{ type: "spring", stiffness: 50, damping: 18 }}
            style={{
              background:
                "radial-gradient(220px 220px at center, rgba(96,165,250,0.22), rgba(96,165,250,0.08) 40%, transparent 60%)",
              willChange: "transform",
            }}
          />

          <motion.div
            className="flex flex-col items-center text-center will-change-transform"
            animate={{ rotateX: (pointer.y || 0) * (reduced ? 0 : -4), rotateY: (pointer.x || 0) * (reduced ? 0 : 6) }}
            transition={{ type: "spring", stiffness: 60, damping: 20 }}
          >
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-primary/15 via-primary/10 to-primary/15 border border-primary/30 px-5 py-2.5 text-sm font-medium backdrop-blur-md shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 hover:scale-105 hover:border-primary/40 group"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                <Sparkles className="h-4 w-4 text-primary" />
              </motion.div>
              <span className="text-foreground font-medium group-hover:text-primary transition-colors duration-300 whitespace-nowrap">
                AI-Powered Anti-Counterfeit Platform
              </span>
            </motion.div>
            
            <motion.div className="relative">
            {/* Scrim behind the heading for readability */}
            <span aria-hidden className="pointer-events-none absolute -inset-x-6 -inset-y-3 rounded-xl bg-gradient-to-b from-background/40 to-transparent blur-md"></span>
            <motion.h1 
              id="hero-heading" 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-8 max-w-5xl text-4xl leading-tight sm:text-6xl md:text-7xl font-bold tracking-tight shimmer-text"
            >
              Stop Counterfeits.<br/>
              Protect Your Brand.
            </motion.h1>
            </motion.div>
            
            <motion.p 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-6 sm:mt-8 text-muted-foreground text-lg sm:text-xl leading-relaxed max-w-3xl font-light"
            >
              Enterprise-grade supply chain security for Bangladesh SMEs. Register products, generate encrypted QR codes, track movements, and verify authenticity with AI—all in one platform.
            </motion.p>
            
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-4"
            >
              <div className="relative">
                {/* Pulse ring behind CTA */}
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -z-10 rounded-lg shadow-[0_0_0_0_rgba(59,130,246,0.4)]"
                  animate={reduced ? {} : { boxShadow: [
                    "0 0 0 0 rgba(59,130,246,0.35)",
                    "0 0 0 12px rgba(59,130,246,0)",
                    "0 0 0 0 rgba(59,130,246,0.0)"
                  ]}}
                  transition={{ duration: 2.2, repeat: Infinity }}
                />
              <Button 
                asChild
                size="lg" 
                className={cn(
                  "font-semibold px-8 text-base shadow-lg",
                  "hover:shadow-xl hover:shadow-primary/25",
                  "transition-all duration-300 hover:scale-105",
                  "relative overflow-hidden",
                  "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/0 before:via-primary/10 before:to-primary/0",
                  "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
                )}
              >
                <Link href="/login">
                  <span className="relative z-10 flex items-center gap-2">
                Get started free
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </Link>
              </Button>
              </div>
              <Button 
                asChild
                variant="outline"
                size="lg" 
                className={cn(
                  "font-medium px-8 text-base border-2",
                  "hover:bg-accent hover:border-primary/50",
                  "transition-all duration-300 hover:scale-105",
                  "relative overflow-hidden group",
                  "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/0 before:via-primary/5 before:to-primary/0",
                  "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-500"
                )}
              >
                <Link href="#features" className="relative z-10 flex items-center gap-2">
                See how it works
                  <motion.span
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ArrowRight className="h-5 w-5" />
                  </motion.span>
                </Link>
              </Button>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm"
            >
              {[
                { text: "No credit card required", delay: 0 },
                { text: "Free for 100 products", delay: 0.1 },
                { text: "Setup in minutes", delay: 0.2 }
              ].map((item, idx) => (
                <motion.div
                  key={item.text}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 + item.delay }}
                  className="flex items-center gap-2.5 group"
                >
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 360 }}
                    transition={{ duration: 0.5 }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-primary group-hover:text-primary/80 transition-colors" />
                  </motion.div>
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                    {item.text}
                  </span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Flow */}
      <section className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent pointer-events-none" />
        {/* Section divider */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        <div className="relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-6 gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider hover:scale-105 transition-transform duration-300">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Route className="h-3.5 w-3.5" />
              </motion.div>
            Process Flow
            </Badge>
          </motion.div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-4 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            How OriginX Works
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Four simple steps from product registration to authenticity verification
          </p>
        </motion.div>
        <div className="mt-12">
        <HowItWorksFlow />
        </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" aria-labelledby="features-heading" className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 scroll-mt-24 sm:scroll-mt-28 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        {/* Section divider */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <div className="relative z-10">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-6 gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider hover:scale-105 transition-transform duration-300">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Zap className="h-3.5 w-3.5 text-primary" />
              </motion.div>
            Core Features
            </Badge>
          </motion.div>
          <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold tracking-tight mt-4 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            Everything you need to fight counterfeits
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            From product registration to AI-powered verification, OriginX provides end-to-end protection for your supply chain.
          </p>
        </motion.div>
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((f) => {
            const Icon = f.icon;
            return (
            <motion.div 
              key={f.title} 
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              transition={{ duration: 0.3 }}
            >
              <Card
                tabIndex={0}
                className={cn(
                  "liquid-card h-full cursor-pointer",
                  "border-2 border-border/40 backdrop-blur-xl",
                  "hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/25",
                  "group relative overflow-hidden",
                  "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                )}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
                  e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
                }}
                onMouseLeave={(e) => {
                  // Reset to center for smooth exit
                  e.currentTarget.style.setProperty('--mouse-x', '50%');
                  e.currentTarget.style.setProperty('--mouse-y', '50%');
                }}
              >
              <CardContent className="gap-4 p-6 relative z-10">
                <div className="flex items-center gap-3">
                  <motion.span 
                    className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </motion.span>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Badge variant="secondary" className="text-xs font-semibold uppercase tracking-wider">
                      {f.tag}
                    </Badge>
                  </motion.div>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-6">{f.body}</p>
              </CardContent>
              </Card>
            </motion.div>
          );
          })}
        </motion.div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" aria-labelledby="roles-heading" className="relative bg-gradient-to-b from-foreground/[0.02] via-foreground/[0.03] to-foreground/[0.05] overflow-hidden scroll-mt-24 sm:scroll-mt-28">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(59,130,246,0.05),transparent_50%)] pointer-events-none" />
        
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 z-10">
          <motion.div 
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-6 gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider hover:scale-105 transition-transform duration-300">
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Users className="h-3.5 w-3.5" />
                </motion.div>
              User Roles
              </Badge>
            </motion.div>
            <h2 id="roles-heading" className="text-3xl sm:text-4xl font-bold tracking-tight mt-4 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
              Built for every stakeholder
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Tailored experiences for each role in your supply chain ecosystem.
            </p>
          </motion.div>
          <motion.div 
            className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              { role: "SME/Supplier", desc: "Register products, print QR, manage batches." },
              { role: "Warehouse", desc: "Inbound/outbound, transfers, QC, handovers." },
              { role: "Auditor", desc: "Journey visualization and verification history." },
              { role: "Admin", desc: "Users, roles, suppliers, policies, analytics." },
            ].map((r) => (
              <motion.div key={r.role} variants={fadeInUp}>
                <Card 
                  tabIndex={0} 
                  className={cn(
                    "liquid-card cursor-pointer group relative",
                    "border-2 border-border/40 backdrop-blur-xl",
                    "hover:scale-105 hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/25",
                    "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                  )}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
                    e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.setProperty('--mouse-x', '50%');
                    e.currentTarget.style.setProperty('--mouse-y', '50%');
                  }}
                >
                  <CardContent className="p-5 relative z-10">
                  <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors duration-300">{r.role}</h3>
                    <p className="text-muted-foreground text-sm mt-2 leading-6 group-hover:text-foreground/90 transition-colors duration-300">{r.desc}</p>
                  </CardContent>
              </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Why OriginX */}
      <section className="relative py-20 sm:py-28 overflow-hidden">
        {/* Enhanced background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/2 to-background pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.06),transparent_60%)] pointer-events-none" />
        {/* Section divider */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 z-10">
          <motion.div 
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-6 gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider hover:scale-105 transition-transform duration-300">
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                </motion.div>
              Why OriginX
              </Badge>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-4 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">Built specifically for Bangladesh SMEs</h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              Addressing local challenges with proven technology and affordable solutions.
            </p>
          </motion.div>
          <motion.div 
            className="grid md:grid-cols-2 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              { 
                title: "Low-Cost Implementation", 
                desc: "No expensive hardware or blockchain nodes required. Works with existing smartphones and infrastructure.",
                icon: TrendingUp
              },
              { 
                title: "Offline-First Design", 
                desc: "Critical verification functions work without constant internet connectivity, perfect for warehouse environments.",
                icon: CheckCircle2
              },
              { 
                title: "Bangla Language Support", 
                desc: "Full interface available in Bangla for local teams and workers, with English for international auditors.",
                icon: Users
              },
              { 
                title: "Compliance Ready", 
                desc: "Built-in support for Bangladesh customs, export documentation, and local regulatory requirements.",
                icon: ShieldCheck
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <motion.div key={item.title} variants={fadeInUp} whileHover={{ y: -4 }}>
                  <Card 
                    tabIndex={0} 
                    className={cn(
                      "liquid-card cursor-pointer group relative",
                      "border-2 border-border/40 backdrop-blur-xl",
                      "hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/25",
                      "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                    )}
                    onMouseMove={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
                      e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.setProperty('--mouse-x', '50%');
                      e.currentTarget.style.setProperty('--mouse-y', '50%');
                    }}
                  >
                    <CardContent className="gap-4 p-6 relative z-10">
                      <motion.div 
                        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary group-hover:from-primary group-hover:to-primary/80 group-hover:text-primary-foreground transition-all duration-300"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                      <Icon className="h-7 w-7" />
                      </motion.div>
                      <h3 className="text-xl font-semibold group-hover:text-primary transition-colors duration-300">{item.title}</h3>
                      <p className="text-muted-foreground text-sm leading-6 group-hover:text-foreground/90 transition-colors duration-300">{item.desc}</p>
                    </CardContent>
                </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="relative bg-gradient-to-b from-foreground/[0.02] via-foreground/[0.03] to-background py-20 sm:py-28 overflow-hidden">
        {/* Enhanced background elements */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_70%,rgba(147,51,234,0.06),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.04),transparent_50%)] pointer-events-none" />
        {/* Section divider */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        <div className="relative mx-auto max-w-6xl px-4 z-10">
          <motion.div 
            className="text-center mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-6 gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider hover:scale-105 transition-transform duration-300">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Package className="h-3.5 w-3.5 text-primary" />
                </motion.div>
              Use Cases
              </Badge>
            </motion.div>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mt-4 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">Protecting diverse industries across Bangladesh</h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
              From pharmaceuticals to textiles, OriginX adapts to your industry needs.
            </p>
          </motion.div>
          <motion.div 
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            {[
              { industry: "Pharmaceuticals", challenge: "Combat fake medicines", solution: "Tamper-evident packaging with instant authenticity verification" },
              { industry: "Auto Parts", challenge: "Prevent counterfeit components", solution: "Supply chain tracking from factory to garage" },
              { industry: "Electronics", challenge: "Verify warranty claims", solution: "Digital certificates tied to immutable records" },
              { industry: "Textiles & Garments", challenge: "Protect brand reputation", solution: "QR codes on labels for customer verification" },
              { industry: "Food & Beverage", challenge: "Ensure product safety", solution: "Batch tracking with expiry and recall management" },
              { industry: "Cosmetics", challenge: "Stop grey market imports", solution: "Geo-fenced distribution monitoring" },
            ].map((useCase) => (
              <motion.div key={useCase.industry} variants={fadeInUp} whileHover={{ y: -4 }}>
                <Card 
                  tabIndex={0} 
                  className={cn(
                    "liquid-card cursor-pointer group relative",
                    "border-2 border-border/40 backdrop-blur-xl",
                    "hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/25",
                    "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                  )}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
                    e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.setProperty('--mouse-x', '50%');
                    e.currentTarget.style.setProperty('--mouse-y', '50%');
                  }}
                >
                  <CardContent className="gap-4 p-5 relative z-10">
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Badge variant="secondary" className="w-fit text-xs font-semibold uppercase tracking-wider">{useCase.industry}</Badge>
                    </motion.div>
                  <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide group-hover:text-primary/80 transition-colors duration-300">Challenge</div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-300">{useCase.challenge}</div>
                  </div>
                  <div>
                      <div className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide group-hover:text-primary/80 transition-colors duration-300">OriginX Solution</div>
                      <div className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/90 transition-colors duration-300">{useCase.solution}</div>
                  </div>
                  </CardContent>
              </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Modules Summary */}
      <section id="modules" aria-labelledby="modules-heading" className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 scroll-mt-24 sm:scroll-mt-28 overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/4 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)] pointer-events-none" />
        {/* Section divider */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
        <motion.div 
          className="text-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="secondary" className="mb-6 gap-1.5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider hover:scale-105 transition-transform duration-300">
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <Blocks className="h-3.5 w-3.5 text-primary" />
              </motion.div>
            Platform Modules
            </Badge>
          </motion.div>
          <h2 id="modules-heading" className="text-3xl sm:text-4xl font-bold tracking-tight mt-4 bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            Complete ecosystem for supply chain security
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
            Integrated modules working together to provide comprehensive protection.
          </p>
        </motion.div>
        <motion.div 
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
        >
          {[
            { module: "Authentication", desc: "Multi-factor auth with role-based access control", points: ["OTP/email/passwordless", "RBAC & granular permissions", "SSO-ready (Google/Okta)"] },
            { module: "Products", desc: "Register, manage, and track your inventory", points: ["Bulk import (CSV/Excel)", "Batches & variants", "Cloudinary media attachments"] },
            { module: "QR System", desc: "Generate and bind tamper-evident QR codes", points: ["AES-256 encrypted payloads", "Print-ready assets", "Duplicate detection"] },
            { module: "Verification", desc: "AI-powered authenticity checks with scoring", points: ["Explainable results", "Escalation workflows", "Geo/time consistency checks"] },
            { module: "Movements", desc: "Track shipments and handovers across locations", points: ["Digital signatures", "Inbound/Outbound/Transfer", "Audit trail per item"] },
            { module: "Blockchain", desc: "Immutable transaction log with hash verification", points: ["Append-only ledger", "Tamper checks", "Anchor to external chain (optional)"] },
            { module: "Analytics", desc: "Real-time KPIs and performance dashboards", points: ["Fraud hotspots", "Supplier scorecards", "Export charts/CSV"] },
            { module: "Reports", desc: "Generate compliance and audit reports", points: ["PDF export", "Custom templates", "Scheduled emails"] },
            { module: "API", desc: "Integrate with your existing systems", points: ["REST endpoints", "Webhooks", "API keys & rate limits"] },
          ].map((item) => (
            <motion.div key={item.module} variants={fadeInUp} whileHover={{ scale: 1.02 }}>
              <Card 
                tabIndex={0} 
                className={cn(
                  "liquid-card cursor-pointer group min-h-[160px] relative",
                  "border-2 border-border/40 backdrop-blur-xl",
                  "hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/25",
                  "focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
                )}
                onMouseMove={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
                  e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.setProperty('--mouse-x', '50%');
                  e.currentTarget.style.setProperty('--mouse-y', '50%');
                }}
              >
                <CardContent className="gap-3 p-5 h-full flex flex-col justify-between relative z-10">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300">{item.module}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed group-hover:text-foreground/90 transition-colors duration-300">{item.desc}</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {item.points.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 flex-shrink-0"></span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                </CardContent>
            </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* CTA */}
      <section id="get-started" aria-labelledby="cta-heading" className="relative overflow-hidden scroll-mt-24 sm:scroll-mt-28">
        {/* Enhanced gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/8 to-background"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.12),transparent_70%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(147,51,234,0.08),transparent_60%)]"></div>
        {/* Animated grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(59,130,246,0.03)_50%,transparent_100%)] bg-[size:200%_100%] animate-[shimmer_8s_linear_infinite]"></div>
        
        <div className="relative mx-auto max-w-4xl px-4 py-20 sm:py-28">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center"
          >
            <motion.div 
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.15, 1]
              }}
              transition={{ 
                duration: 4, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 mb-8 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow duration-300"
            >
              <Sparkles className="h-10 w-10 text-primary" />
            </motion.div>
            
            <h3 id="cta-heading" className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
              Ready to protect your products?
            </h3>
            <p className="text-muted-foreground text-lg sm:text-xl mt-6 max-w-2xl mx-auto leading-relaxed font-light">
              Join Bangladesh's leading manufacturers in the fight against counterfeits. Start with 100 free products—no credit card required.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                asChild
                size="lg"
                className={cn(
                  "font-semibold px-8 text-base shadow-lg",
                  "hover:shadow-xl hover:shadow-primary/25",
                  "transition-all duration-300 hover:scale-105",
                  "relative overflow-hidden",
                  "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/0 before:via-primary/10 before:to-primary/0",
                  "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
                )}
              >
                <Link href="/login">
                  <span className="relative z-10 flex items-center gap-2">
                Get started free
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </Link>
              </Button>
              <Button 
                asChild
                variant="outline"
                size="lg"
                className={cn(
                  "font-medium px-8 text-base border-2",
                  "hover:bg-accent hover:border-primary/50",
                  "transition-all duration-300 hover:scale-105"
                )}
              >
                <Link href="#features">Learn more</Link>
              </Button>
            </div>
            
            <p className="mt-8 text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </section>

      </main>

      <Footer />
    </div>
  );
}


