"use client";

import { useEffect } from "react";
import { X, ExternalLink } from "lucide-react";

interface VideoModalProps {
  url: string | null;
  title?: string;
  onClose: () => void;
}

export function VideoModal({ url, title, onClose }: VideoModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!url) return null;

  // Format embed url for YouTube / Vimeo / Google Drive / Dailymotion
  const getEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return "";
    try {
      // Prioritize 2K (1440p) quality on YouTube: vq=hd1440&hd=1
      if (rawUrl.includes("youtu.be/")) {
        const id = rawUrl.split("youtu.be/")[1]?.split("?")[0]?.split("&")[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&vq=hd1440&hd=1`;
      }
      if (rawUrl.includes("youtube.com/watch")) {
        const urlParams = new URL(rawUrl).searchParams;
        const id = urlParams.get("v");
        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&vq=hd1440&hd=1`;
      }
      if (rawUrl.includes("youtube.com/embed/")) {
        const id = rawUrl.split("youtube.com/embed/")[1]?.split("?")[0]?.split("&")[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&vq=hd1440&hd=1`;
      }
      if (rawUrl.includes("vimeo.com/")) {
        const id = rawUrl.split("vimeo.com/")[1]?.split("?")[0];
        return `https://player.vimeo.com/video/${id}?autoplay=1`;
      }
      if (rawUrl.includes("drive.google.com")) {
        if (rawUrl.includes("/file/d/")) {
          const id = rawUrl.split("/file/d/")[1]?.split("/")[0]?.split("?")[0];
          return `https://drive.google.com/file/d/${id}/preview`;
        }
        if (rawUrl.includes("id=")) {
          try {
            const id = new URL(rawUrl).searchParams.get("id");
            if (id) return `https://drive.google.com/file/d/${id}/preview`;
          } catch {
            // ignore
          }
        }
      }
      if (rawUrl.includes("dailymotion.com/video/")) {
        const id = rawUrl.split("/video/")[1]?.split("?")[0];
        return `https://www.dailymotion.com/embed/video/${id}?autoplay=1`;
      }
    } catch {
      // Fallback
    }
    return rawUrl;
  };

  const isDirectVideo =
    /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(url) ||
    url.startsWith("blob:") ||
    url.startsWith("data:video");

  const isEmbed =
    !isDirectVideo &&
    (url.includes("youtube.com") ||
      url.includes("youtu.be") ||
      url.includes("vimeo.com") ||
      url.includes("drive.google.com") ||
      url.includes("dailymotion.com") ||
      url.includes("/embed") ||
      url.includes("player"));

  const embedSrc = getEmbedUrl(url);

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Top Header Controls (External Link & Close) */}
      <div
        style={{
          position: "fixed",
          top: "20px",
          right: "26px",
          zIndex: 10001,
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        {/* Optional external watch button if user wants to open original source */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: "rgba(255, 255, 255, 0.08)",
            border: "1px solid rgba(255, 255, 255, 0.16)",
            color: "#ffffff",
            padding: "8px 14px",
            borderRadius: "8px",
            fontSize: "0.8rem",
            fontWeight: 600,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            textDecoration: "none",
            transition: "all 0.15s ease",
          }}
          title="Open original video link in new tab"
        >
          <span>Watch Source</span>
          <ExternalLink size={14} />
        </a>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#ffffff",
            cursor: "pointer",
            padding: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "transform 0.15s ease, opacity 0.15s ease",
            opacity: 0.85,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "scale(1.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.85";
            e.currentTarget.style.transform = "scale(1)";
          }}
          title="Close (Esc)"
          aria-label="Close Trailer"
        >
          <X size={30} strokeWidth={2.4} />
        </button>
      </div>

      {/* Video Screen Container with High-Res Sizing for 2K/1080p */}
      <div
        style={{
          position: "relative",
          width: "92vw",
          maxWidth: "1440px",
          maxHeight: "88vh",
          aspectRatio: "16 / 9",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 25px 70px rgba(0, 0, 0, 0.98), 0 0 50px rgba(0, 0, 0, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backgroundColor: "#000000",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {isEmbed ? (
          <iframe
            src={embedSrc}
            title={title || "Trailer Player"}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
          />
        ) : (
          <video
            src={url}
            controls
            autoPlay
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        )}
      </div>
    </div>
  );
}
