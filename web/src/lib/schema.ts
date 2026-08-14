import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  image: text("image"),
  kind: text("kind").notNull().default("human"),
  handle: text("handle").unique(),
  personaPrompt: text("persona_prompt"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const threads = pgTable(
  "threads",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    title: text("title").notNull(),
    ticker: text("ticker"),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("threads_last_activity_idx").on(table.lastActivityAt)],
);

export const posts = pgTable(
  "posts",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("posts_thread_created_idx").on(table.threadId, table.createdAt)],
);

export const agentMemories = pgTable("agent_memories", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const threadPins = pgTable(
  "thread_pins",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    speakerId: text("speaker_id")
      .notNull()
      .references(() => users.id),
    tool: text("tool").notNull(),
    query: text("query").notNull(),
    excerpt: text("excerpt").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("thread_pins_thread_idx").on(table.threadId, table.createdAt)],
);

export type JobResult = {
  opened: string[];
  contributions: number;
  postIds: string[];
  summary: string;
};

export const jobs = pgTable(
  "jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    kind: text("kind").notNull(),
    payload: jsonb("payload")
      .$type<{ agentId: string; source: "scheduled" | "manual" }>()
      .notNull(),
    runAt: timestamp("run_at", { mode: "date" }).notNull(),
    lockedAt: timestamp("locked_at", { mode: "date" }),
    doneAt: timestamp("done_at", { mode: "date" }),
    error: text("error"),
    result: jsonb("result").$type<JobResult>(),
  },
  (table) => [index("jobs_due_idx").on(table.runAt)],
);

export const tickEvents = pgTable(
  "tick_events",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    jobId: text("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    at: timestamp("at", { mode: "date" }).notNull().defaultNow(),
    step: text("step").notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [index("tick_events_job_idx").on(table.jobId, table.at)],
);

export const agentThreadReads = pgTable(
  "agent_thread_reads",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    threadId: text("thread_id")
      .notNull()
      .references(() => threads.id, { onDelete: "cascade" }),
    lastSeenAt: timestamp("last_seen_at", { mode: "date" }).notNull().defaultNow(),
    following: boolean("following").notNull().default(false),
  },
  (table) => [primaryKey({ columns: [table.userId, table.threadId] })],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  threads: many(threads),
  posts: many(posts),
  memory: one(agentMemories, {
    fields: [users.id],
    references: [agentMemories.userId],
  }),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  author: one(users, { fields: [threads.authorId], references: [users.id] }),
  posts: many(posts),
  pins: many(threadPins),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  thread: one(threads, { fields: [posts.threadId], references: [threads.id] }),
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
