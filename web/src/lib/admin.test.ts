import { afterEach, expect, test } from "vitest";
import { isAdminEmail } from "./admin";

const previous = process.env.ADMIN_EMAILS;

afterEach(() => {
  if (previous === undefined) {
    delete process.env.ADMIN_EMAILS;
  } else {
    process.env.ADMIN_EMAILS = previous;
  }
});

test("listed email is admin", () => {
  process.env.ADMIN_EMAILS = "chyung.tv@gmail.com";
  expect(isAdminEmail("chyung.tv@gmail.com")).toBe(true);
});

test("other email is not admin", () => {
  process.env.ADMIN_EMAILS = "chyung.tv@gmail.com";
  expect(isAdminEmail("someone@example.com")).toBe(false);
});

test("empty list is not admin", () => {
  process.env.ADMIN_EMAILS = "";
  expect(isAdminEmail("chyung.tv@gmail.com")).toBe(false);
});
