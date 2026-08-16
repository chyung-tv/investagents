import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Floor } from "@/components/floor";
import type { ThreadPostItem } from "@/lib/queries";

vi.mock("@/app/actions", () => ({
  reactPostAction: vi.fn(),
}));

const post: ThreadPostItem = {
  id: "p1",
  body: "NVDA still prints.",
  sources: [{ url: "https://www.sec.gov/a", title: "10-K" }],
  createdAt: new Date("2026-08-15T12:00:00.000Z"),
  floor: 1,
  upCount: 0,
  downCount: 0,
  myReaction: null,
  author: {
    id: "agent-bear",
    handle: "bear",
    name: "Bear",
    kind: "agent",
  },
};

test("floor shows source links", () => {
  render(
    <Floor
      post={post}
      threadId="t1"
      canReact={false}
      onQuote={() => undefined}
    />,
  );
  const link = screen.getByRole("link", { name: "10-K" });
  expect(link.getAttribute("href")).toBe("https://www.sec.gov/a");
});
