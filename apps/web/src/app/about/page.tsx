import { PublicPage } from "@/components/layout/PublicPage";

const about = {
  body:
    "X2Factor helps you move with intention. The product keeps your tasks, earnings, and next steps visible so progress feels more manageable and less scattered.",
  values: [
    {
      title: "Clearer progress",
      description:
        "Every step has a visible context so your priorities stay focused and your work remains easy to understand.",
    },
    {
      title: "More confidence",
      description:
        "Rewards, rules, and review status stay connected to the actual work, which makes every action easier to trust.",
    },
    {
      title: "Better habits",
      description:
        "When the process is simple and consistent, it becomes easier to keep momentum without burning out.",
    },
  ],
};

export default function AboutPage() {
  return (
    <PublicPage
      eyebrow="About X2Factor"
      title="Progress should feel practical, not complicated."
    >
      <>
        <p>{about.body}</p>
        <div className="mt-12 space-y-7">
          {about.values.map((value) => (
            <div key={value.title} className="border-l border-secondary pl-6">
              <h2 className="font-display text-2xl text-ink">{value.title}</h2>
              <p className="mt-2">{value.description}</p>
            </div>
          ))}
        </div>
      </>
    </PublicPage>
  );
}
