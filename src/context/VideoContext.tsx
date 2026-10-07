"use client";

import React, { createContext, useContext, useState } from "react";
import { VideoModal } from "@/components/VideoModal";

interface VideoContextType {
  playVideo: (url: string, title?: string) => void;
  closeVideo: () => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [videoData, setVideoData] = useState<{ url: string | null; title?: string }>({
    url: null,
    title: "",
  });

  const playVideo = (url: string, title?: string) => {
    setVideoData({ url, title });
  };

  const closeVideo = () => {
    setVideoData({ url: null, title: "" });
  };

  return (
    <VideoContext.Provider value={{ playVideo, closeVideo }}>
      {children}
      <VideoModal url={videoData.url} title={videoData.title} onClose={closeVideo} />
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error("useVideo must be used within a VideoProvider");
  }
  return context;
}
