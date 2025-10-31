"use client";

import { Button, Card, CardBody, Chip, Tooltip } from "@heroui/react";
import Link from "next/link";
import { useState } from "react";
import HeroParticles from "@/components/visuals/HeroParticles";
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
  const reduced = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
          {/* Library vector animation */}
          <HeroParticles />
          <motion.div 
            aria-hidden="true"
            animate={{ 
              y: [0, -20, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl opacity-20"
          />
          <motion.div 
            aria-hidden="true"
            animate={{ 
              y: [0, 20, 0],
              scale: [1, 0.9, 1]
            }}
            transition={{ 
              duration: 10, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="absolute bottom-20 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl opacity-30"
          />
          {/* Cursor-reactive liquid blobs */}
          <motion.div
            aria-hidden="true"
            className="absolute -top-16 -left-24 w-[520px] h-[520px] rounded-full bg-gradient-to-br from-primary/25 to-transparent blur-3xl"
            animate={{ x: (pointer.x || 0) * 50, y: (pointer.y || 0) * 40 }}
            transition={{ type: "spring", stiffness: 60, damping: 20, mass: 0.3 }}
          />
          <motion.div
            aria-hidden="true"
            className="absolute -bottom-24 right-0 w-[520px] h-[520px] rounded-full bg-gradient-to-tr from-sky-400/20 to-transparent blur-3xl"
            animate={{ x: (pointer.x || 0) * -40, y: (pointer.y || 0) * -30 }}
            transition={{ type: "spring", stiffness: 60, damping: 20, mass: 0.3 }}
          />
          {/* Subtle vector grid that drifts with cursor */}
          <motion.svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 opacity-[0.08]"
            animate={{ x: (pointer.x || 0) * 15, y: (pointer.y || 0) * 10 }} transition={{ type: "spring", stiffness: 40, damping: 18 }}>
            <defs>
              <pattern id="grid" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M 8 0 L 0 0 0 8" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </motion.svg>
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
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-4 py-2 text-sm text-foreground/90 backdrop-blur-sm"
            >
              <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              <span className="font-medium">AI-Powered Anti-Counterfeit Platform</span>
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
              className="mt-6 sm:mt-8 text-foreground/70 text-lg sm:text-xl leading-relaxed max-w-3xl"
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
                as={Link} 
                href="#get-started" 
                color="primary" 
                size="lg" 
                radius="lg"
                endContent={<ArrowRight className="h-5 w-5" />}
                className="font-semibold px-8 text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Get started free
              </Button>
              </div>
              <Button 
                as={Link} 
                href="#features" 
                variant="bordered" 
                size="lg" 
                radius="lg"
                className="font-medium px-8 text-base border-2 hover:bg-foreground/5 transition-all duration-300"
              >
                See how it works
              </Button>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-foreground/60"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Free for 100 products</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span>Setup in minutes</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Flow */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <Chip color="primary" variant="flat" className="mb-4" startContent={<Route className="h-3.5 w-3.5" />}>
            Process Flow
          </Chip>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            How OriginX Works
          </h2>
          <p className="mt-4 text-foreground/70 text-lg max-w-2xl mx-auto">
            Four simple steps from product registration to authenticity verification
          </p>
        </motion.div>
        <HowItWorksFlow />
      </section>

      {/* Features Section */}
      <section id="features" aria-labelledby="features-heading" className="mx-auto max-w-6xl px-4 py-20 sm:py-28 scroll-mt-24 sm:scroll-mt-28">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="text-center mb-12"
        >
          <Chip color="primary" variant="flat" className="mb-4" startContent={<Zap className="h-3.5 w-3.5" />}>
            Core Features
          </Chip>
          <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold tracking-tight">
            Everything you need to fight counterfeits
          </h2>
          <p className="mt-4 text-foreground/70 text-lg max-w-2xl mx-auto">
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
            <motion.div key={f.title} variants={fadeInUp}>
              <Card
                radius="lg"
                tabIndex={0}
                className="glass-card glass--medium transition-all duration-300 hover:-translate-y-2 hover:border-primary/60 group h-full cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
              <CardBody className="gap-4 p-6 glass-content">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 group-hover:scale-110">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <Chip size="sm" variant="flat" color="primary" className="w-fit group-hover:scale-105 transition-transform duration-300">{f.tag}</Chip>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">{f.title}</h3>
                <p className="text-foreground/70 text-sm leading-6">{f.body}</p>
              </CardBody>
              </Card>
            </motion.div>
          );
          })}
        </motion.div>
      </section>

      {/* Roles Section */}
      <section id="roles" aria-labelledby="roles-heading" className="bg-gradient-to-b from-foreground/[0.02] to-foreground/[0.05] relative overflow-hidden scroll-mt-24 sm:scroll-mt-28">
        {/* Decorative element */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
        
        <div className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <div className="text-center mb-12">
            <Chip color="primary" variant="flat" className="mb-4" startContent={<Users className="h-3.5 w-3.5" />}>
              User Roles
            </Chip>
            <h2 id="roles-heading" className="text-3xl sm:text-4xl font-bold tracking-tight">
              Built for every stakeholder
            </h2>
            <p className="mt-4 text-foreground/70 text-lg max-w-2xl mx-auto">
              Tailored experiences for each role in your supply chain ecosystem.
            </p>
          </div>
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { role: "SME/Supplier", desc: "Register products, print QR, manage batches." },
              { role: "Warehouse", desc: "Inbound/outbound, transfers, QC, handovers." },
              { role: "Auditor", desc: "Journey visualization and verification history." },
              { role: "Admin", desc: "Users, roles, suppliers, policies, analytics." },
            ].map((r) => (
              <Card key={r.role} radius="lg" tabIndex={0} className="glass-card glass--medium transition-all duration-300 hover:scale-105 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 group cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                <CardBody className="p-5 glass-content">
                  <h3 className="font-semibold text-foreground text-base group-hover:text-primary transition-colors duration-300">{r.role}</h3>
                  <p className="text-foreground/70 text-sm mt-2 leading-6 group-hover:text-foreground/90 transition-colors duration-300">{r.desc}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why OriginX */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <Chip color="primary" variant="flat" className="mb-4" startContent={<ShieldCheck className="h-3.5 w-3.5" />}>
              Why OriginX
            </Chip>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Built specifically for Bangladesh SMEs</h2>
            <p className="mt-4 text-foreground/70 text-lg max-w-2xl mx-auto">
              Addressing local challenges with proven technology and affordable solutions.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
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
                <Card key={item.title} radius="lg" tabIndex={0} className="glass-card glass--medium transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 group cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                  <CardBody className="gap-4 p-6 glass-content">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 text-primary group-hover:from-primary group-hover:to-primary/80 group-hover:text-white group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                      <Icon className="h-7 w-7" />
                    </div>
                <h3 className="text-xl font-semibold group-hover:text-primary transition-colors duration-300 glass-text">{item.title}</h3>
                <p className="text-foreground/70 text-sm leading-6 group-hover:text-foreground/90 transition-colors duration-300 glass-text">{item.desc}</p>
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="bg-gradient-to-b from-foreground/[0.02] to-background py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <div className="text-center mb-12">
            <Chip color="primary" variant="flat" className="mb-4" startContent={<Package className="h-3.5 w-3.5" />}>
              Use Cases
            </Chip>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">Protecting diverse industries across Bangladesh</h2>
            <p className="mt-4 text-foreground/70 text-lg max-w-2xl mx-auto">
              From pharmaceuticals to textiles, OriginX adapts to your industry needs.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { industry: "Pharmaceuticals", challenge: "Combat fake medicines", solution: "Tamper-evident packaging with instant authenticity verification" },
              { industry: "Auto Parts", challenge: "Prevent counterfeit components", solution: "Supply chain tracking from factory to garage" },
              { industry: "Electronics", challenge: "Verify warranty claims", solution: "Digital certificates tied to immutable records" },
              { industry: "Textiles & Garments", challenge: "Protect brand reputation", solution: "QR codes on labels for customer verification" },
              { industry: "Food & Beverage", challenge: "Ensure product safety", solution: "Batch tracking with expiry and recall management" },
              { industry: "Cosmetics", challenge: "Stop grey market imports", solution: "Geo-fenced distribution monitoring" },
            ].map((useCase) => (
              <Card key={useCase.industry} radius="lg" tabIndex={0} className="glass-card glass--medium transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 group cursor-pointer focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                <CardBody className="gap-4 p-5 glass-content">
                  <Chip size="sm" color="primary" variant="flat" className="w-fit group-hover:scale-105 transition-transform duration-300">{useCase.industry}</Chip>
                  <div>
                    <div className="text-xs font-medium text-foreground/60 mb-1.5 uppercase tracking-wide group-hover:text-primary/80 transition-colors duration-300">Challenge</div>
                    <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors duration-300">{useCase.challenge}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-foreground/60 mb-1.5 uppercase tracking-wide group-hover:text-primary/80 transition-colors duration-300">OriginX Solution</div>
                    <div className="text-sm text-foreground/70 leading-relaxed group-hover:text-foreground/90 transition-colors duration-300">{useCase.solution}</div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Modules Summary */}
      <section id="modules" aria-labelledby="modules-heading" className="mx-auto max-w-6xl px-4 py-20 sm:py-28 scroll-mt-24 sm:scroll-mt-28">
        <div className="text-center mb-12">
          <Chip color="primary" variant="flat" className="mb-4" startContent={<Blocks className="h-3.5 w-3.5" />}>
            Platform Modules
          </Chip>
          <h2 id="modules-heading" className="text-3xl sm:text-4xl font-bold tracking-tight">
            Complete ecosystem for supply chain security
          </h2>
          <p className="mt-4 text-foreground/70 text-lg max-w-2xl mx-auto">
            Integrated modules working together to provide comprehensive protection.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
            <Card key={item.module} radius="lg" tabIndex={0} className="glass-card glass--medium transition-all duration-300 hover:scale-105 hover:border-primary/60 hover:shadow-md hover:shadow-primary/10 group cursor-pointer min-h-[160px] focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background">
              <CardBody className="gap-3 p-5 h-full flex flex-col justify-between glass-content">
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300 glass-text">{item.module}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed group-hover:text-foreground/90 transition-colors duration-300 glass-text">{item.desc}</p>
                <ul className="mt-1 space-y-1 text-xs text-foreground/60">
                  {item.points.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary/60"></span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="get-started" aria-labelledby="cta-heading" className="relative overflow-hidden scroll-mt-24 sm:scroll-mt-28">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-primary/5 to-background"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
        
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
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 mb-6"
            >
              <Sparkles className="h-8 w-8 text-primary" />
            </motion.div>
            
            <h3 id="cta-heading" className="text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to protect your products?
            </h3>
            <p className="text-foreground/70 text-lg mt-4 max-w-2xl mx-auto">
              Join Bangladesh's leading manufacturers in the fight against counterfeits. Start with 100 free products—no credit card required.
            </p>
            
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                as={Link} 
                href="/app/auth/login" 
                color="primary" 
                size="lg"
                radius="lg"
                endContent={<ArrowRight className="h-5 w-5" />}
                className="font-semibold px-8 text-base shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Get started free
              </Button>
              <Button 
                as={Link} 
                href="#features" 
                variant="bordered" 
                size="lg"
                radius="lg"
                className="font-medium px-8 text-base border-2 hover:bg-foreground/5 transition-all duration-300"
              >
                Learn more
              </Button>
            </div>
            
            <p className="mt-8 text-sm text-foreground/60">
              Already have an account?{" "}
              <Link href="/app/auth/login" className="text-primary font-medium hover:underline">
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


