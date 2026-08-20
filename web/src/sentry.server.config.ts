import * as Sentry from "@sentry/nextjs";
import { SENTRY_IGNORE_ERRORS } from "@/lib/sentry-ignore";

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,

  ignoreErrors: SENTRY_IGNORE_ERRORS,
});
