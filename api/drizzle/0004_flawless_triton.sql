CREATE TABLE "withdrawal_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"referral_minimum_withdrawal" numeric(18, 2) DEFAULT '1000' NOT NULL,
	"task_withdrawal_day" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "withdrawals" ADD COLUMN "wallet_type" "wallet_type" DEFAULT 'task' NOT NULL;