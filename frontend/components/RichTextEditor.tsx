"use client";

// Reusable CMS rich text field. Backed by Tiptap; saves/loads a plain HTML string so it
// works as a drop-in replacement for a <textarea> bound to a string field -- no schema
// change on either the CMS form state or the Supabase-backed settings/project/blog record
// it writes into (see lib/richText.ts for the plain-text <-> HTML compatibility layer).
//
// Enter starts a new paragraph, Shift+Enter inserts a line break within the same
// paragraph -- both are Tiptap/ProseMirror's built-in StarterKit keymap, not something
// wired up here.

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, Unlink, Eraser } from "lucide-react";
import { toEditableHtml } from "@/lib/richText";

const RC = { P: "var(--c-p,#8B5CF6)", MID: "var(--c-mid,#A892C6)", BORDER: "rgba(255,255,255,0.10)" };

function ToolbarButton({
  label, active, disabled, onClick, children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={!!active}
      disabled={disabled}
      // Keep the editor's own text selection/focus intact -- a normal button click
      // would otherwise blur the editor before the command runs.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 30, height: 28, border: "none", borderRadius: 3, padding: 0,
        background: active ? RC.P : "transparent",
        color: active ? "#09060E" : disabled ? "#444" : RC.MID,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder,
  minHeight = 140,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" },
        },
      }),
      Placeholder.configure({ placeholder: placeholder || "Write here…" }),
    ],
    content: toEditableHtml(value),
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "rte-content" },
    },
  });

  // Keep the editor's document synced when the surrounding CMS form swaps records (e.g.
  // switching which project/blog post is being edited) without remounting this component.
  useEffect(() => {
    if (!editor) return;
    const next = toEditableHtml(value);
    if (next !== editor.getHTML()) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) return null;

  const setLink = () => {
    const previous = (editor.getAttributes("link").href as string | undefined) || "";
    const url = window.prompt("Link URL", previous || "https://");
    if (url === null) return; // cancelled
    const trimmed = url.trim();
    if (!trimmed) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
  };

  return (
    <div style={{ border: `1px solid ${RC.BORDER}`, borderRadius: 2, background: "#1C1330" }}>
      <style>{`
        .rte-content { padding: 12px 16px; font-size: 13px; line-height: 1.7; color: #fff; outline: none; }
        .rte-content { min-height: ${minHeight}px; }
        .rte-content p { margin: 0 0 0.85em; }
        .rte-content p:last-child { margin-bottom: 0; }
        .rte-content ul, .rte-content ol { margin: 0 0 0.85em; padding-left: 1.3em; }
        .rte-content li { margin-bottom: 0.3em; }
        .rte-content h2 { font-size: 1.25em; margin: 0 0 0.5em; }
        .rte-content h3 { font-size: 1.1em; margin: 0 0 0.5em; }
        .rte-content blockquote { margin: 0 0 0.85em; padding-left: 14px; border-left: 2px solid ${RC.BORDER}; color: ${RC.MID}; }
        .rte-content a { color: ${RC.P}; text-decoration: underline; }
        .rte-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder); float: left; color: #555; pointer-events: none; height: 0;
        }
      `}</style>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 2, padding: "6px 8px", borderBottom: `1px solid ${RC.BORDER}` }}>
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}><Bold size={15} /></ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}><Italic size={15} /></ToolbarButton>
        <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={15} /></ToolbarButton>
        <ToolbarButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}><Heading3 size={15} /></ToolbarButton>
        <ToolbarButton label="Bullet list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}><List size={15} /></ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered size={15} /></ToolbarButton>
        <ToolbarButton label="Quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}><Quote size={15} /></ToolbarButton>
        <ToolbarButton label="Add link" active={editor.isActive("link")} onClick={setLink}><Link2 size={15} /></ToolbarButton>
        <ToolbarButton label="Remove link" disabled={!editor.isActive("link")} onClick={() => editor.chain().focus().unsetLink().run()}><Unlink size={15} /></ToolbarButton>
        <ToolbarButton label="Clear formatting" onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}><Eraser size={15} /></ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
