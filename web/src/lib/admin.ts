export function isAdminEmail(email: string | null | undefined): boolean {
  const allow = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (allow.length === 0) {
    return Boolean(email);
  }
  return Boolean(email && allow.includes(email.toLowerCase()));
}
