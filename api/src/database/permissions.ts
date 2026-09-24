// Every permission the API checks via @RequirePermission. Shared by the
// dev seed (seed.ts) and the production reset (reset-and-seed-admin.ts)
// so the bootstrap admin always gets the complete set.
export const PERMISSIONS: { name: string; description: string }[] = [
  { name: "users.read", description: "View user accounts" },
  { name: "users.suspend", description: "Suspend a user account" },
  { name: "users.activate", description: "Reactivate a user account" },
  { name: "users.block", description: "Permanently block a user account" },
  {
    name: "users.update",
    description: "Edit user account details and reset passwords",
  },
  {
    name: "users.create_admin",
    description: "Create a new admin account",
  },
  { name: "withdrawals.read", description: "View withdrawal requests" },
  { name: "withdrawals.reject", description: "Reject a withdrawal request" },
  {
    name: "withdrawals.settings",
    description: "View and edit withdrawal rules (minimums, payout dates)",
  },
  {
    name: "wallets.adjust",
    description: "Manually credit or debit a user's wallet",
  },
  { name: "audit.read", description: "View the admin audit log" },
  { name: "support.read", description: "View support tickets" },
  {
    name: "support.manage",
    description: "Assign, prioritize, reply to, and resolve support tickets",
  },
  {
    name: "notifications.send",
    description: "Send in-app notifications to one user or broadcast to all",
  },
  {
    name: "withdrawals.approve",
    description: "Approve, complete, or reconcile a withdrawal",
  },
  { name: "deposits.read", description: "View deposits" },
  { name: "deposits.review", description: "Approve or reject a deposit" },
  { name: "tasks.manage", description: "Create, edit, or delete tasks" },
  {
    name: "tasks.review",
    description: "Approve or reject a task completion",
  },
  { name: "ads.manage", description: "Review ad campaigns and set pricing" },
  { name: "plans.manage", description: "Create, edit, or delete plans" },
  {
    name: "bonuses.manage",
    description: "View and edit daily check-in bonus settings",
  },
  {
    name: "site_content.manage",
    description: "Edit landing page content and site-wide feature toggles",
  },
  { name: "roles.manage", description: "Create roles and assign permissions" },
  {
    name: "referrals.read",
    description: "View referral relationships and fraud signals",
  },
  {
    name: "subscriptions.read",
    description: "View plan subscriptions (investments) across all users",
  },
  {
    name: "payments.read",
    description:
      "View payment gateway transactions, webhook activity, and configuration status",
  },
];
