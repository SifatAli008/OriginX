"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { TrendingUp, Shield, Users, Zap } from "lucide-react";

interface StatProps {
  end: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

function AnimatedCounter({ end, duration = 2, suffix = "", prefix = "" }: StatProps) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = (timestamp - startTime) / (duration * 1000);

      if (progress < 1) {
        setCount(Math.floor(end * progress));
        animationFrame = requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return (
    <span>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function StatsSection() {
  const stats = [
    {
      icon: Shield,
      value: 15000,
      suffix: "+",
      label: "Products Protected",
      color: "text-blue-500"
    },
    {
      icon: TrendingUp,
      value: 99,
      suffix: ".9%",
      label: "Detection Accuracy",
      color: "text-green-500"
    },
    {
      icon: Users,
      value: 150,
      suffix: "+",
      label: "Active Users",
      color: "text-purple-500"
    },
    {
      icon: Zap,
      value: 2,
      suffix: "s",
      prefix: "<",
      label: "Avg Verification Time",
      color: "text-orange-500"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1 }}
            className="relative group"
          >
            <div className="text-center p-6 rounded-2xl border-2 border-foreground/10 bg-background hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${stat.color} bg-current/10 mb-3`}>
                <Icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                <AnimatedCounter 
                  end={stat.value} 
                  suffix={stat.suffix}
                  prefix={stat.prefix}
                />
              </div>
              <div className="text-sm text-foreground/70 font-medium">{stat.label}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

