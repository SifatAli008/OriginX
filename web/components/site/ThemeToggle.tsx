"use client";

import { useEffect, useState } from "react";
import { Button, Tooltip } from "@heroui/react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("theme") : null;
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextDark = stored ? stored === "dark" : prefersDark;
    setIsDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
  }, []);

  function onChange(value: boolean) {
    setIsDark(value);
    document.documentElement.classList.toggle("dark", value);
    localStorage.setItem("theme", value ? "dark" : "light");
  }

  return (
    <Tooltip content={isDark ? "Switch to light" : "Switch to dark"} placement="bottom">
      <Button
        isIconOnly
        variant="light"
        radius="full"
        aria-label="Toggle theme"
        onPress={() => onChange(!isDark)}
        className="h-9 w-9 text-foreground/80 hover:text-foreground"
      >
        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </Tooltip>
  );
}


