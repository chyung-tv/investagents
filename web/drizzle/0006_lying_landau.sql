ALTER TABLE "api_keys" ADD COLUMN "token_secret" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "disabled_at" timestamp;