"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { BrandLogo } from "./BrandLogo";
import { Button } from "@/components/ui/Button";

export function PublicPage({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <div className="min-h-screen bg-base text-ink">
      <header className="border-b border-base-border">
        <div className="mx-auto flex h-20 max-w-5xl items-center justify-between px-5 sm:px-8">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-5 text-sm text-ink-dim md:flex">
              <Link href="/how-it-works" className="hover:text-ink">
                How it works
              </Link>
              <Link href="/earnings" className="hover:text-ink">
                Earnings
              </Link>
              <Link href="/security" className="hover:text-ink">
                Security
              </Link>
              <Link href="/faq" className="hover:text-ink">
                FAQ
              </Link>
            </nav>
            <button
              type="button"
              aria-label="Toggle theme"
              title="Toggle theme"
              className="rounded-lg p-2 text-ink-dim hover:bg-base-raised hover:text-ink"
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4" /> Home
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="animate-fade-up mx-auto max-w-5xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-5 max-w-3xl font-display text-5xl leading-tight sm:text-6xl">
          {title}
        </h1>
        <div className="mt-12 max-w-3xl text-base leading-8 text-ink-dim">
          {children}
        </div>
        <Link href="/register" className="mt-12 inline-block">
          <Button size="lg">
            Get started <ArrowRight className="h-5 w-5" />
          </Button>
        </Link>
      </main>
      <footer className="border-t border-base-border py-8 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} X2Factor
      </footer>
    </div>
  );
}
