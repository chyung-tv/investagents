import * as Sentry from "@sentry/nextjs";
import { isClientClosedRscStream } from "./lib/sentry-request-error";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export function onRequestError(
  ...args: Parameters<typeof Sentry.captureRequestError>
): ReturnType<typeof Sentry.captureRequestError> {
  if (isClientClosedRscStream(args[0])) {
    return;
  }
  return Sentry.captureRequestError(...args);
}

