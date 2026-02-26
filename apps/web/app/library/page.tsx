"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

type Book = {
  id: string;
  title: string;
  author?: string | null;
  cover_url?: string | null;
};

type LibraryItem = {
  id: string; // user_books row id
  book_id: string;
  status: "want_to_read" | "reading" | "finished" | "dnf";
  rating?: number | null;
  notes?: string | null;
  books?: Book | null; // embedded
};

type Draft = {
  status: LibraryItem["status"];
  rating: number | "";
  notes: string;
};

/**
 * Tiny "design tokens" (edit these later to redesign fast)
 */
const UI = {
  pageMaxWidth: 920,
  radiusCard: 16,
  radiusControl: 12,
  border: "#e7e7e7",
  text: "#111827",
  muted: "#6b7280",
  bg: "#ffffff",
  cardBg: "#ffffff",
  shadow: "0 10px 30px rgba(17, 24, 39, 0.06)",
  // subtle pink accent (flexible)
  accent: "#b4236a",
  accentSoftBg: "#fff1f7",
  accentSoftBorder: "#ffd0e4",
  danger: "#b91c1c",
  dangerBg: "#fff5f5",
  dangerBorder: "#f3c2c2",
};

const STATUS_LABEL: Record<LibraryItem["status"], string> = {
  want_to_read: "Want to read",
  reading: "Reading",
  finished: "Finished",
  dnf: "DNF",
};

function pillStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    border: `1px solid ${UI.border}`,
    background: "#fafafa",
    color: UI.muted,
    whiteSpace: "nowrap",
  };
}

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [savingFor, setSavingFor] = useState<Record<string, boolean>>({});
  const [savedFor, setSavedFor] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await apiGet<LibraryItem[]>("/books/me/library");
      setItems(data);

      const initial: Record<string, Draft> = {};
      for (const it of data) {
        initial[it.book_id] = {
          status: it.status,
          rating: it.rating ?? "",
          notes: it.notes ?? "",
        };
      }
      setDrafts(initial);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load library");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(bookId: string) {
    const d = drafts[bookId];
    if (!d) return;

    setSavingFor((m) => ({ ...m, [bookId]: true }));
    setErr(null);
    try {
      await apiPost(`/books/${bookId}/save`, {
        status: d.status,
        rating: d.rating === "" ? null : Number(d.rating),
        notes: d.notes?.trim() ? d.notes : null,
      });
      await load();

      setSavedFor((m) => ({ ...m, [bookId]: true }));
      setTimeout(() => {
        setSavedFor((m) => ({ ...m, [bookId]: false }));
      }, 1500);
    } catch (e: any) {
      setErr(e.message ?? "Failed to save changes");
    } finally {
      setSavingFor((m) => ({ ...m, [bookId]: false }));
    }
  }

  async function remove(bookId: string) {
    const title = items.find((it) => it.book_id === bookId)?.books?.title ?? "this book";
    if (!confirm(`Remove "${title}" from your library?`)) return;

    setErr(null);

    // Optimistic UI
    setItems((xs) => xs.filter((it) => it.book_id !== bookId));
    setDrafts((m) => {
      const copy = { ...m };
      delete copy[bookId];
      return copy;
    });
    setSavedFor((m) => {
      const copy = { ...m };
      delete copy[bookId];
      return copy;
    });
    setSavingFor((m) => {
      const copy = { ...m };
      delete copy[bookId];
      return copy;
    });

    try {
      await apiDelete(`/books/me/library/${encodeURIComponent(bookId)}`);
    } catch (e: any) {
      await load();
      setErr(e.message ?? "Failed to remove book");
    }
  }

  const isEmpty = useMemo(() => items.length === 0, [items.length]);

  return (
    <div style={{ minHeight: "100vh", background: UI.bg }}>
      <div
        style={{
          maxWidth: UI.pageMaxWidth,
          margin: "0 auto",
          padding: "34px 22px",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
            marginBottom: 18,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 650,
                letterSpacing: "-0.02em",
                color: UI.text,
              }}
            >
              My Library
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: 13, color: UI.muted, lineHeight: 1.4 }}>
              Update status, ratings, and notes. Keep it simple.
            </p>
          </div>

          <Link
            href="/books"
            style={{
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px 12px",
              borderRadius: UI.radiusControl,
              border: `1px solid ${UI.accentSoftBorder}`,
              background: UI.accentSoftBg,
              color: UI.accent,
              fontSize: 13,
              fontWeight: 650,
              whiteSpace: "nowrap",
            }}
          >
            Browse books
          </Link>
        </div>

        {err && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 12px",
              borderRadius: UI.radiusControl,
              border: `1px solid ${UI.dangerBorder}`,
              background: UI.dangerBg,
              color: UI.danger,
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}

        {loading && (
          <div
            style={{
              marginTop: 14,
              padding: 16,
              borderRadius: UI.radiusCard,
              border: `1px solid ${UI.border}`,
              background: UI.cardBg,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              fontSize: 14,
              color: UI.muted,
            }}
          >
            Loading your library…
          </div>
        )}

        {!loading && isEmpty && (
          <div
            style={{
              marginTop: 14,
              padding: 16,
              borderRadius: UI.radiusCard,
              border: `1px solid ${UI.border}`,
              background: UI.cardBg,
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ fontWeight: 650, color: UI.text }}>No books saved yet</div>
            <div style={{ marginTop: 6, fontSize: 13, color: UI.muted }}>
              Add something from the catalogue — you can always edit later.
            </div>
            <div style={{ marginTop: 12 }}>
              <Link
                href="/books"
                style={{
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 12px",
                  borderRadius: UI.radiusControl,
                  border: `1px solid ${UI.accentSoftBorder}`,
                  background: UI.accentSoftBg,
                  color: UI.accent,
                  fontSize: 13,
                  fontWeight: 650,
                }}
              >
                Browse books
              </Link>
            </div>
          </div>
        )}

        {/* List */}
        {!loading && (
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            {items.map((it) => {
              const b = it.books;
              const d = drafts[it.book_id];
              const status = d?.status ?? it.status;

              return (
                <div
                  key={it.id}
                  style={{
                    border: `1px solid ${UI.border}`,
                    borderRadius: UI.radiusCard,
                    padding: 16,
                    background: UI.cardBg,
                    boxShadow: UI.shadow,
                  }}
                >
                  {/* Card header */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 14,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: UI.text, wordBreak: "break-word" }}>
                          {b?.title ?? "Untitled"}
                        </div>
                        <span style={pillStyle()}>{STATUS_LABEL[status]}</span>
                      </div>
                      <div style={{ marginTop: 6, fontSize: 13, color: UI.muted }}>
                        {b?.author ?? "Unknown author"}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                      <Link
                        href={`/books/${it.book_id}`}
                        style={{
                          textDecoration: "none",
                          fontSize: 13,
                          fontWeight: 650,
                          color: UI.text,
                          padding: "8px 10px",
                          borderRadius: UI.radiusControl,
                          border: `1px solid ${UI.border}`,
                          background: "#fff",
                        }}
                      >
                        Open
                      </Link>

                      <button
                        onClick={() => remove(it.book_id)}
                        style={{
                          fontSize: 13,
                          fontWeight: 650,
                          padding: "8px 10px",
                          borderRadius: UI.radiusControl,
                          border: `1px solid ${UI.dangerBorder}`,
                          background: UI.dangerBg,
                          color: UI.danger,
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Controls */}
                  <div style={{ marginTop: 14, display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
                      <div style={{ fontSize: 12, color: UI.muted }}>Status</div>
                      <select
                        value={status}
                        onChange={(e) =>
                          setDrafts((m) => ({
                            ...m,
                            [it.book_id]: {
                              ...(m[it.book_id] ?? {
                                status: it.status,
                                rating: it.rating ?? "",
                                notes: it.notes ?? "",
                              }),
                              status: e.target.value as any,
                            },
                          }))
                        }
                        style={{
                          padding: "10px 12px",
                          borderRadius: UI.radiusControl,
                          border: `1px solid ${UI.border}`,
                          background: "#fff",
                          fontSize: 14,
                          outline: "none",
                        }}
                      >
                        <option value="want_to_read">Want to read</option>
                        <option value="reading">Reading</option>
                        <option value="finished">Finished</option>
                        <option value="dnf">DNF</option>
                      </select>
                    </label>

                    <label style={{ display: "grid", gap: 6, minWidth: 220 }}>
                      <div style={{ fontSize: 12, color: UI.muted }}>Rating</div>
                      <select
                        value={d?.rating ?? (it.rating ?? "")}
                        onChange={(e) =>
                          setDrafts((m) => ({
                            ...m,
                            [it.book_id]: {
                              ...(m[it.book_id] ?? {
                                status: it.status,
                                rating: it.rating ?? "",
                                notes: it.notes ?? "",
                              }),
                              rating: e.target.value === "" ? "" : Number(e.target.value),
                            },
                          }))
                        }
                        style={{
                          padding: "10px 12px",
                          borderRadius: UI.radiusControl,
                          border: `1px solid ${UI.border}`,
                          background: "#fff",
                          fontSize: 14,
                          outline: "none",
                        }}
                      >
                        <option value="">No rating</option>
                        <option value="1">1 ★</option>
                        <option value="2">2 ★★</option>
                        <option value="3">3 ★★★</option>
                        <option value="4">4 ★★★★</option>
                        <option value="5">5 ★★★★★</option>
                      </select>
                    </label>
                  </div>

                  <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: UI.muted }}>Notes</div>
                    <textarea
                      value={d?.notes ?? (it.notes ?? "")}
                      onChange={(e) =>
                        setDrafts((m) => ({
                          ...m,
                          [it.book_id]: {
                            ...(m[it.book_id] ?? {
                              status: it.status,
                              rating: it.rating ?? "",
                              notes: it.notes ?? "",
                            }),
                            notes: e.target.value,
                          },
                        }))
                      }
                      placeholder="Write your thoughts…"
                      style={{
                        padding: "10px 12px",
                        borderRadius: UI.radiusControl,
                        border: `1px solid ${UI.border}`,
                        background: "#fff",
                        minHeight: 90,
                        fontSize: 14,
                        outline: "none",
                        resize: "vertical",
                      }}
                    />
                  </label>

                  {/* Footer */}
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div>
                      {savedFor[it.book_id] && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            fontSize: 13,
                            color: UI.accent,
                            background: UI.accentSoftBg,
                            border: `1px solid ${UI.accentSoftBorder}`,
                            borderRadius: 999,
                            padding: "6px 10px",
                          }}
                        >
                          Saved ✅
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => save(it.book_id)}
                      disabled={!!savingFor[it.book_id]}
                      style={{
                        padding: "10px 14px",
                        borderRadius: UI.radiusControl,
                        border: `1px solid ${UI.accentSoftBorder}`,
                        background: UI.accentSoftBg,
                        color: UI.accent,
                        cursor: savingFor[it.book_id] ? "not-allowed" : "pointer",
                        opacity: savingFor[it.book_id] ? 0.6 : 1,
                        fontSize: 13,
                        fontWeight: 750,
                      }}
                    >
                      {savingFor[it.book_id] ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}