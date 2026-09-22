import { pgEnum } from "drizzle-orm/pg-core";

/**
 * User & account
 */
export const userStatusEnum = pgEnum("user_status", [
  "active",
  "suspended",
  "blocked",
  "pending",
]);

export const genderEnum = pgEnum("gender", ["male", "female", "other"]);

/**
 * Plans
 */
export const planStatusEnum = pgEnum("plan_status", [
  "draft",
  "active",
  "inactive",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "pending",
  "active",
  "completed",
  "cancelled",
  "expired",
]);

/**
 * Tasks
 */
export const taskStatusEnum = pgEnum("task_status", ["active", "inactive"]);

export const taskCompletionStatusEnum = pgEnum("task_completion_status", [
  "pending",
  "approved",
  "rejected",
]);

/**
 * Wallet
 */
export const walletTypeEnum = pgEnum("wallet_type", [
  "account",
  "task",
  "referral",
]);

export const walletStatusEnum = pgEnum("wallet_status", ["active", "frozen"]);

export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", [
  "deposit",
  "plan_purchase",
  "task_reward",
  "referral_commission",
  "withdrawal",
  "airtime_purchase",
  "data_purchase",
  "fee",
  "refund",
  "adjustment",
]);

export const transactionDirectionEnum = pgEnum("transaction_direction", [
  "credit",
  "debit",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "failed",
  "reversed",
]);

export const adTypeEnum = pgEnum("ad_type", [
  "app_download",
  "followers",
  "subscribers",
  "comments",
  "likes",
]);
export const adStatusEnum = pgEnum("ad_status", [
  "pending",
  "active",
  "paused",
  "completed",
  "rejected",
]);

/**
 * Payments
 */
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "processing",
  "successful",
  "failed",
  "cancelled",
  "refunded",
]);

export const paymentProviderEnum = pgEnum("payment_provider", [
  "flutterwave",
  "manual",
  "mock",
]);

export const depositStatusEnum = pgEnum("deposit_status", [
  "pending",
  "processing",
  "successful",
  "failed",
  "rejected",
]);

/**
 * Withdrawals
 */
export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "pending",
  "processing",
  "completed",
  "rejected",
  "cancelled",
]);

/**
 * Referrals
 */
export const referralStatusEnum = pgEnum("referral_status", [
  "pending",
  "active",
  "completed",
  "cancelled",
]);

/**
 * Utility purchases
 */
export const utilityTypeEnum = pgEnum("utility_type", ["airtime", "data"]);

export const utilityPurchaseStatusEnum = pgEnum("utility_purchase_status", [
  "pending",
  "processing",
  "successful",
  "failed",
  "reversed",
]);

export const networkProviderEnum = pgEnum("network_provider", [
  "mtn",
  "airtel",
  "glo",
  "9mobile",
]);

/**
 * Notifications
 */
export const notificationTypeEnum = pgEnum("notification_type", [
  "general",
  "deposit",
  "withdrawal",
  "plan",
  "task",
  "referral",
  "security",
  "system",
  "referral_commission",
  "deposit_completed",
  "withdrawal_completed",
  "withdrawal_rejected",
  "task_approved",
  "task_rejected",
]);

export const notificationChannelEnum = pgEnum("notification_channel", [
  "in_app",
  "email",
  "sms",
]);

/**
 * Support
 */
export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "resolved",
  "closed",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

/**
 * Admin
 */
export const adminActionEnum = pgEnum("admin_action", [
  "create",
  "update",
  "delete",
  "approve",
  "reject",
  "suspend",
  "activate",
  "block",
  "login",
  "logout",
  "adjust",
  "reset_password",
]);

export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "user",
  "wallet",
  "transaction",
  "plan",
  "subscription",
  "task",
  "withdrawal",
  "deposit",
  "payment",
  "utility",
  "ticket",
  "admin",
  "system",
]);

export const earningSourceEnum = pgEnum("earning_source", [
  "task",
  "referral",
  "bonus",
  "adjustment",
]);

export const earningStatusEnum = pgEnum("earning_status", [
  "pending",
  "credited",
  "reversed",
  "cancelled",
]);
