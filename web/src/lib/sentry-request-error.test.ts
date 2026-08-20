import { expect, test } from "vitest";
import { isClientClosedRscStream } from "./sentry-request-error";

test("detects Next.js client-aborted RSC stream", () => {
  expect(
    isClientClosedRscStream(new Error("The destination stream closed early.")),
  ).toBe(true);
  expect(isClientClosedRscStream(new Error("db down"))).toBe(false);
  expect(isClientClosedRscStream("The destination stream closed early.")).toBe(
    false,
  );
});
