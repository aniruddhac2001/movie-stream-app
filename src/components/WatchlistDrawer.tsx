"use client";

import Link from "next/link";
import Image from "next/image";
import { useWatchlist } from "@/context/WatchlistContext";
import { useVideo } from "@/context/VideoContext";
import { X, Trash2, Play, Bookmark } from "lucide-react";
import { getMovieStatus } from "@/types/movie";
import { setCachedMovie } from "@/lib/clientMovieCache";

export function WatchlistDrawer() {
  const { watchlist, isDrawerOpen, setIsDrawerOpen, removeFromWatchlist } = useWatchlist();
  const { playVideo } = useVideo();

  if (!isDrawerOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onClick={() => setIsDrawerOpen(false)}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          height: "100%",
          backgroundColor: "#0d0f17",
          borderLeft: "1px solid var(--border-subtle)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-10px 0 40px rgba(0, 0, 0, 0.8)",
          animation: "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: "18px",
            borderBottom: "1px solid var(--border-subtle)",
            marginBottom: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "rgba(229, 9, 20, 0.15)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Bookmark size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700 }}>My Watchlist</h2>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {watchlist.length} {watchlist.length === 1 ? "movie" : "movies"} saved
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsDrawerOpen(false)}
            className="btn-icon"
            style={{ width: 34, height: 34 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* List Content */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }}>
          {watchlist.length === 0 ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "20px",
                color: "var(--text-muted)",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  background: "rgba(255, 255, 255, 0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: "16px",
                }}
              >
                <Bookmark size={32} />
              </div>
              <h3 style={{ color: "var(--text-main)", fontSize: "1.1rem", marginBottom: "6px" }}>
                Your Watchlist is empty
              </h3>
              <p style={{ fontSize: "0.85rem", maxWidth: "260px" }}>
                Explore movies and tap the bookmark icon to save titles for later viewing.
              </p>
            </div>
          ) : (
            watchlist.map((movie) => {
              const poster = movie.posterImage?.[0]?.url || "/placeholder-poster.jpg";
              const status = getMovieStatus(movie.releaseDate, movie.hasFullMovie);

              return (
                <div
                  key={movie.id}
                  style={{
                    display: "flex",
                    gap: "12px",
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-sm)",
                    padding: "10px",
                    transition: "all var(--transition-fast)",
                  }}
                >
                  <Link
                    href={`/movie/${movie.id}`}
                    prefetch={true}
                    onMouseEnter={() => setCachedMovie(movie)}
                    onPointerDown={() => setCachedMovie(movie)}
                    onClick={() => {
                      setCachedMovie(movie);
                      setIsDrawerOpen(false);
                    }}
                    style={{ position: "relative", width: 60, height: 85, flexShrink: 0, borderRadius: 6, overflow: "hidden" }}
                  >
                    <Image
                      src={poster}
                      alt={movie.title}
                      fill
                      style={{ objectFit: "cover" }}
                      sizes="60px"
                    />
                  </Link>

                  <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <Link
                        href={`/movie/${movie.id}`}
                        prefetch={true}
                        onMouseEnter={() => setCachedMovie(movie)}
                        onPointerDown={() => setCachedMovie(movie)}
                        onClick={() => {
                          setCachedMovie(movie);
                          setIsDrawerOpen(false);
                        }}
                        style={{
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          display: "block",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {movie.title}
                      </Link>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                        {Array.isArray(movie.genre) ? movie.genre.join(", ") : movie.genre}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
                      <span
                        className={`badge ${
                          status === "available_now"
                            ? "badge-available-now"
                            : status === "upcoming"
                            ? "badge-upcoming"
                            : "badge-available-soon"
                        }`}
                        style={{ fontSize: "0.65rem", padding: "2px 8px" }}
                      >
                        {status === "available_now" ? "Stream Now" : "Upcoming"}
                      </span>

                      <div style={{ display: "flex", gap: "6px" }}>
                        {movie.trailerUrl && (
                          <button
                            onClick={() => {
                              playVideo(movie.trailerUrl!, movie.title);
                              setIsDrawerOpen(false);
                            }}
                            className="btn-icon"
                            style={{ width: 28, height: 28 }}
                            title="Play Trailer"
                          >
                            <Play size={12} />
                          </button>
                        )}
                        <button
                          onClick={() => removeFromWatchlist(movie.id)}
                          className="btn-icon"
                          style={{ width: 28, height: 28, color: "var(--text-muted)" }}
                          title="Remove from Watchlist"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {watchlist.length > 0 && (
          <div style={{ paddingTop: "16px", borderTop: "1px solid var(--border-subtle)", marginTop: "16px" }}>
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="btn-secondary"
              style={{ width: "100%", justifyContent: "center" }}
            >
              Continue Browsing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
