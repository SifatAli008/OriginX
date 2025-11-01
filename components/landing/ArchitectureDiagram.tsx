"use client";

import { Card, CardBody } from "@heroui/react";
import { motion } from "framer-motion";
import { Database, Cloud, Cpu, Lock, Smartphone, Server } from "lucide-react";

export default function ArchitectureDiagram() {
  const layers = [
    {
      title: "Frontend Layer",
      icon: Smartphone,
      color: "from-blue-500 to-blue-600",
      items: ["Next.js Web App", "HeroUI Components", "Real-time Dashboard"]
    },
    {
      title: "Backend Services",
      icon: Server,
      color: "from-purple-500 to-purple-600",
      items: ["Firebase Functions", "REST APIs", "Authentication"]
    },
    {
      title: "AI & Processing",
      icon: Cpu,
      color: "from-green-500 to-green-600",
      items: ["AI Verification Engine", "Image Recognition", "Fraud Detection"]
    },
    {
      title: "Data Layer",
      icon: Database,
      color: "from-orange-500 to-orange-600",
      items: ["Firestore Database", "Cloud Storage", "Blockchain Ledger"]
    },
    {
      title: "Security",
      icon: Lock,
      color: "from-red-500 to-red-600",
      items: ["AES-256 Encryption", "Digital Signatures", "Access Control"]
    },
    {
      title: "Cloud Infrastructure",
      icon: Cloud,
      color: "from-cyan-500 to-cyan-600",
      items: ["Firebase Hosting", "CDN", "Auto-scaling"]
    }
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {layers.map((layer, index) => {
        const Icon = layer.icon;
        return (
          <motion.div
            key={layer.title}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              radius="lg" 
              className="border-2 border-foreground/10 hover:border-primary bg-background transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 h-full group"
            >
              <CardBody className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${layer.color} flex items-center justify-center text-white shadow-md flex-shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base mb-1 group-hover:text-primary transition-colors duration-300">
                      {layer.title}
                    </h3>
                  </div>
                </div>
                <div className="space-y-2">
                  {layer.items.map((item, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center gap-2 text-sm text-foreground/70 group-hover:text-foreground/90 transition-colors duration-300"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

