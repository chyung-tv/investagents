import { expect, test } from "vitest";
import { SENTRY_IGNORE_ERRORS } from "./sentry-ignore";

test("covers deploy-transient poll and RSC abort messages", () => {
  expect(SENTRY_IGNORE_ERRORS).toEqual(
    expect.arrayContaining([
      "UnrecognizedActionError",
      "Failed to find Server Action",
      "was not found on the server",
      "Failed to fetch",
      "Load failed",
      "The destination stream closed early.",
      "An unexpected response was received from the server.",
    ]),
  );
});
