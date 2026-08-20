// Mirrors src/common/interceptors/response.interceptor.ts and
// src/common/filters/http-exception.filter.ts on the API.
export interface ApiSuccess<T> {
  success: true;
  data: T;
}
export interface ApiError {
  success: false;
  error: {
    statusCode: number;
    message: string;
    errors?: unknown;
    path: string;
    timestamp: string;
  };
}
export type ApiEnvelope<T> = ApiSuccess<T> | ApiError;

// ---- Auth ----
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  referralCode: string;
  referredById?: string | null;
  status: "active" | "suspended" | "blocked" | "pending";
  loginCount?: number;
  lastLoginAt?: string | null;
  createdAt?: string;
  roles?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

// GET /auth/me only echoes the JWT payload (CurrentUser decorator), not
// the full user record — id/email/roles only. Don't rely on it for
// profile fields like firstName/status; use the cached login/register
// user for those instead (see lib/auth-context.tsx).
export interface AuthMeResponse {
  id: string;
  email: string;
  roles: string[];
}

// ---- Wallet ----
export interface Wallet {
  id: string;
  userId: string;
  type: "account" | "earnings";
  balance: string;
  status: string;
}
export interface UserWallets {
  account: Wallet;
  earnings: Wallet;
}
export interface AdminWalletDetails {
  user: { id: string; name: string; email: string };
  wallets: UserWallets;
  transactions: Array<
    WalletTransaction & {
      walletType: "account" | "earnings";
      balanceBefore: string;
      reference: string;
      status: string;
    }
  >;
}
export interface WalletTransaction {
  id: string;
  walletId: string;
  type: string;
  direction: "credit" | "debit";
  amount: string;
  balanceAfter?: string;
  description?: string;
  createdAt: string;
}
export interface DailyBonusStatus {
  enabled: boolean;
  claimed: boolean;
  amount: string;
  claimDate: string;
  nextClaimAt: string | null;
}

// ---- Deposits / Payments ----
export type DepositProvider = "paystack" | "flutterwave" | "manual" | "mock";
export interface AdminDeposit {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  provider: DepositProvider;
  providerReference?: string | null;
  reference: string;
  status: string;
  failureReason?: string | null;
  createdAt: string;
}
export interface Deposit {
  id: string;
  userId: string;
  amount: string;
  provider: DepositProvider;
  status: "pending" | "success" | "failed";
  reference?: string;
  createdAt: string;
}

// ---- Withdrawals ----
export interface Withdrawal {
  id: string;
  userId: string;
  amount: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  status: "pending" | "approved" | "rejected";
  note?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

// ---- Plans / Subscriptions ----
export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: string;
  durationDays: number;
  dailyTaskLimit?: number;
  dailyReward?: string;
  referralRewardRate?: string;
  minimumWithdrawal?: string;
  status: "draft" | "active" | "inactive";
  isFeatured?: boolean;
  createdAt?: string;
}
export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan?: Plan;
  status: "active" | "completed" | "cancelled";
  startedAt: string;
  endsAt?: string;
}

// ---- Tasks ----
export type TaskType = "video" | "app" | "other";
export interface Task {
  id: string;
  title: string;
  description?: string;
  reward: string;
  durationSeconds?: number;
  status: "active" | "inactive";
  taskType?: TaskType;
  targetUrl?: string;
  createdAt?: string;
}
export interface TaskCompletion {
  id: string;
  taskId: string;
  userId: string;
  reward?: string;
  status: "pending" | "approved" | "rejected";
  submissionData?: Record<string, unknown>;
  screenshotUrl?: string;
  reviewNote?: string;
  reviewedAt?: string;
  completedAt?: string;
  createdAt?: string;
  task?: Task;
}

// ---- Earnings ----
export type EarningSource = "task" | "referral" | "bonus" | "adjustment";
export interface Earning {
  id: string;
  userId: string;
  source: EarningSource;
  amount: string;
  description?: string;
  createdAt: string;
}
export interface EarningsSummary {
  total: string;
  bySource?: Record<string, string>;
  todayTotal?: string;
}

// ---- Referrals ----
export interface ReferralInfo {
  referralCode: string;
  referralLink?: string;
  totalReferrals?: number;
  totalEarned?: string;
}
export interface Referral {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  createdAt: string;
}

// ---- KYC ----
export type KycDocumentType =
  | "national_id"
  | "drivers_license"
  | "passport"
  | "voters_card";
export interface KycDocument {
  id: string;
  userId: string;
  documentType: KycDocumentType;
  documentNumber?: string;
  documentUrl: string;
  status: "pending" | "approved" | "rejected";
  reviewNote?: string | null;
  createdAt: string;
}
export interface KycStatus {
  status: "unsubmitted" | "pending" | "approved" | "rejected";
  documents?: KycDocument[];
}

// ---- Notifications ----
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: string;
  createdAt: string;
}

// ---- Support ----
export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  status: "open" | "pending" | "closed";
  priority?: "low" | "medium" | "high" | "urgent";
  createdAt: string;
}
export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  isFromSupport?: boolean;
  createdAt: string;
}

// ---- Utilities ----
export interface UtilityPurchase {
  id: string;
  userId: string;
  type?: string;
  provider?: string;
  amount: string;
  reference: string;
  status: string;
  createdAt: string;
}

// ---- Admin ----
export interface AdminUser extends User {
  wallets?: UserWallets;
}
export interface AuditLog {
  id: string;
  actorId?: string;
  action:
    | "suspend"
    | "activate"
    | "block"
    | "approve"
    | "reject"
    | "adjust"
    | "create"
    | "update"
    | "delete";
  entityType:
    | "user"
    | "kyc"
    | "withdrawal"
    | "wallet"
    | "plan"
    | "task"
    | "system";
  entityId?: string;
  description?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  createdAt: string;
  actor?: { id: string; name: string; email: string } | null;
  entity?: {
    id: string;
    name?: string;
    email?: string;
    status?: string;
    owner?: string;
    amount?: string;
    price?: string;
    reward?: string;
    reference?: string;
  } | null;
}

// ---- Site content (landing page CMS) ----
export interface SiteContentSections {
  hero: Record<string, unknown>;
  features: { items: { title: string; description: string }[] };
  about: Record<string, unknown>;
  contact: Record<string, unknown>;
  legal: Record<string, unknown>;
  daily_bonus: { enabled: boolean; amount: string };
}
