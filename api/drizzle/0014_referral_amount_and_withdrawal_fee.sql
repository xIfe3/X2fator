ALTER TABLE "plans" ADD COLUMN "referral_reward_amount" numeric(18, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_subscriptions" ADD COLUMN "referral_reward_amount" numeric(18, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "withdrawal_settings" ADD COLUMN "withdrawal_fee_flat" numeric(18, 2) DEFAULT '50' NOT NULL;--> statement-breakpoint
ALTER TABLE "withdrawal_settings" ADD COLUMN "withdrawal_fee_percent" numeric(5, 2) DEFAULT '0' NOT NULL;--> statement-breakpoint
-- Convert the old percentage reward into the naira amount it paid out
-- (commission was amount * rate / 100), so existing plans keep paying the same.
UPDATE "plans" SET "referral_reward_amount" = ROUND("price" * "referral_reward_rate" / 100, 2);--> statement-breakpoint
UPDATE "plan_subscriptions" SET "referral_reward_amount" = ROUND("amount_paid" * "referral_reward_rate" / 100, 2);
