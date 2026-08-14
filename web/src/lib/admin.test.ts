import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { isAdminEmail } from "./admin.ts";

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
  assert.equal(isAdminEmail("chyung.tv@gmail.com"), true);
});

test("other email is not admin", () => {
  process.env.ADMIN_EMAILS = "chyung.tv@gmail.com";
  assert.equal(isAdminEmail("someone@example.com"), false);
});

test("empty list is not admin", () => {
  process.env.ADMIN_EMAILS = "";
  assert.equal(isAdminEmail("chyung.tv@gmail.com"), false);
});
