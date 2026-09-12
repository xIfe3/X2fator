import { relations } from "drizzle-orm";

import { users } from "./users";
import { refreshTokens } from "./auth";
import { passwordResetTokens } from "./password-reset-tokens";
import { roles, permissions, rolePermissions, userRoles } from "./roles";
import { plans } from "./plans";
import { planSubscriptions } from "./subscriptions";
import { planTasks } from "./plan-tasks";
import { tasks, taskCompletions } from "./tasks";
import { wallets, walletTransactions } from "./wallets";
import { referrals } from "./referrals";
import { withdrawals } from "./withdrawals";
import { userBankAccounts } from "./user-bank-accounts";
import { notifications } from "./notifications";
import { supportTickets, supportMessages } from "./support";
import { auditLogs } from "./audit";
import { deposits } from "./deposits";
import { payments } from "./payments";
import { utilityPurchases } from "./utilities";
import { ads } from "./ads";

// Every `with: { ... }` usage in the API relies on the relation names
// defined here (e.g. `with: { plan: true }` needs `planSubscriptionsRelations`
// below to define a `plan` relation). None of this existed before — every
// table only had raw FK columns, so any relational query
// (`db.query.X.findMany({ with: {...} })`) crashed with
// "Cannot read properties of undefined (reading 'referencedTable')".

export const usersRelations = relations(users, ({ one, many }) => ({
  referredBy: one(users, {
    fields: [users.referredById],
    references: [users.id],
    relationName: "userReferrals",
  }),
  referrals: many(users, { relationName: "userReferrals" }),

  refreshTokens: many(refreshTokens),
  passwordResetTokens: many(passwordResetTokens),
  roles: many(userRoles),

  subscriptions: many(planSubscriptions),
  taskCompletions: many(taskCompletions),
  wallets: many(wallets),

  referralsMade: many(referrals, { relationName: "referrer" }),
  referredAs: one(referrals, {
    fields: [users.id],
    references: [referrals.referredUserId],
    relationName: "referredUser",
  }),

  withdrawals: many(withdrawals),
  bankAccounts: many(userBankAccounts),
  notifications: many(notifications),
  supportTickets: many(supportTickets),
  auditLogs: many(auditLogs),
  deposits: many(deposits),
  payments: many(payments),
  utilityPurchases: many(utilityPurchases),
  ads: many(ads),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
}));

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, { fields: [rolePermissions.roleId], references: [roles.id] }),
  permission: one(permissions, { fields: [rolePermissions.permissionId], references: [permissions.id] }),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [userRoles.roleId], references: [roles.id] }),
}));

export const plansRelations = relations(plans, ({ many }) => ({
  subscriptions: many(planSubscriptions),
  planTasks: many(planTasks),
}));

export const planSubscriptionsRelations = relations(planSubscriptions, ({ one, many }) => ({
  user: one(users, { fields: [planSubscriptions.userId], references: [users.id] }),
  plan: one(plans, { fields: [planSubscriptions.planId], references: [plans.id] }),
  taskCompletions: many(taskCompletions),
  referrals: many(referrals),
}));

export const planTasksRelations = relations(planTasks, ({ one }) => ({
  plan: one(plans, { fields: [planTasks.planId], references: [plans.id] }),
  task: one(tasks, { fields: [planTasks.taskId], references: [tasks.id] }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  completions: many(taskCompletions),
  planTasks: many(planTasks),
  ad: one(ads, { fields: [tasks.adId], references: [ads.id] }),
}));

export const taskCompletionsRelations = relations(taskCompletions, ({ one }) => ({
  user: one(users, { fields: [taskCompletions.userId], references: [users.id] }),
  task: one(tasks, { fields: [taskCompletions.taskId], references: [tasks.id] }),
  subscription: one(planSubscriptions, {
    fields: [taskCompletions.subscriptionId],
    references: [planSubscriptions.id],
  }),
  reviewer: one(users, { fields: [taskCompletions.reviewedBy], references: [users.id] }),
  ad: one(ads, { fields: [taskCompletions.adId], references: [ads.id] }),
}));

export const adsRelations = relations(ads, ({ one }) => ({
  user: one(users, { fields: [ads.userId], references: [users.id] }),
  task: one(tasks, { fields: [ads.taskId], references: [tasks.id] }),
}));

export const walletsRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  transactions: many(walletTransactions),
}));

export const walletTransactionsRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, { fields: [walletTransactions.walletId], references: [wallets.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, {
    fields: [referrals.referrerId],
    references: [users.id],
    relationName: "referrer",
  }),
  referredUser: one(users, {
    fields: [referrals.referredUserId],
    references: [users.id],
    relationName: "referredUser",
  }),
  sourceSubscription: one(planSubscriptions, {
    fields: [referrals.sourceSubscriptionId],
    references: [planSubscriptions.id],
  }),
}));

export const withdrawalsRelations = relations(withdrawals, ({ one }) => ({
  user: one(users, { fields: [withdrawals.userId], references: [users.id] }),
  processor: one(users, { fields: [withdrawals.processedBy], references: [users.id] }),
}));

export const userBankAccountsRelations = relations(userBankAccounts, ({ one }) => ({
  user: one(users, { fields: [userBankAccounts.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const supportTicketsRelations = relations(supportTickets, ({ one, many }) => ({
  user: one(users, {
    fields: [supportTickets.userId],
    references: [users.id],
    relationName: "ticketOwner",
  }),
  assignee: one(users, {
    fields: [supportTickets.assignedTo],
    references: [users.id],
    relationName: "ticketAssignee",
  }),
  messages: many(supportMessages),
}));

export const supportMessagesRelations = relations(supportMessages, ({ one }) => ({
  ticket: one(supportTickets, { fields: [supportMessages.ticketId], references: [supportTickets.id] }),
  sender: one(users, { fields: [supportMessages.senderId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, { fields: [auditLogs.actorId], references: [users.id] }),
}));

export const depositsRelations = relations(deposits, ({ one, many }) => ({
  user: one(users, { fields: [deposits.userId], references: [users.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  deposit: one(deposits, { fields: [payments.depositId], references: [deposits.id] }),
}));

export const utilityPurchasesRelations = relations(utilityPurchases, ({ one }) => ({
  user: one(users, { fields: [utilityPurchases.userId], references: [users.id] }),
}));
