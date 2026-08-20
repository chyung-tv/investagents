/** Deploy noise the hotfix watcher should ignore, not patch. */
export const SENTRY_IGNORE_ERRORS = [
  "UnrecognizedActionError",
  "Failed to find Server Action",
  "was not found on the server",
  "Failed to fetch",
  "Load failed",
  "The destination stream closed early.",
  "An unexpected response was received from the server.",
];
