import { expect, test } from "vitest";
import {
  isCookieMutationError,
  readSessionWithFallback,
} from "./session-read";

test("isCookieMutationError matches the Next.js RSC cookie write error", () => {
  expect(
    isCookieMutationError(
      new Error(
        "Cookies can only be modified in a Server Action or Route Handler. Read more: https://nextjs.org/docs/app/api-reference/functions/cookies#options",
      ),
    ),
  ).toBe(true);
  expect(isCookieMutationError(new Error("Sign in first."))).toBe(false);
  expect(isCookieMutationError("nope")).toBe(false);
});

test("readSessionWithFallback uses getSession when cookies can be written", async () => {
  const session = await readSessionWithFallback(
    async () => ({ user: { id: "u1" } }),
    async () => {
      throw new Error("fallback should not run");
    },
  );
  expect(session).toEqual({ user: { id: "u1" } });
});

test("readSessionWithFallback reads without writing when RSC forbids Set-Cookie", async () => {
  const session = await readSessionWithFallback(
    async () => {
      throw new Error(
        "Cookies can only be modified in a Server Action or Route Handler.",
      );
    },
    async () => ({ user: { id: "u2" } }),
  );
  expect(session).toEqual({ user: { id: "u2" } });
});

test("readSessionWithFallback does not swallow unrelated errors", async () => {
  await expect(
    readSessionWithFallback(
      async () => {
        throw new Error("upstream 500");
      },
      async () => ({ user: { id: "u3" } }),
    ),
  ).rejects.toThrow(/upstream 500/);
});
