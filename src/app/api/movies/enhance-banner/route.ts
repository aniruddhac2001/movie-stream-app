import { NextRequest, NextResponse } from "next/server";
import { toHighResImageUrl, analyzeImageResolution } from "@/lib/imageResolution";

export const dynamic = "force-dynamic";

// Known high quality curated backdrops repository
const MOVIE_BACKDROPS_REGISTRY: Record<string, Array<{ url: string; label: string; resolution: string }>> = {
  "ramayana": [
    {
      url: "https://images.ctfassets.net/3sjsytt3tkv5/1r5I3Vo3KGNk4VKbH9j4WN/6efdfa1cbe79d5fc4d2b8ee76f6bdcca/YT_Final_cover.png",
      label: "Official DNEG 2.5K Master Wallpaper",
      resolution: "2560 x 1440 (Ultra-HD)",
    },
    {
      url: "https://cf-images.assettype.com/cinemaexpress%2F2026-08-20%2F7ll340m7%2Fvibe-poster.jpeg?w=2560&auto=format&fit=max",
      label: "Widescreen Cinematic Banner",
      resolution: "1920 x 1080 (Full HD)",
    },
  ],
  "ramayana - part 1": [
    {
      url: "https://images.ctfassets.net/3sjsytt3tkv5/1r5I3Vo3KGNk4VKbH9j4WN/6efdfa1cbe79d5fc4d2b8ee76f6bdcca/YT_Final_cover.png",
      label: "Official DNEG 2.5K Master Wallpaper",
      resolution: "2560 x 1440 (Ultra-HD)",
    },
  ],
  "vibe": [
    {
      url: "https://cf-images.assettype.com/cinemaexpress%2F2026-08-20%2F7ll340m7%2Fvibe-poster.jpeg?w=2560&auto=format&fit=max",
      label: "CinemaExpress 2.5K High-Res Master",
      resolution: "2560 x 1440 (Ultra-HD)",
    },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const { url, title, type = "banner" } = await req.json();

    const currentUrl = typeof url === "string" ? url.trim() : "";
    const movieTitle = typeof title === "string" ? title.trim() : "";

    const analysis = analyzeImageResolution(currentUrl, type, movieTitle);
    const upgradedUrl = toHighResImageUrl(currentUrl, type, movieTitle);

    // Look for matching alternative high-res backdrops by title
    const normalizedTitle = movieTitle.toLowerCase();
    let curatedBackdrops = MOVIE_BACKDROPS_REGISTRY[normalizedTitle] || [];

    // Also partial match
    if (curatedBackdrops.length === 0 && movieTitle) {
      for (const [key, list] of Object.entries(MOVIE_BACKDROPS_REGISTRY)) {
        if (normalizedTitle.includes(key) || key.includes(normalizedTitle)) {
          curatedBackdrops = list;
          break;
        }
      }
    }

    return NextResponse.json({
      success: true,
      originalUrl: currentUrl,
      enhancedUrl: upgradedUrl || currentUrl,
      isUpgraded: upgradedUrl !== currentUrl,
      analysis,
      curatedBackdrops,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to enhance banner";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
