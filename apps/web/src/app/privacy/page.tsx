import { PublicPage } from "@/components/layout/PublicPage";

const privacyBody = `We respect the privacy of the people who use X2Factor. We collect account information, activity records, and wallet details necessary to run the platform and support account security, updates, and payment-related workflows.

We use this information to maintain your account, verify your identity when required, review eligibility for tasks or withdrawals, and provide support. We may also use approved operational data to measure system health, detect misuse, and improve the experience for everyone on the platform.

We keep personal data only for as long as needed to provide the service, satisfy legal obligations, and protect legitimate business interests. Access is limited to authorized personnel and systems with appropriate security controls. When a service provider is used, we only share the minimum information necessary to support the relevant function.`;

export default function PrivacyPage() {
  return (
    <PublicPage eyebrow="Legal" title="Privacy policy">
      <>
        <p className="whitespace-pre-line">{privacyBody}</p>
        <p className="mt-8 text-xs uppercase tracking-widest text-ink-faint">
          Updated: 2026-01-01
        </p>
      </>
    </PublicPage>
  );
}
