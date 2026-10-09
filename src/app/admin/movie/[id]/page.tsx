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
  Zap,
  Check,
  Play,
  HardDrive,
  HelpCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { getAdminToken } from "@/lib/adminAuth";
import { setCachedMovie, getCachedMovies, setCachedMovies } from "@/lib/clientMovieCache";
import { toHighResImageUrl, analyzeImageResolution } from "@/lib/imageResolution";
import { useVideo } from "@/context/VideoContext";

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
  const { playVideo } = useVideo();

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
  const [fullMovieUrl, setFullMovieUrl] = useState("");
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

  // Automated Banner Resolution & Quality Enhancement
  const [enhancingBanner, setEnhancingBanner] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [curatedBackdrops, setCuratedBackdrops] = useState<Array<{ url: string; label: string; resolution: string }>>([]);
  const [showBackdropsPicker, setShowBackdropsPicker] = useState(false);

  const bannerAnalysis = useMemo(() => {
    return analyzeImageResolution(bannerUrl, "banner", title);
  }, [bannerUrl, title]);

  const posterAnalysis = useMemo(() => {
    return analyzeImageResolution(posterUrl, "poster", title);
  }, [posterUrl, title]);

  const [showDriveGuide, setShowDriveGuide] = useState(false);

  const isGoogleDriveLink = useMemo(() => {
    return Boolean(
      fullMovieUrl &&
        (fullMovieUrl.includes("drive.google.com") ||
          fullMovieUrl.includes("/preview") ||
          fullMovieUrl.includes("google.com/file"))
    );
  }, [fullMovieUrl]);

  // Check for curated high-res backdrops when title is present
  useEffect(() => {
    if (!title.trim()) return;
    const fetchEnhanceData = async () => {
      try {
        const res = await fetch("/api/movies/enhance-banner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: bannerUrl, title: title.trim(), type: "banner" }),
        });
        const data = await res.json();
        if (data.success && data.curatedBackdrops) {
          setCuratedBackdrops(data.curatedBackdrops);
        }
      } catch {
        // silent
      }
    };
    fetchEnhanceData();
  }, [title]);

  const handleAutoEnhanceBanner = async () => {
    if (!bannerUrl && !title) return;
    setEnhancingBanner(true);
    setBannerNotice(null);

    try {
      const res = await fetch("/api/movies/enhance-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: bannerUrl, title: title.trim(), type: "banner" }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.curatedBackdrops && data.curatedBackdrops.length > 0) {
          setCuratedBackdrops(data.curatedBackdrops);
        }
        if (data.enhancedUrl && data.enhancedUrl !== bannerUrl) {
          setBannerUrl(data.enhancedUrl);
          setBannerNotice("✨ Banner upgraded to 4K Ultra-HD resolution!");
        } else if (data.curatedBackdrops && data.curatedBackdrops.length > 0 && !bannerUrl) {
          setBannerUrl(data.curatedBackdrops[0].url);
          setBannerNotice("✨ Applied official 4K master backdrop!");
        } else {
          setBannerNotice("✅ Banner is already at maximum available resolution!");
        }
      }
    } catch {
      const upgraded = toHighResImageUrl(bannerUrl, "banner", title);
      if (upgraded && upgraded !== bannerUrl) {
        setBannerUrl(upgraded);
        setBannerNotice("✨ Upgraded to highest CDN resolution!");
      }
    } finally {
      setEnhancingBanner(false);
      setTimeout(() => setBannerNotice(null), 5000);
    }
  };

  const handleBannerUrlChange = (val: string) => {
    const upgraded = toHighResImageUrl(val, "banner", title);
    setBannerUrl(upgraded);
    if (upgraded !== val && val.trim().length > 0) {
      setBannerNotice("⚡ Automatically boosted to high-res master!");
      setTimeout(() => setBannerNotice(null), 4000);
    }
  };

  const handlePosterUrlChange = (val: string) => {
    const upgraded = toHighResImageUrl(val, "poster", title);
    setPosterUrl(upgraded);
  };

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
      fullMovieUrl: isUpcoming ? "" : fullMovieUrl.trim(),
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
    fullMovieUrl,
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
            const fullMovUrl = m.fullMovieUrl || "";
            const dl = m.downloadUrl || "";
            const fullMov = Boolean(m.hasFullMovie || fullMovUrl.trim().length > 0 || dl.trim().length > 0);
            const feat = Boolean(m.featured);
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
            setFullMovieUrl(fullMovUrl);
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
                fullMovieUrl: fullMovUrl.trim(),
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
      hasFullMovie: Boolean(hasFullMovie || fullMovieUrl.trim().length > 0 || downloadUrl.trim().length > 0),
      fullMovieUrl: fullMovieUrl.trim(),
      downloadUrl: downloadUrl.trim(),
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
              <ImageIcon size={18} color="var(--primary)" />
              <span>Poster & Backdrop Media</span>
            </h2>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                type="button"
                onClick={handleAutoEnhanceBanner}
                disabled={enhancingBanner || (!bannerUrl && !title)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "linear-gradient(135deg, rgba(229, 9, 20, 0.2), rgba(255, 75, 43, 0.15))",
                  border: "1px solid rgba(229, 9, 20, 0.4)",
                  color: "#ff4d5a",
                  padding: "6px 12px",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: (!bannerUrl && !title) ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  opacity: (!bannerUrl && !title) ? 0.6 : 1,
                }}
                title="Automatically converts low-resolution banners to pristine 4K/Ultra-HD masters"
              >
                {enhancingBanner ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                <span>Auto-Enhance to 4K</span>
              </button>

              {curatedBackdrops.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowBackdropsPicker((prev) => !prev)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    background: showBackdropsPicker ? "rgba(59, 130, 246, 0.25)" : "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(59, 130, 246, 0.4)",
                    color: "#60a5fa",
                    padding: "6px 12px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <Zap size={13} />
                  <span>{showBackdropsPicker ? "Hide Backdrops" : `Verified 4K Backdrops (${curatedBackdrops.length})`}</span>
                </button>
              )}
            </div>
          </div>

          {/* Banner notification banner */}
          {bannerNotice && (
            <div
              style={{
                padding: "8px 14px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(16, 185, 129, 0.12)",
                border: "1px solid rgba(16, 185, 129, 0.35)",
                color: "#34d399",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Check size={15} />
              <span>{bannerNotice}</span>
            </div>
          )}

          {/* Curated 4K Backdrops Picker Drawer */}
          {showBackdropsPicker && curatedBackdrops.length > 0 && (
            <div
              style={{
                padding: "16px",
                background: "rgba(10, 13, 20, 0.75)",
                border: "1px solid rgba(59, 130, 246, 0.35)",
                borderRadius: "var(--radius-sm)",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#93c5fd", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Sparkles size={14} color="#60a5fa" />
                  Verified Official 4K Masters for &quot;{title}&quot; (Click to apply):
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>1-Click Replacement</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
                {curatedBackdrops.map((bd, idx) => {
                  const isSelected = bannerUrl === bd.url;
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        setBannerUrl(bd.url);
                        setBannerNotice(`✨ Applied: ${bd.label}`);
                        setTimeout(() => setBannerNotice(null), 4000);
                      }}
                      style={{
                        position: "relative",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: isSelected ? "2px solid #3b82f6" : "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        background: "rgba(0, 0, 0, 0.5)",
                        transition: "transform 0.2s, border-color 0.2s",
                      }}
                    >
                      <div style={{ position: "relative", width: "100%", height: 110 }}>
                        <Image src={bd.url} alt={bd.label} fill style={{ objectFit: "cover" }} sizes="240px" />
                        <div
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            background: "rgba(0, 0, 0, 0.75)",
                            backdropFilter: "blur(4px)",
                            color: "#34d399",
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: "4px",
                            border: "1px solid rgba(52, 211, 153, 0.3)",
                          }}
                        >
                          {bd.resolution}
                        </div>
                      </div>
                      <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: isSelected ? "#60a5fa" : "var(--text-primary)" }}>
                          {bd.label}
                        </span>
                        {isSelected && <Check size={14} color="#3b82f6" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "22px" }}>
            {/* Poster URL */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, margin: 0 }}>
                  Poster Image URL (2:3 aspect ratio)
                </label>
                {posterAnalysis.canAutoUpgrade && (
                  <button
                    type="button"
                    onClick={() => setPosterUrl(posterAnalysis.suggestedUrl)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#60a5fa",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    ⚡ Upgrade to HD
                  </button>
                )}
              </div>
              <input
                type="url"
                value={posterUrl}
                onChange={(e) => handlePosterUrlChange(e.target.value)}
                placeholder="https://.../poster.jpg"
                className="input-field"
              />
              {posterUrl && (
                <div style={{ position: "relative", width: 110, height: 165, borderRadius: 8, overflow: "hidden", marginTop: "10px", border: "1px solid var(--border-subtle)" }}>
                  <Image src={posterUrl} alt="Poster Preview" fill style={{ objectFit: "cover" }} sizes="110px" />
                </div>
              )}
            </div>

            {/* Backdrop Banner URL with Automated Resolution Enhancer */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                <label style={{ fontSize: "0.85rem", fontWeight: 600, margin: 0 }}>
                  Backdrop Banner Image URL (16:9 banner)
                </label>
                {bannerAnalysis.canAutoUpgrade ? (
                  <button
                    type="button"
                    onClick={() => {
                      setBannerUrl(bannerAnalysis.suggestedUrl);
                      setBannerNotice("✨ Upgraded to 4K Ultra-HD master!");
                      setTimeout(() => setBannerNotice(null), 4000);
                    }}
                    style={{
                      background: "linear-gradient(135deg, rgba(234, 179, 8, 0.2), rgba(202, 138, 4, 0.15))",
                      border: "1px solid rgba(234, 179, 8, 0.5)",
                      color: "#facc15",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Zap size={11} />
                    <span>Auto-Upgrade to 4K</span>
                  </button>
                ) : bannerUrl ? (
                  <span
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "#34d399",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Check size={11} />
                    <span>{bannerAnalysis.estimatedQuality}</span>
                  </span>
                ) : null}
              </div>

              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => handleBannerUrlChange(e.target.value)}
                placeholder="https://.../banner.jpg"
                className="input-field"
              />

              {/* Real-time Quality Alert if low resolution thumbnail detected */}
              {bannerUrl && bannerAnalysis.isLowRes && (
                <div
                  style={{
                    marginTop: "8px",
                    padding: "8px 12px",
                    background: "rgba(234, 179, 8, 0.1)",
                    border: "1px solid rgba(234, 179, 8, 0.35)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "#facc15" }}>
                    <AlertCircle size={14} />
                    <span>Low quality / downscaled banner detected ({bannerAnalysis.estimatedQuality})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setBannerUrl(bannerAnalysis.suggestedUrl);
                      setBannerNotice("✨ Banner successfully upgraded to 4K Ultra-HD master!");
                      setTimeout(() => setBannerNotice(null), 4000);
                    }}
                    style={{
                      background: "linear-gradient(135deg, #eab308, #ca8a04)",
                      border: "none",
                      color: "#000",
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Sparkles size={11} />
                    <span>Auto-Boost to 4K</span>
                  </button>
                </div>
              )}

              {/* Banner Preview */}
              {bannerUrl && (
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    maxWidth: 320,
                    height: 180,
                    borderRadius: 8,
                    overflow: "hidden",
                    marginTop: "10px",
                    border: "1px solid var(--border-subtle)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.4)",
                  }}
                >
                  <Image
                    src={bannerUrl}
                    alt="Banner Preview"
                    fill
                    unoptimized
                    style={{
                      objectFit: "cover",
                      imageRendering: "-webkit-optimize-contrast",
                    }}
                    sizes="320px"
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      background: "rgba(0, 0, 0, 0.8)",
                      backdropFilter: "blur(6px)",
                      padding: "3px 8px",
                      borderRadius: "4px",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: bannerAnalysis.isLowRes ? "#facc15" : "#34d399",
                      border: bannerAnalysis.isLowRes
                        ? "1px solid rgba(234, 179, 8, 0.4)"
                        : "1px solid rgba(52, 211, 153, 0.4)",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    {bannerAnalysis.isLowRes ? <AlertCircle size={10} /> : <Check size={10} />}
                    <span>{bannerAnalysis.estimatedQuality}</span>
                  </div>
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

        {/* Section 4: Google Drive & Full Movie Streaming */}
        <div
          id="streaming-section"
          style={{
            background: "rgba(20, 23, 34, 0.75)",
            border: `1px solid ${isUpcoming ? "rgba(239, 68, 68, 0.25)" : "rgba(59, 130, 246, 0.28)"}`,
            borderRadius: "var(--radius-md)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.25)",
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "10px", margin: 0 }}>
              <HardDrive size={20} color={isUpcoming ? "#94a3b8" : "#60a5fa"} />
              <span>Google Drive &amp; Full Movie Streaming</span>
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {isUpcoming ? (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#fca5a5",
                    background: "rgba(239, 68, 68, 0.15)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    padding: "4px 10px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Lock size={12} color="#ef4444" />
                  <span>Disabled Until Release Date</span>
                </span>
              ) : (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: isGoogleDriveLink ? "#60a5fa" : fullMovieUrl ? "#34d399" : "#94a3b8",
                    background: isGoogleDriveLink ? "rgba(59, 130, 246, 0.15)" : fullMovieUrl ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${isGoogleDriveLink ? "rgba(59, 130, 246, 0.35)" : fullMovieUrl ? "rgba(16, 185, 129, 0.35)" : "var(--border-subtle)"}`,
                    padding: "4px 10px",
                    borderRadius: "var(--radius-full)",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {isGoogleDriveLink ? (
                    <>
                      <HardDrive size={12} />
                      <span>Google Drive Stream Attached</span>
                    </>
                  ) : fullMovieUrl ? (
                    <>
                      <Play size={12} fill="#34d399" />
                      <span>Stream URL Attached</span>
                    </>
                  ) : (
                    <span>Awaiting Video Link</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* If upcoming: prominent disabled notice */}
          {isUpcoming ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px 18px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.35)",
                borderRadius: "8px",
                color: "#fca5a5",
                fontSize: "0.85rem",
                lineHeight: 1.5,
              }}
            >
              <Lock size={20} color="#ef4444" style={{ flexShrink: 0 }} />
              <div>
                <strong style={{ color: "#ffffff" }}>
                  Google Drive &amp; Full Movie Streaming Disabled
                </strong>
                <div style={{ color: "#cbd5e1", marginTop: "2px", fontSize: "0.8rem" }}>
                  This title is scheduled for release on <strong>{releaseDate || "a future date"}</strong>. Google Drive &amp; stream video upload is disabled until the release date arrives. Once the release date arrives, this section will automatically be enabled.
                </div>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: "0.86rem", color: "#cbd5e1", margin: 0, lineHeight: 1.5 }}>
              To enable the primary <strong>&quot;Play Movie&quot;</strong> button on CineNova (both on the movie page and homepage hero banner), paste your <strong>Google Drive share link</strong> or direct video stream URL below.
            </p>
          )}

          {/* Primary Stream Box: Google Drive & Web Player (Disabled if upcoming) */}
          <div
            style={{
              padding: "18px 20px",
              background: isUpcoming
                ? "rgba(255, 255, 255, 0.02)"
                : "linear-gradient(145deg, rgba(30, 58, 138, 0.18), rgba(15, 23, 42, 0.6))",
              border: `1px solid ${
                isUpcoming
                  ? "rgba(255, 255, 255, 0.08)"
                  : isGoogleDriveLink
                  ? "rgba(96, 165, 250, 0.5)"
                  : "rgba(59, 130, 246, 0.25)"
              }`,
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              opacity: isUpcoming ? 0.45 : 1,
              pointerEvents: isUpcoming ? "none" : "auto",
              cursor: isUpcoming ? "not-allowed" : "default",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px", flexWrap: "wrap", gap: "8px" }}>
                <label style={{ fontSize: "0.88rem", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px", color: "#f8fafc" }}>
                  <HardDrive size={16} color={isUpcoming ? "#94a3b8" : "#60a5fa"} />
                  <span>Google Drive / Stream Video Link</span>
                  <span style={{ fontSize: "0.72rem", color: isUpcoming ? "#94a3b8" : "#bfdbfe", background: isUpcoming ? "rgba(255, 255, 255, 0.06)" : "rgba(59, 130, 246, 0.25)", padding: "2px 7px", borderRadius: "4px", fontWeight: 600 }}>
                    {isUpcoming ? "Locked" : "Powers \"Play Movie\""}
                  </span>
                </label>

                {!isUpcoming && fullMovieUrl && (
                  <button
                    type="button"
                    onClick={() => playVideo(fullMovieUrl, `${title || "Movie"} - Stream Preview`)}
                    style={{
                      background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                      border: "1px solid rgba(147, 197, 253, 0.5)",
                      color: "#ffffff",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 8px rgba(37, 99, 235, 0.4)",
                      transition: "transform 0.15s ease",
                    }}
                    title="Test playing this video directly in the CineNova player modal"
                  >
                    <Play size={13} fill="#ffffff" />
                    <span>Test Play Video</span>
                  </button>
                )}
              </div>

              <input
                type="url"
                value={fullMovieUrl}
                disabled={isUpcoming}
                onChange={(e) => {
                  const val = e.target.value;
                  setFullMovieUrl(val);
                  if (val.trim().length > 0) {
                    setHasFullMovie(true);
                  }
                }}
                placeholder={
                  isUpcoming
                    ? `Disabled — Waiting for release date (${releaseDate || "Upcoming"})`
                    : "https://drive.google.com/file/d/1.../view?usp=sharing or direct .mp4 URL"
                }
                className="input-field"
                style={{
                  background: isUpcoming ? "rgba(255, 255, 255, 0.03)" : "rgba(10, 15, 28, 0.8)",
                  borderColor: isUpcoming ? "rgba(255, 255, 255, 0.1)" : isGoogleDriveLink ? "rgba(96, 165, 250, 0.6)" : "var(--border-subtle)",
                  fontSize: "0.9rem",
                  padding: "10px 14px",
                  cursor: isUpcoming ? "not-allowed" : "text",
                }}
              />

              {/* Status detection badge */}
              {!isUpcoming && isGoogleDriveLink && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    marginTop: "8px",
                    padding: "8px 12px",
                    background: "rgba(59, 130, 246, 0.15)",
                    border: "1px solid rgba(59, 130, 246, 0.3)",
                    borderRadius: "6px",
                    color: "#93c5fd",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                  }}
                >
                  <CheckCircle2 size={15} color="#60a5fa" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Google Drive link verified:</strong> CineNova automatically converts this into the cinema streaming player format for seamless playback.
                  </span>
                </div>
              )}
            </div>

            {/* Quick How-to toggle for Google Drive */}
            {!isUpcoming && (
              <div style={{ marginTop: "2px" }}>
                <button
                  type="button"
                  onClick={() => setShowDriveGuide((prev) => !prev)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#93c5fd",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 0",
                    textDecoration: "underline",
                    textUnderlineOffset: "3px",
                  }}
                >
                  <HelpCircle size={14} />
                  <span>{showDriveGuide ? "Hide instructions" : "How to upload and get a shareable Google Drive link?"}</span>
                </button>

                {showDriveGuide && (
                  <div
                    style={{
                      marginTop: "10px",
                      padding: "14px 16px",
                      background: "rgba(15, 23, 42, 0.85)",
                      border: "1px solid rgba(96, 165, 250, 0.25)",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      lineHeight: 1.6,
                      color: "#cbd5e1",
                    }}
                  >
                    <strong style={{ color: "#ffffff", display: "block", marginBottom: "6px" }}>
                      3 Easy Steps to Stream Movies via Google Drive:
                    </strong>
                    <ol style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                      <li>
                        <strong>Upload Movie:</strong> Upload your video file (<code>.mp4</code>, <code>.mkv</code>, <code>.webm</code>) to your Google Drive account.
                      </li>
                      <li>
                        <strong>Make it Publicly Viewable:</strong> In Google Drive, right-click the video file &rarr; select <strong>Share</strong> &rarr; under <em>General Access</em>, change from <strong>Restricted</strong> to <strong>&quot;Anyone with the link&quot;</strong> (with role set to <em>Viewer</em>).
                      </li>
                      <li>
                        <strong>Copy &amp; Paste:</strong> Click <strong>&quot;Copy link&quot;</strong> and paste it into the input field above. CineNova streams it directly without file size limitations!
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            {/* Availability Toggle */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: isUpcoming ? "not-allowed" : "pointer",
                paddingTop: "6px",
                borderTop: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              <input
                type="checkbox"
                checked={isUpcoming ? false : hasFullMovie}
                disabled={isUpcoming}
                onChange={(e) => setHasFullMovie(e.target.checked)}
                style={{ width: 17, height: 17, accentColor: "var(--primary)", cursor: isUpcoming ? "not-allowed" : "pointer" }}
              />
              <div>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#ffffff" }}>
                  Mark Full Movie as Ready for Streaming
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>
                  {isUpcoming
                    ? "Disabled until release date"
                    : "(Automatically turned on whenever a stream URL is attached)"}
                </span>
              </div>
            </label>
          </div>

          {/* Download Mirror / Cloud Link */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
              Alternative Download / Cloud Mirror Link (Optional)
            </label>
            <input
              type="url"
              value={downloadUrl}
              disabled={isUpcoming}
              onChange={(e) => setDownloadUrl(e.target.value)}
              placeholder={isUpcoming ? "Disabled until release date" : "e.g. https://hubcloud.club/... or secondary download mirror"}
              className="input-field"
              style={{
                cursor: isUpcoming ? "not-allowed" : "text",
                opacity: isUpcoming ? 0.45 : 1,
              }}
            />
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "4px", display: "block" }}>
              Optional backup download link button displayed alongside the primary cinema stream player.
            </span>
          </div>

          {/* Official Trailer Input */}
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, marginBottom: "6px" }}>
              Official Trailer URL (YouTube, Vimeo, or direct MP4)
            </label>
            <input
              type="text"
              value={trailerUrl}
              onChange={(e) => setTrailerUrl(e.target.value)}
              placeholder="e.g. https://youtu.be/0Yq_FsMuP8U"
              className="input-field"
            />
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
              opacity: isUpcoming ? 0.5 : 1,
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

        {/* Section 5: Cast & Characters */}
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

          <Link href="/admin" className="btn-secondary" style={{ padding: "12px 24px" }}>
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
