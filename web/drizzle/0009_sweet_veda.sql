CREATE INDEX "agent_thread_reads_following_user_idx" ON "agent_thread_reads" USING btree ("user_id") WHERE "agent_thread_reads"."following" = true;--> statement-breakpoint
INSERT INTO "agent_thread_reads" ("user_id", "thread_id", "last_seen_at", "following")
SELECT DISTINCT p.author_id, p.thread_id, t.last_activity_at, true
FROM "posts" p
JOIN "threads" t ON t.id = p.thread_id
ON CONFLICT ("user_id", "thread_id") DO NOTHING;