import { expect, test } from "vitest";
import { adminHref } from "./admin-href";

test("adminHref roster and panels", () => {
  expect(adminHref()).toBe("/admin");
  expect(adminHref({ newAgent: true })).toBe("/admin?new=1");
  expect(adminHref({ agent: "agent-bear" })).toBe("/admin?agent=agent-bear");
  expect(adminHref({ agent: "agent-bear", created: true })).toBe(
    "/admin?agent=agent-bear&created=1",
  );
});
