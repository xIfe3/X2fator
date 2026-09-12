import { ListChecks, Wallet, CheckCircle2 } from "lucide-react";
import { PublicPage } from "@/components/layout/PublicPage";

const features = [
  {
    title: "Create a plan",
    description:
      "Start by choosing the tasks and routines that fit your available time, then keep your next action simple and visible.",
  },
  {
    title: "Complete work with clarity",
    description:
      "Follow the instructions, submit evidence when needed, and know exactly what happens after review.",
  },
  {
    title: "Track the rewards",
    description:
      "Approved earnings move into your account with clear status updates so the process stays easy to follow.",
  },
];

export default function HowItWorksPage() {
  return (
    <PublicPage
      eyebrow="How it works"
      title="A focused way to turn spare time into progress."
    >
      <>
        <p>
          Start with a plan, complete eligible tasks, and watch approved rewards
          move into your wallet. X2Factor keeps the next action visible and the
          numbers easy to follow.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {features.map((item, index) => {
            const Icon =
              [ListChecks, CheckCircle2, Wallet][index % 3] ?? ListChecks;
            return (
              <div
                key={item.title}
                className="border border-base-border bg-base-surface p-6"
              >
                <Icon className="h-6 w-6 text-primary" />
                <h2 className="mt-6 font-display text-xl text-ink">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6">{item.description}</p>
              </div>
            );
          })}
        </div>
      </>
    </PublicPage>
  );
}
