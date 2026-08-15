"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  className,
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  className: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`${className} cursor-pointer transition-opacity duration-200 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}
