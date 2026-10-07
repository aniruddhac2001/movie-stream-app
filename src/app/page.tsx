"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Movie } from "@/types/movie";
import { HeroSection } from "@/components/HeroSection";
import { MovieCard } from "@/components/MovieCard";
import { FilterBar } from "@/components/FilterBar";
import { useVideo } from "@/context/VideoContext";
import { Film, Flame } from "lucide-react";
import { dismissPreloader } from "@/lib/preloaderEvents";
import { getCachedMovies, setCachedMovies } from "@/lib/clientMovieCache";
import initialMoviesJson from "@/data/initialMovies.json";

const GENRES = [
  "Action",
  "Comedy",
  "Drama",
  "Horror",
  "Sci-Fi",
  "Thriller",
  "Romance",
  "Animation",
  "Documentary",
  "Fantasy",
];

function HomeContent() {
  const searchParams = useSearchParams();
  const { playVideo } = useVideo();

  const [movies, setMovies] = useState<Movie[]>(() => {
    const cached = getCachedMovies();
    if (cached && cached.length > 0) return cached;
    return (initialMoviesJson as Movie[]) || [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    const cached = getCachedMovies();
    return !(cached && cached.length > 0) && !(initialMoviesJson && initialMoviesJson.length > 0);
  });
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");

  const queryParam = searchParams.get("q") || "";
  const genreParam = searchParams.get("genre") || "";
  const statusParam = searchParams.get("status") || "";

  useEffect(() => {
    if (genreParam) setSelectedGenre(genreParam);
    if (statusParam) setStatusFilter(statusParam);
  }, [genreParam, statusParam]);

  useEffect(() => {
    dismissPreloader();

    fetch(`/api/movies?t=${Date.now()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.movies) && data.movies.length > 0) {
          setCachedMovies(data.movies);
          setMovies(data.movies);
        }
      })
      .catch((err) => console.error("Error loading movies:", err))
      .finally(() => {
        setLoading(false);
        dismissPreloader();
      });
  }, []);

  // Filter & Sort Logic
  const filteredMovies = useMemo(() => {
    let result = [...movies];

    // Search query filter
    if (queryParam.trim()) {
      const q = queryParam.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.synopsis?.toLowerCase().includes(q) ||
          (Array.isArray(m.genre) && m.genre.some((g) => g.toLowerCase().includes(q)))
      );
    }

    // Genre filter
    if (selectedGenre) {
      result = result.filter((m) =>
        Array.isArray(m.genre) ? m.genre.includes(selectedGenre) : m.genre === selectedGenre
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      result = result.filter((m) => {
        if (!m.releaseDate) return statusFilter === "upcoming";
        const rel = new Date(m.releaseDate + "T00:00:00");
        const isUpcoming = rel > today;

        if (statusFilter === "upcoming") return isUpcoming;
        if (statusFilter === "available_now") return !isUpcoming && m.hasFullMovie;
        return true;
      });
    }

    // Sort order
    if (sortBy === "rating") {
      result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime());
    } else if (sortBy === "title") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      // "featured": featured first, then release date
      result.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return new Date(b.releaseDate || 0).getTime() - new Date(a.releaseDate || 0).getTime();
      });
    }

    return result;
  }, [movies, queryParam, selectedGenre, statusFilter, sortBy]);

  return (
    <div style={{ position: "relative", zIndex: 1 }}>
      {/* Hero Section */}
      <HeroSection movies={movies} onPlayVideo={(url, title) => playVideo(url, title)} />

      {/* Main Catalog Section */}
      <section className="container" style={{ paddingTop: "50px", paddingBottom: "80px" }}>
        {/* Section Title Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "28px",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--primary)",
                fontSize: "0.85rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginBottom: "6px",
              }}
            >
              <Flame size={16} />
              <span>Explore Unlimited Cinema</span>
            </div>
            <h2
              style={{
                fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
                fontWeight: 800,
                letterSpacing: "-0.02em",
              }}
            >
              {queryParam ? `Search Results for "${queryParam}"` : "Featured Titles & Releases"}
            </h2>
          </div>
        </div>

        {/* Filter Bar with Genre pills, status tabs, and sorters */}
        <FilterBar
          genres={GENRES}
          selectedGenre={selectedGenre}
          onSelectGenre={setSelectedGenre}
          statusFilter={statusFilter}
          onSelectStatus={setStatusFilter}
          totalCount={filteredMovies.length}
          sortBy={sortBy}
          onSelectSort={setSortBy}
        />

        {/* Movies Grid / Skeleton / Empty state */}
        {loading ? (
          <div className="grid-movies">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <div className="skeleton-shimmer" style={{ width: "100%", aspectRatio: "2 / 3" }} />
                <div className="skeleton-shimmer" style={{ height: "16px", width: "80%" }} />
                <div className="skeleton-shimmer" style={{ height: "12px", width: "50%" }} />
              </div>
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div
            style={{
              padding: "80px 20px",
              textAlign: "center",
              background: "rgba(20, 23, 34, 0.4)",
              borderRadius: "var(--radius-lg)",
              border: "1px dashed var(--border-subtle)",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(229, 9, 20, 0.1)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Film size={30} />
            </div>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0 }}>
              Catalog is Empty
            </h3>
          </div>
        ) : filteredMovies.length === 0 ? (
          <div
            style={{
              padding: "80px 20px",
              textAlign: "center",
              background: "rgba(20, 23, 34, 0.4)",
              borderRadius: "var(--radius-lg)",
              border: "1px dashed var(--border-subtle)",
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                background: "rgba(229, 9, 20, 0.1)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
              }}
            >
              <Film size={28} />
            </div>
            <h3 style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "8px" }}>
              No Movies Found
            </h3>
            <p style={{ color: "var(--text-muted)", maxWidth: "420px", margin: "0 auto 20px" }}>
              We couldn&apos;t find any movies matching your current filters or search query. Try clearing your filters.
            </p>
            <button
              onClick={() => {
                setSelectedGenre("");
                setStatusFilter("all");
                window.history.replaceState({}, "", "/");
              }}
              className="btn-secondary"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid-movies">
            {filteredMovies.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onPlayTrailer={(url, title) => playVideo(url, title)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="skeleton-shimmer" style={{ width: "200px", height: "40px" }} />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
