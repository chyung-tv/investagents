import { afterEach, expect, test, vi } from "vitest";
import { fetchLiveJson, isStaleServerAction, startLivePoll } from "./live-poll";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function unrecognizedAction() {
  const error = new Error(
    'Server Action "test-action-id" was not found on the server.',
  );
  error.name = "UnrecognizedActionError";
  return error;
}

test.each(["Failed to fetch", "Load failed"])(
  "swallows a rejected tick (%s) so the next interval still runs",
  async (message) => {
    vi.useFakeTimers();
    const tick = vi
      .fn()
      .mockRejectedValueOnce(new TypeError(message))
      .mockResolvedValueOnce(undefined);
    const reload = vi.fn();
    const stop = startLivePoll(tick, 4000, () => false, reload);
    await vi.advanceTimersByTimeAsync(4000);
    expect(tick).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(4000);
    expect(tick).toHaveBeenCalledTimes(2);
    expect(reload).not.toHaveBeenCalled();
    stop();
  },
);

test("skips ticks while hidden", async () => {
  vi.useFakeTimers();
  const tick = vi.fn().mockResolvedValue(undefined);
  const stop = startLivePoll(tick, 4000, () => true);
  await vi.advanceTimersByTimeAsync(8000);
  expect(tick).not.toHaveBeenCalled();
  stop();
});

test("does not start a second tick while one is in flight", async () => {
  vi.useFakeTimers();
  let resolveTick = () => undefined;
  const tick = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveTick = resolve;
      }),
  );
  const stop = startLivePoll(tick, 4000, () => false);
  await vi.advanceTimersByTimeAsync(4000);
  expect(tick).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(4000);
  expect(tick).toHaveBeenCalledTimes(1);
  resolveTick();
  await Promise.resolve();
  await vi.advanceTimersByTimeAsync(4000);
  expect(tick).toHaveBeenCalledTimes(2);
  stop();
});

test("reloads once when Next cannot find the server action", async () => {
  vi.useFakeTimers();
  const tick = vi.fn().mockRejectedValue(unrecognizedAction());
  const reload = vi.fn();
  const stop = startLivePoll(tick, 4000, () => false, reload);
  await vi.advanceTimersByTimeAsync(4000);
  expect(reload).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(8000);
  expect(tick).toHaveBeenCalledTimes(1);
  expect(reload).toHaveBeenCalledTimes(1);
  stop();
});

test("isStaleServerAction matches Next's missing-action error", () => {
  expect(isStaleServerAction(unrecognizedAction())).toBe(true);
  expect(isStaleServerAction(new TypeError("Failed to fetch"))).toBe(false);
  expect(isStaleServerAction("nope")).toBe(false);
});

test("fetchLiveJson returns JSON when the response is ok", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ id: "n1", href: "/t/1", label: "hi" }],
    }),
  );
  await expect(fetchLiveJson("/api/live/inbox")).resolves.toEqual([
    { id: "n1", href: "/t/1", label: "hi" },
  ]);
});

test("fetchLiveJson 404 is not a stale server action", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: "Thread not found." }),
    }),
  );
  const error = await fetchLiveJson("/api/live/threads/missing").then(
    () => {
      throw new Error("expected reject");
    },
    (reason: unknown) => reason,
  );
  expect(error).toBeInstanceOf(Error);
  expect((error as Error).message).toBe("Live poll 404");
  expect(isStaleServerAction(error)).toBe(false);
});

test("fetchLiveJson revives payloads and rejects junk", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "t1" }),
    }),
  );
  await expect(
    fetchLiveJson("/api/live/threads/t1", () => ({ id: "t1" })),
  ).resolves.toEqual({ id: "t1" });
  await expect(fetchLiveJson("/api/live/threads/t1", () => null)).rejects.toThrow(
    "Live poll payload",
  );
});
