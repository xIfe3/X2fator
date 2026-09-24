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
  username: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  gender?: "male" | "female" | "other" | null;
  referralCode: string;
  referredById?: string | null;
  status: "active" | "suspended" | "blocked" | "pending";
  loginCount?: number;
  lastLoginAt?: string | null;
  createdAt?: string;
  roles?: string[];
  permissions?: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

// Returned by POST /auth/register when a plan purchase is required —
// the account is created as status='pending' and needs the linked
// Flutterwave payment to succeed before login tokens are ever issued.
// Payment happens in-app via authApi.chargeRegistration (bank transfer /
// USSD), same as wallet deposits.
export interface RegisterInitResponse {
  userId: string;
  paymentReference: string;
  amount: string;
  planName: string;
}

export interface ChargeDetails {
  method: "bank_transfer" | "ussd";
  reference: string;
  amount: string;
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  expiresAt?: string;
  ussdCode?: string;
}

// Returned by POST /auth/register instead, when the platform's
// requirePlanPurchase feature flag is off — the account activates
// immediately and login tokens are issued right away, same shape as a
// normal login response.
export type RegisterResponse = RegisterInitResponse | AuthResponse;

// GET /auth/me only echoes the JWT payload (CurrentUser decorator), not
// the full user record — id/email/roles only. Don't rely on it for
// profile fields like firstName/status; use the cached login/register
// user for those instead (see lib/auth-context.tsx).
export interface AuthMeResponse {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
}

// ---- Wallet ----
export interface Wallet {
  id: string;
  userId: string;
  type: "account" | "task" | "referral";
  balance: string;
  status: string;
}
export interface UserWallets {
  account: Wallet;
  task: Wallet;
  referral: Wallet;
}
export type AdType =
  | "app_download"
  | "followers"
  | "subscribers"
  | "comments"
  | "likes";

export type AdPricing = Record<AdType, string>;

export interface Ad {
  id: string;
  userId: string;
  adType: AdType;
  title: string;
  description?: string | null;
  targetUrl: string;
  budget: string;
  quantity: number;
  pricePerUnit: string;
  remainingSlots: number;
  taskId?: string | null;
  status: "pending" | "active" | "paused" | "completed" | "rejected";
  createdAt: string;
}

export interface AdWithRequester extends Ad {
  requester: { id: string; name: string; email: string } | null;
}

