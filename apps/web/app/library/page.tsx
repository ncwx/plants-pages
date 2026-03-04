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
  id: string;
  book_id: string;
  status: "want_to_read" | "reading" | "finished" | "dnf";
  rating?: number | null;
  notes?: string | null;
  progress?: number | null;
  books?: Book | null;
};

type Draft = {
  status: LibraryItem["status"];
  rating: number | "";
  notes: string;
  progress: number | "";
};

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
          progress: it.progress ?? 0,
        };
      }
      setDrafts(initial);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load library :(");
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
        progress: d.progress === "" ? null : Number(d.progress),
      });

      await load();

      setSavedFor((m) => ({ ...m, [bookId]: true }));
      setTimeout(() => {
        setSavedFor((m) => ({ ...m, [bookId]: false }));
      }, 1500);
    } catch (e: any) {
      setErr(e.message ?? "Failed to save changes :(");
    } finally {
      setSavingFor((m) => ({ ...m, [bookId]: false }));
    }
  }

  async function remove(bookId: string) {
    const title = items.find((it) => it.book_id === bookId)?.books?.title ?? "this book";
    if (!confirm(`Remove "${title}" from your library?`)) return;

    setItems((xs) => xs.filter((it) => it.book_id !== bookId));

    try {
      await apiDelete(`/books/me/library/${encodeURIComponent(bookId)}`);
    } catch {
      await load();
    }
  }

  const isEmpty = useMemo(() => items.length === 0, [items.length]);

  return (
    <div style={{ minHeight: "100vh", background: UI.bg }}>
      <div style={{ maxWidth: UI.pageMaxWidth, margin: "0 auto", padding: "34px 22px" }}>
        <h1 style={{ fontSize: 26 }}>My Library</h1>

        {loading && <p>Loading…</p>}

        {!loading && isEmpty && (
          <div>
            <p>No books saved yet :(</p>
            <Link href="/books">Browse books</Link>
          </div>
        )}

        {!loading && (
          <div style={{ display: "grid", gap: 16 }}>
            {items.map((it) => {
              const b = it.books;
              const d = drafts[it.book_id];

              return (
                <div
                  key={it.id}
                  style={{
                    border: `1px solid ${UI.border}`,
                    borderRadius: UI.radiusCard,
                    padding: 16,
                    background: UI.cardBg,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{b?.title}</div>
                      <div style={{ fontSize: 13, color: UI.muted }}>{b?.author}</div>
                    </div>

                    <span style={pillStyle()}>
                      {STATUS_LABEL[d?.status ?? it.status]}
                    </span>
                  </div>

                  {/* STATUS */}
                  <div style={{ marginTop: 12 }}>
                    <select
                      value={d?.status ?? it.status}
                      onChange={(e) =>
                        setDrafts((m) => ({
                          ...m,
                          [it.book_id]: {
                            ...(m[it.book_id] ?? {
                              status: it.status,
                              rating: it.rating ?? "",
                              notes: it.notes ?? "",
                              progress: it.progress ?? 0,
                            }),
                            status: e.target.value as any,
                          },
                        }))
                      }
                    >
                      <option value="want_to_read">Want to read</option>
                      <option value="reading">Reading</option>
                      <option value="finished">Finished</option>
                      <option value="dnf">DNF</option>
                    </select>
                  </div>

                  {/* PROGRESS */}
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: UI.muted }}>Progress</div>

                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={d?.progress ?? 0}
                      onChange={(e) =>
                        setDrafts((m) => ({
                          ...m,
                          [it.book_id]: {
                            ...(m[it.book_id] ?? {
                              status: it.status,
                              rating: it.rating ?? "",
                              notes: it.notes ?? "",
                              progress: it.progress ?? 0,
                            }),
                            progress: Number(e.target.value),
                          },
                        }))
                      }
                    />

                    <div
                      style={{
                        height: 8,
                        background: "#eee",
                        borderRadius: 999,
                        marginTop: 6,
                      }}
                    >
                      <div
                        style={{
                          width: `${d?.progress ?? it.progress ?? 0}%`,
                          height: "100%",
                          background: "#22c55e",
                          borderRadius: 999,
                        }}
                      />
                    </div>
                  </div>

                  {/* RATING */}
                  <div style={{ marginTop: 12 }}>
                    <select
                      value={d?.rating ?? it.rating ?? ""}
                      onChange={(e) =>
                        setDrafts((m) => ({
                          ...m,
                          [it.book_id]: {
                            ...(m[it.book_id] ?? {
                              status: it.status,
                              rating: it.rating ?? "",
                              notes: it.notes ?? "",
                              progress: it.progress ?? 0,
                            }),
                            rating: e.target.value === "" ? "" : Number(e.target.value),
                          },
                        }))
                      }
                    >
                      <option value="">No rating</option>
                      <option value="1">1 ★</option>
                      <option value="2">2 ★★</option>
                      <option value="3">3 ★★★</option>
                      <option value="4">4 ★★★★</option>
                      <option value="5">5 ★★★★★</option>
                    </select>
                  </div>

                  {/* NOTES */}
                  <textarea
                    style={{ marginTop: 12, width: "100%" }}
                    value={d?.notes ?? it.notes ?? ""}
                    onChange={(e) =>
                      setDrafts((m) => ({
                        ...m,
                        [it.book_id]: {
                          ...(m[it.book_id] ?? {
                            status: it.status,
                            rating: it.rating ?? "",
                            notes: it.notes ?? "",
                            progress: it.progress ?? 0,
                          }),
                          notes: e.target.value,
                        },
                      }))
                    }
                  />

                  <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                    <button onClick={() => save(it.book_id)}>
                      {savingFor[it.book_id] ? "Saving…" : "Save"}
                    </button>

                    <button onClick={() => remove(it.book_id)}>Remove</button>
                  </div>

                  {savedFor[it.book_id] && <div>Saved!</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}