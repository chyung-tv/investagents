import * as Sentry from "@sentry/nextjs";
import { SENTRY_IGNORE_ERRORS } from "@/lib/sentry-ignore";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,

  // 100% in dev, 10% in production
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  ignoreErrors: SENTRY_IGNORE_ERRORS,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
