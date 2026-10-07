"use client";

import { SlidersHorizontal, Sparkles, Film, Clock, Flame } from "lucide-react";

interface FilterBarProps {
  genres: string[];
  selectedGenre: string;
  onSelectGenre: (genre: string) => void;
  statusFilter: string;
  onSelectStatus: (status: string) => void;
  totalCount: number;
  sortBy: string;
  onSelectSort: (sort: string) => void;
}

export function FilterBar({
  genres,
  selectedGenre,
  onSelectGenre,
  statusFilter,
  onSelectStatus,
  totalCount,
  sortBy,
  onSelectSort,
}: FilterBarProps) {
  return (
    <div style={{ marginBottom: "32px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Top Filter Controls: Status Tabs & Sorters */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "14px",
          paddingBottom: "14px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {/* Status Segmented Buttons */}
        <div
          style={{
            display: "inline-flex",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-full)",
            padding: "4px",
            gap: "4px",
          }}
        >
          <button
            onClick={() => onSelectStatus("all")}
            className="btn-ghost"
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.82rem",
              fontWeight: 600,
              background: statusFilter === "all" ? "var(--primary)" : "transparent",
              color: statusFilter === "all" ? "#ffffff" : "var(--text-secondary)",
              boxShadow: statusFilter === "all" ? "0 2px 10px rgba(229, 9, 20, 0.4)" : "none",
            }}
          >
            All Catalog
          </button>

          <button
            onClick={() => onSelectStatus("available_now")}
            className="btn-ghost"
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.82rem",
              fontWeight: 600,
              background: statusFilter === "available_now" ? "var(--primary)" : "transparent",
              color: statusFilter === "available_now" ? "#ffffff" : "var(--text-secondary)",
              boxShadow: statusFilter === "available_now" ? "0 2px 10px rgba(229, 9, 20, 0.4)" : "none",
            }}
          >
            <Film size={14} />
            <span>Full Movies</span>
          </button>

          <button
            onClick={() => onSelectStatus("upcoming")}
            className="btn-ghost"
            style={{
              padding: "6px 14px",
              borderRadius: "var(--radius-full)",
              fontSize: "0.82rem",
              fontWeight: 600,
              background: statusFilter === "upcoming" ? "var(--primary)" : "transparent",
              color: statusFilter === "upcoming" ? "#ffffff" : "var(--text-secondary)",
              boxShadow: statusFilter === "upcoming" ? "0 2px 10px rgba(229, 9, 20, 0.4)" : "none",
            }}
          >
            <Clock size={14} />
            <span>Upcoming Releases</span>
          </button>
        </div>

        {/* Count & Sort Options */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Showing <strong style={{ color: "var(--text-main)" }}>{totalCount}</strong> titles
          </span>

          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <SlidersHorizontal size={14} color="var(--text-muted)" />
            <select
              value={sortBy}
              onChange={(e) => onSelectSort(e.target.value)}
              className="input-field"
              style={{
                width: "auto",
                padding: "6px 12px",
                fontSize: "0.82rem",
                borderRadius: "var(--radius-full)",
                background: "rgba(255, 255, 255, 0.05)",
                cursor: "pointer",
              }}
            >
              <option value="featured" style={{ background: "#11131c" }}>Featured First</option>
              <option value="rating" style={{ background: "#11131c" }}>Top Rated</option>
              <option value="newest" style={{ background: "#11131c" }}>Newest Release</option>
              <option value="title" style={{ background: "#11131c" }}>Title (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Genre Pills Carousel */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "6px",
          scrollbarWidth: "none",
        }}
      >
        <button
          onClick={() => onSelectGenre("")}
          className="btn-ghost"
          style={{
            padding: "6px 16px",
            borderRadius: "var(--radius-full)",
            fontSize: "0.8rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
            border: "1px solid",
            borderColor: selectedGenre === "" ? "var(--primary)" : "var(--border-subtle)",
            background: selectedGenre === "" ? "rgba(229, 9, 20, 0.15)" : "rgba(255, 255, 255, 0.03)",
            color: selectedGenre === "" ? "var(--primary)" : "var(--text-secondary)",
          }}
        >
          <Sparkles size={13} />
          <span>All Genres</span>
        </button>

        {genres.map((g) => {
          const isSelected = selectedGenre === g;
          return (
            <button
              key={g}
              onClick={() => onSelectGenre(isSelected ? "" : g)}
              className="btn-ghost"
              style={{
                padding: "6px 14px",
                borderRadius: "var(--radius-full)",
                fontSize: "0.8rem",
                fontWeight: 500,
                whiteSpace: "nowrap",
                border: "1px solid",
                borderColor: isSelected ? "var(--primary)" : "var(--border-subtle)",
                background: isSelected ? "rgba(229, 9, 20, 0.15)" : "rgba(255, 255, 255, 0.03)",
                color: isSelected ? "var(--primary)" : "var(--text-secondary)",
                transition: "all var(--transition-fast)",
              }}
            >
              {g}
            </button>
          );
        })}
      </div>
    </div>
  );
}
