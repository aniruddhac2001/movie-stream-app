"use client";

import { useEffect, useState, use } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Movie, CastMember, CrewMember, getMovieStatus, isMovieUpcoming } from "@/types/movie";
import { useWatchlist } from "@/context/WatchlistContext";
import { useVideo } from "@/context/VideoContext";
import {
  ArrowLeft,
  Play,
  Download,
  Calendar,
  Star,
  Clock,
  Film,
  Sparkles,
  Users,
  Share2,
  Camera,
  Clapperboard,
} from "lucide-react";
import { dismissPreloader } from "@/lib/preloaderEvents";
import {
  getMemoryMovie,
  getMemoryMovies,
  getCachedMovie,
  getCachedMovies,
  setCachedMovie,
  setCachedMovies,
} from "@/lib/clientMovieCache";

export default function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const movieId = resolvedParams.id;
  const router = useRouter();

  const cachedInitial = getMemoryMovie(movieId);
  const [movie, setMovie] = useState<Movie | null>(() => cachedInitial || null);
  const [cast, setCast] = useState<CastMember[]>(() => cachedInitial?.cast || []);
  const [crew, setCrew] = useState<CrewMember[]>(() => cachedInitial?.crew || []);
  const [loading, setLoading] = useState<boolean>(() => !cachedInitial);
  const [copied, setCopied] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const { isInWatchlist, toggleWatchlist } = useWatchlist();
  const { playVideo } = useVideo();

  useEffect(() => {
    const cached = getCachedMovie(movieId);
    if (cached) {
      setMovie((prev) => prev || cached);
      if (cached.cast && cached.cast.length > 0) {
        setCast((prev) => (prev.length > 0 ? prev : cached.cast || []));
      }
      if (cached.crew && cached.crew.length > 0) {
        setCrew((prev) => (prev.length > 0 ? prev : cached.crew || []));
      }
      setLoading(false);
      dismissPreloader();
    } else {
      setLoading(true);
    }

    fetch(`/api/movies/${movieId}?t=${Date.now()}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.movie) {
          setMovie(data.movie);
          setCachedMovie(data.movie);
          setCast(data.cast || data.movie.cast || []);
          setCrew(data.crew || data.movie.crew || []);

          const allCached = getCachedMovies() || [];
          const idx = allCached.findIndex((m) => m.id === data.movie.id);
          if (idx >= 0) {
            allCached[idx] = data.movie;
          } else {
            allCached.unshift(data.movie);
          }
          setCachedMovies(allCached);
        }
      })
      .catch((err) => console.error("Error loading movie:", err))
      .finally(() => {
        setLoading(false);
        dismissPreloader();
      });
  }, [movieId]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: movie?.title || "CineNova Movie",
        url: window.location.href,
      }).catch(() => { });
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "40px", paddingBottom: "80px" }}>
        <div className="skeleton-shimmer" style={{ width: "120px", height: "36px", marginBottom: "30px" }} />
        <div className="skeleton-shimmer" style={{ width: "100%", height: "450px", borderRadius: "16px", marginBottom: "40px" }} />
        <div style={{ display: "flex", gap: "30px" }}>
          <div className="skeleton-shimmer" style={{ width: "260px", height: "380px", borderRadius: "14px" }} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "16px" }}>
            <div className="skeleton-shimmer" style={{ width: "60%", height: "40px" }} />
            <div className="skeleton-shimmer" style={{ width: "40%", height: "24px" }} />
            <div className="skeleton-shimmer" style={{ width: "100%", height: "120px" }} />
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="container" style={{ padding: "100px 20px", textAlign: "center" }}>
        <div
          style={{
            width: 70,
            height: 70,
            borderRadius: "50%",
            background: "rgba(229, 9, 20, 0.15)",
            color: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
          }}
        >
          <Film size={34} />
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "12px" }}>
          Movie Not Found
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          The movie you are looking for does not exist or has been removed from CineNova.
        </p>
        <Link href="/" className="btn-primary">
          Back to Catalog
        </Link>
      </div>
    );
  }

  const inWatchlist = isInWatchlist(movie.id);
  const status = getMovieStatus(movie);
  const isUpcoming = status === "upcoming";

  const bannerUrl =
    movie.bannerImage?.[0]?.url ||
    movie.posterImage?.[0]?.url ||
    "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1920&q=80";

  const posterUrl =
    movie.posterImage?.[0]?.url ||
    movie.bannerImage?.[0]?.url ||
    "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80";

  const formattedDate = movie.releaseDate
    ? new Date(movie.releaseDate + "T00:00:00").toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
    : "";

  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Unified Hero Banner Section matching Screenshot 2 */}
      <div className="movie-detail-hero">
        {/* Backdrop Banner Image */}
        <div className="movie-detail-banner">
          <Image
            src={bannerUrl}
            alt={movie.title}
            fill
            priority
            sizes="100vw"
            className="movie-detail-banner-img"
          />
          {/* Seamless Cinematic Gradient Overlays matching Screenshot 2 */}
          <div className="movie-detail-banner-overlay-side" />
          <div className="movie-detail-banner-overlay-top" />
        </div>

        {/* Back Button */}
        <div className="container movie-detail-back-container">
          <button
            onClick={() => router.back()}
            className="btn-secondary"
            style={{
              padding: "7px 16px",
              borderRadius: "var(--radius-full)",
              background: "rgba(7, 8, 12, 0.6)",
              backdropFilter: "blur(12px)",
              fontSize: "0.85rem",
            }}
          >
            <ArrowLeft size={15} />
            <span>Back to Browse</span>
          </button>
        </div>

        {/* Main Hero Content Row: Poster on Left, Details on Right matching Screenshot 2 */}
        <div
          className="container hero-movie-content"
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: "36px",
          }}
        >
          {/* Left Column: Clean Poster Card (NO buttons underneath) */}
          <div
            className="detail-poster-card"
            style={{
              position: "relative",
              width: "190px",
              minWidth: "190px",
              aspectRatio: "2 / 3",
              borderRadius: "14px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              boxShadow: "0 20px 45px rgba(0, 0, 0, 0.9)",
              backgroundColor: "#11131c",
              flexShrink: 0,
            }}
          >
            <Image
              src={posterUrl}
              alt={movie.title}
              fill
              priority
              sizes="190px"
              style={{ objectFit: "cover" }}
            />
          </div>

          {/* Right Column: Title, Metadata, Synopsis, Actions matching Screenshot 2 */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-start" }}>
            {/* 1. Status Pill Badge: Coming Soon or Available Soon */}
            {status === "upcoming" && (
              <div style={{ marginBottom: "6px" }}>
                <span className="badge-pill-blue">Coming Soon</span>
              </div>
            )}
            {status === "available_soon" && (
              <div style={{ marginBottom: "6px" }}>
                <span className="badge-pill-amber">Available Soon</span>
              </div>
            )}

            {/* 2. Bold Movie Title */}
            <h1
              style={{
                fontSize: "clamp(1.5rem, 2.6vw, 2.1rem)",
                fontWeight: 800,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                lineHeight: 1.18,
                marginTop: "8px",
                marginBottom: "10px",
              }}
            >
              {movie.title}
            </h1>

            {/* 3. Genre Pills & Release Date Row */}
            <div
              className="detail-meta-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                marginBottom: "18px",
              }}
            >
              {Array.isArray(movie.genre)
                ? movie.genre.map((g) => (
                  <span key={g} className="detail-genre-chip">
                    {g}
                  </span>
                ))
                : movie.genre && (
                  <span className="detail-genre-chip">{movie.genre}</span>
                )}

              {formattedDate && (
                <span
                  style={{
                    color: "#9ca3af",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    marginLeft: "4px",
                  }}
                >
                  <Calendar size={15} style={{ opacity: 0.8 }} />
                  <span>{formattedDate}</span>
                </span>
              )}
            </div>

            {/* 4. Movie Synopsis / Overview Paragraph */}
            <p
              style={{
                color: "#cbd5e1",
                fontSize: "0.96rem",
                lineHeight: 1.68,
                maxWidth: "760px",
                marginBottom: "24px",
              }}
            >
              {movie.synopsis || "No description provided for this title."}
            </p>

            {/* 5. Action Buttons: Watch Trailer & Download Movie */}
            <div
              className="detail-actions-row"
              style={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "14px",
                marginBottom: "32px",
              }}
            >
              <button
                onClick={() => {
                  if (movie.trailerUrl) {
                    playVideo(movie.trailerUrl, `${movie.title} - Official Trailer`);
                  } else {
                    alert("Trailer is not yet available for this title.");
                  }
                }}
                className="btn-watch-trailer"
                title="Watch Trailer"
              >
                <Play size={16} fill="none" stroke="currentColor" strokeWidth={2.4} />
                <span>Watch Trailer</span>
              </button>

              {status === "upcoming" ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#38bdf8",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                  }}
                >
                  <Clock size={18} style={{ opacity: 0.9 }} />
                  <span>Releases on {formattedDate}</span>
                </div>
              ) : status === "available_soon" ? (
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#fbbf24",
                    fontSize: "0.92rem",
                    fontWeight: 600,
                    background: "rgba(245, 158, 11, 0.1)",
                    border: "1px solid rgba(245, 158, 11, 0.25)",
                    padding: "8px 16px",
                    borderRadius: "8px",
                  }}
                >
                  <Clock size={16} style={{ opacity: 0.9 }} />
                  <span>Available Soon — Movie Link Arriving Shortly</span>
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (movie.downloadUrl) {
                      window.open(movie.downloadUrl, "_blank");
                    } else if (movie.fullMovieUrl) {
                      playVideo(movie.fullMovieUrl, movie.title);
                    } else {
                      alert("Download link will be available shortly.");
                    }
                  }}
                  className="btn-download-movie"
                  title="Download Movie"
                >
                  <Download size={16} strokeWidth={2.4} />
                  <span>Download Movie</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Page Lower Content (Cast & More Like This) */}
      <div className="container" style={{ paddingBottom: "80px", paddingTop: "40px" }}>
        {/* Cast & Characters Section */}
        {cast.length > 0 && (
          <div style={{ marginTop: "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Users size={18} color="var(--primary)" />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff" }}>
                Cast
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "16px",
              }}
            >
              {cast.map((actor, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(20, 23, 34, 0.6)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "70px",
                      height: "70px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      margin: "0 auto 10px",
                      backgroundColor: "#1e2230",
                      border: "2px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {actor.photoUrl ? (
                      <Image
                        src={actor.photoUrl}
                        alt={actor.actorName}
                        fill
                        sizes="70px"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        <Users size={24} />
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {actor.actorName}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginTop: "2px",
                    }}
                  >
                    {actor.characterName || "Cast Member"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Crew & Production Section */}
        {crew.length > 0 && (
          <div style={{ marginTop: cast.length > 0 ? "36px" : "10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <Clapperboard size={18} color="var(--primary)" />
              <h3 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#ffffff" }}>
                Crew
              </h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: "16px",
              }}
            >
              {crew.map((member, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "rgba(20, 23, 34, 0.6)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      position: "relative",
                      width: "70px",
                      height: "70px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      margin: "0 auto 10px",
                      backgroundColor: "#1e2230",
                      border: "2px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    {member.photoUrl ? (
                      <Image
                        src={member.photoUrl}
                        alt={member.name}
                        fill
                        sizes="70px"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-muted)",
                        }}
                      >
                        <Clapperboard size={24} />
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.85rem",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {member.name}
                  </div>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginTop: "2px",
                    }}
                  >
                    {member.role || "Crew Member"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Movie Screenshots & Scene Stills Gallery */}
        {movie.screenshots && movie.screenshots.length > 0 && (
          <div id="screenshots" style={{ marginTop: (cast.length > 0 || crew.length > 0) ? "50px" : "10px", marginBottom: "50px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Camera size={20} color="var(--primary)" />
                <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>
                  Screenshots
                </h2>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "18px",
              }}
            >
              {movie.screenshots.map((shot, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedScreenshot(shot.url)}
                  style={{
                    position: "relative",
                    borderRadius: "12px",
                    overflow: "hidden",
                    border: "1px solid rgba(255, 255, 255, 0.14)",
                    background: "#0c0e15",
                    aspectRatio: "16 / 9",
                    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5)",
                    cursor: "pointer",
                  }}
                >
                  <Image
                    src={shot.url}
                    alt={shot.filename || `${movie.title} Screenshot ${idx + 1}`}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 33vw"
                    style={{ objectFit: "cover" }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full-Screen Screenshot Lightbox Modal */}
      {selectedScreenshot && (
        <div
          onClick={() => setSelectedScreenshot(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.92)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "24px",
            cursor: "zoom-out",
          }}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "1140px",
              width: "100%",
              aspectRatio: "16 / 9",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 25px 65px rgba(0, 0, 0, 0.95)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              backgroundColor: "#07080c",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selectedScreenshot}
              alt="Movie Screenshot Fullscreen"
              fill
              unoptimized
              sizes="100vw"
              style={{ objectFit: "contain" }}
            />
            <button
              type="button"
              onClick={() => setSelectedScreenshot(null)}
              title="Close Fullscreen"
              style={{
                position: "absolute",
                top: "14px",
                right: "14px",
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "rgba(0, 0, 0, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                color: "#ffffff",
                fontSize: "1.1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 10,
                transition: "transform 0.15s ease",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
