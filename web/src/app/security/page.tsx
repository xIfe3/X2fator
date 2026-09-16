import {
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { PublicPage } from "@/components/layout/PublicPage";

const controls: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: LockKeyhole,
    title: "Protected access",
    description:
      "Your account is protected by authenticated sessions and password controls designed to keep access personal.",
  },
  {
    icon: ShieldCheck,
    title: "Traceable money movement",
    description:
      "Deposits, rewards, and withdrawals are recorded with statuses and references so activity stays accountable.",
  },
  {
    icon: Fingerprint,
    title: "Verification when it matters",
    description:
      "Identity and account checks help keep higher-risk actions reviewable without adding friction to every visit.",
  },
];

export default function SecurityPage() {
  return (
    <PublicPage
      eyebrow="Trust & security"
      title="Built for confidence, not confusion."
    >
      <>
        <p className="max-w-2xl">
          Security is part of the product experience. X2Factor makes important
          account and wallet activity visible, reviewable, and easier to
          understand.
        </p>
        <div className="mt-12 space-y-5">
          {controls.map(({ icon: SecurityIcon, title, description }) => {
            return (
              <div
                key={title}
                className="flex gap-5 border-t border-base-border pt-5"
              >
                <SecurityIcon className="mt-1 h-6 w-6 shrink-0 text-primary" />
                <div>
                  <h2 className="font-display text-xl text-ink">{title}</h2>
                  <p className="mt-2 text-sm leading-7">{description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </>
    </PublicPage>
  );
}
