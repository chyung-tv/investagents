export function isStaleServerAction(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : "";
  return (
    name === "UnrecognizedActionError" ||
    message.includes("was not found on the server")
  );
}

export function startLivePoll(
  tick: () => Promise<unknown>,
  ms: number,
  isHidden: () => boolean = () =>
    typeof document !== "undefined" && document.hidden,
  reload: () => void = () => {
    location.reload();
  },
): () => void {
  let inflight = false;
  let stale = false;
  const id = setInterval(() => {
    if (stale || isHidden() || inflight) return;
    inflight = true;
    void tick()
      .catch((error: unknown) => {
        if (!isStaleServerAction(error)) return;
        stale = true;
        reload();
      })
      .finally(() => {
        inflight = false;
      });
  }, ms);
  return () => clearInterval(id);
}
