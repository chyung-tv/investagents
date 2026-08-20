import { createNeonAuth } from "@neondatabase/auth/next/server";
import {
  createAuthServer,
  extractNeonAuthCookies,
  type CookieOptions,
} from "@neondatabase/auth/server";
import { cookies, headers } from "next/headers";
import { ignoreRscCookieMutation } from "@/lib/auth/rsc-cookies";

const baseUrl = process.env.NEON_AUTH_BASE_URL!;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET!;

export const auth = createNeonAuth({
  baseUrl,
  cookies: {
    secret: cookieSecret,
    sameSite: "lax",
  },
});

async function createRscRequestContext() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  return {
    getCookies() {
      return extractNeonAuthCookies(headerStore.get("cookie") ?? "");
    },
    setCookie(name: string, value: string, options: CookieOptions) {
      ignoreRscCookieMutation(() => {
        cookieStore.set(name, value, options);
      });
    },
    getHeader(name: string) {
      return headerStore.get(name) ?? null;
    },
    getOrigin() {
      return (
        headerStore.get("origin") ||
        headerStore.get("referer")?.split("/").slice(0, 3).join("/") ||
        ""
      );
    },
    getFramework() {
      return "nextjs";
    },
  };
}

/**
 * Session reads for RSC. Neon Auth's default adapter calls `cookies().set`
 * when it refreshes the session-data cookie; Next.js forbids that on GET
 * renders and 500s `/t/[id]`.
 */
export const rscAuth = createAuthServer({
  baseUrl,
  cookieSecret,
  sameSite: "lax",
  context: createRscRequestContext,
});
