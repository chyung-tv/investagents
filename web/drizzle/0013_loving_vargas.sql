DROP INDEX "jobs_due_idx";--> statement-breakpoint
CREATE INDEX "jobs_pending_idx" ON "jobs" USING btree ("run_at") WHERE "jobs"."done_at" is null;--> statement-breakpoint
CREATE INDEX "jobs_agent_idx" ON "jobs" USING btree (("payload"->>'agentId'));--> statement-breakpoint
CREATE INDEX "posts_created_idx" ON "posts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "users_kind_idx" ON "users" USING btree ("kind");