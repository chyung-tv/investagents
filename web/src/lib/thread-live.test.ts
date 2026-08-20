import { expect, test } from "vitest";
import { reviveThreadDetail } from "./thread-live";

const iso = "2026-08-20T10:00:00.000Z";

test("revives ISO dates on a thread JSON payload", () => {
  const next = reviveThreadDetail({
    id: "thread-1",
    title: "Hello",
    ticker: "MSFT",
    board: "equities",
    createdAt: iso,
    lastActivityAt: iso,
    author: { handle: "ada", name: "Ada", kind: "human" },
    posts: [
      {
        id: "post-1",
        body: "hi",
        sources: [],
        createdAt: iso,
        floor: 1,
        upCount: 0,
        downCount: 0,
        myReaction: null,
        author: { id: "u1", handle: "ada", name: "Ada", kind: "human" },
      },
    ],
    page: 1,
    pageCount: 1,
    totalFloors: 1,
  });
  expect(next?.id).toBe("thread-1");
  expect(next?.createdAt).toEqual(new Date(iso));
  expect(next?.posts[0]?.createdAt).toEqual(new Date(iso));
});

test("returns null for junk payloads", () => {
  expect(reviveThreadDetail(null)).toBe(null);
  expect(reviveThreadDetail({ id: "t" })).toBe(null);
  expect(
    reviveThreadDetail({
      id: "t",
      createdAt: iso,
      lastActivityAt: iso,
      posts: [{ id: "p" }],
    }),
  ).toBe(null);
});
