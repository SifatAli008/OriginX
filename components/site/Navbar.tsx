"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Navbar as HNavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
  Button,
} from "@heroui/react";
import ThemeToggle from "@/components/site/ThemeToggle";

export default function Navbar() {
  const [active, setActive] = useState<string>("hero");
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
    <HNavbar
      maxWidth="xl"
      isBordered
      position="sticky"
      height="4.5rem"
      className="top-0 border-b border-foreground/10 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 shadow-sm"
      classNames={{
        wrapper: "px-4 md:px-6 py-2",
      }}
    >
      <NavbarContent justify="start" className="flex-shrink-0">
        <NavbarBrand>
          <Link href="/" className="nav-brand flex items-center gap-2 whitespace-nowrap !no-underline hover:!no-underline focus:!no-underline visited:!no-underline text-inherit hover:text-inherit">
            <span className="text-xl font-bold text-primary tracking-tight">OriginX</span>
            <span className="text-sm text-foreground/60 hidden sm:inline font-normal">Anti‑Counterfeit</span>
          </Link>
        </NavbarBrand>
      </NavbarContent>
      <NavbarContent className="hidden lg:flex gap-8" justify="center">
        {navLinks.map((link) => (
          <NavbarItem key={link.href}>
            <Link
              href={link.href}
              aria-current={active === link.href.replace("#", "") ? "page" : undefined}
              className={`relative text-base font-medium transition-all duration-300 after:absolute after:-bottom-1 after:left-0 after:h-0.5 after:w-full after:scale-x-0 after:bg-primary after:transition-transform after:duration-300 after:ease-out hover:text-primary hover:after:scale-x-100 ${
                active === link.href.replace("#", "") ? "text-primary after:scale-x-100" : "text-foreground/90"
              }`}
            >
              {link.label}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>
      <NavbarContent
        justify="end"
        className="flex flex-shrink-0 flex-nowrap items-center gap-4"
      >
        <NavbarItem className="lg:hidden flex items-center">
          <NavbarMenuToggle aria-label="Toggle menu" />
        </NavbarItem>
        <NavbarItem className="hidden lg:flex items-center">
          <Link href="/app/auth/login" className="text-base text-foreground/90 font-medium hover:text-primary transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-primary after:transition-all after:duration-300 hover:after:w-full">
            Sign in
          </Link>
        </NavbarItem>
        <NavbarItem className="flex shrink-0">
          <Button
            as={Link}
            href="#get-started"
            color="primary"
            size="lg"
            radius="sm"
            className="font-semibold text-base px-7 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            Get started
          </Button>
        </NavbarItem>
      </NavbarContent>
      <NavbarMenu>
        {navLinks.map((item) => (
          <NavbarMenuItem key={item.href}>
            <Link href={item.href} className="w-full" aria-label={item.label}>
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}
        <NavbarMenuItem>
          <Link href="/app/auth/login">Sign in</Link>
        </NavbarMenuItem>
        <NavbarMenuItem>
          <Button as={Link} href="#get-started" color="primary" radius="sm" className="w-full">
            Get started
          </Button>
        </NavbarMenuItem>
      </NavbarMenu>
    </HNavbar>
  );
}