export interface CreateAdInput {
  adType: AdType;
  title: string;
  description?: string;
  targetUrl: string;
  quantity: number;
}
export interface AdminWalletDetails {
  user: { id: string; name: string; email: string };
  wallets: UserWallets;
  transactions: Array<
    WalletTransaction & {
      walletType: "account" | "task" | "referral";
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
export interface PaginatedTransactions {
  items: WalletTransaction[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
export interface DailyBonusStatus {
  enabled: boolean;
  claimed: boolean;
  amount: string;
  currentStreak: number;
  longestStreak: number;
  nextStreak: number;
  nextIsMilestone: boolean;
  milestoneDays: number;
  nextClaimAt: string | null;
}

export interface AdminBonusSettings {
  enabled: boolean;
  amount: string;
  milestoneAmount: string;
}

export interface AdminBonusStats {
  claimedToday: number;
  totalPaid: string;
  topStreaks: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    currentStreak: number;
    longestStreak: number;
    lastBonusClaimDate: string | null;
  }[];
}

// ---- Deposits / Payments ----
export type DepositProvider = "flutterwave" | "manual" | "mock";
export interface AdminDeposit {
  id: string;
  userId: string;
  userFirstName: string;
  userLastName: string;
  userEmail: string;
  amount: number;
  currency: string;
  provider: DepositProvider;
  providerReference?: string | null;
  reference: string;
  status: string;
  failureReason?: string | null;
  createdAt: string;
}
export interface AdminDepositDetail extends AdminDeposit {
  paidAt?: string | null;
  updatedAt?: string;
  payment: {
    id: string;
    reference: string;
    providerReference?: string | null;
    status: string;
    rawResponse?: string | null;
  } | null;
}
export interface AdminDepositStats {
  totalCount: number;
  totalAmount: string;
  successfulCount: number;
  successfulAmount: string;
  pendingCount: number;
  pendingAmount: string;
  failedCount: number;
  failedAmount: string;
}
export interface Deposit {
  id: string;
  userId: string;
  amount: string;
  currency?: string;
  provider: DepositProvider;
  providerReference?: string | null;
  status: "pending" | "processing" | "successful" | "failed" | "rejected";
  reference?: string;
  failureReason?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

// ---- Withdrawals ----
export interface Withdrawal {
  id: string;
  userId: string;
  walletType: "task" | "referral";
  amount: string;
  fee?: string;
  netAmount?: string;
  bankName: string;
  bankCode?: string | null;
  accountNumber: string;
  accountName: string;
  transactionReference?: string;
  status: "pending" | "processing" | "completed" | "rejected" | "cancelled";
  rejectionReason?: string | null;
  adminNote?: string | null;
  createdAt: string;
  processedAt?: string | null;
}

export interface WithdrawalSettings {
  id: number;
  referralMinimumWithdrawal: string;
  taskWithdrawalDay: number;
  autoPayoutEnabled: boolean;
  withdrawalFeeFlat: string;
  withdrawalFeePercent: string;
  updatedAt: string;
}
export interface WithdrawalStats {
  totalCount: number;
  totalAmount: string;
  pendingCount: number;
  pendingAmount: string;
  completedCount: number;
  completedAmount: string;
  rejectedCount: number;
  rejectedAmount: string;
}

// ---- Plans / Subscriptions ----
export interface Plan {
  id: string;
  name: string;
  description?: string;
  price: string;
  rank: number;
  dailyTaskLimit?: number;
  dailyReward?: string;
  referralRewardAmount?: string;
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
  amountPaid: string;
  dailyTaskLimit: number;
  dailyReward: string;
  referralRewardAmount: string;
  status: "pending" | "active" | "completed" | "cancelled" | "expired";
  startsAt: string;
  createdAt?: string;
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
  source?: "admin" | "ad";
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

export interface ReferralLeaderboardEntry {
  userId: string;
  firstName: string;
  lastName: string;
  totalEarned: string;
}
export interface Referral {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  createdAt: string;
}

// ---- Notifications ----
export type NotificationType =
  | "general"
  | "deposit"
  | "withdrawal"
  | "plan"
  | "task"
  | "referral"
  | "security"
  | "system"
  | "referral_commission"
  | "deposit_completed"
  | "withdrawal_completed"
  | "withdrawal_rejected"
  | "task_approved"
  | "task_rejected";

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  type?: NotificationType;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

// ---- Support ----
export interface SupportTicket {
  id: string;
  userId: string;
  assignedTo?: string | null;
  subject: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string | null;
}
export interface AdminSupportTicket extends SupportTicket {
  requesterFirstName: string;
  requesterLastName: string;
  requesterEmail: string;
}
export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  message: string;
  isFromSupport?: boolean;
  createdAt: string;
}
export interface AdminSupportTicketDetail extends SupportTicket {
  requester: { id: string; name: string; email: string } | null;
  messages: SupportMessage[];
}

// ---- Roles & staff ----
export interface Permission {
  id: string;
  name: string;
  description: string | null;
}

export interface RoleWithPermissions {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissions: string[];
  staffCount: number;
}

export interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  roles: { id: string; name: string }[];
}

// ---- Utilities ----
export interface UtilityPurchase {
  id: string;
  userId: string;
  type?: "airtime" | "data";
  provider?: "mtn" | "airtel" | "glo" | "9mobile";
  phoneNumber?: string;
  amount: string;
  reference: string;
  status: "pending" | "processing" | "successful" | "failed" | "reversed";
  responseMessage?: string | null;
  createdAt: string;
}

export interface DataBundle {
  biller_code: string;
  item_code: string;
  name: string;
  biller_name: string;
  amount: number | null;
  is_airtime: boolean;
}

export interface UtilityBeneficiary {
  id: string;
  provider: "mtn" | "airtel" | "glo" | "9mobile";
  phoneNumber: string;
  label?: string | null;
  isDefault: boolean;
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
    | "reset_password"
    | "delete";
  entityType:
    | "user"
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
  stats?: { items: { value: string; label: string }[] };
  testimonials?: { items: { quote: string; name: string; role: string }[] };
  faq?: { items: { question: string; answer: string }[] };
  daily_bonus: { enabled: boolean; amount: string };
  welcome_bonus: { enabled: boolean; amount: string };
  feature_flags?: { requirePlanPurchase: boolean; adsEnabled: boolean };
  telegram?: { enabled: boolean; channelUrl: string; groupUrl?: string };
}
