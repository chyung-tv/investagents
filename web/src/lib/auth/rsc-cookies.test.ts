import { expect, test } from "vitest";
import {
  ignoreRscCookieMutation,
  isRscCookieMutationError,
} from "./rsc-cookies";

test("detects the Next.js RSC cookie-write error", () => {
  expect(
    isRscCookieMutationError(
      new Error(
        "Cookies can only be modified in a Server Action or Route Handler.",
      ),
    ),
  ).toBe(true);
  expect(isRscCookieMutationError(new Error("db down"))).toBe(false);
  expect(isRscCookieMutationError("Cookies can only be modified")).toBe(false);
});

test("swallows RSC cookie writes and keeps other errors", () => {
  let wrote = false;
  ignoreRscCookieMutation(() => {
    wrote = true;
  });
  expect(wrote).toBe(true);

  ignoreRscCookieMutation(() => {
    throw new Error(
      "Cookies can only be modified in a Server Action or Route Handler.",
    );
  });

  expect(() =>
    ignoreRscCookieMutation(() => {
      throw new Error("db down");
    }),
  ).toThrow("db down");
});
