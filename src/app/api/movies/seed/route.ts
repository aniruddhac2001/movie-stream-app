import { NextResponse } from "next/server";
import { resetCatalog } from "@/lib/movieStore";

export async function POST() {
  try {
    const result = await resetCatalog();
    return NextResponse.json({
      success: true,
      message: `Reset catalog successfully with ${result.count} movies`,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to reset catalog";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
