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

export default function LibraryPage() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [savingFor, setSavingFor] = useState<Record<string, boolean>>({}); // book_id -> saving?
  const [savedFor, setSavedFor] = useState<Record<string, boolean>>({}); // book_id -> saved?

  // Store per-book editable drafts
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  async function load() {
    setErr(null);
    try {
      const data = await apiGet<LibraryItem[]>("/books/me/library");
      setItems(data);

      // Initialise drafts from server values
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
    if (!confirm("Remove this book from your library?")) return;

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
      await load(); // reliable rollback
      setErr(e.message ?? "Failed to remove book");
    }
  }

  const isEmpty = useMemo(() => items.length === 0, [items.length]);

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>My Library</h1>

      {err && <p style={{ marginTop: 12, color: "crimson" }}>{err}</p>}
      {isEmpty && <p style={{ marginTop: 12 }}>No books saved yet.</p>}

      <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
        {items.map((it) => {
          const b = it.books;
          const d = drafts[it.book_id];

          return (
            <div key={it.id} style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {b?.title ?? "Untitled"}
                  </div>
                  <div style={{ opacity: 0.7, marginTop: 4 }}>
                    {b?.author ?? "Unknown author"}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <Link href={`/books/${it.book_id}`} style={{ textDecoration: "none" }}>
                    Open
                  </Link>

                  <button
                    onClick={() => remove(it.book_id)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: "1px solid #f3c2c2",
                      background: "white",
                      color: "crimson",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Status</div>
                  <select
                    value={d?.status ?? it.status}
                    onChange={(e) =>
                      setDrafts((m) => ({
                        ...m,
                        [it.book_id]: { ...(m[it.book_id] ?? { status: it.status, rating: it.rating ?? "", notes: it.notes ?? "" }), status: e.target.value as any },
                      }))
                    }
                    style={{ padding: 10, borderRadius: 8 }}
                  >
                    <option value="want_to_read">Want to read</option>
                    <option value="reading">Reading</option>
                    <option value="finished">Finished</option>
                    <option value="dnf">DNF</option>
                  </select>
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Rating</div>
                  <select
                    value={d?.rating ?? (it.rating ?? "")}
                    onChange={(e) =>
                      setDrafts((m) => ({
                        ...m,
                        [it.book_id]: { ...(m[it.book_id] ?? { status: it.status, rating: it.rating ?? "", notes: it.notes ?? "" }), rating: e.target.value === "" ? "" : Number(e.target.value) },
                      }))
                    }
                    style={{ padding: 10, borderRadius: 8 }}
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
                <div style={{ fontSize: 12, opacity: 0.7 }}>Notes</div>
                <textarea
                  value={d?.notes ?? (it.notes ?? "")}
                  onChange={(e) =>
                    setDrafts((m) => ({
                      ...m,
                      [it.book_id]: { ...(m[it.book_id] ?? { status: it.status, rating: it.rating ?? "", notes: it.notes ?? "" }), notes: e.target.value },
                    }))
                  }
                  placeholder="Write your thoughts…"
                  style={{ padding: 10, borderRadius: 8, minHeight: 80 }}
                />
              </label>

              <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
                {savedFor[it.book_id] && <span style={{ fontSize: 13, opacity: 0.8 }}>Saved ✅</span>}

                <button
                  onClick={() => save(it.book_id)}
                  disabled={!!savingFor[it.book_id]}
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd" }}
                >
                  {savingFor[it.book_id] ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}