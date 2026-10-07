import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const file = formData.get("file") as File | null;

    const toProcess: File[] = [];
    if (files && files.length > 0) {
      for (const f of files) {
        if (f && typeof f !== "string" && f.size > 0) toProcess.push(f);
      }
    }
    if (toProcess.length === 0 && file && typeof file !== "string" && file.size > 0) {
      toProcess.push(file);
    }

    if (toProcess.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid image files provided" },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "screenshots");
    await mkdir(uploadDir, { recursive: true });

    const uploadedItems = [];
    for (const f of toProcess) {
      const bytes = await f.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const safeName = f.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const uniqueFilename = `shot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;
      const filePath = path.join(uploadDir, uniqueFilename);

      await writeFile(filePath, buffer);

      uploadedItems.push({
        url: `/uploads/screenshots/${uniqueFilename}`,
        filename: f.name,
      });
    }

    return NextResponse.json({
      success: true,
      files: uploadedItems,
      file: uploadedItems[0],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Upload processing failed";
    console.error("Screenshot upload error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
