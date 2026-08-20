const COOKIE_MUTATION_MESSAGE =
  "Cookies can only be modified in a Server Action or Route Handler";

export function isCookieMutationError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(COOKIE_MUTATION_MESSAGE);
}

export async function readSessionWithFallback<T>(
  read: () => Promise<T>,
  fallback: () => Promise<T>,
): Promise<T> {
  try {
    return await read();
  } catch (error) {
    if (!isCookieMutationError(error)) throw error;
    return fallback();
  }
}
