"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Movie, getMovieStatus } from "@/types/movie";
import {
  Shield,
  Plus,
  Search,
  Pencil,
  Trash2,
  Film,
  Eye,
} from "lucide-react";
import { getAdminToken } from "@/lib/adminAuth";
import { dismissPreloader } from "@/lib/preloaderEvents";
import { getCachedMovies, setCachedMovies } from "@/lib/clientMovieCache";
import initialMoviesJson from "@/data/initialMovies.json";

export default function AdminPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);

  // Dashboard state
  const [movies, setMovies] = useState<Movie[]>(() => {
    const cached = getCachedMovies();
    if (cached && cached.length > 0) return cached;
    return (initialMoviesJson as Movie[]) || [];
  });
  const [loadingMovies, setLoadingMovies] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showCleanModal, setShowCleanModal] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Check authorization via secret code
  useEffect(() => {
    const token = getAdminToken();
    if (token) {
      setIsAuthenticated(true);
      setCheckingAuth(false);
      loadDashboardData();
    } else {
      // Direct access without secret code - return to home page
      router.replace("/");
    }
  }, [router]);

  const loadDashboardData = () => {
    setLoadingMovies(true);
    fetch(`/api/movies?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.movies) && data.movies.length > 0) {
          setMovies(data.movies);
          setCachedMovies(data.movies);
        }
      })
      .catch((e) => console.error("Failed to load movies:", e))
      .finally(() => {
        setLoadingMovies(false);
        dismissPreloader();
      });
  };



  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/movies/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setMovies((prev) => prev.filter((m) => m.id !== id));
        setDeleteId(null);
        setActionMessage({ type: "success", text: "Movie deleted successfully." });
      }
    } catch (e) {
      console.error("Delete failed:", e);
      setActionMessage({ type: "error", text: "Failed to delete movie." });
    } finally {
      setDeleting(false);
    }
  };

  const handleCleanDatabase = async () => {
    setCleaning(true);
    setActionMessage(null);
    try {
      const res = await fetch("/api/movies/clean", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setMovies([]);
        setShowCleanModal(false);
        setActionMessage({
          type: "success",
          text: data.message || `Database cleaned successfully. Removed ${data.deletedCount ?? 0} movies.`,
        });
      } else {
        setActionMessage({
          type: "error",
          text: data.error || "Failed to clean database.",
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error connecting to server";
      setActionMessage({ type: "error", text: msg });
    } finally {
      setCleaning(false);
    }
  };

  if (checkingAuth || !isAuthenticated) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="skeleton-shimmer" style={{ width: "200px", height: "30px", borderRadius: "8px" }} />
      </div>
    );
  }

  // --- Admin Dashboard Screen ---
  const filtered = movies.filter((m) =>
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (Array.isArray(m.genre) && m.genre.some((g) => g.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
      {/* Top Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>CineNova Management</h1>
            <span
              className="badge"
              style={{
                background: "rgba(229, 9, 20, 0.15)",
                color: "var(--primary)",
                border: "1px solid var(--primary-glow)",
              }}
            >
              Admin Mode
            </span>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "4px" }}>
            Add, update, or remove movies, and configure trailers.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {movies.length > 0 && (
            <button
              onClick={() => setShowCleanModal(true)}
              className="btn-secondary"
              style={{
                borderColor: "rgba(239, 68, 68, 0.4)",
                color: "#f87171",
                background: "rgba(239, 68, 68, 0.08)",
              }}
              title="Clean all movies from database"
            >
              <Trash2 size={16} />
              <span>Clean Database</span>
            </button>
          )}

          <Link href="/admin/movie/new" className="btn-primary">
            <Plus size={18} />
            <span>Add New Movie</span>
          </Link>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: "var(--radius-sm)",
            marginBottom: "20px",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              actionMessage.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${
              actionMessage.type === "success" ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)"
            }`,
            color: actionMessage.type === "success" ? "#34d399" : "#fca5a5",
          }}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "inherit",
              cursor: "pointer",
              fontSize: "1rem",
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Catalog Search & Filter */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
          marginBottom: "20px",
        }}
      >
        <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
          <Search
            size={16}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            placeholder="Search movie titles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: "38px" }}
          />
        </div>

        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Total Catalog: <strong style={{ color: "var(--text-main)" }}>{movies.length}</strong> movies
        </div>
      </div>

      {/* Movie Management Table */}
      {loadingMovies ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer" style={{ height: "64px", borderRadius: "10px" }} />
          ))}
        </div>
      ) : movies.length === 0 ? (
        <div
          style={{
            padding: "50px 20px",
            textAlign: "center",
            background: "rgba(20, 23, 34, 0.4)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border-subtle)",
          }}
        >
          <Link href="/admin/movie/new" className="btn-primary" style={{ display: "inline-flex" }}>
            <Plus size={16} />
            <span>Add Your First Movie</span>
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div
          style={{
            padding: "60px 20px",
            textAlign: "center",
            background: "rgba(20, 23, 34, 0.4)",
            borderRadius: "var(--radius-md)",
            border: "1px dashed var(--border-subtle)",
          }}
        >
          <Film size={32} color="var(--text-muted)" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700 }}>No movies match your filter</h3>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((m) => {
            const status = getMovieStatus(m.releaseDate, m.hasFullMovie);
            const poster = m.posterImage?.[0]?.url || "/placeholder-poster.jpg";

            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: "rgba(20, 23, 34, 0.6)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  gap: "16px",
                  flexWrap: "wrap",
                  transition: "background var(--transition-fast)",
                }}
              >
                {/* Poster & Title */}
                <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: "240px", flex: 1 }}>
                  <div
                    style={{
                      position: "relative",
                      width: 44,
                      height: 60,
                      borderRadius: 6,
                      overflow: "hidden",
                      flexShrink: 0,
                      backgroundColor: "#11131c",
                    }}
                  >
                    <Image
                      src={poster}
                      alt={m.title}
                      fill
                      sizes="44px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h4
                        style={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {m.title}
                      </h4>
                      {m.featured && (
                        <span className="badge badge-featured" style={{ fontSize: "0.6rem", padding: "2px 6px" }}>
                          Hero
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                      {Array.isArray(m.genre) ? m.genre.join(", ") : m.genre} • Release: {m.releaseDate || "TBA"}
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    className={`badge ${
                      status === "available_now"
                        ? "badge-available-now"
                        : status === "upcoming"
                        ? "badge-upcoming"
                        : "badge-available-soon"
                    }`}
                    style={{ fontSize: "0.68rem" }}
                  >
                    {status === "available_now" ? "Full Movie Available" : status === "upcoming" ? "Coming Soon" : "Available Soon"}
                  </span>

                  {m.trailerUrl && (
                    <span
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--text-secondary)",
                        background: "rgba(255, 255, 255, 0.05)",
                        padding: "3px 8px",
                        borderRadius: "4px",
                      }}
                    >
                      Trailer Linked
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Link
                    href={`/movie/${m.id}`}
                    target="_blank"
                    className="btn-icon"
                    style={{ width: "36px", height: "36px" }}
                    title="View Public Page"
                  >
                    <Eye size={16} />
                  </Link>

                  <Link
                    href={`/admin/movie/${m.id}`}
                    className="btn-icon"
                    style={{ width: "36px", height: "36px" }}
                    title="Edit Movie"
                  >
                    <Pencil size={16} />
                  </Link>

                  <button
                    onClick={() => setDeleteId(m.id)}
                    className="btn-icon"
                    style={{ width: "36px", height: "36px", color: "#f87171" }}
                    title="Delete Movie"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Single Movie Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div
            className="glass-panel"
            style={{
              maxWidth: "400px",
              width: "100%",
              padding: "24px",
              borderRadius: "var(--radius-md)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "8px" }}>
              Confirm Deletion
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "20px" }}>
              Are you sure you want to delete this movie from CineNova? This will also remove all associated cast data.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setDeleteId(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="btn-primary"
                style={{ background: "#dc2626" }}
              >
                {deleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Entire Database Modal */}
      {showCleanModal && (
        <div className="modal-overlay" onClick={() => !cleaning && setShowCleanModal(false)}>
          <div
            className="glass-panel"
            style={{
              maxWidth: "440px",
              width: "100%",
              padding: "26px",
              borderRadius: "var(--radius-md)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "10px",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} />
              </div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Clean Entire Database?</h3>
            </div>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", marginBottom: "22px", lineHeight: "1.5" }}>
              This will automatically wipe all <strong>{movies.length}</strong> movies from Firestore and server memory. This action is permanent and cannot be undone.
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                onClick={() => setShowCleanModal(false)}
                disabled={cleaning}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleCleanDatabase}
                disabled={cleaning}
                className="btn-primary"
                style={{ background: "#dc2626" }}
              >
                {cleaning ? "Cleaning Database..." : "Yes, Clean Database"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
