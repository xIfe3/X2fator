import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Coins,
  ListChecks,
  Megaphone,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const steps = [
  {
    title: "Complete tasks",
    description:
      "Browse available tasks — including ones other users have funded — follow the instructions, and submit proof.",
    icon: ListChecks,
  },
  {
    title: "Get reviewed and paid",
    description:
      "Once approved, your reward lands straight in your task wallet. No waiting on unclear timelines.",
    icon: Wallet,
  },
  {
    title: "Grow it further",
    description:
      "Refer friends, keep your daily login streak alive, or fund your own campaign for others to complete.",
    icon: Coins,
  },
];

const highlights = [
  {
    title: "Real task rewards",
    description:
      "Every completed task is reviewed before payout, so what you earn is real and tracked from day one.",
    icon: ShieldCheck,
  },
  {
    title: "Referral earnings",
    description:
      "Invite people you know and earn a share of what they complete, visible in one place.",
    icon: Users,
  },
  {
    title: "Run your own campaign",
    description:
      "Need followers, downloads, comments, or likes? Fund a campaign and other users complete it for you.",
    icon: Megaphone,
  },
  {
    title: "Plans that scale with you",
    description:
      "Subscribe to a higher plan tier to unlock more daily tasks, bigger rewards, and better referral rates.",
    icon: Award,
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-base text-ink">
      <header className="border-b border-base-border">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <BrandLogo />
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
        </div>
      </header>

      <main>
        <section className="app-page-background border-b border-base-border">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:items-center">
            <div className="animate-fade-up">
              <Badge tone="primary">Task-based earning platform</Badge>
              <h1 className="mt-5 max-w-xl font-display text-4xl leading-tight sm:text-5xl lg:text-6xl">
                Turn simple tasks into steady earnings.
              </h1>
              <p className="mt-6 max-w-lg leading-8 text-ink-dim">
                Complete tasks, refer friends, and keep a daily login streak
                going — every reward is reviewed and tracked in one wallet,
                with no hidden steps.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <Link href="/register">
                  <Button size="lg">
                    Create your account <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline">
                    I already have an account
                  </Button>
                </Link>
              </div>
            </div>

            {/* Product visual: a mock wallet + task card, not stock art */}
            <div className="relative animate-fade-up lg:justify-self-end">
              <div className="w-full max-w-sm rounded-3xl border border-base-border bg-base-surface p-6 shadow-[0_24px_60px_-24px_rgba(91,91,246,0.35)]">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-wider text-ink-faint">
                    Task wallet
                  </p>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Wallet className="h-4 w-4" />
                  </span>
                </div>
                <p className="mt-2 font-mono text-3xl font-semibold tabular text-ink">
                  NGN 24,850.00
                </p>

                <div className="mt-6 space-y-2.5">
                  <div className="flex items-center gap-3 rounded-xl border border-base-border bg-base-raised p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-soft text-secondary">
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">
                        Follow &amp; subscribe task
                      </p>
                      <p className="text-[11px] text-ink-faint">Approved</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-secondary">
                      +NGN 200
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-base-border bg-base-raised p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                      <Users className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">
                        Referral commission
                      </p>
                      <p className="text-[11px] text-ink-faint">Credited</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-primary">
                      +NGN 500
                    </span>
                  </div>
                  <div className="flex items-center gap-3 rounded-xl border border-base-border bg-base-raised p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary-soft text-secondary">
                      <Award className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">
                        Daily streak bonus — day 12
                      </p>
                      <p className="text-[11px] text-ink-faint">Claimed</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs font-semibold text-secondary">
                      +NGN 50
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-base-border bg-base-raised">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 font-display text-3xl text-ink">
              Three steps, start to finish.
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step.title}
                  className="relative rounded-2xl border border-base-border bg-base-surface p-6"
                >
                  <span className="absolute right-6 top-6 font-display text-3xl font-semibold text-base-border">
                    0{index + 1}
                  </span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-6 font-display text-lg text-ink">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink-dim">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-base-border">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              What you get
            </p>
            <h2 className="mt-3 font-display text-3xl text-ink">
              Built around real earning, not gimmicks.
            </h2>
            <div className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {highlights.map((item) => (
                <div key={item.title} className="flex gap-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-soft text-secondary">
                    <item.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg text-ink">
                      {item.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-6 text-ink-dim">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-base-raised">
          <div className="mx-auto max-w-6xl px-5 py-16 text-center sm:px-8">
            <h2 className="font-display text-3xl text-ink">
              Ready to get started?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-ink-dim">
              Create your account in a couple of minutes and complete your
              first task today.
            </p>
            <Link href="/register" className="mt-8 inline-block">
              <Button size="lg">
                Create your account <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-base-border py-8 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} X2Factor
      </footer>
    </div>
  );
}
