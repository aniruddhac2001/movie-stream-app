"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Film,
  Search,
  Shield,
  X,
  Menu,
  Sparkles,
  LogOut,
} from "lucide-react";
import { isAdminAuthenticated, removeAdminToken } from "@/lib/adminAuth";

export function Navbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync with search URL parameter if present
  useEffect(() => {
    const q = searchParams.get("q") || "";
    setQuery(q);
  }, [searchParams]);

  // Check admin session (session-scoped: automatically clears on site close)
  useEffect(() => {
    const checkAuth = () => {
      setIsAdmin(isAdminAuthenticated());
    };
    checkAuth();
    window.addEventListener("storage", checkAuth);
    window.addEventListener("cinenova_auth_change", checkAuth);
    return () => {
      window.removeEventListener("storage", checkAuth);
      window.removeEventListener("cinenova_auth_change", checkAuth);
    };
  }, []);

  // Header background blur on scroll (optimized with rAF)
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const shouldScroll = window.scrollY > 20;
          setIsScrolled((prev) => (prev !== shouldScroll ? shouldScroll : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Keyboard shortcut Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearchChange = (val: string) => {
    setQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (val.trim()) {
        params.set("q", val.trim());
      } else {
        params.delete("q");
      }
      router.replace(`/?${params.toString()}`);
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cinenova_trigger_preloader", {
          detail: { subtitle: "Cinematic Streaming Universe", duration: 1100 },
        })
      );
    }
    removeAdminToken();
    setIsAdmin(false);
    router.push("/");
  };

  return (
    <header
      className="glass-header"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        transition: "background var(--transition-normal), box-shadow var(--transition-normal)",
        background: isScrolled ? "rgba(7, 8, 12, 0.55)" : "rgba(7, 8, 12, 0.2)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        boxShadow: isScrolled ? "0 10px 30px rgba(0, 0, 0, 0.4)" : "none",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: "72px",
          gap: "16px",
        }}
      >
        {/* Brand Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            flexDirection: "column",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "1.45rem",
              fontWeight: 900,
              letterSpacing: "-0.03em",
              background: "linear-gradient(180deg, #ffffff 30%, #cbd5e1 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              lineHeight: 1.15,
            }}
          >
            Cine<span style={{ color: "var(--primary)", WebkitTextFillColor: "var(--primary)" }}>Nova</span>
          </span>
          <span
            style={{
              fontSize: "0.62rem",
              color: "var(--text-muted)",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              marginTop: "3px",
              fontWeight: 600,
            }}
          >
            Cinematic Universe
          </span>
        </Link>

        {/* Search Bar with live filter and keyboard hint */}
        <div
          style={{
            position: "relative",
            flex: "1",
            maxWidth: "460px",
            display: "none",
          }}
          className="desktop-search"
        >
          <Search
            size={18}
            style={{
              position: "absolute",
              left: 14,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search movies, genres, actors..."
            value={query}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="input-field"
            style={{
              paddingLeft: "42px",
              paddingRight: "70px",
              height: "42px",
              fontSize: "0.88rem",
              background: "rgba(255, 255, 255, 0.06)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "var(--radius-full)",
            }}
          />
          {query ? (
            <button
              onClick={() => handleSearchChange("")}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              <X size={16} />
            </button>
          ) : (
            <span
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "0.7rem",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                padding: "2px 6px",
                pointerEvents: "none",
              }}
            >
              Ctrl+K
            </span>
          )}
        </div>

        {/* Navigation Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}>

          {/* Admin Link / Status */}
          {/* Admin link / indicator - only displayed when logged in */}
          {isAdmin && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={handleLogout}
                className="btn-icon"
                style={{ width: "38px", height: "38px", cursor: "pointer" }}
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn-icon mobile-toggle"
            style={{ width: "38px", height: "38px", display: "none" }}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Search & Navigation Dropdown */}
      {mobileMenuOpen && (
        <div
          style={{
            padding: "12px 16px 20px",
            borderTop: "1px solid var(--border-subtle)",
            background: "#0a0c12",
          }}
        >
          <div style={{ position: "relative", marginBottom: "14px" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search movies..."
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="input-field"
              style={{
                paddingLeft: "42px",
                height: "42px",
                borderRadius: "var(--radius-full)",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="btn-ghost"
              style={{ justifyContent: "flex-start", width: "100%" }}
            >
              <Film size={18} />
              <span>Browse All Movies</span>
            </Link>


            {isAdmin && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="btn-ghost"
                style={{ justifyContent: "flex-start", width: "100%", cursor: "pointer" }}
              >
                <Shield size={18} />
                <span>Exit & Logout</span>
              </button>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        @media (min-width: 768px) {
          .desktop-search {
            display: block !important;
          }
        }
        @media (max-width: 767px) {
          .mobile-toggle {
            display: inline-flex !important;
          }
          .desktop-text {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
