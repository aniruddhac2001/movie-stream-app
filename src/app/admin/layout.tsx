import React from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ position: "relative", minHeight: "100vh" }}>
      {/* Admin-only Ambient Dual Gaussian Glows: Sky Blue (Bottom-Left) & Red (Top-Right) */}
      <div className="admin-glow-left" />
      <div className="admin-glow-right" />
      <div style={{ position: "relative", zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
