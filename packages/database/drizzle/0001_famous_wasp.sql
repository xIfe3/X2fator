CREATE TYPE "public"."earning_source" AS ENUM('task', 'referral', 'bonus', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."earning_status" AS ENUM('pending', 'credited', 'reversed', 'cancelled');--> statement-breakpoint
CREATE TABLE "earnings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source" "earning_source" NOT NULL,
	"amount" numeric(20, 2) NOT NULL,
	"status" "earning_status" DEFAULT 'credited' NOT NULL,
	"reference" varchar(100) NOT NULL,
	"description" text,
	"metadata" jsonb,
	"earning_date" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "earnings_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "deposits" DROP CONSTRAINT "deposits_user_id_users_id_fk";
--> statement-breakpoint
DROP INDEX "deposits_reference_idx";--> statement-breakpoint
ALTER TABLE "deposits" ALTER COLUMN "amount" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "deposits" ALTER COLUMN "provider" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "deposits" ALTER COLUMN "reference" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "deposits" ALTER COLUMN "provider_reference" SET DATA TYPE varchar(150);--> statement-breakpoint
ALTER TABLE "deposits" ALTER COLUMN "status" SET DATA TYPE varchar(30);--> statement-breakpoint
ALTER TABLE "deposits" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "deposits" ALTER COLUMN "metadata" SET DATA TYPE jsonb;--> statement-breakpoint
ALTER TABLE "deposits" ADD COLUMN "currency" varchar(3) DEFAULT 'NGN' NOT NULL;--> statement-breakpoint
ALTER TABLE "earnings" ADD CONSTRAINT "earnings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "earnings_user_idx" ON "earnings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "earnings_source_idx" ON "earnings" USING btree ("source");--> statement-breakpoint
CREATE INDEX "earnings_date_idx" ON "earnings" USING btree ("earning_date");--> statement-breakpoint
CREATE INDEX "earnings_status_idx" ON "earnings" USING btree ("status");--> statement-breakpoint
ALTER TABLE "deposits" ADD CONSTRAINT "deposits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "deposits_provider_reference_idx" ON "deposits" USING btree ("provider_reference");