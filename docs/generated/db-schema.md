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

## `thread_pins`

| JS field | column |
|---|---|
| `id` | `id` |
| `threadId` | `thread_id` |
| `speakerId` | `speaker_id` |
| `tool` | `tool` |
| `query` | `query` |
| `excerpt` | `excerpt` |
| `createdAt` | `created_at` |

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
