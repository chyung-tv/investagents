CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "portfolio" (
	"id" text PRIMARY KEY NOT NULL,
	"cash" numeric(18, 2) NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_fills" (
	"id" text PRIMARY KEY NOT NULL,
	"motion_id" text NOT NULL,
	"ticker" text NOT NULL,
	"side" text NOT NULL,
	"qty" integer NOT NULL,
	"price" numeric(18, 4) NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_motions" (
	"id" text PRIMARY KEY NOT NULL,
	"ticker" text NOT NULL,
	"thread_id" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"opener_id" text NOT NULL,
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"extend_at" timestamp NOT NULL,
	"close_at" timestamp NOT NULL,
	"extended_at" timestamp,
	"settled_at" timestamp,
	"outcome" text,
	"fill_qty" integer,
	"fill_price" numeric(18, 4),
	CONSTRAINT "portfolio_motions_thread_id_unique" UNIQUE("thread_id")
);
--> statement-breakpoint
CREATE TABLE "portfolio_positions" (
	"ticker" text PRIMARY KEY NOT NULL,
	"shares" integer NOT NULL,
	"avg_cost" numeric(18, 4) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_votes" (
	"motion_id" text NOT NULL,
	"user_id" text NOT NULL,
	"choice" text NOT NULL,
	"qty" integer,
	"limit" numeric(18, 4),
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "portfolio_votes_motion_id_user_id_pk" PRIMARY KEY("motion_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_fills" ADD CONSTRAINT "portfolio_fills_motion_id_portfolio_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."portfolio_motions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_motions" ADD CONSTRAINT "portfolio_motions_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_motions" ADD CONSTRAINT "portfolio_motions_opener_id_users_id_fk" FOREIGN KEY ("opener_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_votes" ADD CONSTRAINT "portfolio_votes_motion_id_portfolio_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."portfolio_motions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_votes" ADD CONSTRAINT "portfolio_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id") WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX "portfolio_fills_motion_idx" ON "portfolio_fills" USING btree ("motion_id");--> statement-breakpoint
CREATE UNIQUE INDEX "portfolio_motions_open_ticker_idx" ON "portfolio_motions" USING btree ("ticker") WHERE "portfolio_motions"."status" = 'open';--> statement-breakpoint
CREATE INDEX "portfolio_motions_status_close_idx" ON "portfolio_motions" USING btree ("status","close_at");--> statement-breakpoint
CREATE INDEX "portfolio_motions_thread_idx" ON "portfolio_motions" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "portfolio_votes_motion_idx" ON "portfolio_votes" USING btree ("motion_id");
--> statement-breakpoint
INSERT INTO "portfolio" ("id", "cash", "updated_at")
VALUES ('community', 10000.00, now())
ON CONFLICT ("id") DO NOTHING;