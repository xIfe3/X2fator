CREATE TABLE "utility_beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" "network_provider" NOT NULL,
	"phone_number" varchar(20) NOT NULL,
	"label" varchar(60),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "utility_beneficiaries" ADD CONSTRAINT "utility_beneficiaries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "utility_beneficiaries_user_idx" ON "utility_beneficiaries" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "utility_beneficiaries_user_phone_provider_unique" ON "utility_beneficiaries" USING btree ("user_id","phone_number","provider");