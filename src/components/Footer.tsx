import Link from "next/link";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-subtle)",
        background: "linear-gradient(to bottom, #07080c 0%, #050508 100%)",
        marginTop: "80px",
        paddingTop: "60px",
        paddingBottom: "40px",
        position: "relative",
        zIndex: 10,
      }}
    >
      <div className="container">

        {/* Main Footer Links */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "36px",
            marginBottom: "40px",
          }}
        >
          {/* Col 1: Brand Info */}
          <div>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                textDecoration: "none",
                marginBottom: "14px",
              }}
            >
              <span style={{ fontSize: "1.3rem", fontWeight: 800 }}>
                Cine<span style={{ color: "var(--primary)" }}>Nova</span>
              </span>
            </Link>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              CineNova is your premium destination for movie streaming, upcoming theatrical previews, high-definition trailers, and exclusive cinema downloads.
            </p>
          </div>

          {/* Col 2: Navigation */}
          <div>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#e2e8f0", marginBottom: "14px" }}>
              Explore
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <Link href="/" style={{ transition: "color var(--transition-fast)" }}>Browse All Movies</Link>
              <Link href="/?status=available_now" style={{ transition: "color var(--transition-fast)" }}>Full Movies</Link>
              <Link href="/?status=upcoming" style={{ transition: "color var(--transition-fast)" }}>Upcoming Theatrical Releases</Link>
            </div>
          </div>

          {/* Col 3: Genres */}
          <div>
            <h4 style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#e2e8f0", marginBottom: "14px" }}>
              Popular Genres
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <Link href="/?genre=Action">Action & Thrillers</Link>
              <Link href="/?genre=Horror">Horror & Mystery</Link>
              <Link href="/?genre=Sci-Fi">Sci-Fi & Fantasy</Link>
              <Link href="/?genre=Drama">Award-Winning Drama</Link>
            </div>
          </div>


        </div>

        {/* Bottom Credits & Copyright */}
        <div
          style={{
            paddingTop: "24px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            fontSize: "0.8rem",
            color: "var(--text-muted)",
          }}
        >
          <div>© {new Date().getFullYear()} CineNova. All rights reserved.</div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span>Crafted with</span>
            <Heart size={14} color="var(--primary)" fill="currentColor" />
            <span>using Next.js & Firebase</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
