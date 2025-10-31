"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Navbar() {
  const [active, setActive] = useState<string>("hero");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
    const navLinks = [
      { href: "#features", label: "Features" },
      { href: "#roles", label: "Roles" },
      { href: "#modules", label: "Modules" },
    ];

  useEffect(() => {
    const sectionIds = ["hero", "features", "roles", "modules", "get-started"];
    const sections = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActive(visible.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: [0.1, 0.25, 0.5, 0.75] }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container mx-auto max-w-7xl px-4 md:px-6 h-18 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center">
          <Link 
            href="/" 
            className="nav-brand flex items-center gap-2 whitespace-nowrap group"
          >
            <span className="text-xl font-bold text-primary tracking-tight transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg">
              OriginX
            </span>
            <span className="text-sm text-muted-foreground hidden sm:inline font-normal transition-colors duration-300 group-hover:text-foreground">
              Anti‑Counterfeit
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => {
            const isActive = active === link.href.replace("#", "");
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative text-base font-medium transition-all duration-300",
                  "hover:text-primary group",
                  "before:absolute before:-inset-x-2 before:-inset-y-1 before:rounded-md before:bg-primary/0",
                  "before:transition-all before:duration-300 hover:before:bg-primary/5",
                  "after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0",
                  "after:bg-primary after:transition-all after:duration-300 after:ease-out",
                  "hover:after:w-full hover:scale-105",
                  isActive ? "text-primary after:w-full" : "text-foreground/80"
                )}
              >
                <span className="relative z-10">{link.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-4">
            <Link
              href="/login"
              className={cn(
                "relative text-base font-medium transition-all duration-300",
                "text-foreground/80 hover:text-primary",
                "after:absolute after:-bottom-0.5 after:left-0 after:h-[2px] after:w-0",
                "after:bg-primary after:transition-all after:duration-300",
                "hover:after:w-full hover:scale-105"
              )}
            >
              Sign in
            </Link>
            <Button
              asChild
              size="lg"
              className={cn(
                "font-semibold text-base px-7",
                "relative overflow-hidden",
                "hover:shadow-lg hover:shadow-primary/25",
                "hover:scale-105 hover:-translate-y-0.5",
                "transition-all duration-300",
                "before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/0 before:via-primary/10 before:to-primary/0",
                "before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700"
              )}
            >
              <Link href="#get-started">
                <span className="relative z-10">Get started</span>
          </Link>
            </Button>
          </div>

          {/* Mobile Actions */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              className="p-2 rounded-md text-foreground/80 hover:text-foreground hover:bg-accent transition-all duration-200 hover:scale-110"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-border/40 bg-background/95 backdrop-blur">
          <div className="container mx-auto max-w-7xl px-4 py-4 space-y-2">
            {navLinks.map((link) => {
              const isActive = active === link.href.replace("#", "");
              return (
            <Link
                  key={link.href}
              href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "block px-4 py-3 rounded-md text-base font-medium transition-all duration-200",
                    "hover:bg-accent hover:text-primary",
                    "hover:translate-x-2 hover:shadow-sm",
                    isActive ? "text-primary bg-accent/50" : "text-foreground/80"
                  )}
            >
              {link.label}
            </Link>
              );
            })}
            <div className="pt-4 border-t border-border/40 space-y-2">
              <Link
                href="/login"
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 rounded-md text-base font-medium text-foreground/80 hover:bg-accent hover:text-primary transition-all duration-200 hover:translate-x-2"
              >
            Sign in
          </Link>
          <Button
                asChild
                className="w-full mt-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <Link href="#get-started">Get started</Link>
          </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}


