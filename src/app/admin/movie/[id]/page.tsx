"use client";

import { useEffect, useState, useRef, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Movie, CastMember, CrewMember, ImageItem, isMovieUpcoming } from "@/types/movie";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Upload,
  Film,
  Sparkles,
  Star,
  Clock,
  Video,
  Download,
  Image as ImageIcon,
  Camera,
  Loader2,
  AlertCircle,
  Users,
  Clapperboard,
} from "lucide-react";
import { getAdminToken } from "@/lib/adminAuth";
import { setCachedMovie, getCachedMovies, setCachedMovies } from "@/lib/clientMovieCache";

const ALL_GENRES = [
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

export default function AdminMovieEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const movieId = resolvedParams.id;
  const isNew = movieId === "new";
  const router = useRouter();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Baseline snapshot of loaded movie to track if any changes occurred
  const [initialSnapshot, setInitialSnapshot] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [releaseDate, setReleaseDate] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [trailerUrl, setTrailerUrl] = useState("");
  const [hasFullMovie, setHasFullMovie] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [enableRating, setEnableRating] = useState(false);
  const [rating, setRating] = useState<string>("");
  const [duration, setDuration] = useState("2h 15m");
  const [cast, setCast] = useState<CastMember[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [screenshots, setScreenshots] = useState<ImageItem[]>([]);
  const [screenshotUrlInput, setScreenshotUrlInput] = useState("");
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isUpcoming = isMovieUpcoming(releaseDate);

  // Detect whether any changes have been made compared to the initial baseline
  const isChanged = useMemo(() => {
    if (isNew) return true;
    if (!initialSnapshot) return false;

    const currentSnapshot = JSON.stringify({
      title: title.trim(),
      synopsis: synopsis.trim(),
      genres: [...genres].sort(),
      releaseDate,
      posterUrl: posterUrl.trim(),
      bannerUrl: bannerUrl.trim(),
      trailerUrl: trailerUrl.trim(),
      hasFullMovie: isUpcoming ? false : hasFullMovie,
      downloadUrl: isUpcoming ? "" : downloadUrl.trim(),
      featured: isUpcoming ? false : featured,
      enableRating,
      rating: enableRating ? rating.trim() : "",
      duration: duration.trim(),
      cast: cast.map((c) => ({
        actorName: (c.actorName || "").trim(),
        characterName: (c.characterName || "").trim(),
        photoUrl: (c.photoUrl || "").trim(),
      })),
      crew: crew.map((c) => ({
        name: (c.name || "").trim(),
        role: (c.role || "").trim(),
        photoUrl: (c.photoUrl || "").trim(),
      })),
      screenshots: screenshots.map((s) => ({
        url: (s.url || "").trim(),
        filename: (s.filename || "").trim(),
      })),
    });

    return currentSnapshot !== initialSnapshot;
  }, [
    isNew,
    initialSnapshot,
    title,
    synopsis,
    genres,
    releaseDate,
    posterUrl,
    bannerUrl,
    trailerUrl,
    hasFullMovie,
    downloadUrl,
    featured,
    enableRating,
    rating,
    duration,
    cast,
    crew,
    screenshots,
    isUpcoming,
  ]);

  // Verify admin session (redirects if site was closed and reopened)
  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      router.push("/admin");
    }
  }, [router]);

  // Load existing movie data
  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      fetch(`/api/movies/${movieId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.movie) {
            const m: Movie = data.movie;
            const t = m.title || "";
            const syn = m.synopsis || "";
            const gen = Array.isArray(m.genre) ? m.genre : [m.genre].filter(Boolean);
            const rel = m.releaseDate || "";
            const post = m.posterImage?.[0]?.url || "";
            const ban = m.bannerImage?.[0]?.url || "";
            const trail = m.trailerUrl || "";
            const upcoming = isMovieUpcoming(rel);
            const fullMov = upcoming ? false : Boolean(m.hasFullMovie);
            const dl = upcoming ? "" : (m.downloadUrl || "");
            const feat = upcoming ? false : Boolean(m.featured);
            const enRating = typeof m.rating === "number" && !isNaN(m.rating);
            const rat = enRating ? String(m.rating) : "";
            const dur = m.duration || "2h 15m";
            const castList: CastMember[] = data.cast || m.cast || [];
            const crewList: CrewMember[] = data.crew || m.crew || [];
            const scList: ImageItem[] = m.screenshots || [];

            setTitle(t);
            setSynopsis(syn);
            setGenres(gen);
            setReleaseDate(rel);
            setPosterUrl(post);
            setBannerUrl(ban);
            setTrailerUrl(trail);
            setHasFullMovie(fullMov);
            setDownloadUrl(dl);
            setFeatured(feat);
            setEnableRating(enRating);
            setRating(rat);
            setDuration(dur);
            setCast(castList);
            setCrew(crewList);
            setScreenshots(scList);

            // Baseline snapshot to detect if user makes any edits
            setInitialSnapshot(
              JSON.stringify({
                title: t.trim(),
                synopsis: syn.trim(),
                genres: [...gen].sort(),
                releaseDate: rel,
                posterUrl: post.trim(),
                bannerUrl: ban.trim(),
                trailerUrl: trail.trim(),
                hasFullMovie: fullMov,
                downloadUrl: dl.trim(),
                featured: feat,
                enableRating: enRating,
                rating: rat.trim(),
                duration: dur.trim(),
                cast: castList.map((c) => ({
                  actorName: (c.actorName || "").trim(),
                  characterName: (c.characterName || "").trim(),
                  photoUrl: (c.photoUrl || "").trim(),
                })),
                crew: crewList.map((c) => ({
                  name: (c.name || "").trim(),
                  role: (c.role || "").trim(),
                  photoUrl: (c.photoUrl || "").trim(),
                })),
                screenshots: scList.map((s) => ({
                  url: (s.url || "").trim(),
                  filename: (s.filename || "").trim(),
                })),
              })
            );
          }
        })
        .catch((e) => console.error("Error loading movie:", e))
        .finally(() => setLoading(false));
    }
  }, [isNew, movieId]);

  const toggleGenre = (genre: string) => {
    setGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleAddCastMember = () => {
    setCast((prev) => [...prev, { actorName: "", characterName: "", photoUrl: "" }]);
  };

  const handleUpdateCast = (index: number, field: keyof CastMember, val: string) => {
    setCast((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveCast = (index: number) => {
    setCast((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddCrewMember = () => {
    setCrew((prev) => [...prev, { name: "", role: "", photoUrl: "" }]);
  };

  const handleUpdateCrew = (index: number, field: keyof CrewMember, val: string) => {
    setCrew((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveCrew = (index: number) => {
    setCrew((prev) => prev.filter((_, i) => i !== index));
  };

  const handleScreenshotFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingScreenshots(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.files) {
        setScreenshots((prev) => [...prev, ...data.files]);
      } else {
        alert(data.error || "Failed to upload screenshots");
      }
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error uploading screenshot files");
    } finally {
      setUploadingScreenshots(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleAddScreenshotUrl = () => {
    if (!screenshotUrlInput.trim()) return;
    setScreenshots((prev) => [
      ...prev,
      { url: screenshotUrlInput.trim(), filename: `Screenshot ${prev.length + 1}` },
    ]);
    setScreenshotUrlInput("");
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Movie Title is required.");
      return;
    }

    setSaving(true);
    setError("");

    const parsedRating =
      enableRating && rating.trim() !== "" ? parseFloat(rating) : undefined;

    const payload: Record<string, unknown> = {
      id: isNew ? undefined : movieId,
      title: title.trim(),
      synopsis: synopsis.trim(),
      genre: genres.length > 0 ? genres : ["Action"],
      releaseDate: releaseDate.trim(),
      posterImage: posterUrl ? [{ url: posterUrl.trim() }] : [],
      bannerImage: bannerUrl ? [{ url: bannerUrl.trim() }] : [],
      trailerUrl: trailerUrl.trim(),
      hasFullMovie: isUpcoming ? false : hasFullMovie,
      downloadUrl: isUpcoming ? "" : (hasFullMovie ? downloadUrl.trim() : ""),
      featured: isUpcoming ? false : featured,
      duration: duration.trim(),
      cast: cast.filter((c) => c.actorName.trim()),
      crew: crew.filter((c) => c.name.trim()),
      screenshots: screenshots.filter((s) => s.url && s.url.trim()),
    };

    if (typeof parsedRating === "number" && !isNaN(parsedRating)) {
      payload.rating = parsedRating;
    }

    try {
      const url = isNew ? "/api/movies" : `/api/movies/${movieId}`;
      const method = isNew ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        if (data.movie) {
          setCachedMovie(data.movie);
          const all = getCachedMovies() || [];
          const idx = all.findIndex((m) => m.id === data.movie.id);
          if (idx >= 0) {
            all[idx] = data.movie;
          } else {
            all.unshift(data.movie);
          }
          setCachedMovies(all);
        }
        router.push("/admin");
      } else {
        setError(data.error || "Failed to save movie.");
      }
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ paddingTop: "60px", maxWidth: "800px" }}>
        <div className="skeleton-shimmer" style={{ height: "40px", width: "200px", marginBottom: "30px" }} />
        <div className="skeleton-shimmer" style={{ height: "400px", borderRadius: "14px" }} />
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "40px", paddingBottom: "80px", maxWidth: "880px" }}>
      {/* Top Header */}
      <div style={{ marginBottom: "28px" }}>
        <Link
          href="/admin"
          className="btn-ghost"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginBottom: "16px" }}
        >
          <ArrowLeft size={16} />
          <span>Back to Admin Dashboard</span>
        </Link>

        <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>
          {isNew ? "Add New Movie to CineNova" : `Edit Movie: ${title || "Untitled"}`}
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: "4px" }}>
          Configure movie information, poster & backdrop media, trailer streams, and cast lists.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: "rgba(239, 68, 68, 0.15)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            color: "#fca5a5",
            padding: "12px 18px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.9rem",
            marginBottom: "24px",
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {/* Section 1: Basic Information */}
        <div
          style={{
            background: "rgba(20, 23, 34, 0.6)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
            <Film size={18} color="var(--primary)" />
            <span>General Information</span>
          </h2>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
              Movie Title <span style={{ color: "var(--primary)" }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Avatar: The Way of Water"
              required
              className="input-field"
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
              Synopsis / Overview
            </label>
            <textarea
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Provide a compelling storyline synopsis..."
              rows={4}
              className="input-field"
              style={{ resize: "vertical" }}
            />
          </div>

          {/* Genres Multi-select */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "8px" }}>
              Genres (Select all that apply)
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {ALL_GENRES.map((g) => {
                const active = genres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGenre(g)}
                    className="btn-ghost"
                    style={{
                      padding: "6px 14px",
                      borderRadius: "var(--radius-full)",
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      border: "1px solid",
                      borderColor: active ? "var(--primary)" : "var(--border-subtle)",
                      background: active ? "rgba(229, 9, 20, 0.2)" : "rgba(255, 255, 255, 0.04)",
                      color: active ? "#ffffff" : "var(--text-secondary)",
                    }}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Release Date, Rating, Duration Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                Release Date (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                  gap: "8px",
                }}
              >
                <label
                  style={{
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <span>IMDb / Rating (0 - 10)</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 400 }}>
                    (Optional)
                  </span>
                </label>

                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    cursor: "pointer",
                    fontSize: "0.8rem",
                    color: enableRating ? "var(--primary)" : "var(--text-muted)",
                    userSelect: "none",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={enableRating}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setEnableRating(checked);
                      if (checked && !rating) {
                        setRating("7.5");
                      }
                    }}
                    style={{
                      width: 15,
                      height: 15,
                      accentColor: "var(--primary)",
                      cursor: "pointer",
                    }}
                  />
                  <span>Enable Rating</span>
                </label>
              </div>

              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                disabled={!enableRating}
                value={enableRating ? rating : ""}
                onChange={(e) => setRating(e.target.value)}
                placeholder={enableRating ? "e.g. 7.5 (Optional)" : "Rating disabled / unrated"}
                className="input-field"
                style={{
                  opacity: enableRating ? 1 : 0.45,
                  cursor: enableRating ? "text" : "not-allowed",
                  transition: "opacity 0.2s ease, border-color 0.2s ease",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                Runtime Duration
              </label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 2h 28m"
                className="input-field"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Poster & Banner Media */}
        <div
          style={{
            background: "rgba(20, 23, 34, 0.6)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
            <ImageIcon size={18} color="var(--primary)" />
            <span>Poster & Backdrop Media</span>
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                Poster Image URL (2:3 aspect ratio)
              </label>
              <input
                type="url"
                value={posterUrl}
                onChange={(e) => setPosterUrl(e.target.value)}
                placeholder="https://.../poster.jpg"
                className="input-field"
              />
              {posterUrl && (
                <div style={{ position: "relative", width: 100, height: 150, borderRadius: 8, overflow: "hidden", marginTop: "10px", border: "1px solid var(--border-subtle)" }}>
                  <Image src={posterUrl} alt="Poster Preview" fill style={{ objectFit: "cover" }} sizes="100px" />
                </div>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
                Backdrop Banner Image URL (16:9 banner)
              </label>
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://.../banner.jpg"
                className="input-field"
              />
              {bannerUrl && (
                <div style={{ position: "relative", width: "100%", maxWidth: 220, height: 124, borderRadius: 8, overflow: "hidden", marginTop: "10px", border: "1px solid var(--border-subtle)" }}>
                  <Image src={bannerUrl} alt="Banner Preview" fill style={{ objectFit: "cover" }} sizes="220px" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Movie Screenshots & Scene Stills */}
        <div
          style={{
            background: "rgba(20, 23, 34, 0.6)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <Camera size={18} color="var(--primary)" />
              <span>Movie Screenshots & Scene Stills</span>
            </h2>
            <span
              style={{
                fontSize: "0.8rem",
                color: "var(--text-muted)",
                background: "rgba(255, 255, 255, 0.05)",
                padding: "3px 10px",
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {screenshots.length} {screenshots.length === 1 ? "screenshot" : "screenshots"}
            </span>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, marginTop: "-4px" }}>
            Upload high-resolution movie stills or screenshots directly from your device, or paste image URLs.
          </p>

          {/* Upload Dropzone / File Picker */}
          <div
            style={{
              border: "2px dashed rgba(255, 255, 255, 0.16)",
              borderRadius: "var(--radius-md)",
              padding: "26px 20px",
              textAlign: "center",
              background: "rgba(255, 255, 255, 0.02)",
              cursor: "pointer",
              transition: "border-color 0.2s, background 0.2s",
              position: "relative",
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              style={{ display: "none" }}
              onChange={handleScreenshotFileUpload}
            />

            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(229, 9, 20, 0.15)",
                color: "var(--primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              {uploadingScreenshots ? (
                <Loader2 size={24} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <Upload size={22} />
              )}
            </div>

            <div style={{ fontWeight: 600, fontSize: "0.95rem", marginBottom: "4px" }}>
              {uploadingScreenshots ? "Uploading Screenshots..." : "Click to Upload Screenshots from Device"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
              Supports multiple PNG, JPG, WEBP image files (saved locally for instant preview)
            </div>
          </div>

          {/* Or Add by Image URL input */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="url"
              value={screenshotUrlInput}
              onChange={(e) => setScreenshotUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddScreenshotUrl();
                }
              }}
              placeholder="Or paste screenshot image URL (https://...)"
              className="input-field"
              style={{ flex: 1 }}
            />
            <button
              type="button"
              onClick={handleAddScreenshotUrl}
              className="btn-secondary"
              style={{ flexShrink: 0, padding: "0 18px", height: "42px", gap: "6px" }}
            >
              <Plus size={16} />
              <span>Add URL</span>
            </button>
          </div>

          {/* Screenshot Preview Gallery Grid */}
          {screenshots.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "14px",
                marginTop: "4px",
              }}
            >
              {screenshots.map((shot, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    borderRadius: "10px",
                    overflow: "hidden",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "#0d0f17",
                    aspectRatio: "16 / 9",
                  }}
                >
                  <Image
                    src={shot.url}
                    alt={shot.filename || `Screenshot ${idx + 1}`}
                    fill
                    sizes="220px"
                    style={{ objectFit: "cover" }}
                  />

                  {/* Top-Right Delete Action Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveScreenshot(idx);
                    }}
                    title="Remove Screenshot"
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "rgba(0, 0, 0, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      color: "#ef4444",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      zIndex: 2,
                    }}
                  >
                    <Trash2 size={13} />
                  </button>

                  {/* Index badge */}
                  <span
                    style={{
                      position: "absolute",
                      bottom: "6px",
                      left: "6px",
                      background: "rgba(0, 0, 0, 0.75)",
                      color: "#ffffff",
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      padding: "2px 7px",
                      borderRadius: "4px",
                      zIndex: 2,
                    }}
                  >
                    #{idx + 1}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 4: Video Streaming & Downloads */}
        <div
          style={{
            background: "rgba(20, 23, 34, 0.6)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
            <Video size={18} color="var(--primary)" />
            <span>Streaming & Playback</span>
          </h2>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
              Trailer URL (YouTube, Vimeo, or direct MP4)
            </label>
            <input
              type="text"
              value={trailerUrl}
              onChange={(e) => setTrailerUrl(e.target.value)}
              placeholder="e.g. https://youtu.be/0Yq_FsMuP8U"
              className="input-field"
            />
          </div>

          {/* Upcoming notice message if release date is in the future */}
          {isUpcoming && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                padding: "14px 16px",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid rgba(239, 68, 68, 0.28)",
                borderRadius: "var(--radius-sm)",
                color: "#fca5a5",
                fontSize: "0.85rem",
                lineHeight: 1.5,
              }}
            >
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div>
                <strong style={{ color: "#ffffff" }}>Release Date has not arrived yet:</strong>
                <div style={{ color: "#cbd5e1", marginTop: "2px", fontSize: "0.8rem" }}>
                  This title is marked as upcoming. Full Movie Streaming / Download and Homepage Hero Spotlight Showcase are disabled until the release date.
                </div>
              </div>
            </div>
          )}

          {/* Full movie availability toggle */}
          <div
            style={{
              padding: "16px",
              background: isUpcoming ? "rgba(255, 255, 255, 0.015)" : "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              opacity: isUpcoming ? 0.45 : 1,
              cursor: isUpcoming ? "not-allowed" : "default",
            }}
          >
            <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: isUpcoming ? "not-allowed" : "pointer" }}>
              <input
                type="checkbox"
                checked={isUpcoming ? false : hasFullMovie}
                disabled={isUpcoming}
                onChange={(e) => setHasFullMovie(e.target.checked)}
                style={{ width: 18, height: 18, accentColor: "var(--primary)", cursor: isUpcoming ? "not-allowed" : "pointer" }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>Full Movie Available for Streaming / Download</div>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {isUpcoming
                    ? "Disabled — movie has not been released yet"
                    : "Toggle on if the entire film is ready on CineNova"}
                </div>
              </div>
            </label>

            {!isUpcoming && !hasFullMovie && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  background: "rgba(217, 119, 6, 0.1)",
                  border: "1px solid rgba(217, 119, 6, 0.3)",
                  borderRadius: "6px",
                  color: "#fcd34d",
                  fontSize: "0.82rem",
                  lineHeight: 1.45,
                }}
              >
                <Clock size={16} color="#f59e0b" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Automated Status: Available Soon</strong> — The release date has arrived, but no movie link is attached yet. CineNova automatically displays &quot;Available Soon&quot; to users instead of &quot;Coming Soon&quot;.
                </span>
              </div>
            )}

            {!isUpcoming && hasFullMovie && (
              <div style={{ marginTop: "6px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: "6px" }}>
                  Download / Stream File Link
                </label>
                <input
                  type="url"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="https://... direct link or cloud mirror"
                  className="input-field"
                />
              </div>
            )}
          </div>

          {/* Hero Banner Feature Toggle */}
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: isUpcoming ? "not-allowed" : "pointer",
              padding: "16px",
              background: isUpcoming ? "rgba(255, 255, 255, 0.015)" : "rgba(255, 255, 255, 0.03)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-sm)",
              opacity: isUpcoming ? 0.45 : 1,
            }}
          >
            <input
              type="checkbox"
              checked={isUpcoming ? false : featured}
              disabled={isUpcoming}
              onChange={(e) => setFeatured(e.target.checked)}
              style={{ width: 18, height: 18, accentColor: "var(--primary)", cursor: isUpcoming ? "not-allowed" : "pointer" }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>Spotlight on Homepage Hero Showcase</span>
                <Sparkles size={14} color="var(--accent-gold)" />
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                {isUpcoming
                  ? "Disabled — hero showcase is reserved for released titles"
                  : "Showcase this movie in the main rotating carousel at the top of the homepage"}
              </div>
            </div>
          </label>
        </div>

        {/* Section 4: Cast & Characters */}
        <div
          style={{
            background: "rgba(20, 23, 34, 0.6)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Users size={18} color="var(--primary)" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Top Cast Members</h2>
            </div>
            <button
              type="button"
              onClick={handleAddCastMember}
              className="btn-secondary"
              style={{ padding: "6px 14px", fontSize: "0.8rem" }}
            >
              <Plus size={14} />
              <span>Add Actor</span>
            </button>
          </div>

          {cast.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
              No cast members added yet. Click &quot;Add Actor&quot; above to list lead stars.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {cast.map((actor, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1.5fr auto",
                    gap: "10px",
                    alignItems: "center",
                    padding: "10px",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Actor Name"
                    value={actor.actorName}
                    onChange={(e) => handleUpdateCast(idx, "actorName", e.target.value)}
                    className="input-field"
                    style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                  />

                  <input
                    type="text"
                    placeholder="Character Role"
                    value={actor.characterName}
                    onChange={(e) => handleUpdateCast(idx, "characterName", e.target.value)}
                    className="input-field"
                    style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                  />

                  <input
                    type="url"
                    placeholder="Photo URL"
                    value={actor.photoUrl || ""}
                    onChange={(e) => handleUpdateCast(idx, "photoUrl", e.target.value)}
                    className="input-field"
                    style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveCast(idx)}
                    className="btn-icon"
                    style={{ width: 34, height: 34, color: "#f87171" }}
                    title="Remove Actor"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5: Crew & Production Members */}
        <div
          style={{
            background: "rgba(20, 23, 34, 0.6)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Clapperboard size={18} color="var(--primary)" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Crew Members</h2>
            </div>
            <button
              type="button"
              onClick={handleAddCrewMember}
              className="btn-secondary"
              style={{ padding: "6px 14px", fontSize: "0.8rem" }}
            >
              <Plus size={14} />
              <span>Add Crew Member</span>
            </button>
          </div>

          {crew.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
              No crew members added yet. Click &quot;Add Crew Member&quot; above to list Director, Producer, Writer, etc.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {crew.map((member, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1.5fr auto",
                    gap: "10px",
                    alignItems: "center",
                    padding: "10px",
                    background: "rgba(255, 255, 255, 0.03)",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <input
                    type="text"
                    placeholder="Crew Name (e.g. Nitish Tiwari)"
                    value={member.name}
                    onChange={(e) => handleUpdateCrew(idx, "name", e.target.value)}
                    className="input-field"
                    style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                  />

                  <input
                    type="text"
                    placeholder="Role (e.g. Director, Producer)"
                    value={member.role}
                    onChange={(e) => handleUpdateCrew(idx, "role", e.target.value)}
                    className="input-field"
                    style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                  />

                  <input
                    type="url"
                    placeholder="Photo URL"
                    value={member.photoUrl || ""}
                    onChange={(e) => handleUpdateCrew(idx, "photoUrl", e.target.value)}
                    className="input-field"
                    style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                  />

                  <button
                    type="button"
                    onClick={() => handleRemoveCrew(idx)}
                    className="btn-icon"
                    style={{ width: 34, height: 34, color: "#f87171" }}
                    title="Remove Crew Member"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", paddingTop: "10px", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={saving || (!isNew && !isChanged)}
            className="btn-primary"
            style={{
              padding: "12px 32px",
              fontSize: "1rem",
              opacity: !isNew && !isChanged ? 0.45 : 1,
              cursor: !isNew && !isChanged ? "not-allowed" : "pointer",
              boxShadow: !isNew && !isChanged ? "none" : undefined,
              filter: !isNew && !isChanged ? "grayscale(0.6)" : "none",
              transition: "all var(--transition-fast)",
            }}
            title={!isNew && !isChanged ? "No changes detected to update" : "Update Movie"}
          >
            <Save size={18} />
            <span>{saving ? "Saving Movie..." : isNew ? "Create Movie" : "Update Movie"}</span>
          </button>

          {!isNew && !isChanged && (
            <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              No changes detected
            </span>
          )}

          <Link href="/admin" className="btn-secondary" style={{ padding: "12px 24px" }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
