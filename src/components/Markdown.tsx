import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// 약관·정책 본문 등 정적 마크다운을 통일된 톤으로 렌더.
// @tailwindcss/typography 없이 최소 스타일만 적용.
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed space-y-3">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="text-2xl font-bold mt-2 mb-3" {...p} />,
          h2: (p) => <h2 className="text-lg font-semibold mt-5 mb-2 text-fg" {...p} />,
          h3: (p) => <h3 className="text-base font-semibold mt-4 mb-1.5" {...p} />,
          p: (p) => <p className="my-2 leading-relaxed" {...p} />,
          ul: (p) => <ul className="list-disc pl-6 my-2 space-y-1" {...p} />,
          ol: (p) => <ol className="list-decimal pl-6 my-2 space-y-1" {...p} />,
          li: (p) => <li className="leading-relaxed" {...p} />,
          strong: (p) => <strong className="font-semibold text-fg" {...p} />,
          em: (p) => <em className="italic" {...p} />,
          a: (p) => <a className="text-accent underline underline-offset-2 hover:opacity-80" target="_blank" rel="noopener" {...p} />,
          hr: () => <hr className="my-4 border-border" />,
          code: (p) => <code className="px-1 py-0.5 rounded bg-panel2 text-xs" {...p} />,
          blockquote: (p) => <blockquote className="border-l-2 border-border pl-3 text-muted my-3" {...p} />,
          table: (p) => (
            <div className="overflow-x-auto my-3">
              <table className="w-full text-xs border border-border rounded" {...p} />
            </div>
          ),
          thead: (p) => <thead className="bg-panel2" {...p} />,
          th: (p) => <th className="px-3 py-2 text-left font-medium border-b border-border" {...p} />,
          td: (p) => <td className="px-3 py-2 border-b border-border align-top" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
