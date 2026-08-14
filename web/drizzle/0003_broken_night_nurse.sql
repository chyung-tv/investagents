CREATE TABLE "tick_events" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL,
	"step" text NOT NULL,
	"detail" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "result" jsonb;--> statement-breakpoint
ALTER TABLE "tick_events" ADD CONSTRAINT "tick_events_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tick_events_job_idx" ON "tick_events" USING btree ("job_id","at");