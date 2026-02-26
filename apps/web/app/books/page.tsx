"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";

type Book = {
  id: string;
  title: string;
  author?: string | null;
  cover_url?: string | null;
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
};

export default function BooksPage() {
  const [q, setQ] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      const trimmed = q.trim();
      if (trimmed) params.set("q", trimmed);
      params.set("limit", "30");

      const data = await apiGet<Book[]>(`/books?${params.toString()}`);
      setBooks(data);
    } catch (e: any) {
      setErr(e.message ?? "Failed to load books");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
        <div style={{ marginBottom: 18 }}>
          <h1
            style={{
              margin: 0,
              fontSize: 26,
              fontWeight: 650,
              letterSpacing: "-0.02em",
              color: UI.text,
            }}
          >
            Browse Books
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13, color: UI.muted }}>
            Search by title or author and add to your library.
          </p>
        </div>

        {/* Search Bar */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 16,
            flexWrap: "wrap",
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") load();
            }}
            placeholder="Search title or author…"
            style={{
              flex: 1,
              minWidth: 220,
              padding: "10px 12px",
              borderRadius: UI.radiusControl,
              border: `1px solid ${UI.border}`,
              background: "#fff",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            onClick={load}
            disabled={loading}
            style={{
              padding: "10px 14px",
              borderRadius: UI.radiusControl,
              border: `1px solid ${UI.accentSoftBorder}`,
              background: UI.accentSoftBg,
              color: UI.accent,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              fontSize: 13,
              fontWeight: 650,
            }}
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </div>

        {err && (
          <div
            style={{
              marginTop: 14,
              padding: "10px 12px",
              borderRadius: UI.radiusControl,
              border: "1px solid #f3c2c2",
              background: "#fff5f5",
              color: "#b91c1c",
              fontSize: 13,
            }}
          >
            {err}
          </div>
        )}

        {/* Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
            marginTop: 20,
          }}
        >
          {books.map((b) => (
            <Link
              key={b.id}
              href={`/books/${b.id}`}
              style={{
                border: `1px solid ${UI.border}`,
                borderRadius: UI.radiusCard,
                padding: 16,
                background: UI.cardBg,
                boxShadow: UI.shadow,
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: UI.text,
                  lineHeight: 1.3,
                }}
              >
                {b.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: UI.muted,
                }}
              >
                {b.author ?? "Unknown author"}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}