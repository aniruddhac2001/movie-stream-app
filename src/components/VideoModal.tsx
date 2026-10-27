"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

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

  // Format embed url for YouTube / Vimeo / Google Drive / Dailymotion in 2K (1440p) format
  const getEmbedUrl = (rawUrl: string) => {
    if (!rawUrl) return "";
    try {
      // Force 2K (1440p QHD) playback: vq=hd1440, hd=1, highres=1, enablejsapi=1
      if (rawUrl.includes("youtu.be/")) {
        const id = rawUrl.split("youtu.be/")[1]?.split("?")[0]?.split("&")[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&vq=hd1440&hd=1&highres=1&enablejsapi=1`;
      }
      if (rawUrl.includes("youtube.com/watch")) {
        const urlParams = new URL(rawUrl).searchParams;
        const id = urlParams.get("v");
        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&vq=hd1440&hd=1&highres=1&enablejsapi=1`;
      }
      if (rawUrl.includes("youtube.com/embed/")) {
        const id = rawUrl.split("youtube.com/embed/")[1]?.split("?")[0]?.split("&")[0];
        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&vq=hd1440&hd=1&highres=1&enablejsapi=1`;
      }
      if (rawUrl.includes("vimeo.com/")) {
        const id = rawUrl.split("vimeo.com/")[1]?.split("?")[0];
        return `https://player.vimeo.com/video/${id}?autoplay=1&quality=1440p`;
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

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = e.currentTarget;
    try {
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackQuality", args: ["hd1440"] }),
        "*"
      );
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "setSuggestedQuality", args: ["hd1440"] }),
        "*"
      );
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.90)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      {/* Top-Right Screen Close Button matching Screenshot */}
      <button
        onClick={onClose}
        style={{
          position: "fixed",
          top: "22px",
          right: "26px",
          zIndex: 10001,
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
        <X size={32} strokeWidth={2.4} />
      </button>

      {/* Video Screen Container with Rounded Corners matching Screenshot */}
      <div
        style={{
          position: "relative",
          width: "90vw",
          maxWidth: "1060px",
          aspectRatio: "16 / 9",
          borderRadius: "14px",
          overflow: "hidden",
          boxShadow: "0 25px 70px rgba(0, 0, 0, 0.98), 0 0 50px rgba(0, 0, 0, 0.6)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          backgroundColor: "#000000",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 2K QHD Quality Pill Indicator */}
        <div
          style={{
            position: "absolute",
            top: "14px",
            left: "14px",
            zIndex: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(10, 14, 26, 0.85)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(56, 189, 248, 0.45)",
            padding: "4px 10px",
            borderRadius: "6px",
            fontSize: "0.72rem",
            fontWeight: 800,
            color: "#38bdf8",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.5)",
            letterSpacing: "0.5px",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: "#38bdf8",
              boxShadow: "0 0 8px #38bdf8",
              display: "inline-block",
            }}
          />
          <span>2K QHD (1440p)</span>
        </div>

        {isEmbed ? (
          <iframe
            src={embedSrc}
            title={title || "Trailer Player"}
            onLoad={handleIframeLoad}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
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
