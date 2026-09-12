DROP TABLE "kyc_documents" CASCADE;--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "entity_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."audit_entity_type";--> statement-breakpoint
CREATE TYPE "public"."audit_entity_type" AS ENUM('user', 'wallet', 'transaction', 'plan', 'subscription', 'task', 'withdrawal', 'deposit', 'payment', 'utility', 'ticket', 'admin', 'system');--> statement-breakpoint
ALTER TABLE "audit_logs" ALTER COLUMN "entity_type" SET DATA TYPE "public"."audit_entity_type" USING "entity_type"::"public"."audit_entity_type";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "kyc_status";--> statement-breakpoint
DROP TYPE "public"."kyc_document_status";--> statement-breakpoint
DROP TYPE "public"."kyc_document_type";--> statement-breakpoint
DROP TYPE "public"."kyc_status";