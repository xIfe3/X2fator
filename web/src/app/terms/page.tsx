import { PublicPage } from "@/components/layout/PublicPage";

const sections = [
  {
    title: "1. What X2Factor is",
    body: "X2Factor is a platform where you can complete tasks, run task-based promotion campaigns, refer other users, and subscribe to paid plans in exchange for rewards credited to your in-app wallet. Rewards are not guaranteed income and are always subject to review before payout.",
  },
  {
    title: "2. Your account",
    body: "You must provide accurate information when registering and keep your login credentials confidential. You are responsible for all activity that happens under your account. We may suspend or block an account that provides false information, is used to abuse referral or task systems, or otherwise violates these terms.",
  },
  {
    title: "3. Tasks, campaigns, and rewards",
    body: "Rewards for completed tasks are credited only after an administrator reviews and approves the submitted proof. Submitting false, misleading, or duplicated proof will result in rejection and may lead to account suspension. If you fund a promotion campaign, the price is fixed at the time of purchase and the funds are held against that campaign until it completes, is cancelled, or is rejected by an admin (in which case the balance is refunded to your wallet).",
  },
  {
    title: "4. Plans and subscriptions",
    body: "Paid plans unlock higher daily task limits, rewards, and referral rates for the plan's duration. Plans are ranked by tier, and once you hold a given tier you may only upgrade to a higher tier — you cannot downgrade or repurchase a lower tier. Upgrading replaces your current plan immediately; unused time on the previous plan is not refunded or prorated.",
  },
  {
    title: "5. Deposits and withdrawals",
    body: "Deposits are processed through our payment partner and are credited to your account wallet once payment is confirmed. Withdrawal requests are reviewed before funds are released to your provided bank account; we may request additional verification for unusually large or frequent withdrawal requests. We are not responsible for delays caused by your bank or payment provider.",
  },
  {
    title: "6. Referrals",
    body: "Referral commissions are earned according to the rate attached to your active plan at the time a referred user makes a qualifying purchase. Creating fake or duplicate accounts to generate referral commissions is prohibited and will result in forfeiture of the associated rewards and possible account suspension.",
  },
  {
    title: "7. Prohibited conduct",
    body: "You may not use automated tools, bots, or scripts to interact with the platform; submit fraudulent task or campaign proof; attempt to manipulate the referral or bonus systems; or use the platform for any unlawful purpose. We reserve the right to withhold rewards, reverse transactions, and suspend or terminate accounts involved in prohibited conduct.",
  },
  {
    title: "8. Disputes",
    body: "If you believe a task, campaign, withdrawal, or wallet adjustment was handled incorrectly, contact support with your account details and a description of the issue. We will review the relevant records and respond with a decision. Our review decisions on task and campaign submissions are final.",
  },
  {
    title: "9. Changes to these terms",
    body: "We may update these terms to reflect product changes, legal requirements, or operational needs. Material changes will be reflected by an updated date below. Continuing to use X2Factor after a change takes effect means you accept the revised terms.",
  },
  {
    title: "10. Contact",
    body: "Questions about these terms can be sent through the Support page inside the app, or to the contact email listed on our Contact page.",
  },
];

export default function TermsPage() {
  return (
    <PublicPage eyebrow="Legal" title="Terms of service">
      <>
        <p>
          These terms govern your use of X2Factor. By creating an account you
          agree to the terms below.
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
