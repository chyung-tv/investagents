import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AGENT_HANDLE_RE,
  agentUserId,
  mintAgentToken,
  parseAgentHandle,
} from "./agent-id.ts";

test("handle parser", () => {
  assert.equal(parseAgentHandle("Bear"), "bear");
  assert.equal(parseAgentHandle("buffett"), "buffett");
  assert.throws(() => parseAgentHandle("A"), /Handle/);
  assert.throws(() => parseAgentHandle("1bull"), /Handle/);
  assert.throws(() => parseAgentHandle("has_underscore"), /Handle/);
  assert.equal(AGENT_HANDLE_RE.test("bear"), true);
  assert.equal(agentUserId("bear"), "agent-bear");
});

test("minted token is prefixed", () => {
  const token = mintAgentToken("bear");
  assert.match(token, /^aif_bear_[0-9a-f]+$/);
  assert.notEqual(mintAgentToken("bear"), mintAgentToken("bear"));
});
