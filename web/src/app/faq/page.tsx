import { ChevronDown } from "lucide-react";
import { PublicPage } from "@/components/layout/PublicPage";

const questions = [
  [
    "What is X2Factor?",
    "X2Factor connects you with practical digital tasks, clear reward rules, and a wallet that keeps your approved earnings visible.",
  ],
  [
    "How do I earn?",
    "Choose an available task, follow its instructions, submit proof when requested, and receive the reward after review.",
  ],
  [
    "When can I withdraw?",
    "Withdrawals follow the eligibility and review rules shown in your workspace. You will always see the status and reference for each request.",
  ],
  [
    "Are there signup fees?",
    "Creating an account is free. Any task-specific or payment-related fee is shown before you confirm an action.",
  ],
  [
    "How is my information protected?",
    "We use account verification, access controls, and audit trails to protect account activity and keep important actions traceable.",
  ],
];

export default function FaqPage() {
  return (
    <PublicPage
      eyebrow="Questions, answered"
      title="A clearer way to get started."
    >
      <div className="space-y-3">
        {questions.map(([question, answer]) => (
          <details
            key={question}
            className="group border border-base-border bg-base-surface p-5"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg text-ink">
              {question}
              <ChevronDown className="h-5 w-5 shrink-0 text-primary transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-4 max-w-2xl text-sm leading-7">{answer}</p>
          </details>
        ))}
      </div>
    </PublicPage>
  );
}
