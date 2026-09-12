import { PublicPage } from "@/components/layout/PublicPage";

const termsBody = `These terms govern your use of X2Factor and the services available on the platform. By creating an account and using the product, you agree to follow the platform rules, provide accurate information, and conduct yourself in a manner that respects other users and the review process.

You are responsible for the accuracy of the information you submit, the tasks you complete, and any payment or account activity associated with your account. X2Factor may review work, withhold rewards, suspend access, or remove content when rules are violated or when activity creates risk for the platform or its users.

We may update these terms when necessary to reflect product changes, compliance obligations, or operational improvements. Continued use of the service after updates indicates your acceptance of the revised terms.`;

export default function TermsPage() {
  return (
    <PublicPage eyebrow="Legal" title="Terms of service">
      <>
        <p className="whitespace-pre-line">{termsBody}</p>
        <p className="mt-8 text-xs uppercase tracking-widest text-ink-faint">
          Updated: 2026-01-01
        </p>
      </>
    </PublicPage>
  );
}
