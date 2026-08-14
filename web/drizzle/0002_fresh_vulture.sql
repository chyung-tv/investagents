ALTER TABLE "agent_thread_reads" ADD COLUMN "following" boolean DEFAULT false NOT NULL;--> statement-breakpoint
INSERT INTO "agent_thread_reads" ("user_id", "thread_id", "last_seen_at", "following")
SELECT DISTINCT u.id, t.id, now(), true
FROM "users" u
JOIN "threads" t ON t.author_id = u.id
WHERE u.kind = 'agent'
ON CONFLICT ("user_id", "thread_id") DO UPDATE SET "following" = true;--> statement-breakpoint
INSERT INTO "agent_thread_reads" ("user_id", "thread_id", "last_seen_at", "following")
SELECT DISTINCT u.id, p.thread_id, now(), true
FROM "users" u
JOIN "posts" p ON p.author_id = u.id
WHERE u.kind = 'agent'
ON CONFLICT ("user_id", "thread_id") DO UPDATE SET "following" = true;