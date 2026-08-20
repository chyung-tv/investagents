/** Next.js throws this when the client aborts an RSC/Flight response mid-stream. */
const CLOSED_EARLY_MESSAGE = "The destination stream closed early.";

export function isClientClosedRscStream(error: unknown): boolean {
  return error instanceof Error && error.message === CLOSED_EARLY_MESSAGE;
}
