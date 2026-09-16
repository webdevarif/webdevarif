import type { ReactNode } from "react";
import { Fragment } from "react";

import type { RichMark, RichNode } from "@/lib/rich-text/doc";
import {
  attrString,
  docToPlainText,
  isEmptyDoc,
  parseDoc,
  safeHref,
  safeImageSrc,
} from "@/lib/rich-text/doc";

/**
 * Render a stored task note.
 *
 * Every node type is looked up in a fixed map and anything unrecognised is
 * dropped, so there is no path from stored content to executed markup. See
 * `lib/rich-text/doc.ts` for why the notes are JSON in the first place.
 */

export function RichText({
  value,
  className,
}: {
  value: string | null | undefined;
  className?: string;
}) {
  const doc = parseDoc(value);
  if (isEmptyDoc(doc)) return null;

  return (
    <div className={["rich-text", className].filter(Boolean).join(" ")}>
      <Nodes nodes={doc?.content} />
    </div>
  );
}

function Nodes({ nodes }: { nodes: RichNode[] | null | undefined }) {
  return (
    <>
      {(nodes ?? []).map((node, i) => (
        <Node key={i} node={node} />
      ))}
    </>
  );
}

function Node({ node }: { node: RichNode }): ReactNode {
  switch (node.type) {
    case "text":
      return <Text node={node} />;

    case "paragraph":
      return (
        <p>
          <Nodes nodes={node.content} />
        </p>
      );

    case "heading": {
      // Only h2/h3 exist in the editor; anything else is clamped into range
      // so a pasted h1 cannot outrank the page title.
      const level = Number(node.attrs?.level);
      const Tag = level <= 2 ? "h2" : ("h3" as const);
      return (
        <Tag>
          <Nodes nodes={node.content} />
        </Tag>
      );
    }

    case "bulletList":
      return (
        <ul>
          <Nodes nodes={node.content} />
        </ul>
      );

    case "orderedList":
      return (
        <ol start={Number(node.attrs?.start) || undefined}>
          <Nodes nodes={node.content} />
        </ol>
      );

    case "listItem":
      return (
        <li>
          <Nodes nodes={node.content} />
        </li>
      );

    case "blockquote":
      return (
        <blockquote>
          <Nodes nodes={node.content} />
        </blockquote>
      );

    case "codeBlock":
      return (
        <pre>
          <code>
            <Nodes nodes={node.content} />
          </code>
        </pre>
      );

    case "horizontalRule":
      return <hr />;

    case "hardBreak":
      return <br />;

    case "image": {
      const src = safeImageSrc(node.attrs?.src);
      if (!src) return null;
      const alt = attrString(node.attrs, "alt") ?? "";
      const title = attrString(node.attrs, "title");
      return (
        // Not next/image: these are private, authenticated, arbitrary-size
        // uploads, so the optimiser would only add a fetch that cannot see
        // the session cookie.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} title={title} loading="lazy" />
      );
    }

    default:
      // Unknown node — render whatever children it has and drop the wrapper,
      // so an extension added later degrades to its text instead of vanishing.
      return <Nodes nodes={node.content} />;
  }
}

/** Applies marks from the inside out so nesting order stays stable. */
function Text({ node }: { node: RichNode }) {
  if (!node.text) return null;

  let out: ReactNode = node.text;
  for (const mark of node.marks ?? []) {
    out = <Marked mark={mark}>{out}</Marked>;
  }
  return <Fragment>{out}</Fragment>;
}

function Marked({ mark, children }: { mark: RichMark; children: ReactNode }) {
  switch (mark.type) {
    case "bold":
      return <strong>{children}</strong>;
    case "italic":
      return <em>{children}</em>;
    case "strike":
      return <s>{children}</s>;
    case "underline":
      return <u>{children}</u>;
    case "code":
      return <code>{children}</code>;
    case "link": {
      const href = safeHref(mark.attrs?.href);
      if (!href) return <>{children}</>;
      return (
        <a href={href} target="_blank" rel="noopener noreferrer nofollow">
          {children}
        </a>
      );
    }
    default:
      return <>{children}</>;
  }
}

/** Flattened preview for collapsed cards and list rows. */
export function RichTextExcerpt({
  value,
  lines = 2,
  className,
}: {
  value: string | null | undefined;
  lines?: 1 | 2 | 3;
  className?: string;
}) {
  const text = docToPlainText(parseDoc(value));
  if (!text) return null;

  const clamp =
    lines === 1 ? "line-clamp-1" : lines === 3 ? "line-clamp-3" : "line-clamp-2";

  return <p className={[clamp, className].filter(Boolean).join(" ")}>{text}</p>;
}
