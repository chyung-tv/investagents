CREATE TABLE "portfolio_vote_events" (
	"id" text PRIMARY KEY NOT NULL,
	"motion_id" text NOT NULL,
	"user_id" text NOT NULL,
	"choice" text NOT NULL,
	"qty" integer,
	"limit" numeric(18, 4),
	"at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_ledger" (
	"id" text PRIMARY KEY NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL,
	"kind" text NOT NULL,
	"motion_id" text,
	"ticker" text,
	"qty" integer,
	"price" numeric(18, 4),
	"cash_delta" numeric(18, 2) NOT NULL,
	"cash_after" numeric(18, 2) NOT NULL,
	"shares_after" integer,
	"avg_cost_after" numeric(18, 4),
	"outcome" text
);
--> statement-breakpoint
ALTER TABLE "portfolio_vote_events" ADD CONSTRAINT "portfolio_vote_events_motion_id_portfolio_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."portfolio_motions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_vote_events" ADD CONSTRAINT "portfolio_vote_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_ledger" ADD CONSTRAINT "portfolio_ledger_motion_id_portfolio_motions_id_fk" FOREIGN KEY ("motion_id") REFERENCES "public"."portfolio_motions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "portfolio_vote_events_motion_at_idx" ON "portfolio_vote_events" USING btree ("motion_id","at");--> statement-breakpoint
CREATE INDEX "portfolio_vote_events_user_idx" ON "portfolio_vote_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "portfolio_ledger_at_idx" ON "portfolio_ledger" USING btree ("at");--> statement-breakpoint
CREATE INDEX "portfolio_ledger_motion_idx" ON "portfolio_ledger" USING btree ("motion_id");
--> statement-breakpoint
INSERT INTO "portfolio_ledger" (
	"id", "at", "kind", "cash_delta", "cash_after"
)
SELECT
	'seed',
	COALESCE((SELECT MIN("updated_at") FROM "portfolio"), now()),
	'seed',
	10000.00,
	10000.00
WHERE NOT EXISTS (SELECT 1 FROM "portfolio_ledger" WHERE "id" = 'seed');
--> statement-breakpoint
DO $$
DECLARE
	r RECORD;
	cash numeric := 10000;
	delta numeric;
	sh int;
	avg numeric;
BEGIN
	CREATE TEMP TABLE IF NOT EXISTS _ledger_pos (
		ticker text PRIMARY KEY,
		shares int NOT NULL,
		avg_cost numeric NOT NULL
	) ON COMMIT DROP;
	FOR r IN
		SELECT * FROM portfolio_fills ORDER BY at, id
	LOOP
		SELECT shares, avg_cost INTO sh, avg FROM _ledger_pos WHERE ticker = r.ticker;
		IF NOT FOUND THEN
			sh := 0;
			avg := 0;
		END IF;
		IF r.side = 'buy' THEN
			delta := -(r.qty * r.price);
			IF sh + r.qty = 0 THEN
				avg := 0;
			ELSE
				avg := (sh * avg + r.qty * r.price) / (sh + r.qty);
			END IF;
			sh := sh + r.qty;
		ELSE
			delta := r.qty * r.price;
			sh := sh - r.qty;
			IF sh <= 0 THEN
				sh := 0;
				avg := 0;
			END IF;
		END IF;
		cash := cash + delta;
		INSERT INTO _ledger_pos (ticker, shares, avg_cost)
		VALUES (r.ticker, sh, avg)
		ON CONFLICT (ticker) DO UPDATE SET shares = EXCLUDED.shares, avg_cost = EXCLUDED.avg_cost;
		INSERT INTO portfolio_ledger (
			id, at, kind, motion_id, ticker, qty, price,
			cash_delta, cash_after, shares_after, avg_cost_after
		) VALUES (
			'fill-' || r.id,
			r.at,
			r.side,
			r.motion_id,
			r.ticker,
			r.qty,
			r.price,
			delta,
			cash,
			sh,
			avg
		);
	END LOOP;
	FOR r IN
		SELECT * FROM portfolio_motions
		WHERE status = 'settled'
			AND fill_qty IS NULL
			AND NOT EXISTS (
				SELECT 1 FROM portfolio_ledger l WHERE l.motion_id = portfolio_motions.id
			)
		ORDER BY settled_at, id
	LOOP
		SELECT shares, avg_cost INTO sh, avg FROM _ledger_pos WHERE ticker = r.ticker;
		INSERT INTO portfolio_ledger (
			id, at, kind, motion_id, ticker, cash_delta, cash_after,
			shares_after, avg_cost_after, outcome
		) VALUES (
			'nofill-' || r.id,
			COALESCE(r.settled_at, now()),
			'no_fill',
			r.id,
			r.ticker,
			0,
			cash,
			COALESCE(sh, 0),
			COALESCE(avg, 0),
			r.outcome
		);
	END LOOP;
END $$;
--> statement-breakpoint
INSERT INTO "portfolio_vote_events" (
	"id", "motion_id", "user_id", "choice", "qty", "limit", "at"
)
SELECT 'vote-' || "motion_id" || '-' || "user_id", "motion_id", "user_id", "choice", "qty", "limit", "updated_at"
FROM "portfolio_votes";
--> statement-breakpoint
ALTER TABLE "portfolio_fills" DROP CONSTRAINT "portfolio_fills_motion_id_portfolio_motions_id_fk";
--> statement-breakpoint
DROP INDEX "portfolio_fills_motion_idx";
--> statement-breakpoint
DROP TABLE "portfolio_fills";
