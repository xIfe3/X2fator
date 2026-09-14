import { PublicPage } from "@/components/layout/PublicPage";

const sections = [
  {
    title: "1. Information we collect",
    body: "We collect the information you provide when you register (name, email, phone number), activity you generate on the platform (tasks completed, campaigns created, referrals, support tickets), and transaction records (deposits, withdrawals, wallet balances) needed to operate the service.",
  },
  {
    title: "2. How we use your information",
    body: "We use this information to create and secure your account, process deposits and withdrawals, review task and campaign submissions, calculate referral commissions, respond to support requests, and detect fraud or abuse of the platform. We do not sell your personal information to third parties.",
  },
  {
    title: "3. Payment information",
    body: "Deposits are processed by our payment provider (Flutterwave); we do not store your card or bank credentials directly — the payment provider handles that data under its own security and compliance standards. Withdrawal payouts use the bank account details you provide, which are stored only to fulfil your withdrawal requests.",
  },
  {
    title: "4. Uploaded content",
    body: "Screenshots and other files you upload as proof of task completion are stored to support the review process and to resolve disputes. Do not upload files containing sensitive personal information beyond what is required to prove task completion.",
  },
  {
    title: "5. Data retention",
    body: "We retain account and transaction data for as long as your account is active and for a reasonable period afterward to meet legal, accounting, and fraud-prevention obligations. You may request deletion of your account by contacting support; some transaction records may be retained where required by law.",
  },
  {
    title: "6. Data security",
    body: "Access to personal data is limited to authorized personnel and systems needed to operate the platform. Passwords are stored using industry-standard hashing and are never stored or transmitted in plain text.",
  },
  {
    title: "7. Your rights",
    body: "You can view and update most of your account information from your profile and settings pages. To request a copy of your data, ask a correction, or request account deletion, contact support through the app or the email on our Contact page.",
  },
  {
    title: "8. Changes to this policy",
    body: "We may update this privacy policy to reflect changes in our practices or legal requirements. Material changes will be reflected by an updated date below.",
  },
];

export default function PrivacyPage() {
  return (
    <PublicPage eyebrow="Legal" title="Privacy policy">
      <>
        <p>
          This policy explains what information X2Factor collects and how we
          use it.
        </p>
        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="font-display text-lg text-ink">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-6">{section.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-10 text-xs uppercase tracking-widest text-ink-faint">
          Updated: 2026-01-01
        </p>
      </>
    </PublicPage>
  );
}
