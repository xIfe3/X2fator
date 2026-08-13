CREATE TABLE "plan_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"bank_code" varchar(20) NOT NULL,
	"bank_name" varchar(150) NOT NULL,
	"account_number" varchar(20) NOT NULL,
	"account_name" varchar(150) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "task_completions" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "task_completions" ALTER COLUMN "status" SET DEFAULT 'pending'::text;--> statement-breakpoint
DROP TYPE "public"."task_completion_status";--> statement-breakpoint
CREATE TYPE "public"."task_completion_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "task_completions" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."task_completion_status";--> statement-breakpoint
ALTER TABLE "task_completions" ALTER COLUMN "status" SET DATA TYPE "public"."task_completion_status" USING "status"::"public"."task_completion_status";--> statement-breakpoint
ALTER TABLE "utility_purchases" ALTER COLUMN "metadata" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "plan_subscriptions" ADD COLUMN "daily_task_limit" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_subscriptions" ADD COLUMN "daily_reward" numeric(18, 2) NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_subscriptions" ADD COLUMN "referral_reward_rate" numeric(8, 4) NOT NULL;--> statement-breakpoint
ALTER TABLE "task_completions" ADD COLUMN "submission_data" jsonb;--> statement-breakpoint
ALTER TABLE "task_completions" ADD COLUMN "screenshot_url" text;--> statement-breakpoint
ALTER TABLE "task_completions" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "task_completions" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "task_completions" ADD COLUMN "rejection_reason" text;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "source_subscription_id" uuid;--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "commission_reference" varchar(150);--> statement-breakpoint
ALTER TABLE "referrals" ADD COLUMN "commission_paid_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD CONSTRAINT "plan_tasks_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_tasks" ADD CONSTRAINT "plan_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bank_accounts" ADD CONSTRAINT "user_bank_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_tasks_plan_idx" ON "plan_tasks" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_tasks_task_idx" ON "plan_tasks" USING btree ("task_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plan_tasks_plan_task_unique" ON "plan_tasks" USING btree ("plan_id","task_id");--> statement-breakpoint
CREATE INDEX "user_bank_accounts_user_idx" ON "user_bank_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_bank_accounts_account_number_idx" ON "user_bank_accounts" USING btree ("account_number");--> statement-breakpoint
CREATE UNIQUE INDEX "user_bank_accounts_user_account_unique" ON "user_bank_accounts" USING btree ("user_id","account_number");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_id_users_id_fk" FOREIGN KEY ("referred_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_source_subscription_id_plan_subscriptions_id_fk" FOREIGN KEY ("source_subscription_id") REFERENCES "public"."plan_subscriptions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "role_permissions_role_permission_unique" ON "role_permissions" USING btree ("role_id","permission_id");--> statement-breakpoint
CREATE INDEX "task_completions_status_idx" ON "task_completions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "referrals_source_subscription_idx" ON "referrals" USING btree ("source_subscription_id");--> statement-breakpoint
CREATE INDEX "utility_purchases_provider_reference_idx" ON "utility_purchases" USING btree ("provider_reference");--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_commission_reference_unique" UNIQUE("commission_reference");