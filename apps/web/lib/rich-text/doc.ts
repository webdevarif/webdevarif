/**
 * Task notes are stored as ProseMirror JSON, not HTML.
 *
 * That choice is a security decision, not a stylistic one. The notes on a
 * task can come from three places — the editor, the MCP tool Claude calls,
 * and text a client pasted in — and rendering any of those as HTML would
 * mean `dangerouslySetInnerHTML` and a sanitiser that has to be right every
 * time. Walking a JSON tree and emitting React elements from a fixed map
 * cannot execute anything, so there is no sanitiser to get wrong.
 *
 * The database columns stay `text`; this is what goes in them.
 */

export type RichMark = {
  type: string;
  attrs?: Record<string, unknown> | null;
};

export type RichNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown> | null;
  marks?: RichMark[] | null;
  content?: RichNode[] | null;
};

export type RichDoc = {
  type: "doc";
  content?: RichNode[] | null;
};

/** An empty document — what the editor starts from. */
export function emptyDoc(): RichDoc {
  return { type: "doc", content: [{ type: "paragraph" }] };
}

function looksLikeNode(value: unknown): value is RichNode {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { type?: unknown }).type === "string"
  );
}

/**
 * Turn a stored column value into a document.
 *
 * Anything that is not our JSON — a plain-text report typed before this
 * existed, or one Claude wrote over MCP — becomes paragraphs. That fallback
 * is why the change needed no migration and why MCP can keep sending plain
 * strings.
 */
export function parseDoc(value: string | null | undefined): RichDoc | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (
        looksLikeNode(parsed) &&
        parsed.type === "doc" &&
        (parsed.content == null || Array.isArray(parsed.content))
      ) {
        return parsed as RichDoc;
      }
    } catch {
      // Not our JSON after all. Fall through and treat it as text.
    }
  }

  return textToDoc(trimmed);
}

/**
 * Shape a stored document for Tiptap.
 *
 * `RichNode` tolerates `content: null` because a column can hold anything;
 * Tiptap's `JSONContent` does not. Rather than cast the difference away —
 * which would hand ProseMirror a null it cannot walk — the nulls are dropped
 * here, once, on the way into the editor.
 */
export function toEditorDoc(doc: RichDoc): {
  type: "doc";
  content?: EditorNode[];
} {
  return { type: "doc", ...omitEmpty(doc.content) };
}

type EditorNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: EditorNode[];
};

function omitEmpty(nodes: RichNode[] | null | undefined): {
  content?: EditorNode[];
} {
  if (!nodes?.length) return {};
  return { content: nodes.map(cleanNode) };
}

function cleanNode(node: RichNode): EditorNode {
  const out: EditorNode = { type: node.type };
  if (node.text != null) out.text = node.text;
  if (node.attrs) out.attrs = node.attrs;
  if (node.marks?.length) {
    out.marks = node.marks.map((m) =>
      m.attrs ? { type: m.type, attrs: m.attrs } : { type: m.type },
    );
  }
  if (node.content?.length) out.content = node.content.map(cleanNode);
  return out;
}

/** Plain text in, one paragraph per line out. Blank lines are dropped. */
export function textToDoc(text: string): RichDoc {
  const paragraphs = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map<RichNode>((line) => ({
      type: "paragraph",
      content: [{ type: "text", text: line }],
    }));

  return {
    type: "doc",
    content: paragraphs.length ? paragraphs : [{ type: "paragraph" }],
  };
}

/**
 * True when the document holds nothing worth saving.
 *
 * Tiptap always keeps at least one empty paragraph, so a "blank" editor is
 * never an empty array. Without this check every task would store a note.
 */
export function isEmptyDoc(doc: RichDoc | null | undefined): boolean {
  if (!doc) return true;
  return !hasSubstance(doc.content);
}

function hasSubstance(nodes: RichNode[] | null | undefined): boolean {
  if (!nodes?.length) return false;
  return nodes.some((node) => {
    if (node.type === "text") return Boolean(node.text?.trim());
    if (node.type === "image" || node.type === "horizontalRule") return true;
    return hasSubstance(node.content);
  });
}

/**
 * Flatten to plain text — for card previews, `line-clamp` and anywhere the
 * formatting would only get in the way.
 */
export function docToPlainText(doc: RichDoc | null | undefined): string {
  if (!doc) return "";
  const out: string[] = [];

  const walk = (nodes: RichNode[] | null | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === "text" && node.text) out.push(node.text);
      else if (node.type === "image") out.push("[image]");
      else if (node.type === "hardBreak") out.push(" ");
      walk(node.content);
      if (BLOCK_TYPES.has(node.type)) out.push(" ");
    }
  };

  walk(doc.content);
  return out.join("").replace(/\s+/g, " ").trim();
}

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "listItem",
  "blockquote",
  "codeBlock",
]);

/** How many images the document embeds — shown as a badge on the card. */
export function countImages(doc: RichDoc | null | undefined): number {
  if (!doc) return 0;
  let total = 0;
  const walk = (nodes: RichNode[] | null | undefined) => {
    for (const node of nodes ?? []) {
      if (node.type === "image") total += 1;
      walk(node.content);
    }
  };
  walk(doc.content);
  return total;
}

/**
 * Links are restricted to schemes a browser can safely follow. `javascript:`
 * and `data:` are the ones that matter — both can run script from a click.
 */
export function safeHref(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const href = value.trim();
  if (!href) return null;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  return /^(https?:|mailto:|tel:)/i.test(href) ? href : null;
}

/**
 * Images may come from our own authenticated routes or any https host.
 * `data:` URLs are refused so a pasted megabyte of base64 never ends up in
 * a text column.
 */
export function safeImageSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const src = value.trim();
  if (!src) return null;
  if (src.startsWith("/api/uploads/image?") || src.startsWith("/api/attachments/")) {
    return src;
  }
  return /^https:\/\//i.test(src) ? src : null;
}

/** Read a string attribute without trusting the shape of `attrs`. */
export function attrString(
  attrs: Record<string, unknown> | null | undefined,
  key: string,
): string | undefined {
  const value = attrs?.[key];
  return typeof value === "string" && value ? value : undefined;
}
