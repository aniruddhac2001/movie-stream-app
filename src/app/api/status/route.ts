import { NextResponse } from "next/server";
import { getFirebaseStatus } from "@/lib/firebase";
import { getAllMovies } from "@/lib/movieStore";

export async function GET() {
  const firebaseStatus = getFirebaseStatus();
  let dbStats = { movieCount: 0, dbConnected: false };

  try {
    const { movies, source } = await getAllMovies();
    dbStats = {
      movieCount: movies.length,
      dbConnected: source === "firebase",
    };
  } catch (e) {
    console.warn("DB check error:", e);
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    firebase: firebaseStatus,
    stats: dbStats,
    secretCodeLength: (process.env.ADMIN_SECRET_CODE || "admincine").length,
  });
}
