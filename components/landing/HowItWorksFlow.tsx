"use client";

import { Card, CardBody } from "@heroui/react";
import { motion } from "framer-motion";
import { ArrowRight, Package, QrCode, Truck, CheckCircle } from "lucide-react";

export default function HowItWorksFlow() {
  const steps = [
    {
      number: "01",
      title: "Register Products",
      description: "Upload product details and generate unique IDs",
      icon: Package,
      color: "from-foreground/90 to-foreground/70"
    },
    {
      number: "02",
      title: "Generate QR Codes",
      description: "Create encrypted, tamper-evident QR codes",
      icon: QrCode,
      color: "from-foreground/90 to-foreground/70"
    },
    {
      number: "03",
      title: "Track Movement",
      description: "Monitor supply chain with digital signatures",
      icon: Truck,
      color: "from-foreground/90 to-foreground/70"
    },
    {
      number: "04",
      title: "Verify Authenticity",
      description: "AI-powered verification with instant results",
      icon: CheckCircle,
      color: "from-foreground/90 to-foreground/70"
    }
  ];

  return (
    <div className="relative">
      {/* Desktop Flow */}
      <div className="hidden md:flex items-stretch justify-between gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.number} className="flex items-stretch flex-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="flex-1 w-full"
              >
                <Card radius="lg" className="glass-card glass--medium transition-all duration-300 group cursor-default relative h-full min-h-[280px]">
                  <CardBody className="p-6 pt-10 pb-8 flex flex-col items-center text-center gap-4 h-full glass-content">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-background shadow-lg flex-shrink-0`}>
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="flex flex-col gap-3 flex-1 justify-center items-center">
                    <h3 className="font-bold text-lg leading-tight px-2 w-full glass-text">{step.title}</h3>
                    <p className="text-sm text-foreground/70 leading-relaxed px-2 w-full glass-text">{step.description}</p>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
              
              {index < steps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 + 0.1 }}
                  className="px-4 flex items-center select-none"
                >
                  <ArrowRight className="h-6 w-6 text-primary" />
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Flow */}
      <div className="md:hidden space-y-6">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.number} className="relative">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <Card radius="lg" className="glass-card glass--medium">
                  <CardBody className="p-5 flex items-start gap-4 glass-content">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-background shadow-md flex-shrink-0`}>
                      <Icon className="h-7 w-7" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <h3 className="font-bold text-base leading-tight">{step.title}</h3>
                      </div>
                      <p className="text-sm text-foreground/70 leading-relaxed">{step.description}</p>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
              
              {index < steps.length - 1 && (
                <div className="flex justify-center py-3 select-none">
                  <ArrowRight className="h-6 w-6 text-primary rotate-90" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

