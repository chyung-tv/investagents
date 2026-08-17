export type AuthMode = "signin" | "signup";

export function isAuthMode(value: string | null | undefined): value is AuthMode {
  return value === "signin" || value === "signup";
}

export function shouldShowAuthModal(
  signedIn: boolean,
  mode: string | null | undefined,
): boolean {
  return !signedIn && isAuthMode(mode);
}

export function safeNextPath(value: unknown): string {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

export function stripAuthParam(path: string): string {
  const url = new URL(path, "http://local.invalid");
  url.searchParams.delete("auth");
  const qs = url.searchParams.toString();
  return qs ? `${url.pathname}?${qs}` : url.pathname;
}

export function signInRedirect(next?: string): string {
  const safe = next ? safeNextPath(next) : "/";
  if (safe === "/") return "/?auth=signin";
  return `/?auth=signin&next=${encodeURIComponent(safe)}`;
}
