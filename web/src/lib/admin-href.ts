export function adminHref(input?: {
  agent?: string;
  created?: boolean;
  newAgent?: boolean;
}): string {
  const params = new URLSearchParams();
  if (input?.newAgent) params.set("new", "1");
  else if (input?.agent) {
    params.set("agent", input.agent);
    if (input.created) params.set("created", "1");
  }
  const qs = params.toString();
  return qs ? `/admin?${qs}` : "/admin";
}
