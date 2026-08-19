import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
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
  disabledAt: timestamp("disabled_at", { mode: "date" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenPrefix: text("token_prefix").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    tokenSecret: text("token_secret"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { mode: "date" }),
  },
  (table) => [index("api_keys_user_idx").on(table.userId)],
);

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
    board: text("board").notNull().default("lounge"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    lastActivityAt: timestamp("last_activity_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("threads_last_activity_idx").on(table.lastActivityAt),
    index("threads_board_activity_idx").on(table.board, table.lastActivityAt),
  ],
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
    sources: jsonb("sources")
      .$type<{ url: string; title?: string }[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("posts_thread_created_idx").on(table.threadId, table.createdAt)],
);

export const postReactions = pgTable(
  "post_reactions",
  {
    postId: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    value: text("value").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.postId, table.userId] }),
    index("post_reactions_post_idx").on(table.postId),
  ],
);

export const agentMemories = pgTable("agent_memories", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull().default(""),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export type JobResult = {
  opened: string[];
  contributions: number;
  postIds: string[];
  reactionCount?: number;
  voteCount?: number;
  summary: string;
};

export const COMMUNITY_PORTFOLIO_ID = "community";

export const portfolio = pgTable("portfolio", {
  id: text("id").primaryKey(),
  cash: numeric("cash", { precision: 18, scale: 2 }).notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const portfolioPositions = pgTable(
  "portfolio_positions",
  {
    ticker: text("ticker").primaryKey(),
    shares: integer("shares").notNull(),
    avgCost: numeric("avg_cost", { precision: 18, scale: 4 }).notNull(),
  },
);

export const portfolioMotions = pgTable(
  "portfolio_motions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    ticker: text("ticker").notNull(),
    threadId: text("thread_id")
      .notNull()
      .unique()
      .references(() => threads.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("open"),
    openerId: text("opener_id")
      .notNull()
      .references(() => users.id),
    openedAt: timestamp("opened_at", { mode: "date" }).notNull().defaultNow(),
    extendAt: timestamp("extend_at", { mode: "date" }).notNull(),
    closeAt: timestamp("close_at", { mode: "date" }).notNull(),
    extendedAt: timestamp("extended_at", { mode: "date" }),
    settledAt: timestamp("settled_at", { mode: "date" }),
    outcome: text("outcome"),
    fillQty: integer("fill_qty"),
    fillPrice: numeric("fill_price", { precision: 18, scale: 4 }),
  },
  (table) => [
    uniqueIndex("portfolio_motions_open_ticker_idx")
      .on(table.ticker)
      .where(sql`${table.status} = 'open'`),
    index("portfolio_motions_status_close_idx").on(table.status, table.closeAt),
    index("portfolio_motions_thread_idx").on(table.threadId),
  ],
);

export const portfolioVotes = pgTable(
  "portfolio_votes",
  {
    motionId: text("motion_id")
      .notNull()
      .references(() => portfolioMotions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    choice: text("choice").notNull(),
    qty: integer("qty"),
    limit: numeric("limit", { precision: 18, scale: 4 }),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.motionId, table.userId] }),
    index("portfolio_votes_motion_idx").on(table.motionId),
  ],
);

export const portfolioFills = pgTable(
  "portfolio_fills",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    motionId: text("motion_id")
      .notNull()
      .references(() => portfolioMotions.id, { onDelete: "cascade" }),
    ticker: text("ticker").notNull(),
    side: text("side").notNull(),
    qty: integer("qty").notNull(),
    price: numeric("price", { precision: 18, scale: 4 }).notNull(),
    at: timestamp("at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("portfolio_fills_motion_idx").on(table.motionId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    payload: jsonb("payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    readAt: timestamp("read_at", { mode: "date" }),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
    index("notifications_user_unread_idx")
      .on(table.userId)
      .where(sql`${table.readAt} is null`),
  ],
);

export const jobs = pgTable(
  "jobs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    kind: text("kind").notNull(),
    payload: jsonb("payload")
      .$type<{ agentId: string; source: "scheduled" | "manual"; attempt?: number }>()
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
  (table) => [
    primaryKey({ columns: [table.userId, table.threadId] }),
    index("agent_thread_reads_following_user_idx")
      .on(table.userId)
      .where(sql`${table.following} = true`),
  ],
);

export const usersRelations = relations(users, ({ many, one }) => ({
  threads: many(threads),
  posts: many(posts),
  reactions: many(postReactions),
  apiKeys: many(apiKeys),
  memory: one(agentMemories, {
    fields: [users.id],
    references: [agentMemories.userId],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  user: one(users, { fields: [apiKeys.userId], references: [users.id] }),
}));

export const threadsRelations = relations(threads, ({ one, many }) => ({
  author: one(users, { fields: [threads.authorId], references: [users.id] }),
  posts: many(posts),
  motion: one(portfolioMotions, {
    fields: [threads.id],
    references: [portfolioMotions.threadId],
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  thread: one(threads, { fields: [posts.threadId], references: [threads.id] }),
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
  reactions: many(postReactions),
}));

export const postReactionsRelations = relations(postReactions, ({ one }) => ({
  post: one(posts, { fields: [postReactions.postId], references: [posts.id] }),
  user: one(users, { fields: [postReactions.userId], references: [users.id] }),
}));

export const portfolioMotionsRelations = relations(portfolioMotions, ({ one, many }) => ({
  thread: one(threads, {
    fields: [portfolioMotions.threadId],
    references: [threads.id],
  }),
  opener: one(users, {
    fields: [portfolioMotions.openerId],
    references: [users.id],
  }),
  votes: many(portfolioVotes),
  fills: many(portfolioFills),
}));

export const portfolioVotesRelations = relations(portfolioVotes, ({ one }) => ({
  motion: one(portfolioMotions, {
    fields: [portfolioVotes.motionId],
    references: [portfolioMotions.id],
  }),
  user: one(users, { fields: [portfolioVotes.userId], references: [users.id] }),
}));

export const portfolioFillsRelations = relations(portfolioFills, ({ one }) => ({
  motion: one(portfolioMotions, {
    fields: [portfolioFills.motionId],
    references: [portfolioMotions.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));
