import { NextRequest, NextResponse } from "next/server";
import { getAllMovies, saveMovie } from "@/lib/movieStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase();
    const genre = searchParams.get("genre");
    const status = searchParams.get("status");

    const { movies, source, firebaseStatus } = await getAllMovies();

    let filtered = movies;

    if (query) {
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          m.synopsis?.toLowerCase().includes(query) ||
          (Array.isArray(m.genre) && m.genre.some((g) => g.toLowerCase().includes(query)))
      );
    }

    if (genre && genre !== "All") {
      filtered = filtered.filter((m) =>
        Array.isArray(m.genre) ? m.genre.includes(genre) : m.genre === genre
      );
    }

    if (status) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter((m) => {
        if (!m.releaseDate) return status === "upcoming";
        const rel = new Date(m.releaseDate + "T00:00:00");
        const isUpcoming = rel > today;

        if (status === "upcoming") return isUpcoming;
        if (status === "available_now") return !isUpcoming && m.hasFullMovie;
        if (status === "available_soon") return !isUpcoming && !m.hasFullMovie;
        return true;
      });
    }

    return NextResponse.json({
      success: true,
      count: filtered.length,
      movies: filtered,
      source,
      firebaseStatus,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title || !body.title.trim()) {
      return NextResponse.json({ success: false, error: "Title is required" }, { status: 400 });
    }

    const { movie, source } = await saveMovie(body);
    return NextResponse.json({ success: true, movie, source }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to create movie";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { cleanDatabase } = await import("@/lib/movieStore");
    const result = await cleanDatabase();
    return NextResponse.json({
      message: `Database cleaned successfully. Removed ${result.deletedCount} movies.`,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to clean database";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
