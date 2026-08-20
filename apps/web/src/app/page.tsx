"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  ListChecks,
  Menu,
  ShieldCheck,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useApiQuery } from "@/hooks/useApiQuery";
import { siteContentApi } from "@/lib/api/site-content";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/layout/BrandLogo";

const FALLBACK_FEATURES = [
  {
    title: "Pick a plan",
    description: "Choose a subscription that matches your goals and budget.",
  },
  {
    title: "Complete tasks",
    description:
      "Watch videos, try apps, and submit proof — it only takes minutes a day.",
  },
  {
    title: "Get paid",
    description:
      "Earnings land in your wallet once tasks are reviewed and approved.",
  },
];

const FEATURE_ICONS = [ListChecks, CheckCircle2, Wallet];

export default function LandingPage() {
  const { user } = useAuth();
  const { data: content } = useApiQuery(() => siteContentApi.get());
  const [navOpen, setNavOpen] = useState(false);

  const hero = content?.hero as
    | {
        eyebrow?: string;
        headline?: string;
        subheadline?: string;
        primaryCta?: string;
        secondaryCta?: string;
      }
    | undefined;
  const features = content?.features?.items?.length
    ? content.features.items
    : FALLBACK_FEATURES;
  const about = content?.about as
    | { heading?: string; body?: string }
    | undefined;
  const contact = content?.contact as
    | { heading?: string; email?: string; phone?: string; address?: string }
    | undefined;
  const legal = content?.legal as
    | {
        termsTitle?: string;
        termsBody?: string;
        privacyTitle?: string;
        privacyBody?: string;
      }
    | undefined;

  return (
    <div className="min-h-screen bg-base text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-base-border bg-base/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <BrandLogo />

          <nav className="hidden items-center gap-8 text-sm font-medium text-ink-dim sm:flex">
            <a href="#features" className="transition-colors hover:text-ink">
              Features
            </a>
            <a href="#about" className="transition-colors hover:text-ink">
              About
            </a>
            <a href="#contact" className="transition-colors hover:text-ink">
              Contact
            </a>
            <a href="#legal" className="transition-colors hover:text-ink">
              Legal
            </a>
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <Link href="/dashboard">
                <Button size="sm">Go to dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button size="sm" variant="secondary">
                    Log in
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Get started</Button>
                </Link>
              </>
            )}
          </div>

          <button
            className="p-2 sm:hidden"
            onClick={() => setNavOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {navOpen && (
          <div className="border-t border-base-border bg-base px-4 py-4 sm:hidden">
            <nav className="flex flex-col gap-3 text-sm font-medium text-ink-dim">
              <a href="#features" onClick={() => setNavOpen(false)}>
                Features
              </a>
              <a href="#about" onClick={() => setNavOpen(false)}>
                About
              </a>
              <a href="#contact" onClick={() => setNavOpen(false)}>
                Contact
              </a>
              <a href="#legal" onClick={() => setNavOpen(false)}>
                Legal
              </a>
            </nav>
            <div className="mt-4 flex flex-col gap-2">
              {user ? (
                <Link href="/dashboard">
                  <Button className="w-full">Go to dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button className="w-full">Get started</Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="secondary" className="w-full">
                      Log in
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-mint-dim/40 bg-mint-soft px-3 py-1 text-xs font-medium text-mint">
            <ShieldCheck className="h-3.5 w-3.5" />
            {hero?.eyebrow ?? "Earn on your terms"}
          </span>
          <h1 className="mt-6 font-display text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            {hero?.headline ?? "Turn small daily tasks into steady income."}
          </h1>
          <p className="mt-5 text-base text-ink-dim sm:text-lg">
            {hero?.subheadline ??
              "Subscribe to a plan, complete simple tasks, and withdraw your earnings — no experience required."}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={user ? "/dashboard" : "/register"}>
              <Button size="lg">
                {hero?.primaryCta ?? "Get started"}{" "}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="secondary">
                {hero?.secondaryCta ?? "See how it works"}
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-base-border bg-base-raised/40 py-20"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center font-display text-2xl font-semibold text-ink sm:text-3xl">
            How it works
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {features.map((f, i) => {
              const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
              return (
                <div
                  key={f.title}
                  className="rounded-2xl border border-base-border bg-base-surface p-6 shadow-panel"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mint-soft text-mint">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold text-ink">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-dim">{f.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            {about?.heading ?? "About us"}
          </h2>
          <p className="mt-4 text-base text-ink-dim">
            {about?.body ??
              "We built this platform to make everyday earning simple, transparent, and fast."}
          </p>
        </div>
      </section>

      {/* Contact */}
      <section
        id="contact"
        className="border-t border-base-border bg-base-raised/40 py-20"
      >
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
            {contact?.heading ?? "Get in touch"}
          </h2>
          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-ink-dim">
            {contact?.email && <p>{contact.email}</p>}
            {contact?.phone && <p>{contact.phone}</p>}
            {contact?.address && <p>{contact.address}</p>}
          </div>
        </div>
      </section>

      {/* Legal */}
      <section id="legal" className="py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div>
              <h3 className="font-display text-base font-semibold text-ink">
                {legal?.termsTitle ?? "Terms of service"}
              </h3>
              <p className="mt-2 text-sm text-ink-dim">
                {legal?.termsBody ?? "Add your terms of service here."}
              </p>
            </div>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">
                {legal?.privacyTitle ?? "Privacy policy"}
              </h3>
              <p className="mt-2 text-sm text-ink-dim">
                {legal?.privacyBody ?? "Add your privacy policy here."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-base-border py-8 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} X2Factor. All rights reserved.
      </footer>
    </div>
  );
}
