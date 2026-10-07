import type { Metadata } from "next";
import "./globals.css";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { VideoProvider } from "@/context/VideoContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WatchlistDrawer } from "@/components/WatchlistDrawer";
import { SecretAdminListener } from "@/components/SecretAdminListener";
import { Preloader } from "@/components/Preloader";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "CineNova | Stream Blockbusters & Upcoming Movie Previews",
  description:
    "CineNova is your premier movie platform to explore the latest trailers, full releases, cast info, and upcoming blockbusters with ultra-modern playback.",
  keywords: ["movies", "streaming", "trailers", "cinema", "upcoming releases", "cinenova"],
  authors: [{ name: "CineNova Team" }],
  openGraph: {
    title: "CineNova | Modern Movie Universe",
    description: "Explore trailers, blockbusters, and cinema downloads with stunning aesthetics.",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/cinenova-logo.png", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/cinenova-logo.png",
    apple: "/cinenova-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/cinenova-logo.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/cinenova-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/cinenova-logo.png" />
      </head>
      <body>
        <Preloader />
        <VideoProvider>
          <WatchlistProvider>
            {/* Ambient Background Spotlights */}
            <div className="cinematic-glow" />
            <div className="cinematic-glow-gold" />

            {/* Secret Shortcut Listener */}
            <SecretAdminListener />

            {/* Persistent Glassmorphism Navbar */}
            <Suspense fallback={<div style={{ height: "72px" }} />}>
              <Navbar />
            </Suspense>

            {/* Main Content Area */}
            <main style={{ minHeight: "calc(100vh - 72px)", paddingTop: "72px" }}>
              {children}
            </main>

            {/* Global Watchlist Drawer */}
            <WatchlistDrawer />

            {/* Cinematic Footer */}
            <Footer />
          </WatchlistProvider>
        </VideoProvider>
      </body>
    </html>
  );
}
