"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Movie, getMovieStatus, isMovieUpcoming } from "@/types/movie";
import { Play, Calendar, Film, ChevronRight, ChevronLeft } from "lucide-react";
import { setCachedMovie } from "@/lib/clientMovieCache";

interface HeroSectionProps {
  movies: Movie[];
  onPlayVideo?: (url: string, title: string) => void;
}

export function HeroSection({ movies }: HeroSectionProps) {
  // Only released movies whose release date has arrived can appear in hero spotlight
  const eligibleMovies = movies.filter((m) => !isMovieUpcoming(m.releaseDate));
  const heroMovies = eligibleMovies.filter((m) => m.featured || m.bannerImage?.length).slice(0, 5);
  const displayMovies = heroMovies.length > 0 ? heroMovies : eligibleMovies.slice(0, 3);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-advance carousel
  useEffect(() => {
    if (displayMovies.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % displayMovies.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [displayMovies.length, isPaused]);

  if (displayMovies.length === 0) {
    return (
      <div
        style={{
          height: "45vh",
          minHeight: "360px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at 50% 30%, rgba(229, 9, 20, 0.15), transparent 70%)",
          textAlign: "center",
          padding: "20px",
        }}
      >
        <div>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "rgba(229, 9, 20, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 14px",
              color: "var(--primary)",
            }}
          >
            <Film size={28} />
          </div>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, margin: 0 }}>
            Welcome to <span style={{ color: "var(--primary)" }}>CineNova</span>
          </h1>
        </div>
      </div>
    );
  }

  const currentMovie = displayMovies[currentIndex];
  const bannerUrl =
    currentMovie.bannerImage?.[0]?.url ||
    currentMovie.posterImage?.[0]?.url ||
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80";

  const status = getMovieStatus(currentMovie);
  const isUpcoming = status === "upcoming";

  const formattedDate = currentMovie.releaseDate
    ? new Date(currentMovie.releaseDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const genreList = Array.isArray(currentMovie.genre)
    ? currentMovie.genre
    : currentMovie.genre
    ? [currentMovie.genre]
    : [];

  return (
    <section
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        position: "relative",
        height: "54vh",
        minHeight: "400px",
        maxHeight: "500px",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Background Banner with Crossfade & Ambient Glow */}
      <div
        key={currentMovie.id}
        style={{
          position: "absolute",
          inset: 0,
          animation: "fadeIn 0.6s ease-in-out",
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 0.85) 60%, rgba(0, 0, 0, 0.4) 80%, rgba(0, 0, 0, 0) 100%)",
          maskImage:
            "linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 1) 40%, rgba(0, 0, 0, 0.85) 60%, rgba(0, 0, 0, 0.4) 80%, rgba(0, 0, 0, 0) 100%)",
        }}
      >
        <Image
          src={bannerUrl}
          alt={currentMovie.title}
          fill
          priority
          sizes="100vw"
          style={{
            objectFit: "cover",
            objectPosition: "center 25%",
          }}
        />

        {/* Cinematic Gradient Overlays matching Screenshot 1 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(7, 8, 12, 0.95) 0%, rgba(7, 8, 12, 0.82) 45%, rgba(7, 8, 12, 0.15) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(7, 8, 12, 0.92) 0%, rgba(7, 8, 12, 0.6) 35%, transparent 70%)",
          }}
        />
      </div>

      {/* Main Content Area matching Screenshot 1 */}
      <div
        className="container"
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
        }}
      >
        <div style={{ maxWidth: "600px" }}>
          {/* Status Pill Badge: Automatically changes from Coming Soon to Available Soon */}
          {status === "upcoming" && (
            <div style={{ marginBottom: "10px" }}>
              <span className="badge-pill-blue">Coming Soon</span>
            </div>
          )}
          {status === "available_soon" && (
            <div style={{ marginBottom: "10px" }}>
              <span className="badge-pill-amber">Available Soon</span>
            </div>
          )}

          {/* Movie Title */}
          <h1
            style={{
              fontSize: "clamp(1.3rem, 2.2vw, 1.75rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              marginBottom: "12px",
              color: "#ffffff",
              textShadow: "0 2px 12px rgba(0, 0, 0, 0.7)",
            }}
          >
            {currentMovie.title}
          </h1>

          {/* Metadata Row: Genre Capsules & Date Capsule matching Screenshot 1 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "14px",
            }}
          >
            {genreList.map((g) => (
              <span
                key={g}
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "9999px",
                  padding: "3px 12px",
                  fontSize: "0.78rem",
                  color: "#e2e8f0",
                  fontWeight: 500,
                }}
              >
                {g}
              </span>
            ))}

            {formattedDate && (
              <span
                style={{
                  border: "1px solid rgba(255, 255, 255, 0.18)",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "9999px",
                  padding: "3px 12px",
                  fontSize: "0.78rem",
                  color: "#cbd5e1",
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Calendar size={13} style={{ opacity: 0.8 }} />
                <span>{formattedDate}</span>
              </span>
            )}
          </div>

          {/* Synopsis Paragraph matching Screenshot 1 */}
          <p
            style={{
              color: "#cbd5e1",
              fontSize: "0.92rem",
              lineHeight: 1.55,
              marginBottom: "22px",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textShadow: "0 1px 8px rgba(0, 0, 0, 0.6)",
              maxWidth: "560px",
            }}
          >
            {currentMovie.synopsis ||
              "An ancient epic follows a young prince and princess whose marriage and subsequent exile mark the beginning of a legendary..."}
          </p>

          {/* Single Red Button: View Details matching Screenshot 1 */}
          <div>
            <Link
              href={`/movie/${currentMovie.id}`}
              prefetch={true}
              onMouseEnter={() => setCachedMovie(currentMovie)}
              onPointerDown={() => setCachedMovie(currentMovie)}
              onClick={() => setCachedMovie(currentMovie)}
              className="btn-download-movie"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "9px 22px",
                borderRadius: "8px",
                fontSize: "0.92rem",
                fontWeight: 600,
                background: "#ef4444",
                color: "#ffffff",
                boxShadow: "0 4px 15px rgba(239, 68, 68, 0.35)",
              }}
            >
              <Play size={14} fill="none" stroke="currentColor" strokeWidth={2.4} />
              <span>View Details</span>
            </Link>
          </div>
        </div>

        {/* Subtle Carousel Indicator on Right */}
        {displayMovies.length > 1 && (
          <div
            style={{
              position: "absolute",
              right: "20px",
              bottom: "10px",
              display: "none",
              alignItems: "center",
              gap: "8px",
            }}
            className="hero-thumbnails"
          >
            <button
              onClick={() =>
                setCurrentIndex((prev) => (prev - 1 + displayMovies.length) % displayMovies.length)
              }
              className="btn-icon"
              style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(0,0,0,0.4)" }}
              aria-label="Previous"
            >
              <ChevronLeft size={15} />
            </button>

            <div style={{ display: "flex", gap: "6px" }}>
              {displayMovies.map((m, idx) => (
                <button
                  key={m.id}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    position: "relative",
                    width: idx === currentIndex ? "24px" : "8px",
                    height: "4px",
                    borderRadius: "2px",
                    backgroundColor: idx === currentIndex ? "var(--primary)" : "rgba(255, 255, 255, 0.3)",
                    border: "none",
                    cursor: "pointer",
                    transition: "all var(--transition-normal)",
                  }}
                  title={m.title}
                />
              ))}
            </div>

            <button
              onClick={() => setCurrentIndex((prev) => (prev + 1) % displayMovies.length)}
              className="btn-icon"
              style={{ width: "30px", height: "30px", borderRadius: "50%", background: "rgba(0,0,0,0.4)" }}
              aria-label="Next"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @media (min-width: 900px) {
          .hero-thumbnails {
            display: flex !important;
          }
        }
      `}</style>
    </section>
  );
}
