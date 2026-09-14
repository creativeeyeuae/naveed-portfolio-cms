"use client";
// Real, shared, deduped Likes + moderated Comments for a /work/[slug] project -- backed by
// functions/api/likes.ts and functions/api/comments.ts (which in turn use the visitors/
// project_likes/project_comments tables from database/migrations/0004_visitor_engagement.sql).
// This deliberately does NOT touch the old localStorage-only ProjectReaction widget still
// living in app/page.tsx's SPA view (that view is no longer linked to from anywhere live, but
// is left in place per the "don't delete existing functionality" rule) -- this is a fresh,
// real implementation for the new canonical page only.
import { useEffect, useState } from "react";
import { useVisitorIdentity } from "@/lib/useVisitorIdentity";
import VisitorIdentityForm from "./VisitorIdentityForm";

type Comment = { id: string; name: string; comment: string; createdAt: string };

export default function ProjectEngagement({ projectId, compact, anchorId }: { projectId: string; compact?: boolean; anchorId?: string }) {
  const identity = useVisitorIdentity();
  const [likeCount, setLikeCount] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [pendingLike, setPendingLike] = useState(false);

  const [comments, setComments] = useState<Comment[] | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentBusy, setCommentBusy] = useState(false);
  const [commentMsg, setCommentMsg] = useState("");
  const [showIdentityFor, setShowIdentityFor] = useState<"like" | "comment" | null>(null);

  useEffect(() => {
    fetch(`/api/likes?projectId=${encodeURIComponent(projectId)}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => {
        setLikeCount(typeof d.count === "number" ? d.count : 0);
        setLiked(!!d.liked);
      })
      .catch(() => setLikeCount(0));
    fetch(`/api/comments?projectId=${encodeURIComponent(projectId)}`, { credentials: "same-origin" })
      .then((r) => r.json())
      .then((d) => setComments(Array.isArray(d.comments) ? d.comments : []))
      .catch(() => setComments([]));
  }, [projectId]);

  async function doLike() {
    setLikeBusy(true);
    try {
      const res = await fetch(`/api/likes?projectId=${encodeURIComponent(projectId)}`, {
        method: "POST",
        credentials: "same-origin",
      });
      if (res.status === 401) {
        setPendingLike(true);
        setShowIdentityFor("like");
        setLikeBusy(false);
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (typeof data.count === "number") setLikeCount(data.count);
      setLiked(!!data.liked);
    } catch {
      /* transient network issue -- the button just stays clickable to retry */
    }
    setLikeBusy(false);
  }

  async function submitComment() {
    if (!commentText.trim()) return;
    if (!identity.identified) {
      setShowIdentityFor("comment");
      return;
    }
    setCommentBusy(true);
    setCommentMsg("");
    try {
      const res = await fetch(`/api/comments?projectId=${encodeURIComponent(projectId)}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentText.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        setShowIdentityFor("comment");
      } else if (!res.ok) {
        setCommentMsg(data?.error || "Could not post your comment.");
      } else {
        setCommentText("");
        setCommentMsg("Thanks -- your comment is awaiting approval and will appear here once reviewed.");
      }
    } catch {
      setCommentMsg("Could not reach the server -- please try again.");
    }
    setCommentBusy(false);
  }

  async function onIdentified(name: string, email: string, whatsapp: string) {
    const ok = await identity.identify(name, email, whatsapp);
    if (!ok) return;
    if (showIdentityFor === "like" || pendingLike) {
      setPendingLike(false);
      setShowIdentityFor(null);
      doLike();
    } else if (showIdentityFor === "comment") {
      setShowIdentityFor(null);
      submitComment();
    }
  }

  // COMPACT MODE -- a single inline summary line (Likes + Comments count) meant to sit
  // directly under the project title, above the fold, like a post header on Instagram/
  // Medium/Behance. Clicking either pill smooth-scrolls down to the full interactive
  // engagement block (the like button + comment thread + form), which keeps rendering
  // right after the gallery exactly as before -- this is purely an additional, lighter-
  // weight view of the same real data (same /api/likes + /api/comments endpoints), not a
  // second engagement system.
  if (compact) {
    const targetId = anchorId || "engagement";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <a
          href={`#${targetId}`}
          onClick={(e) => { e.preventDefault(); document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, color: liked ? "var(--accent-primary, #8B5CF6)" : "var(--text-muted, #A892C6)", fontSize: 13, textDecoration: "none" }}
        >
          <span>{liked ? "♥" : "♡"}</span>
          <span>{likeCount === null ? "…" : likeCount} {likeCount === 1 ? "Like" : "Likes"}</span>
        </a>
        <span style={{ color: "var(--border-subtle, #2D1F45)" }}>·</span>
        <a
          href={`#${targetId}`}
          onClick={(e) => { e.preventDefault(); document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--text-muted, #A892C6)", fontSize: 13, textDecoration: "none" }}
        >
          <span>💬</span>
          <span>{comments === null ? "…" : comments.length} {comments?.length === 1 ? "Comment" : "Comments"}</span>
        </a>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 28 }}>
        <button
          onClick={doLike}
          disabled={likeBusy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "none",
            border: "1px solid var(--border-subtle, #2D1F45)",
            borderRadius: 20,
            padding: "8px 18px",
            color: liked ? "var(--accent-primary, #8B5CF6)" : "var(--text-muted, #A892C6)",
            fontSize: 14,
            cursor: likeBusy ? "default" : "pointer",
          }}
        >
          <span>{liked ? "♥" : "♡"}</span>
          <span>{likeCount === null ? "…" : likeCount} {likeCount === 1 ? "Like" : "Likes"}</span>
        </button>
      </div>
      {showIdentityFor === "like" && (
        <div style={{ marginBottom: 24, maxWidth: 360 }}>
          <VisitorIdentityForm onSubmit={onIdentified} busy={identity.busy} error={identity.error} intro="Add your details to like this project -- no password needed." />
        </div>
      )}

      <div style={{ fontSize: 11, letterSpacing: 3, color: "var(--text-secondary, #E2D9F3)", textTransform: "uppercase", marginBottom: 16 }}>
        Comments{comments && comments.length > 0 ? ` (${comments.length})` : ""}
      </div>
      {comments === null ? (
        <div style={{ fontSize: 13, color: "var(--text-dim, #6B5C87)" }}>Loading…</div>
      ) : comments.length === 0 ? (
        <div style={{ fontSize: 13, color: "var(--text-dim, #6B5C87)", fontStyle: "italic", marginBottom: 16 }}>Be the first to comment.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20, maxWidth: 640 }}>
          {comments.map((c) => (
            <div key={c.id} style={{ borderLeft: "2px solid var(--border-subtle, #2D1F45)", paddingLeft: 14 }}>
              <div style={{ fontSize: 13, color: "var(--text-primary, #fff)", fontWeight: 700 }}>{c.name}</div>
              <div style={{ fontSize: 11, color: "var(--text-dim, #6B5C87)", marginBottom: 4 }}>{new Date(c.createdAt).toLocaleDateString()}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted, #A892C6)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{c.comment}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 480 }}>
        <textarea
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          placeholder="Leave a comment..."
          style={{
            width: "100%",
            minHeight: 70,
            padding: "10px 12px",
            fontSize: 13,
            background: "var(--bg-surface-1, #140D21)",
            border: "1px solid var(--border-subtle, #2D1F45)",
            borderRadius: 4,
            color: "var(--text-primary, #fff)",
            resize: "vertical",
            boxSizing: "border-box",
            marginBottom: 8,
            fontFamily: "inherit",
          }}
        />
        {commentMsg && <div style={{ fontSize: 12, color: "var(--text-muted, #A892C6)", marginBottom: 8 }}>{commentMsg}</div>}
        {showIdentityFor === "comment" ? (
          <VisitorIdentityForm onSubmit={onIdentified} busy={identity.busy} error={identity.error} intro="Add your details to post this comment -- no password needed." />
        ) : (
          <button
            onClick={submitComment}
            disabled={commentBusy || !commentText.trim()}
            style={{
              background: "var(--accent-primary, #8B5CF6)",
              border: "none",
              color: "#fff",
              padding: "10px 22px",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
              cursor: commentBusy ? "default" : "pointer",
              opacity: commentBusy || !commentText.trim() ? 0.6 : 1,
              borderRadius: 2,
            }}
          >
            {commentBusy ? "..." : "Post Comment"}
          </button>
        )}
      </div>
    </div>
  );
}
