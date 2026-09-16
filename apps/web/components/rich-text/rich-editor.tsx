"use client";

import type { ReactNode } from "react";
import { useCallback, useMemo, useRef, useState } from "react";

import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import type { Editor } from "@tiptap/react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

import {
  BoldIcon,
  BulletListIcon,
  CodeBlockIcon,
  DividerIcon,
  HeadingOneIcon,
  HeadingTwoIcon,
  ImageAddIcon,
  ItalicIcon,
  LinkChainIcon,
  NumberedListIcon,
  QuoteIcon,
  RedoIcon,
  StrikethroughIcon,
  UndoIcon,
} from "@kit/ui/icons";

import {
  emptyDoc,
  isEmptyDoc,
  parseDoc,
  toEditorDoc,
} from "@/lib/rich-text/doc";
import type { RichDoc } from "@/lib/rich-text/doc";

/**
 * The note editor used for "what the client asked for" and "what you did".
 *
 * It submits through a hidden input rather than any client-side state, so
 * the existing FormData server actions did not have to change: the field
 * still arrives as `description` or `report`, it just holds JSON now.
 *
 * Images upload the moment they land — pasted, dropped or picked — because
 * the note is a text column and cannot hold bytes. See
 * `app/api/uploads/image/route.ts` for why they need no database row.
 */

type Props = {
  /** Form field name — `description` or `report`. */
  name: string;
  /** Stored column value. Plain text from before this existed is fine. */
  defaultValue?: string | null;
  placeholder?: string;
  disabled?: boolean;
  /** Tailwind min-height for the writing area, e.g. `min-h-32`. */
  minHeight?: string;
  /** False when R2 is unset — the image button says so instead of failing. */
  storageReady?: boolean;
  label?: string;
  hint?: string;
};

