"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

export function Preloader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  const [fading, setFading] = useState(false);
  const [subtitle, setSubtitle] = useState("Cinematic Streaming Universe");

  const lastPathRef = useRef<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const activeRef = useRef<boolean>(false);

  // Keep activeRef in sync
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const dismiss = useCallback(() => {
    if (!activeRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

    // Provide a brief minimum visual time (~180ms) to avoid jarring 1-frame flashes
    const elapsed = Date.now() - startTimeRef.current;
    const minDelay = Math.max(0, 180 - elapsed);

    timerRef.current = setTimeout(() => {
      setFading(true);
      fadeTimerRef.current = setTimeout(() => {
        setActive(false);
        setFading(false);
        activeRef.current = false;
      }, 220);
    }, minDelay);
  }, []);

  const triggerAnimation = useCallback(
    (text: string, maxDurationMs: number = 2500) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);

      startTimeRef.current = Date.now();
      setSubtitle(text);
      setActive(true);
      setFading(false);
      activeRef.current = true;

      // Safety timeout: automatically dismiss if no data event received within maxDurationMs
      timerRef.current = setTimeout(() => {
        dismiss();
      }, maxDurationMs);
    },
    [dismiss]
  );

  useEffect(() => {
    setMounted(true);

    // 1. Initial Site Opening Preloader (shows until data loads, or safety fallback)
    try {
      const alreadyLoaded = sessionStorage.getItem("cinenova_intro_seen");
      if (!alreadyLoaded) {
        sessionStorage.setItem("cinenova_intro_seen", "true");
        triggerAnimation("Cinematic Streaming Universe", 2500);
      }
    } catch {
      triggerAnimation("Cinematic Streaming Universe", 2500);
    }

    lastPathRef.current = pathname;

    // Listen to custom trigger & dismiss events
    const handleCustomTrigger = (event: Event) => {
      const customEvent = event as CustomEvent<{ subtitle?: string; duration?: number }>;
      const text = customEvent.detail?.subtitle || "Cinematic Streaming Universe";
      const dur = customEvent.detail?.duration || 2500;
      triggerAnimation(text, dur);
    };

    const handleDismiss = () => {
      dismiss();
    };

    window.addEventListener("cinenova_trigger_preloader", handleCustomTrigger);
    window.addEventListener("cinenova_dismiss_preloader", handleDismiss);

    return () => {
      window.removeEventListener("cinenova_trigger_preloader", handleCustomTrigger);
      window.removeEventListener("cinenova_dismiss_preloader", handleDismiss);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [triggerAnimation, dismiss, pathname]);

  // 2. Smooth Preloader transition between Landing Page (/) and CineNova Management (/admin)
  useEffect(() => {
    if (!mounted) return;

    const prevPath = lastPathRef.current;
    lastPathRef.current = pathname;

    if (!prevPath || prevPath === pathname) return;

    const isPrevAdmin = prevPath.startsWith("/admin");
    const isNowAdmin = pathname.startsWith("/admin");
    const isPrevHome = prevPath === "/";
    const isNowHome = pathname === "/";

    if (isPrevHome && isNowAdmin) {
      triggerAnimation("CineNova Management Portal", 2000);
    } else if (isPrevAdmin && isNowHome) {
      triggerAnimation("Cinematic Streaming Universe", 2000);
    }
  }, [pathname, mounted, triggerAnimation]);

  if (!mounted || !active) return null;

  return (
    <div
      className={`cinenova-preloader-backdrop ${fading ? "fade-out" : ""}`}
      aria-hidden={!active}
    >
      {/* Background Radial Neon Aura */}
      <div className="cinenova-preloader-glow" />

      {/* Animated CineNova Brand Typography */}
      <div className="cinenova-preloader-title">
        <span className="cinenova-preloader-cine">Cine</span>
        <span className="cinenova-preloader-nova">Nova</span>
        <div className="cinenova-preloader-shine" />
      </div>

      {/* Cinematic Tagline / Mode */}
      <div className="cinenova-preloader-sub">{subtitle}</div>

      {/* Cinematic Progress Bar */}
      <div className="cinenova-preloader-bar-track">
        <div className="cinenova-preloader-bar-fill" />
      </div>
    </div>
  );
}
