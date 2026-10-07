import { NextResponse } from "next/server";
import { cleanDatabase } from "@/lib/movieStore";

export async function POST() {
  try {
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
