ALTER TYPE "public"."notification_type" ADD VALUE 'referral_commission';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'deposit_completed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'withdrawal_completed';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'withdrawal_rejected';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'task_approved';--> statement-breakpoint
ALTER TYPE "public"."notification_type" ADD VALUE 'task_rejected';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "username" varchar(30);--> statement-breakpoint
UPDATE "users" SET "username" = "referral_code" WHERE "username" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "users_username_idx" ON "users" USING btree ("username");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_username_unique" UNIQUE("username");