"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid rendering theme-dependent UI until mounted, since the
  // server can't know the viewer's system preference.
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-base-border text-ink-dim hover:bg-base-surface2 hover:text-ink"
    >
      {mounted && (isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />)}
    </button>
  );
}
