import type { Config } from "tailwindcss";

// HeroUI (NextUI v2) Tailwind plugin configuration for Tailwind CSS v4
import { heroui } from "@heroui/react";

export default {
  // Tailwind v4 automatically scans, but we keep an explicit plugin setup for HeroUI
  plugins: [
    heroui({
      themes: {
        light: {
          colors: {
            primary: "#2563eb", // brand primary (blue-600)
          },
        },
        dark: {
          colors: {
            primary: "#60a5fa", // brand primary (blue-400)
          },
        },
      },
    }),
  ],
} satisfies Config;


