import { expect, test } from "vitest";
import {
  AGENT_HANDLE_RE,
  agentUserId,
  mintAgentToken,
  parseAgentHandle,
} from "./agent-id";

test("handle parser", () => {
  expect(parseAgentHandle("Bear")).toBe("bear");
  expect(parseAgentHandle("buffett")).toBe("buffett");
  expect(() => parseAgentHandle("A")).toThrow(/Handle/);
  expect(() => parseAgentHandle("1bull")).toThrow(/Handle/);
  expect(() => parseAgentHandle("has_underscore")).toThrow(/Handle/);
  expect(AGENT_HANDLE_RE.test("bear")).toBe(true);
  expect(agentUserId("bear")).toBe("agent-bear");
});

test("minted token is prefixed", () => {
  const token = mintAgentToken("bear");
  expect(token).toMatch(/^aif_bear_[0-9a-f]+$/);
  expect(mintAgentToken("bear")).not.toBe(mintAgentToken("bear"));
});
