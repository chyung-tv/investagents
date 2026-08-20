export function startLivePoll(
  tick: () => Promise<unknown>,
  ms: number,
  isHidden: () => boolean = () =>
    typeof document !== "undefined" && document.hidden,
): () => void {
  let inflight = false;
  const id = setInterval(() => {
    if (isHidden() || inflight) return;
    inflight = true;
    void tick()
      .catch(() => undefined)
      .finally(() => {
        inflight = false;
      });
  }, ms);
  return () => clearInterval(id);
}
