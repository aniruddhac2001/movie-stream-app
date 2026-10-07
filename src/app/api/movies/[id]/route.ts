import { NextRequest, NextResponse } from "next/server";
import { getMovieById, saveMovie, deleteMovie } from "@/lib/movieStore";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { movie, cast, crew, source } = await getMovieById(id);

    if (!movie) {
      return NextResponse.json({ success: false, error: "Movie not found" }, { status: 404 });
    }

    return NextResponse.json(
      { success: true, movie, cast, crew, source },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const { movie, source } = await saveMovie({ ...body, id });
    return NextResponse.json({ success: true, movie, source });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update movie";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = await deleteMovie(id);
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to delete movie";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
