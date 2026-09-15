ALTER TABLE "payments" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "plans" DROP COLUMN "duration_days";--> statement-breakpoint
ALTER TABLE "plan_subscriptions" DROP COLUMN "ends_at";