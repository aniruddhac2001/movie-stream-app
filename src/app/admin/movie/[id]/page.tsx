"use client";

import { useEffect, useState, useRef, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Movie, CastMember, CrewMember, ImageItem, isMovieUpcoming, TrailerItem } from "@/types/movie";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Edit2,
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
  ArrowUp,
  ArrowDown,
  X,
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
  const [trailers, setTrailers] = useState<TrailerItem[]>([]);
  const [hasFullMovie, setHasFullMovie] = useState(false);
  const [fullMovieUrl, setFullMovieUrl] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [enableRating, setEnableRating] = useState(false);
  const [rating, setRating] = useState<string>("");
  const [duration, setDuration] = useState("2h 15m");
  const [cast, setCast] = useState<CastMember[]>([]);
  const [fetchingCast, setFetchingCast] = useState(false);
  const [castNotice, setCastNotice] = useState<string | null>(null);
  const [castViewMode, setCastViewMode] = useState<"cards" | "list">("cards");
  const [editingCastIndex, setEditingCastIndex] = useState<number | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [modalActor, setModalActor] = useState<{
    index: number;
    actorName: string;
    characterName: string;
    photoUrl: string;
  } | null>(null);
  const [uploadingActorPhoto, setUploadingActorPhoto] = useState(false);
  const actorPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const [crew, setCrew] = useState<CrewMember[]>([]);
  const [screenshots, setScreenshots] = useState<ImageItem[]>([]);
  const [screenshotUrlInput, setScreenshotUrlInput] = useState("");
  const [uploadingScreenshots, setUploadingScreenshots] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Automated Banner Resolution & Quality Enhancement
  const [enhancingBanner, setEnhancingBanner] = useState(false);
  const [fetchingBackdrops, setFetchingBackdrops] = useState(false);
  const [hasManualBannerEdit, setHasManualBannerEdit] = useState(false);
  const lastFetchedTitleRef = useRef<string>("");
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

  const executeFetchBackdrops = async (targetTitle: string, forceApply: boolean = false) => {
    const trimmedTitle = targetTitle.trim();
    if (!trimmedTitle || trimmedTitle.length < 2) return;

    setFetchingBackdrops(true);
    try {
      const res = await fetch("/api/movies/enhance-banner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: bannerUrl, title: trimmedTitle, type: "banner" }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.curatedBackdrops) && data.curatedBackdrops.length > 0) {
        setCuratedBackdrops(data.curatedBackdrops);
        // Automatically apply the top official 4K banner if not yet filled, or forceApply, or banner wasn't manually typed
        if (forceApply || !bannerUrl.trim() || !hasManualBannerEdit) {
          const topBackdrop = data.curatedBackdrops[0].url;
          setBannerUrl(topBackdrop);
          setBannerNotice(`✨ Auto-fetched official 4K backdrop for "${trimmedTitle}"! (${data.curatedBackdrops.length} available)`);
          setTimeout(() => setBannerNotice(null), 5000);
        }
      }
    } catch (err) {
      console.warn("Auto-fetch backdrop error:", err);
    } finally {
      setFetchingBackdrops(false);
    }
  };

  // Auto-fetch backdrops whenever movie title is given or updated in the management page
  useEffect(() => {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length < 2) return;
    if (lastFetchedTitleRef.current.toLowerCase() === trimmed.toLowerCase()) return;

    const timer = setTimeout(() => {
      lastFetchedTitleRef.current = trimmed;
      executeFetchBackdrops(trimmed, false);
    }, 600);

    return () => clearTimeout(timer);
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
    setHasManualBannerEdit(true);
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
      trailerUrl: trailers[0]?.url ? trailers[0].url.trim() : trailerUrl.trim(),
      trailers: trailers.map((t) => ({
        name: (t.name || "").trim(),
        url: (t.url || "").trim(),
      })),
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
    trailers,
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
            let trailerList: TrailerItem[] = [];
            if (Array.isArray(m.trailers) && m.trailers.length > 0) {
              trailerList = m.trailers.map((t, idx) => ({
                id: t.id || `trailer-${idx + 1}`,
                name: (t.name || `Trailer ${idx + 1}`).trim(),
                url: (t.url || "").trim(),
              }));
            } else if (trail) {
              trailerList = [{ id: "trailer-1", name: "Official Trailer", url: trail.trim() }];
            }
            const primaryTrail = trailerList[0]?.url || trail;
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
            setTrailerUrl(primaryTrail);
            setTrailers(trailerList);
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
                trailerUrl: primaryTrail.trim(),
                trailers: trailerList.map((t) => ({
                  name: (t.name || "").trim(),
                  url: (t.url || "").trim(),
                })),
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

  // Escape key to close actor edit modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalActor) {
        setModalActor(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalActor]);

  const handleAddCastMember = () => {
    setCast((prev) => [...prev, { actorName: "", characterName: "", photoUrl: "" }]);
  };

  const handleOpenEditModal = (idx: number) => {
    const item = cast[idx];
    if (!item) return;
    setModalActor({
      index: idx,
      actorName: item.actorName || "",
      characterName: item.characterName || "",
      photoUrl: item.photoUrl || "",
    });
  };

  const handleOpenAddModal = () => {
    setModalActor({
      index: -1,
      actorName: "",
      characterName: "",
      photoUrl: "",
    });
  };

  const handleSaveModalActor = () => {
    if (!modalActor) return;
    if (!modalActor.actorName.trim()) {
      alert("Please enter the actor name.");
      return;
    }
    const updated: CastMember = {
      actorName: modalActor.actorName.trim(),
      characterName: modalActor.characterName.trim(),
      photoUrl: modalActor.photoUrl.trim(),
    };
    if (modalActor.index === -1) {
      setCast((prev) => [...prev, updated]);
    } else {
      setCast((prev) => {
        const copy = [...prev];
        copy[modalActor.index] = updated;
        return copy;
      });
    }
    setModalActor(null);
  };

  const handleDeleteFromModal = () => {
    if (!modalActor) return;
    if (modalActor.index >= 0) {
      handleRemoveCast(modalActor.index);
    }
    setModalActor(null);
  };

  const handleActorPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingActorPhoto(true);
    try {
      const formData = new FormData();
      formData.append("files", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.files?.[0]?.url) {
        setModalActor((prev) => (prev ? { ...prev, photoUrl: data.files[0].url } : null));
      } else {
        alert(data.error || "Failed to upload photo");
      }
    } catch (err) {
      console.error("Actor photo upload error:", err);
      alert("Error uploading actor photo");
    } finally {
      setUploadingActorPhoto(false);
      if (e.target) e.target.value = "";
    }
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
    if (editingCastIndex === index) {
      setEditingCastIndex(null);
    }
    if (modalActor?.index === index) {
      setModalActor(null);
    }
  };

  const handleAutoFetchCast = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || trimmedTitle.length < 2) {
      setCastNotice("⚠️ Please enter a movie title above first to auto-fetch actors.");
      setTimeout(() => setCastNotice(null), 4000);
      return;
    }

    if (cast.length > 0) {
      const confirmOverwrite = window.confirm(
        `Auto-fetch actors for "${trimmedTitle}"? This will replace the current cast with newly fetched actors. Click OK to proceed.`
      );
      if (!confirmOverwrite) return;
    }

    setFetchingCast(true);
    setCastNotice(null);
    try {
      const res = await fetch("/api/movies/fetch-cast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmedTitle }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.cast) && data.cast.length > 0) {
        setBrokenImages({});
        setCast(data.cast);
        setCastViewMode("cards");
        setCastNotice(`✨ Auto-fetched ${data.cast.length} actors with image, name, and role! You can click "Edit Manually" on any actor to correct mistakes.`);
        setTimeout(() => setCastNotice(null), 6000);
      } else {
        setCastNotice(`⚠️ ${data.error || "No cast found for this movie. You can add actors manually with '+ Add Actor'."}`);
        setTimeout(() => setCastNotice(null), 5000);
      }
    } catch (err: any) {
      console.error("Auto fetch cast error:", err);
      setCastNotice("❌ Error fetching actors. Please try again or add manually.");
      setTimeout(() => setCastNotice(null), 5000);
    } finally {
      setFetchingCast(false);
    }
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

  const handleAddTrailer = (presetName?: string) => {
    const nextIdx = trailers.length + 1;
    const defaultName = presetName || (nextIdx === 1 ? "Official Trailer" : `Trailer ${nextIdx}`);
    setTrailers((prev) => [
      ...prev,
      {
        id: `trailer-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: defaultName,
        url: "",
      },
    ]);
  };

  const handleUpdateTrailer = (index: number, field: keyof TrailerItem, val: string) => {
    setTrailers((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const handleRemoveTrailer = (index: number) => {
    setTrailers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveTrailer = (index: number, direction: "up" | "down") => {
    setTrailers((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
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

    const validTrailers = trailers
      .map((t, idx) => ({
        id: t.id || `trailer-${idx + 1}`,
        name: (t.name || `Trailer ${idx + 1}`).trim(),
        url: (t.url || "").trim(),
      }))
      .filter((t) => t.url.length > 0);

    const primaryTrailerUrl = validTrailers[0]?.url || trailerUrl.trim();

    const payload: Record<string, unknown> = {
      id: isNew ? undefined : movieId,
      title: title.trim(),
      synopsis: synopsis.trim(),
      genre: genres.length > 0 ? genres : ["Action"],
      releaseDate: releaseDate.trim(),
      posterImage: posterUrl ? [{ url: posterUrl.trim() }] : [],
      bannerImage: bannerUrl ? [{ url: bannerUrl.trim() }] : [],
      trailerUrl: primaryTrailerUrl,
      trailers: validTrailers,
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
      <div className="container" style={{ paddingTop: "100px", maxWidth: "800px" }}>
        <div className="skeleton-shimmer" style={{ height: "40px", width: "200px", marginBottom: "30px" }} />
        <div className="skeleton-shimmer" style={{ height: "400px", borderRadius: "14px" }} />
      </div>
    );
  }

  return (
    <div className="container" style={{ paddingTop: "100px", paddingBottom: "80px", maxWidth: "880px" }}>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                Movie Title <span style={{ color: "var(--primary)" }}>*</span>
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {fetchingBackdrops && (
                  <span style={{ fontSize: "0.75rem", color: "#60a5fa", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Loader2 size={12} className="animate-spin" /> Auto-fetching 4K backdrops...
                  </span>
                )}
                {!fetchingBackdrops && curatedBackdrops.length > 0 && (
                  <span style={{ fontSize: "0.75rem", color: "#34d399", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                    <Check size={12} /> {curatedBackdrops.length} 4K backdrops available
                  </span>
                )}
                {title.trim().length > 1 && (
                  <button
                    type="button"
                    onClick={() => executeFetchBackdrops(title, true)}
                    disabled={fetchingBackdrops}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      background: "rgba(59, 130, 246, 0.15)",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      color: "#93c5fd",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    title="Auto-fetch and apply the best available 4K background banner"
                  >
                    <Sparkles size={11} /> Auto-Fetch 4K Banners
                  </button>
                )}
              </div>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasManualBannerEdit(false);
              }}
              onBlur={() => {
                if (title.trim().length > 1) {
                  executeFetchBackdrops(title, true);
                }
              }}
              placeholder="e.g. Ramayana - Part 1"
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

              {title.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (curatedBackdrops.length === 0) {
                      executeFetchBackdrops(title, true);
                      setShowBackdropsPicker(true);
                    } else {
                      setShowBackdropsPicker((prev) => !prev);
                    }
                  }}
                  disabled={fetchingBackdrops}
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
                  {fetchingBackdrops ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                  <span>
                    {fetchingBackdrops
                      ? "Fetching 4K Backdrops..."
                      : showBackdropsPicker
                      ? "Hide Backdrops"
                      : curatedBackdrops.length > 0
                      ? `Verified 4K Backdrops (${curatedBackdrops.length})`
                      : "Find 4K Backdrops"}
                  </span>
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

        {/* Section 5: Official Trailers & Teasers (Multiple Trailers) */}
        <div
          style={{
            background: "rgba(20, 23, 34, 0.6)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Film size={20} color="var(--primary)" />
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Official Trailers &amp; Teasers</h2>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: "rgba(229, 9, 20, 0.12)",
                      color: "var(--primary)",
                      border: "1px solid rgba(229, 9, 20, 0.3)",
                    }}
                  >
                    {trailers.length} {trailers.length === 1 ? "Trailer" : "Trailers"}
                  </span>
                </div>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  Add multiple trailers, teasers, and promotional clips. The first trailer is set as the primary preview.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleAddTrailer()}
              className="btn-secondary"
              style={{ padding: "8px 16px", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Plus size={14} />
              <span>Add Trailer</span>
            </button>
          </div>

          {/* Quick preset chips */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", padding: "10px 14px", background: "rgba(255, 255, 255, 0.02)", borderRadius: "var(--radius-sm)", border: "1px solid rgba(255, 255, 255, 0.05)" }}>
            <span style={{ fontSize: "0.76rem", fontWeight: 600, color: "var(--text-secondary)" }}>Quick Add:</span>
            {[
              "Official Trailer",
              "Teaser Trailer",
              "Trailer 2",
              "Final Trailer",
              "Exclusive Promo",
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleAddTrailer(preset)}
                style={{
                  fontSize: "0.74rem",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#e2e8f0",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(229, 9, 20, 0.18)";
                  e.currentTarget.style.borderColor = "var(--primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                }}
              >
                <Plus size={11} />
                <span>{preset}</span>
              </button>
            ))}
          </div>

          {trailers.length === 0 ? (
            <div
              style={{
                border: "2px dashed var(--border-subtle)",
                borderRadius: "var(--radius-sm)",
                padding: "32px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.04)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                }}
              >
                <Film size={22} />
              </div>
              <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "#ffffff" }}>
                No trailers linked to this movie yet
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: "420px", margin: 0 }}>
                Link YouTube, Vimeo, or direct video trailers so users can preview high-definition trailers before watching.
              </p>
              <button
                type="button"
                onClick={() => handleAddTrailer("Official Trailer")}
                className="btn-secondary"
                style={{ marginTop: "6px", padding: "6px 16px", fontSize: "0.82rem" }}
              >
                <Plus size={14} />
                <span>Add Official Trailer</span>
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {trailers.map((trailer, idx) => (
                <div
                  key={trailer.id || idx}
                  style={{
                    background: "rgba(255, 255, 255, 0.025)",
                    borderRadius: "var(--radius-sm)",
                    border: idx === 0 ? "1px solid rgba(229, 9, 20, 0.35)" : "1px solid var(--border-subtle)",
                    padding: "14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          background: idx === 0 ? "rgba(229, 9, 20, 0.2)" : "rgba(255, 255, 255, 0.08)",
                          color: idx === 0 ? "var(--primary)" : "var(--text-secondary)",
                          border: idx === 0 ? "1px solid rgba(229, 9, 20, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        {idx === 0 ? "★ Primary Trailer (#1)" : `#${idx + 1}`}
                      </span>
                      {trailer.url && (
                        <span style={{ fontSize: "0.72rem", color: "#38bdf8" }}>
                          {trailer.url.includes("youtu") ? "YouTube" : trailer.url.includes("vimeo") ? "Vimeo" : "Direct Link"}
                        </span>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {/* Live Test Play button */}
                      <button
                        type="button"
                        disabled={!trailer.url?.trim()}
                        onClick={() => {
                          if (trailer.url?.trim()) {
                            playVideo(trailer.url.trim(), `${title || "Movie"} - ${trailer.name || "Trailer"}`);
                          }
                        }}
                        className="btn-icon"
                        style={{
                          width: 32,
                          height: 32,
                          color: trailer.url?.trim() ? "#22c55e" : "var(--text-muted)",
                          opacity: trailer.url?.trim() ? 1 : 0.4,
                          cursor: trailer.url?.trim() ? "pointer" : "not-allowed",
                        }}
                        title={trailer.url?.trim() ? "Preview Trailer Video" : "Enter a URL to preview"}
                      >
                        <Play size={14} fill={trailer.url?.trim() ? "currentColor" : "none"} />
                      </button>

                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveTrailer(idx, "up")}
                        className="btn-icon"
                        style={{ width: 32, height: 32, opacity: idx === 0 ? 0.3 : 1 }}
                        title="Move Up"
                      >
                        <ArrowUp size={14} />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={idx === trailers.length - 1}
                        onClick={() => handleMoveTrailer(idx, "down")}
                        className="btn-icon"
                        style={{ width: 32, height: 32, opacity: idx === trailers.length - 1 ? 0.3 : 1 }}
                        title="Move Down"
                      >
                        <ArrowDown size={14} />
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => handleRemoveTrailer(idx)}
                        className="btn-icon"
                        style={{ width: 32, height: 32, color: "#f87171" }}
                        title="Remove Trailer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 2fr",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <input
                        type="text"
                        placeholder="Trailer Name (e.g. Official Trailer)"
                        value={trailer.name}
                        onChange={(e) => handleUpdateTrailer(idx, "name", e.target.value)}
                        className="input-field"
                        style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Trailer URL (YouTube, Vimeo, MP4, etc.)"
                        value={trailer.url}
                        onChange={(e) => handleUpdateTrailer(idx, "url", e.target.value)}
                        className="input-field"
                        style={{ fontSize: "0.85rem", padding: "8px 12px" }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 6: Top Cast Members */}
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
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Users size={18} color="var(--primary)" />
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Top Cast Members</h2>
              {cast.length > 0 && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    padding: "2px 8px",
                    borderRadius: "999px",
                    background: "rgba(229, 9, 20, 0.12)",
                    color: "var(--primary)",
                    border: "1px solid rgba(229, 9, 20, 0.25)",
                    fontWeight: 700,
                  }}
                >
                  {cast.length} {cast.length === 1 ? "Actor" : "Actors"}
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Add Actor Button */}
              <button
                type="button"
                onClick={handleOpenAddModal}
                className="btn-secondary"
                style={{
                  padding: "7px 16px",
                  fontSize: "0.85rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  borderRadius: "8px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <Plus size={15} />
                <span>Add Actor</span>
              </button>

              {/* Auto Fetch Actors Button beside Add Actor */}
              <button
                type="button"
                onClick={handleAutoFetchCast}
                disabled={fetchingCast}
                className="btn-primary"
                style={{
                  padding: "7px 16px",
                  fontSize: "0.85rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  background: "linear-gradient(135deg, #e50914 0%, #b81d24 100%)",
                  boxShadow: "0 2px 10px rgba(229, 9, 20, 0.35)",
                  cursor: fetchingCast ? "not-allowed" : "pointer",
                  opacity: fetchingCast ? 0.75 : 1,
                  borderRadius: "8px",
                  color: "#ffffff",
                  fontWeight: 600,
                  border: "none",
                  transition: "all 0.2s ease",
                }}
                title={`Auto-fetch actors with images and roles for "${title || "this movie"}"`}
              >
                {fetchingCast ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Fetching Actors...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    <span>Auto Fetch Actors</span>
                  </>
                )}
              </button>

              {/* View Mode Toggle: Cards vs Inputs */}
              {cast.length > 0 && (
                <div style={{ display: "inline-flex", background: "rgba(255, 255, 255, 0.06)", borderRadius: "8px", padding: "3px", border: "1px solid rgba(255, 255, 255, 0.1)" }}>
                  <button
                    type="button"
                    onClick={() => setCastViewMode("cards")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      background: castViewMode === "cards" ? "rgba(229, 9, 20, 0.3)" : "transparent",
                      color: castViewMode === "cards" ? "#ffffff" : "var(--text-muted)",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    title="2nd Image Format: Circular Photo Cards"
                  >
                    Cards
                  </button>
                  <button
                    type="button"
                    onClick={() => setCastViewMode("list")}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.78rem",
                      background: castViewMode === "list" ? "rgba(229, 9, 20, 0.3)" : "transparent",
                      color: castViewMode === "list" ? "#ffffff" : "var(--text-muted)",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                    title="Inputs Table View"
                  >
                    Inputs
                  </button>
                </div>
              )}
            </div>
          </div>

          {castNotice && (
            <div
              style={{
                padding: "8px 12px",
                background: "rgba(229, 9, 20, 0.12)",
                border: "1px solid rgba(229, 9, 20, 0.3)",
                borderRadius: "var(--radius-sm)",
                fontSize: "0.82rem",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>{castNotice}</span>
            </div>
          )}

          {cast.length === 0 ? (
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", textAlign: "center", padding: "16px 0", margin: 0 }}>
              No cast members added yet.
            </p>
          ) : castViewMode === "cards" ? (
            /* Horizontal Scroll Cards Row */
            <div
              className="cast-horizontal-scroll"
              style={{
                display: "flex",
                flexWrap: "nowrap",
                gap: "16px",
                overflowX: "auto",
                overflowY: "hidden",
                paddingBottom: "14px",
                paddingTop: "6px",
                paddingLeft: "4px",
                paddingRight: "4px",
                scrollSnapType: "x mandatory",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {cast.map((actor, idx) => (
                <div
                  key={idx}
                  onClick={() => handleOpenEditModal(idx)}
                  style={{
                    flex: "0 0 145px",
                    width: "145px",
                    scrollSnapAlign: "start",
                    position: "relative",
                    background: "rgba(18, 22, 32, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: "14px",
                    padding: "16px 10px 14px",
                    textAlign: "center",
                    boxShadow: "0 6px 18px rgba(0, 0, 0, 0.35)",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(229, 9, 20, 0.5)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.12)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                  title="Click to edit actor manually"
                >
                  {/* Remove Button on top-right */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCast(idx);
                    }}
                    style={{
                      position: "absolute",
                      top: "6px",
                      right: "6px",
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: "rgba(239, 68, 68, 0.18)",
                      border: "1px solid rgba(239, 68, 68, 0.35)",
                      color: "#f87171",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 0,
                      zIndex: 2,
                    }}
                    title="Remove Actor"
                  >
                    <Trash2 size={11} />
                  </button>

                  {/* Circular Avatar matching 2nd image */}
                  <div
                    style={{
                      position: "relative",
                      width: "72px",
                      height: "72px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      margin: "0 auto 10px",
                      backgroundColor: "#161922",
                      border: "2px solid rgba(255, 255, 255, 0.18)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                    }}
                  >
                    {actor.photoUrl && !brokenImages[actor.photoUrl] ? (
                      <Image
                        src={actor.photoUrl}
                        alt=""
                        fill
                        unoptimized
                        referrerPolicy="no-referrer"
                        sizes="72px"
                        style={{ objectFit: "cover" }}
                        onError={() => {
                          if (actor.photoUrl) {
                            setBrokenImages((prev) => ({ ...prev, [actor.photoUrl!]: true }));
                          }
                        }}
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
                          background: "linear-gradient(135deg, #1b2030 0%, #10131d 100%)",
                        }}
                      >
                        <Users size={28} />
                      </div>
                    )}
                  </div>

                  {/* Name in bold white (matching 2nd image) */}
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.95rem",
                      color: "#ffffff",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1.25,
                      marginBottom: "3px",
                    }}
                    title={actor.actorName}
                  >
                    {actor.actorName || "Actor Name"}
                  </div>

                  {/* Role in muted text (matching 2nd image) */}
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      lineHeight: 1.2,
                    }}
                    title={actor.characterName}
                  >
                    {actor.characterName || "Role / Character"}
                  </div>

                  {/* Manual Edit Button */}
                  <div style={{ marginTop: "10px" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(idx);
                      }}
                      style={{
                        padding: "3px 10px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        background: "rgba(255, 255, 255, 0.08)",
                        border: "1px solid rgba(255, 255, 255, 0.16)",
                        borderRadius: "6px",
                        color: "#e2e8f0",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        cursor: "pointer",
                      }}
                      title="Click to edit actor manually"
                    >
                      <Edit2 size={10} />
                      <span>Edit Manually</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Add New Actor Card */}
              <div
                onClick={handleOpenAddModal}
                style={{
                  flex: "0 0 145px",
                  width: "145px",
                  minHeight: "180px",
                  scrollSnapAlign: "start",
                  borderRadius: "14px",
                  border: "2px dashed rgba(255, 255, 255, 0.18)",
                  background: "rgba(255, 255, 255, 0.02)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  padding: "16px",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--primary)";
                  e.currentTarget.style.color = "#ffffff";
                  e.currentTarget.style.background = "rgba(229, 9, 20, 0.05)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.18)";
                  e.currentTarget.style.color = "var(--text-muted)";
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.02)";
                }}
              >
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Plus size={20} />
                </div>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>Add Actor</span>
              </div>
            </div>
          ) : (
            /* List Form View */
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

        {/* Section 7: Crew & Production Members */}
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

      {/* Manual Actor Edit / Add Modal */}
      {modalActor && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0, 0, 0, 0.82)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setModalActor(null)}
        >
          <div
            style={{
              position: "relative",
              maxWidth: "460px",
              width: "100%",
              background: "#121622",
              border: "1px solid rgba(255, 255, 255, 0.16)",
              borderRadius: "16px",
              padding: "24px",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Edit2 size={18} color="var(--primary)" />
                <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#ffffff" }}>
                  {modalActor.index === -1 ? "Add Cast Member" : "Edit Actor Details"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalActor(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "6px",
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Live Card Preview (Matching 2nd Image Format) */}
            <div
              style={{
                background: "#0a0c13",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "12px",
                padding: "16px",
                textAlign: "center",
                marginBottom: "18px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  margin: "0 auto 8px",
                  backgroundColor: "#161922",
                  border: "2px solid rgba(255, 255, 255, 0.2)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
                }}
              >
                {modalActor.photoUrl && !brokenImages[modalActor.photoUrl] ? (
                  <Image
                    src={modalActor.photoUrl}
                    alt=""
                    fill
                    unoptimized
                    referrerPolicy="no-referrer"
                    sizes="72px"
                    style={{ objectFit: "cover" }}
                    onError={() => {
                      if (modalActor.photoUrl) {
                        setBrokenImages((prev) => ({ ...prev, [modalActor.photoUrl!]: true }));
                      }
                    }}
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
                      background: "linear-gradient(135deg, #1b2030 0%, #10131d 100%)",
                    }}
                  >
                    <Users size={28} />
                  </div>
                )}
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#ffffff", marginBottom: "2px" }}>
                {modalActor.actorName.trim() || "Actor Name"}
              </div>
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {modalActor.characterName.trim() || "Role / Character in Movie"}
              </div>
            </div>

            {/* Form Inputs */}
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Actor Name <span style={{ color: "var(--primary)" }}>*</span>
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Ranbir Kapoor or Nitish Tiwari"
                  value={modalActor.actorName}
                  onChange={(e) => setModalActor({ ...modalActor, actorName: e.target.value })}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: "6px" }}>
                  Character / Role
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Lord Rama, Director, Producer"
                  value={modalActor.characterName}
                  onChange={(e) => setModalActor({ ...modalActor, characterName: e.target.value })}
                />
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--text-muted)" }}>
                    Photo URL or Upload
                  </label>
                  <button
                    type="button"
                    onClick={() => actorPhotoInputRef.current?.click()}
                    disabled={uploadingActorPhoto}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--primary)",
                      fontSize: "0.78rem",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontWeight: 600,
                    }}
                  >
                    {uploadingActorPhoto ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                    <span>Upload Photo</span>
                  </button>
                  <input
                    ref={actorPhotoInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleActorPhotoUpload}
                  />
                </div>
                <input
                  type="url"
                  className="input-field"
                  placeholder="https://... or paste image link"
                  value={modalActor.photoUrl}
                  onChange={(e) => setModalActor({ ...modalActor, photoUrl: e.target.value })}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "22px" }}>
              {modalActor.index >= 0 ? (
                <button
                  type="button"
                  onClick={handleDeleteFromModal}
                  style={{
                    padding: "8px 14px",
                    background: "rgba(239, 68, 68, 0.14)",
                    border: "1px solid rgba(239, 68, 68, 0.35)",
                    borderRadius: "8px",
                    color: "#f87171",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <Trash2 size={14} />
                  <span>Remove</span>
                </button>
              ) : <div />}

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setModalActor(null)}
                  className="btn-secondary"
                  style={{ padding: "8px 16px", fontSize: "0.82rem", borderRadius: "8px" }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveModalActor}
                  className="btn-primary"
                  style={{ padding: "8px 20px", fontSize: "0.82rem", borderRadius: "8px", fontWeight: 700 }}
                >
                  {modalActor.index === -1 ? "Add Actor" : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
