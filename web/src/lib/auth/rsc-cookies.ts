/** Next.js throws this when `cookies().set` runs during an RSC GET. */
const COOKIE_MUTATION_MESSAGE = "Cookies can only be modified";

export function isRscCookieMutationError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes(COOKIE_MUTATION_MESSAGE)
  );
}

export function ignoreRscCookieMutation(write: () => void): void {
  try {
    write();
  } catch (error) {
    if (!isRscCookieMutationError(error)) throw error;
  }
}
