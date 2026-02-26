"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";

type Book = {
  id: string;
  title: string;
  author?: string | null;
  description?: string | null;
};

type UserBook = {
  id: string;
  book_id: string;
  status: "want_to_read" | "reading" | "finished" | "dnf";
  rating?: number | null;
  notes?: string | null;
};

export default function BookDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [book, setBook] = useState<Book | null>(null);
  const [status, setStatus] = useState<UserBook["status"]>("want_to_read");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const b = await apiGet<Book>(`/books/${id}`);
      setBook(b);
    })();
  }, [id]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await apiPost<UserBook>(`/books/${id}/save`, { status });
      setMsg("Saved to your library ✅");
    } catch (e: any) {
      setMsg(e.message ?? "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (!book) return <div style={{ padding: 24 }}>Loading…</div>;

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>{book.title}</h1>
      <div style={{ opacity: 0.75, marginTop: 6 }}>{book.author ?? "Unknown author"}</div>

      {book.description && <p style={{ marginTop: 16, lineHeight: 1.6 }}>{book.description}</p>}

      <div style={{ marginTop: 18, display: "flex", gap: 10, alignItems: "center" }}>
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ padding: 10, borderRadius: 8 }}>
          <option value="want_to_read">Want to read</option>
          <option value="reading">Reading</option>
          <option value="finished">Finished</option>
          <option value="dnf">DNF</option>
        </select>

        <button
          onClick={save}
          disabled={saving}
          style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd" }}
        >
          {saving ? "Saving…" : "Save to my library"}
        </button>
      </div>

      {msg && <p style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}