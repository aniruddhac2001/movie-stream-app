"use client";

import Image from "next/image";
import Link from "next/link";
import { Movie, getMovieStatus, isMovieUpcoming } from "@/types/movie";
import { Calendar } from "lucide-react";
import { setCachedMovie } from "@/lib/clientMovieCache";

interface MovieCardProps {
  movie: Movie;
  onPlayTrailer?: (url: string, title: string) => void;
}

export function MovieCard({ movie, onPlayTrailer }: MovieCardProps) {

  const poster =
    movie.posterImage?.[0]?.url ||
    movie.bannerImage?.[0]?.url ||
    "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80";

  const isUpcoming = isMovieUpcoming(movie.releaseDate);

  // Format date like: "November 8, 2026"
  const formattedDate = movie.releaseDate
    ? new Date(movie.releaseDate + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const genreText = Array.isArray(movie.genre)
    ? movie.genre.join(", ")
    : movie.genre || "";

  return (
    <Link
      href={`/movie/${movie.id}`}
      prefetch={true}
      className="movie-card group"
      title={movie.title}
      onMouseEnter={() => setCachedMovie(movie)}
      onPointerDown={() => setCachedMovie(movie)}
      onClick={() => setCachedMovie(movie)}
    >
      {/* Poster Media Box with Rounded Corners */}
      <div className="poster-container">
        <Image
          src={poster}
          alt={movie.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 18vw"
          className="poster-img"
          loading="lazy"
        />

        {/* Top-Left Status Pill Badge: Only displayed automatically if release date is in the future */}
        {isUpcoming && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              zIndex: 5,
              pointerEvents: "none",
            }}
          >
            <span className="badge-pill-blue">Coming Soon</span>
          </div>
        )}
      </div>

      {/* Card Info Box: Red Title & Meta Line */}
      <div className="movie-card-info">
        <h3 className="movie-card-title">{movie.title}</h3>

        <div className="movie-card-meta">
          <span className="meta-genres" title={genreText}>
            {genreText}
          </span>

          {formattedDate && (
            <span className="meta-date">
              <Calendar size={11.5} style={{ flexShrink: 0, opacity: 0.85 }} />
              <span>{formattedDate}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
