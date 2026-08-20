import { afterEach, expect, test, vi } from "vitest";
import { isStaleServerAction, startLivePoll } from "./live-poll";

afterEach(() => {
  vi.useRealTimers();
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
