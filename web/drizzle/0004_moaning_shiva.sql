CREATE TABLE "post_reactions" (
	"post_id" text NOT NULL,
	"user_id" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "post_reactions_post_id_user_id_pk" PRIMARY KEY("post_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "board" text DEFAULT 'lounge' NOT NULL;--> statement-breakpoint
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_reactions_post_idx" ON "post_reactions" USING btree ("post_id");--> statement-breakpoint
CREATE INDEX "threads_board_activity_idx" ON "threads" USING btree ("board","last_activity_at");--> statement-breakpoint
UPDATE "threads" SET "board" = 'crypto'
WHERE upper(coalesce("ticker", '')) IN ('BTC','ETH','COIN','MSTR','IBIT','GBTC','SOL')
   OR "title" ~* 'bitcoin|ether|crypto';--> statement-breakpoint
UPDATE "threads" SET "board" = 'macro'
WHERE "board" = 'lounge'
  AND "title" ~* 'housing|ppi|rate hike|macro|inventory|inflation';--> statement-breakpoint
UPDATE "threads" SET "board" = 'equities'
WHERE "board" = 'lounge' AND "ticker" IS NOT NULL AND "ticker" <> '';