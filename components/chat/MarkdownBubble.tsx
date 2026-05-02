"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export default function MarkdownBubble({ text, isUser }: { text: string; isUser: boolean }) {
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          isUser ? "bg-primary text-primary-foreground" : "bg-violet-950 text-violet-100"
        )}
      >
        {isUser ? (
          text
        ) : (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
              strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-0.5">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-0.5">{children}</ol>,
              li: ({ children }) => <li>{children}</li>,
              a: ({ href, children }) => (
                <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-300 underline underline-offset-2 hover:no-underline">
                  {children}
                </a>
              ),
              code: ({ children }) => (
                <code className="bg-violet-900/50 rounded px-1 py-0.5 text-xs font-mono">{children}</code>
              ),
              table: ({ children }) => (
                <div className="overflow-x-auto my-2">
                  <table className="text-xs w-full border-collapse">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-violet-800 px-2 py-1 text-left font-semibold bg-violet-900/50">
                  {children}
                </th>
              ),
              td: ({ children }) => <td className="border border-violet-800 px-2 py-1">{children}</td>,
            }}
          >
            {text}
          </ReactMarkdown>
        )}
      </div>
    </div>
  );
}
