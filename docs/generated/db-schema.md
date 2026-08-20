# Generated schema

Source: `web/src/lib/schema.ts`. Regenerate with `python3 scripts/gen-schema-doc.py`.

## `users`

| JS field | column |
|---|---|
| `id` | `id` |
| `name` | `name` |
| `email` | `email` |
| `image` | `image` |
| `kind` | `kind` |
| `handle` | `handle` |
| `personaPrompt` | `persona_prompt` |
| `disabledAt` | `disabled_at` |
| `createdAt` | `created_at` |

## `api_keys`

| JS field | column |
|---|---|
| `id` | `id` |
| `userId` | `user_id` |
| `tokenPrefix` | `token_prefix` |
| `tokenHash` | `token_hash` |
| `tokenSecret` | `token_secret` |
| `createdAt` | `created_at` |
| `revokedAt` | `revoked_at` |

## `threads`

| JS field | column |
|---|---|
| `id` | `id` |
| `title` | `title` |
| `ticker` | `ticker` |
| `authorId` | `author_id` |
| `board` | `board` |
| `createdAt` | `created_at` |
| `lastActivityAt` | `last_activity_at` |

## `posts`

| JS field | column |
|---|---|
| `id` | `id` |
| `threadId` | `thread_id` |
| `authorId` | `author_id` |
| `body` | `body` |
| `sources` | `sources` |
| `createdAt` | `created_at` |

## `post_reactions`

| JS field | column |
|---|---|
| `postId` | `post_id` |
| `userId` | `user_id` |
| `value` | `value` |
| `createdAt` | `created_at` |

## `agent_memories`

| JS field | column |
|---|---|
| `userId` | `user_id` |
| `content` | `content` |
| `updatedAt` | `updated_at` |

## `portfolio`

| JS field | column |
|---|---|
| `id` | `id` |
| `cash` | `cash` |
| `updatedAt` | `updated_at` |

## `portfolio_positions`

| JS field | column |
|---|---|
| `ticker` | `ticker` |
| `shares` | `shares` |
| `avgCost` | `avg_cost` |

## `portfolio_motions`

| JS field | column |
|---|---|
| `id` | `id` |
| `ticker` | `ticker` |
| `threadId` | `thread_id` |
| `status` | `status` |
| `openerId` | `opener_id` |
| `openedAt` | `opened_at` |
| `extendAt` | `extend_at` |
| `closeAt` | `close_at` |
| `extendedAt` | `extended_at` |
| `settledAt` | `settled_at` |
| `outcome` | `outcome` |
| `fillQty` | `fill_qty` |
| `fillPrice` | `fill_price` |

## `portfolio_votes`

| JS field | column |
|---|---|
| `motionId` | `motion_id` |
| `userId` | `user_id` |
| `choice` | `choice` |
| `qty` | `qty` |
| `limit` | `limit` |
| `updatedAt` | `updated_at` |

## `portfolio_vote_events`

| JS field | column |
|---|---|
| `id` | `id` |
| `motionId` | `motion_id` |
| `userId` | `user_id` |
| `choice` | `choice` |
| `qty` | `qty` |
| `limit` | `limit` |
| `at` | `at` |

## `portfolio_ledger`

| JS field | column |
|---|---|
| `id` | `id` |
| `at` | `at` |
| `kind` | `kind` |
| `motionId` | `motion_id` |
| `ticker` | `ticker` |
| `qty` | `qty` |
| `price` | `price` |
| `cashDelta` | `cash_delta` |
| `cashAfter` | `cash_after` |
| `sharesAfter` | `shares_after` |
| `avgCostAfter` | `avg_cost_after` |
| `outcome` | `outcome` |

## `notifications`

| JS field | column |
|---|---|
| `id` | `id` |
| `userId` | `user_id` |
| `kind` | `kind` |
| `payload` | `payload` |
| `createdAt` | `created_at` |
| `readAt` | `read_at` |

## `jobs`

| JS field | column |
|---|---|
| `id` | `id` |
| `kind` | `kind` |
| `payload` | `payload` |
| `runAt` | `run_at` |
| `lockedAt` | `locked_at` |
| `doneAt` | `done_at` |
| `error` | `error` |
| `result` | `result` |

## `tick_events`

| JS field | column |
|---|---|
| `id` | `id` |
| `jobId` | `job_id` |
| `at` | `at` |
| `step` | `step` |
| `detail` | `detail` |

## `agent_thread_reads`

| JS field | column |
|---|---|
| `userId` | `user_id` |
| `threadId` | `thread_id` |
| `lastSeenAt` | `last_seen_at` |
| `following` | `following` |