export function RichEditor({
  name,
  defaultValue,
  placeholder = "Write something…",
  disabled = false,
  minHeight = "min-h-28",
  storageReady = true,
  label,
  hint,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // What actually gets submitted. It is tracked in state rather than read
  // from the editor during render because Tiptap v3 does not re-render on
  // every transaction — reading it inline would post whatever the note said
  // when the component last happened to render.
  const initial = useMemo(() => serialise(parseDoc(defaultValue)), [defaultValue]);
  const [serialised, setSerialised] = useState(initial);

  // `useEditor` builds its options once, on the render where the editor is
  // still null. Referencing the upload function directly from `editorProps`
  // would freeze that first closure — and it sees `editor === null`, so
  // every pasted image would be dropped on the floor. The ref is refreshed
  // below, after the function exists.
  const uploadRef = useRef<(files: File[]) => Promise<void>>(async () => {});

  const editor = useEditor({
    // Next renders this on the server first; rendering the editor there too
    // is what produces the classic hydration mismatch.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        // The note sits inside a card, so a full-bleed h1 would outrank the
        // page title.
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: "noopener noreferrer nofollow" },
        },
      }),
      Image.configure({
        inline: false,
        // Refused on purpose: a base64 image would be written straight into
        // a text column and bloat every row that reads the task.
        allowBase64: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: toEditorDoc(parseDoc(defaultValue) ?? emptyDoc()),
    onUpdate: ({ editor: e }) => setSerialised(serialise(e.getJSON() as RichDoc)),
    editorProps: {
      attributes: { class: `tiptap ${minHeight} focus:outline-none` },
      handlePaste: (_view, event) => {
        const files = imageFilesFrom(event.clipboardData);
        if (!files.length) return false;
        event.preventDefault();
        void uploadRef.current(files);
        return true;
      },
      handleDrop: (_view, event, _slice, moved) => {
        // `moved` means the user dragged a node around inside the document —
        // let ProseMirror handle that itself.
        if (moved) return false;
        const files = imageFilesFrom((event as DragEvent).dataTransfer ?? null);
        if (!files.length) return false;
        event.preventDefault();
        void uploadRef.current(files);
        return true;
      },
    },
  });

  const uploadAll = useCallback(
    async (files: File[]) => {
      if (!editor) return;
      if (!storageReady) {
        setUploadError("Image storage is not configured, so this cannot be uploaded.");
        return;
      }

      setUploadError(null);
      setUploading((n) => n + files.length);

      for (const file of files) {
        try {
          const body = new FormData();
          body.append("file", file);
          const res = await fetch("/api/uploads/image", {
            method: "POST",
            body,
          });
          const json: unknown = await res.json().catch(() => null);

          if (!res.ok) {
            setUploadError(readError(json) ?? `Upload failed (${res.status}).`);
            continue;
          }
          const url = readUrl(json);
          if (!url) {
            setUploadError("The server did not return an image URL.");
            continue;
          }
          editor
            .chain()
            .focus()
            .setImage({ src: url, alt: file.name })
            .createParagraphNear()
            .run();
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : "Upload failed.");
        } finally {
          setUploading((n) => Math.max(0, n - 1));
        }
      }
    },
    [editor, storageReady],
  );

  uploadRef.current = uploadAll;

  return (
    <div className="space-y-2">
      {label ? (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-label">{label}</span>
          {hint ? <span className="text-comment text-2xs">{hint}</span> : null}
        </div>
      ) : null}

      <div
        className={[
          "overflow-hidden rounded-xl border bg-[var(--card-muted)] transition-colors",
          disabled
            ? "border-border/60 opacity-60"
            : "border-border focus-within:border-primary/50",
        ].join(" ")}
      >
        {editor ? (
          <Toolbar
            editor={editor}
            disabled={disabled}
            storageReady={storageReady}
            onPickImage={() => fileRef.current?.click()}
          />
        ) : (
          <div className="h-10 border-b border-border/70 bg-[var(--card-elevated)]" />
        )}

        <EditorContent editor={editor} className="px-3.5 py-3 text-sm" />

        {uploading > 0 || uploadError ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-border/70 px-3.5 py-2">
            {uploading > 0 ? (
              <span className="text-comment text-xs">
                {`// uploading ${uploading} image${uploading === 1 ? "" : "s"}…`}
              </span>
            ) : null}
            {uploadError ? (
              <span className="text-xs text-destructive" role="alert">
                {uploadError}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <input type="hidden" name={name} value={serialised} readOnly />

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          if (files.length) void uploadAll(files);
        }}
      />
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────

/**
 * Split out so it mounts only once the editor exists, which is what lets
 * `useEditorState` take a non-null editor and subscribe to transactions.
 * Without that subscription the active states never repaint as the caret
 * moves.
 */
function Toolbar({
  editor,
  disabled,
  storageReady,
  onPickImage,
}: {
  editor: Editor;
  disabled: boolean;
  storageReady: boolean;
  onPickImage: () => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      strike: e.isActive("strike"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      codeBlock: e.isActive("codeBlock"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });

  const openLink = () => {
    setLinkValue((editor.getAttributes("link").href as string) ?? "");
    setLinkOpen(true);
  };

  const applyLink = () => {
    const href = linkValue.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (href) chain.setLink({ href }).run();
    else chain.unsetLink().run();
    setLinkOpen(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/70 bg-[var(--card-elevated)] px-2 py-1.5">
        <Tool
          label="Bold"
          shortcut="Ctrl+B"
          icon={BoldIcon}
          active={state.bold}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <Tool
          label="Italic"
          shortcut="Ctrl+I"
          icon={ItalicIcon}
          active={state.italic}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <Tool
          label="Strikethrough"
          icon={StrikethroughIcon}
          active={state.strike}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />

        <Divider />

        <Tool
          label="Heading"
          icon={HeadingOneIcon}
          active={state.h2}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        />
        <Tool
          label="Subheading"
          icon={HeadingTwoIcon}
          active={state.h3}
          disabled={disabled}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        />
        <Tool
          label="Bullet list"
          icon={BulletListIcon}
          active={state.bullet}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <Tool
          label="Numbered list"
          icon={NumberedListIcon}
          active={state.ordered}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <Tool
          label="Quote"
          icon={QuoteIcon}
          active={state.quote}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <Tool
          label="Code block"
          icon={CodeBlockIcon}
          active={state.codeBlock}
          disabled={disabled}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <Tool
          label="Divider"
          icon={DividerIcon}
          disabled={disabled}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        />

        <Divider />

        <Tool
          label={state.link ? "Edit link" : "Add link"}
          icon={LinkChainIcon}
          active={state.link || linkOpen}
          disabled={disabled}
          onClick={openLink}
        />
        <Tool
          label={
            storageReady
              ? "Insert image — you can also paste or drop one"
              : "Set the R2 keys to upload images"
          }
          icon={ImageAddIcon}
          disabled={disabled || !storageReady}
          onClick={onPickImage}
        />

        <div className="ml-auto flex items-center gap-0.5">
          <Tool
            label="Undo"
            icon={UndoIcon}
            disabled={disabled || !state.canUndo}
            onClick={() => editor.chain().focus().undo().run()}
          />
          <Tool
            label="Redo"
            icon={RedoIcon}
            disabled={disabled || !state.canRedo}
            onClick={() => editor.chain().focus().redo().run()}
          />
        </div>
      </div>

      {linkOpen ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/70 bg-[var(--card-elevated)]/60 px-2 py-2">
          <input
            autoFocus
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
            placeholder="https://…"
            className="h-8 min-w-0 flex-1 rounded-md border border-border bg-background px-2.5 font-mono text-xs outline-none focus:border-primary/50"
          />
          <button
            type="button"
            onClick={applyLink}
            className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
          >
            {linkValue.trim() ? "Apply" : "Remove"}
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="h-8 rounded-md px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </>
  );
}

function Divider() {
  return <span aria-hidden className="mx-1 h-5 w-px bg-border" />;
}

function Tool({
  label,
  shortcut,
  icon: Icon,
  active = false,
  disabled = false,
  onClick,
}: {
  label: string;
  shortcut?: string;
  icon: (props: { className?: string }) => ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      // Buttons inside a form default to submit — one click on Bold would
      // otherwise save the task.
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      aria-label={label}
      title={shortcut ? `${label} (${shortcut})` : label}
      data-active={active || undefined}
      className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-35 data-[active]:bg-primary/15 data-[active]:text-primary"
    >
      <Icon className="size-4" />
    </button>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────

/**
 * An empty document submits as "" so the action stores NULL, rather than a
 * lone paragraph that renders as a blank line forever.
 */
function serialise(doc: RichDoc | null | undefined): string {
  return !doc || isEmptyDoc(doc) ? "" : JSON.stringify(doc);
}

function imageFilesFrom(data: DataTransfer | null): File[] {
  if (!data) return [];
  return Array.from(data.files).filter((f) => f.type.startsWith("image/"));
}

function readError(json: unknown): string | null {
  if (typeof json === "object" && json !== null && "error" in json) {
    const { error } = json as { error?: unknown };
    if (typeof error === "string") return error;
  }
  return null;
}

function readUrl(json: unknown): string | null {
  if (typeof json === "object" && json !== null && "url" in json) {
    const { url } = json as { url?: unknown };
    if (typeof url === "string") return url;
  }
  return null;
}
