import { expect, test } from "vitest";
import { parseLimit, ticketsFromVote } from "./vote-ticket";

test("parseLimit accepts integers and rounds to 4 decimals", () => {
  expect(parseLimit(240)).toBe(240);
  expect(parseLimit(240.0)).toBe(240);
  expect(parseLimit("240" as unknown as number)).toBeNull();
  expect(parseLimit(240.12345)).toBe(240.1235);
  expect(parseLimit(0)).toBeNull();
  expect(parseLimit(-1)).toBeNull();
});

test("ticketsFromVote keeps integer buy limits", () => {
  expect(ticketsFromVote({ choice: "buy", qty: 10, limit: 240 })).toEqual({
    qty: 10,
    limit: "240.0000",
  });
});
