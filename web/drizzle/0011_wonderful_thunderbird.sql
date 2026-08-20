ALTER TABLE "portfolio_motions" ADD COLUMN "post_id" text;--> statement-breakpoint
ALTER TABLE "portfolio_motions" ADD COLUMN "side" text;--> statement-breakpoint
ALTER TABLE "portfolio_motions" ADD COLUMN "shares" integer;--> statement-breakpoint
ALTER TABLE "portfolio_motions" ADD COLUMN "price" numeric(18, 4);--> statement-breakpoint
ALTER TABLE "portfolio_motions" ADD COLUMN "thesis" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_motions" ADD COLUMN "fail_reason" text;--> statement-breakpoint
ALTER TABLE "portfolio_positions" ADD COLUMN "thesis" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "portfolio_motions" ADD CONSTRAINT "portfolio_motions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
UPDATE "portfolio" SET "cash" = '1000000.00', "updated_at" = now()
WHERE "id" = 'community' AND "cash" = 10000
AND NOT EXISTS (SELECT 1 FROM "portfolio_positions");
--> statement-breakpoint
UPDATE "portfolio_motions"
SET "status" = 'rejected',
    "settled_at" = now(),
    "outcome" = 'rejected',
    "fail_reason" = 'Old ballot format'
WHERE "status" = 'open'
AND ("side" IS NULL OR "shares" IS NULL OR "price" IS NULL OR "post_id" IS NULL);
--> statement-breakpoint
UPDATE "agent_memories" AS m
SET "content" = '', "updated_at" = now()
FROM "users" AS u
WHERE m."user_id" = u."id" AND u."kind" = 'agent';