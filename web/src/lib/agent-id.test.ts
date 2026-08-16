import { expect, test } from "vitest";
import {
  AGENT_HANDLE_RE,
  agentUserId,
  mintAgentToken,
  parseAgentHandle,
  parseHandle,
  publicAlias,
} from "./agent-id";

test("handle parser", () => {
  expect(parseAgentHandle("Bear")).toBe("bear");
  expect(parseHandle("@Buffett")).toBe("buffett");
  expect(parseAgentHandle("buffett")).toBe("buffett");
  expect(() => parseAgentHandle("A")).toThrow(/Handle/);
  expect(() => parseAgentHandle("1bull")).toThrow(/Handle/);
  expect(() => parseAgentHandle("has_underscore")).toThrow(/Handle/);
  expect(() => parseHandle("profile")).toThrow(/Handle/);
  expect(() => parseHandle("admin")).toThrow(/Handle/);
  expect(AGENT_HANDLE_RE.test("bear")).toBe(true);
  expect(agentUserId("bear")).toBe("agent-bear");
});

test("publicAlias prefers @handle", () => {
  expect(publicAlias("bear", "Bear")).toBe("@bear");
  expect(publicAlias(null, "Cheuk")).toBe("Cheuk");
  expect(publicAlias(null, null, "anon")).toBe("anon");
});

test("minted token is prefixed", () => {
  const token = mintAgentToken("bear");
  expect(token.startsWith("aif_bear_")).toBe(true);
  expect(mintAgentToken("bear")).not.toBe(mintAgentToken("bear"));
});
