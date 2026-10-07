"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Movie } from "@/types/movie";

interface WatchlistContextType {
  watchlist: Movie[];
  isInWatchlist: (id: string) => boolean;
  toggleWatchlist: (movie: Movie) => void;
  removeFromWatchlist: (id: string) => void;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (open: boolean) => void;
}

const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem("cinenova_watchlist") ||
        localStorage.getItem("cinestream_watchlist");
      if (stored) {
        setWatchlist(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Failed to load watchlist from localStorage", e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem("cinenova_watchlist", JSON.stringify(watchlist));
      } catch (e) {
        console.warn("Failed to save watchlist to localStorage", e);
      }
    }
  }, [watchlist, isLoaded]);

  const isInWatchlist = (id: string) => watchlist.some((m) => m.id === id);

  const toggleWatchlist = (movie: Movie) => {
    setWatchlist((prev) => {
      const exists = prev.some((m) => m.id === movie.id);
      if (exists) {
        return prev.filter((m) => m.id !== movie.id);
      } else {
        return [movie, ...prev];
      }
    });
  };

  const removeFromWatchlist = (id: string) => {
    setWatchlist((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <WatchlistContext.Provider
      value={{
        watchlist,
        isInWatchlist,
        toggleWatchlist,
        removeFromWatchlist,
        isDrawerOpen,
        setIsDrawerOpen,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error("useWatchlist must be used within a WatchlistProvider");
  }
  return context;
}
