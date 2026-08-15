import { ApiError } from "@/lib/api-util";
import { allowWrite } from "@/lib/rate-limit";

export function assertWriteBudget(userId: string): void {
  if (!allowWrite(userId)) {
    throw new ApiError(429, "Rate limit: 10 writes per minute.");
  }
}
