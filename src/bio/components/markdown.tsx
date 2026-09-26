import { Fragment, type ReactNode } from "react";
import { parseMarkdown, type Block, type Inline } from "@/lib/markdown";
import "../prose.css";

function renderInline(nodes: Inline[], keyPrefix: string): ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (node.kind) {
      case "text":
        return <Fragment key={key}>{node.value}</Fragment>;
      case "strong":
        return <strong key={key}>{renderInline(node.children, key)}</strong>;
      case "em":
        return <em key={key}>{renderInline(node.children, key)}</em>;
      case "code":
        return (
          <code key={key} className="lv-md-code">
            {node.value}
          </code>
        );
      case "link": {
        const external = /^https?:/i.test(node.href);
        return (
          <a
            key={key}
            href={node.href}
            className="lv-md-link"
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          >
            {renderInline(node.children, key)}
          </a>
        );
      }
    }
  });
}

function renderBlocks(blocks: Block[], keyPrefix: string): ReactNode[] {
  return blocks.map((block, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (block.kind) {
      case "heading": {
        const Tag = `h${Math.min(6, block.level + 1)}` as "h2";
        return <Tag key={key}>{renderInline(block.children, key)}</Tag>;
      }
      case "paragraph":
        return <p key={key}>{renderInline(block.children, key)}</p>;
      case "list": {
        const Tag = block.ordered ? "ol" : "ul";
        return (
          <Tag key={key}>
            {block.items.map((item, j) => (
              <li key={`${key}-${j}`}>{renderInline(item, `${key}-${j}`)}</li>
            ))}
          </Tag>
        );
      }
      case "quote":
        return (
          <blockquote key={key}>{renderBlocks(block.children, key)}</blockquote>
        );
      case "code":
        return (
          <pre key={key} data-lang={block.lang}>
            <code>{block.value}</code>
          </pre>
        );
      case "rule":
        return <hr key={key} />;
    }
  });
}

/** Vuelca markdown como elementos React. Sin HTML, sin `dangerouslySetInnerHTML`. */
export function Markdown({ source, className = "" }: { source: string; className?: string }) {
  const blocks = parseMarkdown(source);
  if (blocks.length === 0) return null;
  return (
    <div className={`lv-md ${className}`.trim()}>{renderBlocks(blocks, "md")}</div>
  );
}
