import { HeartHandshake, MessageCircle, Users } from "lucide-react";
import { PublicPage } from "@/components/layout/PublicPage";

export default function CommunityPage() {
  return (
    <PublicPage
      eyebrow="Community"
      title="A place to build a better earning rhythm."
    >
      <>
        <p className="max-w-2xl">
          The best progress is sustainable. X2Factor gives you a focused
          workspace for your own goals, with support when you need a second set
          of eyes.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-3">
          <div className="border border-base-border bg-base-surface p-6">
            <Users className="h-6 w-6 text-primary" />
            <h2 className="mt-6 font-display text-xl text-ink">
              Shared momentum
            </h2>
            <p className="mt-2 text-sm leading-6">
              Invite people you trust and follow referral activity without losing
              sight of your own work.
            </p>
          </div>
          <div className="border border-base-border bg-base-surface p-6">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h2 className="mt-6 font-display text-xl text-ink">
              Human support
            </h2>
            <p className="mt-2 text-sm leading-6">
              Questions have a home in support tickets with a visible status and
              response history.
            </p>
          </div>
          <div className="border border-base-border bg-base-surface p-6">
            <HeartHandshake className="h-6 w-6 text-primary" />
            <h2 className="mt-6 font-display text-xl text-ink">
              Fair by design
            </h2>
            <p className="mt-2 text-sm leading-6">
              Clear requirements and review states help everyone understand what
              happens next.
            </p>
          </div>
        </div>
      </>
    </PublicPage>
  );
}
