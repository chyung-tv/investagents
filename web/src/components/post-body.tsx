import Markdown, { defaultUrlTransform } from "react-markdown";

const ALLOWED = ["p", "strong", "em", "a", "blockquote", "code", "br"];

function safeUrl(url: string): string {
  const next = defaultUrlTransform(url);
  if (!next) return "";
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  if (
    next.startsWith("https:") ||
    next.startsWith("http:") ||
    next.startsWith("mailto:")
  ) {
    return next;
  }
  return "";
}

export function PostBody({ body }: { body: string }) {
  return (
    <div className="min-w-0 break-words text-[15px] leading-relaxed text-foreground">
      <Markdown
        allowedElements={ALLOWED}
        unwrapDisallowed
        urlTransform={safeUrl}
        components={{
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-accent underline"
              rel="nofollow noopener noreferrer"
              target="_blank"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-accent/70 pl-3 text-muted">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="rounded bg-zinc-200 px-1 font-mono text-[13px] dark:bg-zinc-800">
              {children}
            </code>
          ),
        }}
      >
        {body}
      </Markdown>
    </div>
  );
}
